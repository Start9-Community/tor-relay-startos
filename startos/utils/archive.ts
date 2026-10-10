import { gunzipSync, gzipSync } from 'node:zlib'

export const identityFiles = [
  'secret_id_key',
  'ed25519_master_id_secret_key',
] as const
type IdentityFile = (typeof identityFiles)[number]
export type Identity = Record<IdentityFile, Buffer> & {
  /** lyrebird's pt_state/obfs4_state.json; it holds the cert in the bridge line. */
  obfs4State?: Buffer
}

export const obfs4StatePath = 'pt_state/obfs4_state.json'

const ED25519_HEADER = '== ed25519v1-secret: type0 =='

function validateObfs4State(state: Buffer) {
  let parsed: unknown
  try {
    parsed = JSON.parse(state.toString('utf8'))
  } catch {
    throw new Error('obfs4_state.json is not valid JSON')
  }
  const o = parsed as Record<string, unknown> | null
  if (
    !o ||
    typeof o['node-id'] !== 'string' ||
    typeof o['private-key'] !== 'string'
  )
    throw new Error('obfs4_state.json lacks node-id or private-key')
}

export function validate(id: Partial<Identity>): Identity {
  const rsa = id.secret_id_key
  const ed = id.ed25519_master_id_secret_key
  if (
    !rsa ||
    !rsa.toString('latin1').startsWith('-----BEGIN RSA PRIVATE KEY-----')
  )
    throw new Error('secret_id_key is missing or is not an RSA private key')
  if (
    !ed ||
    ed.length !== 96 ||
    !ed.toString('latin1').startsWith(ED25519_HEADER)
  )
    throw new Error('ed25519_master_id_secret_key is missing or malformed')
  if (id.obfs4State) validateObfs4State(id.obfs4State)
  return {
    secret_id_key: rsa,
    ed25519_master_id_secret_key: ed,
    ...(id.obfs4State ? { obfs4State: id.obfs4State } : {}),
  }
}

const field = (h: Buffer, start: number, len: number) =>
  h
    .subarray(start, start + len)
    .toString('latin1')
    .replace(/\0.*$/s, '')

/** Reads the two identity keys, and obfs4_state.json when present, out of a .tar or .tar.gz at any depth. */
export function readArchive(archive: Buffer): Identity {
  const tar =
    archive[0] === 0x1f && archive[1] === 0x8b ? gunzipSync(archive) : archive
  const found: Partial<Identity> = {}
  let off = 0
  while (off + 512 <= tar.length) {
    const h = tar.subarray(off, off + 512)
    if (h.every((b) => b === 0)) break
    const name = [field(h, 345, 155), field(h, 0, 100)]
      .filter(Boolean)
      .join('/')
    const size = parseInt(field(h, 124, 12).trim() || '0', 8)
    const type = field(h, 156, 1)
    const body = tar.subarray(off + 512, off + 512 + size)
    const base = name.split('/').pop() as string
    if (
      (type === '0' || type === '') &&
      (identityFiles as readonly string[]).includes(base)
    )
      found[base as IdentityFile] = Buffer.from(body)
    else if ((type === '0' || type === '') && base === 'obfs4_state.json')
      found.obfs4State = Buffer.from(body)
    off += 512 + Math.ceil(size / 512) * 512
  }
  return validate(found)
}

function header(name: string, size: number): Buffer {
  const h = Buffer.alloc(512, 0)
  const put = (s: string, at: number) => h.write(s, at, 'latin1')
  put(name, 0)
  put('0000600\0', 100)
  put('0000000\0', 108)
  put('0000000\0', 116)
  put(size.toString(8).padStart(11, '0') + '\0', 124)
  put(
    Math.floor(Date.now() / 1000)
      .toString(8)
      .padStart(11, '0') + '\0',
    136,
  )
  put('        ', 148)
  put('0', 156)
  put('ustar\0', 257)
  put('00', 263)
  const sum = h.reduce((a, b) => a + b, 0)
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148)
  return h
}

/** A .tar.gz holding the two keys under keys/, plus pt_state/obfs4_state.json for a bridge. */
export function writeArchive(id: Identity): Buffer {
  const entries: [string, Buffer][] = identityFiles.map((f) => [
    `keys/${f}`,
    id[f],
  ])
  if (id.obfs4State) entries.push([obfs4StatePath, id.obfs4State])
  const parts: Buffer[] = []
  for (const [name, body] of entries) {
    parts.push(header(name, body.length), body)
    const pad = (512 - (body.length % 512)) % 512
    if (pad) parts.push(Buffer.alloc(pad, 0))
  }
  parts.push(Buffer.alloc(1024, 0))
  return gzipSync(Buffer.concat(parts))
}
