// Run: node --test test/*.test.js
const { test, before } = require('node:test')
const assert = require('node:assert')
const { execSync } = require('node:child_process')
const net = require('node:net')
const { mkdtempSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const out = mkdtempSync(join(tmpdir(), 'tor-node-ctl-'))
let ControlConnection
before(() => {
  execSync(
    `npx tsc --outDir ${out} --module commonjs --target es2021 --skipLibCheck --ignoreConfig --types node startos/utils/controlConnection.ts`,
    { stdio: 'inherit' },
  )
  ;({ ControlConnection } = require(join(out, 'controlConnection.js')))
})

/** A minimal stand-in for Tor's control port: one reply per line, values split across chunks. */
function fakeTor(sockPath, { silentAfter = Infinity } = {}) {
  const state = { connections: 0, lines: 0, sockets: [] }
  const server = net.createServer((s) => {
    state.connections++
    state.sockets.push(s)
    let buf = ''
    let out = Promise.resolve()
    const send = (text) => {
      out = out
        .then(() => s.write(text.slice(0, 5)))
        .then(() => new Promise((r) => setTimeout(r, 5)))
        .then(() => s.write(text.slice(5)))
    }
    s.on('data', (d) => {
      buf += d.toString()
      let i
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i)
        buf = buf.slice(i + 2)
        if (++state.lines > silentAfter) continue
        if (line === 'AUTHENTICATE') send('250 OK\r\n')
        else if (line.startsWith('GETINFO ')) {
          const key = line.slice(8)
          send(`250-${key}=1\r\n250 OK\r\n`)
        } else send('510 Unrecognized command\r\n')
      }
    })
  })
  return new Promise((r) => server.listen(sockPath, () => r({ server, state })))
}

test('reuses one connection across many probes', async () => {
  const p = join(mkdtempSync(join(tmpdir(), 's-')), 'c.sock')
  const { server, state } = await fakeTor(p)
  const c = new ControlConnection(p)
  const replies = await Promise.all(
    [1, 2, 3, 4, 5].map(() => c.send('GETINFO version', 'GETINFO uptime')),
  )
  for (const r of replies) {
    assert.match(r, /version=1/)
    assert.match(r, /uptime=1/)
    assert.equal((r.match(/^\d{3} /gm) || []).length, 2)
  }
  assert.equal(state.connections, 1)
  c.close()
  state.sockets.forEach((s) => s.destroy())
  server.close()
})

test('resolves null when Tor is not there, then reconnects once it is', async () => {
  const p = join(mkdtempSync(join(tmpdir(), 's-')), 'c.sock')
  const c = new ControlConnection(p)
  assert.equal(await c.send('GETINFO version'), null)
  const { server, state } = await fakeTor(p)
  assert.match(await c.send('GETINFO version'), /version=1/)
  assert.equal(state.connections, 1)
  c.close()
  state.sockets.forEach((s) => s.destroy())
  server.close()
})

test('reconnects after Tor restarts', async () => {
  const p = join(mkdtempSync(join(tmpdir(), 's-')), 'c.sock')
  const first = await fakeTor(p)
  const c = new ControlConnection(p)
  assert.match(await c.send('GETINFO version'), /version=1/)
  first.state.sockets.forEach((s) => s.destroy())
  await new Promise((r) => first.server.close(r))
  await new Promise((r) => setTimeout(r, 20))
  const second = await fakeTor(p)
  assert.match(await c.send('GETINFO uptime'), /uptime=1/)
  assert.equal(second.state.connections, 1)
  c.close()
  second.state.sockets.forEach((s) => s.destroy())
  second.server.close()
})

test('times out a silent Tor instead of hanging', async () => {
  const p = join(mkdtempSync(join(tmpdir(), 's-')), 'c.sock')
  const { server, state } = await fakeTor(p, { silentAfter: 1 })
  const c = new ControlConnection(p)
  const t0 = Date.now()
  assert.equal(await c.send('GETINFO version'), null)
  assert.ok(Date.now() - t0 >= 4900)
  c.close()
  state.sockets.forEach((s) => s.destroy())
  server.close()
})
