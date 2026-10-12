import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { gunzipSync, gzipSync } from 'node:zlib'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { Mode, modeDir } from './utils'

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
    throw new Error(i18n('obfs4_state.json is not valid JSON.'))
  }
  const o = parsed as Record<string, unknown> | null
  if (
    !o ||
    typeof o['node-id'] !== 'string' ||
    typeof o['private-key'] !== 'string'
  )
    throw new Error(i18n('obfs4_state.json lacks node-id or private-key.'))
}

export function validate(id: Partial<Identity>): Identity {
  const rsa = id.secret_id_key
  const ed = id.ed25519_master_id_secret_key
  if (
    !rsa ||
    !rsa.toString('latin1').startsWith('-----BEGIN RSA PRIVATE KEY-----')
  )
    throw new Error(
      i18n('secret_id_key is missing or is not an RSA private key.'),
    )
  if (
    !ed ||
    ed.length !== 96 ||
    !ed.toString('latin1').startsWith(ED25519_HEADER)
  )
    throw new Error(
      i18n('ed25519_master_id_secret_key is missing or malformed.'),
    )
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
  let tar = archive
  if (archive[0] === 0x1f && archive[1] === 0x8b) {
    try {
      tar = gunzipSync(archive)
    } catch {
      throw new Error(i18n('The archive is not a valid .tar.gz.'))
    }
  }
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

const path = (mode: Mode, rel: string) =>
  sdk.volumes.main.subpath(`${modeDir(mode)}/${rel}`)

/** Files Tor derives from the two identity keys; stale copies would contradict an imported identity. */
const derived = [
  'keys/ed25519_master_id_public_key',
  'keys/ed25519_signing_cert',
  'keys/ed25519_signing_secret_key',
  'keys/secret_onion_key',
  'keys/secret_onion_key.old',
  'keys/secret_onion_key_ntor',
  'keys/secret_onion_key_ntor.old',
  'fingerprint',
  'fingerprint-ed25519',
  'hashed-fingerprint',
]

export async function readIdentity(mode: Mode): Promise<Identity | null> {
  try {
    const obfs4State =
      mode === 'bridge'
        ? await readFile(path(mode, obfs4StatePath)).catch(() => undefined)
        : undefined
    return validate({
      secret_id_key: await readFile(path(mode, 'keys/secret_id_key')),
      ed25519_master_id_secret_key: await readFile(
        path(mode, 'keys/ed25519_master_id_secret_key'),
      ),
      obfs4State,
    })
  } catch {
    return null
  }
}

export async function installIdentity(mode: Mode, id: Identity) {
  await mkdir(path(mode, 'keys'), { recursive: true, mode: 0o700 })
  for (const f of derived) await rm(path(mode, f), { force: true })
  for (const f of identityFiles)
    await writeFile(path(mode, `keys/${f}`), id[f], { mode: 0o600 })
  // A relay has no pluggable transport, so the obfs4 state only lands in bridge mode.
  if (mode === 'bridge' && id.obfs4State) {
    await mkdir(path(mode, 'pt_state'), { recursive: true, mode: 0o700 })
    await rm(path(mode, 'pt_state/obfs4_bridgeline.txt'), { force: true })
    await writeFile(path(mode, obfs4StatePath), id.obfs4State, { mode: 0o600 })
  }
}

/** `<nickname> <FINGERPRINT>` as Tor writes it, split; null before Tor has run in this mode. */
export async function readFingerprint(
  mode: Mode,
  file: 'fingerprint' | 'hashed-fingerprint' = 'fingerprint',
): Promise<string | null> {
  try {
    const parts = (await readFile(path(mode, file), 'utf8')).trim().split(/\s+/)
    return parts[1] ?? null
  } catch {
    return null
  }
}

export async function readBridgeLine(): Promise<string | null> {
  try {
    const raw = await readFile(
      path('bridge', 'pt_state/obfs4_bridgeline.txt'),
      'utf8',
    )
    return raw.split('\n').find((l) => l.startsWith('Bridge obfs4')) ?? null
  } catch {
    return null
  }
}
