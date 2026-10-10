import { connect, Socket } from 'node:net'

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
