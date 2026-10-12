import { T } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { obfs4Port } from '../utils'
import { readBridgeLine, readFingerprint } from '../identity'

const single = (
  name: string,
  value: string,
  extra: { qr?: boolean; launchable?: boolean } = {},
): T.ActionResultMember => ({
  type: 'single',
  name,
  description: null,
  value,
  masked: false,
  copyable: true,
  qr: extra.qr ?? false,
  launchable: extra.launchable ?? null,
})

export const nodeInfo = sdk.Action.withoutInput(
  'node-info',

  async () => ({
    name: i18n('Node Info'),
    description: i18n(
      'Show the fingerprint, the Tor Metrics link, and in bridge mode the bridge line to share.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async () => {
    const s = await storeJson.read().once()
    const mode = s?.mode ?? 'relay'
    const fingerprint = await readFingerprint(mode)
    if (!s?.configured || !fingerprint)
      return {
        version: '1' as const,
        title: i18n('Node Info'),
        message: i18n(
          'Tor has not created an identity for this mode yet. Start the service first.',
        ),
        result: null,
      }

    // Tor Metrics lists bridges by their hashed fingerprint only.
    const metricsId =
      mode === 'bridge'
        ? await readFingerprint(mode, 'hashed-fingerprint')
        : fingerprint
    const members = [
      single(
        i18n('Mode'),
        mode === 'bridge' ? i18n('obfs4 bridge') : i18n('Non-exit relay'),
      ),
      single(i18n('Nickname'), s.nickname ?? ''),
      single(i18n('Fingerprint'), fingerprint),
      single(i18n('Public IPv4'), s.confirmedIp ?? ''),
    ]
    if (metricsId)
      members.push(
        single(
          i18n('Tor Metrics'),
          `https://metrics.torproject.org/rs.html#details/${metricsId}`,
          {
            launchable: true,
          },
        ),
      )

    if (mode === 'bridge') {
      const template = await readBridgeLine()
      if (template && s.confirmedIp)
        members.push(
          single(
            i18n('Bridge Line'),
            template
              .replace('Bridge ', '')
              .replace('<IP ADDRESS>', s.confirmedIp)
              .replace('<PORT>', String(obfs4Port))
              .replace('<FINGERPRINT>', fingerprint),
            { qr: true },
          ),
        )
    }

    return {
      version: '1' as const,
      title: i18n('Node Info'),
      message:
        mode === 'bridge'
          ? i18n(
              'Share the bridge line only with people you trust, or let the Tor Project distribute it. A new node takes a few hours to appear on Tor Metrics.',
            )
          : i18n('A new node takes a few hours to appear on Tor Metrics.'),
      result: { type: 'group' as const, value: members },
    }
  },
)
