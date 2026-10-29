import { connect, Socket } from 'node:net'
import { sdk } from './sdk'
import { metricsPort, Mode, modeDir } from './utils'

/** Final reply lines (`250 OK`, `5xx ...`), one per command sent. */
const finalLines = (data: string) => (data.match(/^\d{3} /gm) ?? []).length

/**
 * One long-lived control connection per mode: Tor logs every new control
 * connection at notice level, so polling must not reconnect.
 */
export class ControlConnection {
  private socket: Socket | null = null
  private buf = ''
  private waiting: {
    finals: number
    resolve: (reply: string | null) => void
    timer: NodeJS.Timeout
  } | null = null
  private chain: Promise<unknown> = Promise.resolve()

  constructor(private readonly path: string) {}

  private fail() {
    const w = this.waiting
    this.waiting = null
    this.buf = ''
    this.socket?.destroy()
    this.socket = null
    if (w) {
      clearTimeout(w.timer)
      w.resolve(null)
    }
  }

  private exchange(text: string, finals: number): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(null)
      this.buf = ''
      this.waiting = {
        finals,
        resolve,
        timer: setTimeout(() => this.fail(), 5000),
      }
      this.socket.write(text)
    })
  }

  private async ensure(): Promise<boolean> {
    if (this.socket) return true
    const socket = await new Promise<Socket | null>((res) => {
      const s = connect(this.path)
      s.once('connect', () => res(s))
      s.once('error', () => res(null))
    })
    if (!socket) return false
    socket.on('data', (chunk) => {
      const w = this.waiting
      if (!w) return
      this.buf += chunk.toString()
      if (finalLines(this.buf) >= w.finals) {
        this.waiting = null
        clearTimeout(w.timer)
        w.resolve(this.buf)
      }
    })
    socket.on('error', () => this.fail())
    socket.on('close', () => this.fail())
    this.socket = socket
    const auth = await this.exchange('AUTHENTICATE\r\n', 1)
    if (!auth?.startsWith('250')) {
      this.fail()
      return false
    }
    return true
  }

  /** Drops the connection; the next send reconnects. */
  close() {
    this.fail()
  }

  /** Resolves null when Tor is not answering. */
  send(...commands: string[]): Promise<string | null> {
    const run = async () =>
      (await this.ensure())
        ? this.exchange(commands.join('\r\n') + '\r\n', commands.length)
        : null
    const reply = this.chain.then(run, run)
    this.chain = reply.catch(() => null)
    return reply
  }
}

const connections: Partial<Record<Mode, ControlConnection>> = {}
const send = (mode: Mode, ...commands: string[]) =>
  (connections[mode] ??= new ControlConnection(
    sdk.volumes.main.subpath(`${modeDir(mode)}/control.sock`),
  )).send(...commands)

export type NodeStatus = {
  version: string | null
  bootstrap: number | null
  /** Vacuously true until a descriptor exists; read with `published`. */
  reachable: boolean
  published: boolean
  uptimeSeconds: number | null
  bytesRead: number | null
  bytesWritten: number | null
  accountingEnabled: boolean
  accountingBytes: string | null
  accountingIntervalEnd: string | null
  /** Tor knows an IPv6 address to publish. */
  ipv6: boolean
  /** Flags and weight from the current consensus; null for a bridge or a relay not yet listed. */
  consensus: { flags: string[]; weight: number | null } | null
  /** From the MetricsPort; null when it does not answer. */
  load: RelayLoad | null
  /** `tor_relay_dos_total` by type, counted since Tor started. */
  dos: Record<string, number> | null
}

export type RelayLoad = {
  circuits: number
  orConnectionsIn: number
  orConnectionsOut: number
  orConnectionsRejected: number
  dirRequests: number
  onionskinsProcessed: number
  onionskinsDropped: number
  oomBytes: number
  rateLimitReached: number
  tcpExhaustion: number
}

type Sample = { name: string; labels: Record<string, string>; value: number }

const parseMetrics = (text: string): Sample[] =>
  text.split('\n').flatMap((line) => {
    const m = line.match(/^(\w+)(?:\{([^}]*)\})? (\S+)$/)
    if (!m) return []
    const labels = Object.fromEntries(
      [...(m[2] ?? '').matchAll(/(\w+)="([^"]*)"/g)].map((l) => [l[1], l[2]]),
    )
    return [{ name: m[1], labels, value: Number(m[3]) }]
  })

const total = (
  samples: Sample[],
  name: string,
  where: Record<string, string> = {},
) =>
  samples
    .filter(
      (s) =>
        s.name === name &&
        Object.entries(where).every(([k, v]) => s.labels[k] === v),
    )
    .reduce((sum, s) => sum + s.value, 0)

async function readMetrics(): Promise<Sample[] | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${metricsPort}/metrics`, {
      signal: AbortSignal.timeout(5000),
    })
    return res.ok ? parseMetrics(await res.text()) : null
  } catch {
    return null
  }
}

const relayLoad = (m: Sample[]): RelayLoad => {
  const or = (direction: string) =>
    total(m, 'tor_relay_connections', {
      type: 'OR',
      direction,
      state: 'opened',
    })
  return {
    circuits: total(m, 'tor_relay_circuits_total', { state: 'opened' }),
    orConnectionsIn: or('received'),
    orConnectionsOut: or('initiated'),
    orConnectionsRejected: total(m, 'tor_relay_connections_total', {
      type: 'OR',
      state: 'rejected',
    }),
    dirRequests: total(m, 'tor_relay_streams_total', { type: 'BEGIN_DIR' }),
    onionskinsProcessed: total(m, 'tor_relay_load_onionskins_total', {
      action: 'processed',
    }),
    onionskinsDropped: total(m, 'tor_relay_load_onionskins_total', {
      action: 'dropped',
    }),
    oomBytes: total(m, 'tor_relay_load_oom_bytes_total'),
    rateLimitReached: total(
      m,
      'tor_relay_load_global_rate_limit_reached_total',
    ),
    tcpExhaustion: total(m, 'tor_relay_load_tcp_exhaustion_total'),
  }
}

const dosCounters = (m: Sample[]) =>
  Object.fromEntries(
    m
      .filter((s) => s.name === 'tor_relay_dos_total' && s.labels.type)
      .map((s) => [s.labels.type, s.value]),
  )

/** Parses the `s` (flags) and `w` (weight) lines of a `GETINFO ns/id/…` reply. */
function consensusEntry(reply: string | null) {
  if (!reply?.startsWith('250+')) return null
  const flags = reply.match(/^s (.*)$/m)
  const weight = reply.match(/^w Bandwidth=(\d+)/m)
  return {
    flags: flags ? flags[1].trim().split(' ') : [],
    weight: weight ? Number(weight[1]) : null,
  }
}

const num = (reply: string, key: string) => {
  const m = reply.match(new RegExp(`${key}=(\\d+)`))
  return m ? Number(m[1]) : null
}
const str = (reply: string, key: string) => {
  const m = reply.match(new RegExp(`${key}="?([^"\\r\\n]*)"?`))
  return m ? m[1] : null
}

export async function probe(mode: Mode): Promise<NodeStatus | null> {
  const r = await send(
    mode,
    'GETINFO version',
    'GETINFO status/bootstrap-phase',
    'GETINFO status/reachability-succeeded/or',
    'GETINFO status/accepted-server-descriptor',
    'GETINFO uptime',
    'GETINFO traffic/read',
    'GETINFO traffic/written',
    'GETINFO accounting/enabled',
    'GETINFO accounting/bytes',
    'GETINFO accounting/interval-end',
    'GETINFO address/v6',
    'GETINFO fingerprint',
  )
  if (r === null || !/^250/m.test(r)) return null
  const boot = r.match(/BOOTSTRAP PROGRESS=(\d+)/)
  const fingerprint = str(r, 'fingerprint')
  const [ns, metrics] = await Promise.all([
    mode === 'relay' && fingerprint
      ? send(mode, `GETINFO ns/id/${fingerprint}`)
      : null,
    readMetrics(),
  ])
  return {
    version: str(r, 'version'),
    bootstrap: boot ? Number(boot[1]) : null,
    reachable: /status\/reachability-succeeded\/or=1/.test(r),
    published: /status\/accepted-server-descriptor=1/.test(r),
    uptimeSeconds: num(r, 'uptime'),
    bytesRead: num(r, 'traffic/read'),
    bytesWritten: num(r, 'traffic/written'),
    accountingEnabled: /accounting\/enabled=1/.test(r),
    accountingBytes: str(r, 'accounting/bytes'),
    accountingIntervalEnd: str(r, 'accounting/interval-end'),
    ipv6: /address\/v6=\S/.test(r),
    consensus: consensusEntry(ns),
    load: metrics && relayLoad(metrics),
    dos: metrics && dosCounters(metrics),
  }
}
