import { Store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { PortExposure } from './exposure'

/** Why Tor must not start, or null when it may. */
export function blocker(
  store: Store | null,
  or: PortExposure | null,
  obfs4: PortExposure | null,
): string | null {
  if (!store?.configured || !store.nickname)
    return i18n('Run Configure Node first.')
  const ips = or?.ipv4 ?? []
  if (ips.length === 0)
    return i18n(
      'No public IPv4 is enabled on the Tor ORPort interface. Enable one, then run Confirm Public IP.',
    )
  if (ips.length > 1)
    return i18n(
      'More than one public IPv4 is enabled on the Tor ORPort interface. Keep exactly one.',
    )
  if (!store.confirmedIp) return i18n('Run Confirm Public IP.')
  if (ips[0] !== store.confirmedIp)
    return i18n(
      'The public IPv4 changed from ${old} to ${new}. Tor stays stopped until you run Confirm Public IP.',
      { old: store.confirmedIp, new: ips[0] },
    )
  if (
    store.mode === 'bridge' &&
    !(obfs4?.ipv4 ?? []).includes(store.confirmedIp)
  )
    return i18n(
      'Bridge mode: enable ${ip} on the obfs4 Bridge Port interface as well.',
      {
        ip: store.confirmedIp,
      },
    )
  return null
}
