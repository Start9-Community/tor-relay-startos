import { utils } from '@start9labs/start-sdk'
import type { Effects } from '@start9labs/start-sdk/lib/types'
import { sdk } from '../sdk'
import { obfs4HostId, obfs4Port, orHostId, orPort } from './index'

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

export const orExposure = (effects: Effects) =>
  sdk.host.getOwn(effects, orHostId, exposureOf(orHostId, orPort))

export const obfs4Exposure = (effects: Effects) =>
  sdk.host.getOwn(effects, obfs4HostId, exposureOf(obfs4HostId, obfs4Port))

/** The single public IPv4 on the ORPort, or null when there is none or more than one. */
export const singleIp = (e: PortExposure | null) =>
  e && e.ipv4.length === 1 ? e.ipv4[0] : null
