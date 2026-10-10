import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

export const configureSpec = InputSpec.of({
  mode: Value.select({
    name: i18n('Mode'),
    description: i18n(
      'A relay is listed publicly and carries traffic between other relays; it never lets traffic exit. A bridge is unlisted and helps censored users reach Tor through obfs4. Each mode keeps its own identity.',
    ),
    default: 'relay',
    values: {
      relay: i18n('Non-exit relay'),
      bridge: i18n('obfs4 bridge'),
    },
  }),
  nickname: Value.text({
    name: i18n('Nickname'),
    description: i18n('Shown on Tor Metrics. 1-19 letters and digits.'),
    required: true,
    default: null,
    placeholder: 'MyTorNode',
    patterns: [
      {
        regex: '^[A-Za-z0-9]{1,19}$',
        description: i18n('1-19 letters and digits'),
      },
    ],
    minLength: 1,
    maxLength: 19,
  }),
  contactInfo: Value.text({
    name: i18n('Contact Info'),
    description: i18n(
      'How the Tor Project can reach you about this node, usually an email address. Published with the node.',
    ),
    required: false,
    default: null,
    placeholder: 'tor@example.com',
    patterns: [
      {
        regex: '^[^\\x00-\\x1f]*$',
        description: i18n('A single line of text'),
      },
    ],
    maxLength: 200,
  }),
  bandwidthRate: Value.number({
    name: i18n('Bandwidth Rate'),
    description: i18n(
      'Sustained bandwidth Tor may use in each direction. Tor needs at least 75 KB/s.',
    ),
    required: true,
    default: 1024,
    min: 75,
    integer: true,
    units: 'KB/s',
  }),
  bandwidthBurst: Value.number({
    name: i18n('Bandwidth Burst'),
    description: i18n(
      'Short peaks above the rate. At least the Bandwidth Rate.',
    ),
    required: true,
    default: 2048,
    min: 75,
    integer: true,
    units: 'KB/s',
  }),
  accountingMax: Value.number({
    name: i18n('Monthly Traffic Limit'),
    description: i18n(
      'Tor hibernates once it has used this much in either direction in a calendar month. Leave empty for no limit.',
    ),
    required: false,
    default: null,
    min: 1,
    integer: true,
    units: 'GB',
  }),
})

export const configureNode = sdk.Action.withInput(
  'configure-node',

  async () => ({
    name: i18n('Configure Node'),
    description: i18n(
      'Choose relay or bridge mode, the nickname, and bandwidth limits.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  configureSpec,

  async () => {
    const s = await storeJson.read().once()
    if (!s?.configured) return {}
    return {
      mode: s.mode,
      nickname: s.nickname ?? undefined,
      contactInfo: s.contactInfo ?? undefined,
      bandwidthRate: s.bandwidthRate,
      bandwidthBurst: s.bandwidthBurst,
      accountingMax: s.accountingMax ?? undefined,
    }
  },

  async ({ effects, input }) => {
    if (input.bandwidthBurst < input.bandwidthRate)
      throw new Error(
        i18n('Bandwidth Burst must be at least the Bandwidth Rate.'),
      )
    await storeJson.merge(effects, {
      configured: true,
      mode: input.mode,
      nickname: input.nickname,
      contactInfo: input.contactInfo || null,
      bandwidthRate: input.bandwidthRate,
      bandwidthBurst: input.bandwidthBurst,
      accountingMax: input.accountingMax ?? null,
    })
  },
)
