import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { isIpv4, isNonPublicIpv4 } from '../utils'
import { orExposure } from '../utils/exposure'

const { InputSpec, Value } = sdk

export const confirmSpec = InputSpec.of({
  ip: Value.text({
    name: i18n('Public IPv4'),
    description: i18n(
      'The public IPv4 enabled on the Tor ORPort interface. Tor advertises it in the directory and runs only while it stays the same.',
    ),
    required: true,
    default: null,
    placeholder: '203.0.113.10',
    patterns: [
      {
        regex: '^\\d{1,3}(\\.\\d{1,3}){3}$',
        description: i18n('An IPv4 address'),
      },
    ],
  }),
  permanent: Value.toggle({
    name: i18n('This address is static'),
    description: i18n(
      'A relay builds its reputation on a stable address. Confirm it will not change, for example a VPS IP routed to this server through StartTunnel.',
    ),
    default: false,
  }),
})

export const confirmPublicIp = sdk.Action.withInput(
  'confirm-public-ip',

  async () => ({
    name: i18n('Confirm Public IP'),
    description: i18n(
      'Confirm the public IPv4 this node advertises. Needed on first setup and whenever the address changes.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  confirmSpec,

  async () => {
    const ip = await storeJson.read((s) => s.confirmedIp).once()
    return ip ? { ip, permanent: true } : {}
  },

  async ({ effects, input }) => {
    const exposure = await orExposure(effects).once()
    const ips = exposure?.ipv4 ?? []
    if (ips.length === 0)
      throw new Error(
        i18n(
          'No public IPv4 is enabled on the Tor ORPort interface. Enable one on its Interfaces page, for example through your StartTunnel gateway, then run this again.',
        ),
      )
    if (ips.length > 1)
      throw new Error(
        i18n(
          'More than one public IPv4 is enabled on the Tor ORPort interface (${ips}). Keep exactly one.',
          {
            ips: ips.join(', '),
          },
        ),
      )
    if (!isIpv4(input.ip) || isNonPublicIpv4(input.ip))
      throw new Error(
        i18n('${ip} is not a public IPv4 address.', { ip: input.ip }),
      )
    if (input.ip !== ips[0])
      throw new Error(
        i18n(
          'The Tor ORPort interface is reachable at ${detected}, not ${ip}. Enter ${detected}.',
          {
            detected: ips[0],
            ip: input.ip,
          },
        ),
      )
    if (!input.permanent)
      throw new Error(i18n('Confirm that the address is static to continue.'))

    await storeJson.merge(effects, { confirmedIp: input.ip })

    return {
      version: '1' as const,
      title: i18n('Public IP Confirmed'),
      message: i18n(
        'Tor Node will advertise ${ip}. Start the service if it is stopped.',
        {
          ip: input.ip,
        },
      ),
      result: null,
    }
  },
)
