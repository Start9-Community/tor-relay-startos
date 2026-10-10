import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { sdk } from '../sdk'
import { Identity, identityFiles, validate } from './archive'
import { Mode, modeDir } from './index'

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
    return validate({
      secret_id_key: await readFile(path(mode, 'keys/secret_id_key')),
      ed25519_master_id_secret_key: await readFile(
        path(mode, 'keys/ed25519_master_id_secret_key'),
      ),
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
