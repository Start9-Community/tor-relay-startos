import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { readArchive, writeArchive } from '../identity'
import { installIdentity, readIdentity } from '../identity'

const { InputSpec, Value } = sdk

const modeValue = (name: string) =>
  Value.select({
    name,
    default: 'relay',
    values: { relay: i18n('Non-exit relay'), bridge: i18n('obfs4 bridge') },
  })

export const importIdentity = sdk.Action.withInput(
  'import-identity',

  async () => ({
    name: i18n('Import Identity'),
    description: i18n(
      'Bring an existing relay or bridge identity, so its fingerprint and history carry over. Paste the base64 of a .tar.gz holding keys/secret_id_key and keys/ed25519_master_id_secret_key, plus pt_state/obfs4_state.json for a bridge to keep its bridge line.',
    ),
    warning: i18n(
      "Replaces this mode's identity. Never run the same identity on two machines at once: stop the old node first.",
    ),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),

  InputSpec.of({
    mode: modeValue(i18n('Import into')),
    archive: Value.textarea({
      name: i18n('Identity archive (base64)'),
      description: i18n(
        'On a Mac: base64 -i tor-identity.tgz | pbcopy. On Linux: base64 -w0 tor-identity.tgz.',
      ),
      required: true,
      default: null,
    }),
  }),

  async () => null,

  async ({ input }) => {
    const identity = readArchive(
      Buffer.from(input.archive.replace(/\s+/g, ''), 'base64'),
    )
    await installIdentity(input.mode, identity)
    return {
      version: '1' as const,
      title: i18n('Identity Imported'),
      message: i18n(
        'Start the service. Tor will rebuild the derived keys and keep the imported fingerprint.',
      ),
      result: null,
    }
  },
)

export const exportIdentity = sdk.Action.withInput(
  'export-identity',

  async () => ({
    name: i18n('Export Identity'),
    description: i18n(
      "Download this node's identity keys as base64 of a .tar.gz, to move the node to another machine.",
    ),
    warning: i18n(
      'Anyone holding these keys can impersonate this node. Stop this node before running the identity anywhere else.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  InputSpec.of({ mode: modeValue(i18n('Export from')) }),

  async () => {
    const mode = await storeJson.read((s) => s.mode).once()
    return mode ? { mode } : {}
  },

  async ({ input }) => {
    const identity = await readIdentity(input.mode)
    if (!identity)
      throw new Error(
        i18n(
          'This mode has no identity yet. Start the service in this mode first.',
        ),
      )
    return {
      version: '1' as const,
      title: i18n('Identity Export'),
      message: i18n(
        'Decode with: base64 -d > tor-identity.tgz. Extract into the new Tor DataDirectory with tar xzf.',
      ),
      result: {
        type: 'multiline' as const,
        value: writeArchive(identity).toString('base64'),
        masked: true,
        copyable: true,
        qr: false,
        filename: `tor-${input.mode}-identity.tgz.b64`,
      },
    }
  },
)
