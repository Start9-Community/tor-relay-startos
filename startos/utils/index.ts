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
