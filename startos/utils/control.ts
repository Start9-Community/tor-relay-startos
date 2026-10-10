import { connect } from 'node:net'
import { sdk } from '../sdk'
import { Mode, modeDir } from './index'

/** Resolves null when the socket is absent or silent. */
function send(mode: Mode, ...commands: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = connect(
      sdk.volumes.main.subpath(`${modeDir(mode)}/control.sock`),
    )
    let data = ''
    socket.setTimeout(5000)
    socket.on('connect', () => {
      socket.write(['AUTHENTICATE', ...commands, 'QUIT', ''].join('\r\n'))
    })
    socket.on('data', (chunk) => {
      data += chunk.toString()
    })
    socket.on('end', () => resolve(data))
    socket.on('error', () => resolve(null))
    socket.on('timeout', () => {
      socket.destroy()
      resolve(null)
    })
  })
}

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
  )
  if (r === null || !/^250/m.test(r)) return null
  const boot = r.match(/BOOTSTRAP PROGRESS=(\d+)/)
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
  }
}
