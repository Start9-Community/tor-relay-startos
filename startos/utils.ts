import { T, utils } from '@start9labs/start-sdk'
import { Store } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const uiPort = 80
export const orPort = 9001
export const obfs4Port = 8443

export const orHostId = 'or-multi'
export const obfs4HostId = 'obfs4-multi'

export type Mode = 'relay' | 'bridge'

/** Where the `main` volume is mounted inside the subcontainer. */
export const dataMount = '/data'

/** Tor's DataDirectory for a mode, relative to the `main` volume. One identity per mode. */
export const modeDir = (mode: Mode) => mode

export const lyrebirdPath = '/usr/bin/lyrebird'

const octets = (ip: string) => ip.split('.').map(Number)

export function isIpv4(ip: string): boolean {
  const o = octets(ip)
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) &&
    o.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  )
}

/** Private, loopback, link-local, CGNAT, multicast and reserved ranges. */
export function isNonPublicIpv4(ip: string): boolean {
  const [a, b] = octets(ip)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  )
}

export type PortExposure = {
  /** Public IPv4 addresses the user enabled on this binding, deduplicated. */
  ipv4: string[]
  ipv6: boolean
  /** External port StartOS assigned to the binding. */
  assignedPort: number | null
}

const none: PortExposure = { ipv4: [], ipv6: false, assignedPort: null }

function exposureOf(hostId: string, internalPort: number) {
  return (
    host: Parameters<typeof utils.filledAddress>[0] | null,
  ): PortExposure => {
    const binding = host?.bindings[internalPort]
    if (!host || !binding) return none
    const publicAddrs = utils
      .filledAddress(host, {
        hostId,
        internalPort,
        username: null,
        scheme: null,
        sslScheme: null,
        suffix: '',
      })
      .filter({ visibility: 'public' })
    return {
      ipv4: [
        ...new Set(
          publicAddrs.filter({ kind: 'ipv4' }).hostnames.map((h) => h.hostname),
        ),
      ],
      ipv6: publicAddrs.filter({ kind: 'ipv6' }).hostnames.length > 0,
      assignedPort: binding.net.assignedPort ?? null,
    }
  }
}

export const orExposure = (effects: T.Effects) =>
  sdk.host.getOwn(effects, orHostId, exposureOf(orHostId, orPort))

export const obfs4Exposure = (effects: T.Effects) =>
  sdk.host.getOwn(effects, obfs4HostId, exposureOf(obfs4HostId, obfs4Port))

/** The single public IPv4 on the ORPort, or null when there is none or more than one. */
export const singleIp = (e: PortExposure | null) =>
  e && e.ipv4.length === 1 ? e.ipv4[0] : null

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
  if (store.mode === 'bridge') {
    if (!(obfs4?.ipv4 ?? []).includes(store.confirmedIp))
      return i18n(
        'Bridge mode: enable ${ip} on the obfs4 Bridge Port interface as well.',
        { ip: store.confirmedIp },
      )
    // lyrebird advertises the port it listens on, so a remapped port would publish an unreachable bridge line.
    if (obfs4?.assignedPort != null && obfs4.assignedPort !== obfs4Port)
      return i18n(
        'Bridge mode: the obfs4 Bridge Port must be reachable on port ${port}, but StartOS assigned ${assigned}.',
        { port: obfs4Port, assigned: obfs4.assignedPort },
      )
  }
  return null
}
