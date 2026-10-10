// Run: node --test test/*.test.js  (compiles the pure modules first)
const { test, before } = require('node:test')
const assert = require('node:assert')
const { execSync } = require('node:child_process')
const {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
} = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const out = mkdtempSync(join(tmpdir(), 'tor-node-test-'))
let torrc, utils, archive
before(() => {
  execSync(
    `npx tsc --outDir ${out} --module commonjs --target es2021 --skipLibCheck --ignoreConfig --types node startos/utils/index.ts startos/utils/torrc.ts startos/utils/archive.ts`,
    { stdio: 'inherit' },
  )
  torrc = require(join(out, 'torrc.js'))
  utils = require(join(out, 'index.js'))
  archive = require(join(out, 'archive.js'))
})

const base = {
  mode: 'relay',
  nickname: 'WSOSrelay',
  contactInfo: 'Bitcoin@ruxal.de',
  bandwidthRate: 200,
  bandwidthBurst: 512,
  accountingMax: null,
  address: '51.68.216.223',
  assignedOrPort: 9001,
  ipv6: false,
}

test('relay torrc is non-exit, onion-free and advertises the confirmed IP', () => {
  const t = torrc.renderTorrc(base)
  for (const l of [
    'DataDirectory /data/relay',
    'SocksPort 0',
    'Nickname WSOSrelay',
    'ContactInfo Bitcoin@ruxal.de',
    'Address 51.68.216.223',
    'ORPort 9001 IPv4Only',
    'ExitRelay 0',
    'ExitPolicy reject *:*',
    'RelayBandwidthRate 200 KBytes',
    'RelayBandwidthBurst 512 KBytes',
  ])
    assert.ok(t.split('\n').includes(l), `missing: ${l}\n${t}`)
  assert.doesNotMatch(t, /HiddenService|BridgeRelay|Accounting|SocksPort [^0]/)
})

test('bridge torrc uses its own DataDirectory and lyrebird', () => {
  const t = torrc.renderTorrc({
    ...base,
    mode: 'bridge',
    accountingMax: 500,
    ipv6: true,
  })
  for (const l of [
    'DataDirectory /data/bridge',
    'BridgeRelay 1',
    'ORPort 9001',
    'ServerTransportPlugin obfs4 exec /usr/bin/lyrebird',
    'ServerTransportListenAddr obfs4 0.0.0.0:8443',
    'ExtORPort auto',
    'AccountingMax 500 GBytes',
  ])
    assert.ok(t.split('\n').includes(l), `missing: ${l}\n${t}`)
})

test('a remapped external ORPort is advertised with NoListen', () => {
  const t = torrc.renderTorrc({ ...base, assignedOrPort: 19001 })
  assert.ok(
    t.includes(
      'ORPort 19001 NoListen IPv4Only\nORPort 9001 NoAdvertise IPv4Only',
    ),
  )
})

test('public IPv4 classification', () => {
  for (const ip of ['51.68.216.223', '203.0.113.10', '8.8.8.8'])
    assert.ok(utils.isIpv4(ip) && !utils.isNonPublicIpv4(ip), ip)
  for (const ip of [
    '10.0.3.1',
    '192.168.188.58',
    '100.64.1.2',
    '172.16.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '192.0.0.2',
  ])
    assert.ok(utils.isNonPublicIpv4(ip), ip)
  for (const ip of ['1.2.3', '256.1.1.1', 'a.b.c.d', '1.2.3.4.5'])
    assert.ok(!utils.isIpv4(ip), ip)
})

const fakeIdentity = () => ({
  secret_id_key: Buffer.from(
    '-----BEGIN RSA PRIVATE KEY-----\nMIIC\n-----END RSA PRIVATE KEY-----\n',
  ),
  ed25519_master_id_secret_key: Buffer.concat([
    Buffer.from('== ed25519v1-secret: type0 ==\0\0\0'),
    Buffer.alloc(64, 7),
  ]),
})

test('identity archive round-trips', () => {
  const id = fakeIdentity()
  const back = archive.readArchive(archive.writeArchive(id))
  assert.deepStrictEqual(back.secret_id_key, id.secret_id_key)
  assert.deepStrictEqual(
    back.ed25519_master_id_secret_key,
    id.ed25519_master_id_secret_key,
  )
})

test('reads an archive made with tar czf, like the StartOS export', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tor-id-'))
  mkdirSync(join(dir, 'keys'))
  const id = fakeIdentity()
  writeFileSync(join(dir, 'keys/secret_id_key'), id.secret_id_key)
  writeFileSync(
    join(dir, 'keys/ed25519_master_id_secret_key'),
    id.ed25519_master_id_secret_key,
  )
  execSync(
    `tar czf ${dir}/id.tgz -C ${dir} keys/secret_id_key keys/ed25519_master_id_secret_key`,
  )
  const back = archive.readArchive(readFileSync(join(dir, 'id.tgz')))
  assert.deepStrictEqual(
    back.ed25519_master_id_secret_key,
    id.ed25519_master_id_secret_key,
  )
  // and our own export extracts with system tar
  writeFileSync(join(dir, 'ours.tgz'), archive.writeArchive(id))
  mkdirSync(join(dir, 'x'))
  execSync(`tar xzf ${dir}/ours.tgz -C ${dir}/x`)
  assert.deepStrictEqual(
    readFileSync(join(dir, 'x/keys/secret_id_key')),
    id.secret_id_key,
  )
})

test('rejects an archive without both keys', () => {
  const id = fakeIdentity()
  id.ed25519_master_id_secret_key = Buffer.alloc(10)
  assert.throws(() => archive.readArchive(archive.writeArchive(id)), /ed25519/)
})

const obfs4State = () =>
  Buffer.from(
    JSON.stringify({
      'node-id': 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
      'private-key': '00'.repeat(32),
      'public-key': '11'.repeat(32),
      'drbg-seed': '22'.repeat(24),
      'iat-mode': 0,
    }),
  )

test('bridge archive carries obfs4 state through a round trip', () => {
  const id = { ...fakeIdentity(), obfs4State: obfs4State() }
  const back = archive.readArchive(archive.writeArchive(id))
  assert.deepStrictEqual(back.obfs4State, id.obfs4State)
  assert.deepStrictEqual(back.secret_id_key, id.secret_id_key)
})

test('relay archive stays without obfs4 state', () => {
  const back = archive.readArchive(archive.writeArchive(fakeIdentity()))
  assert.equal(back.obfs4State, undefined)
})

test('rejects a broken obfs4 state file', () => {
  const id = { ...fakeIdentity(), obfs4State: Buffer.from('{"iat-mode":0}') }
  assert.throws(() => archive.readArchive(archive.writeArchive(id)), /node-id/)
  id.obfs4State = Buffer.from('not json')
  assert.throws(() => archive.readArchive(archive.writeArchive(id)), /JSON/)
})

test('reads obfs4 state from a tar czf of a Tor DataDirectory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tor-br-'))
  mkdirSync(join(dir, 'keys'))
  mkdirSync(join(dir, 'pt_state'))
  const id = fakeIdentity()
  writeFileSync(join(dir, 'keys/secret_id_key'), id.secret_id_key)
  writeFileSync(
    join(dir, 'keys/ed25519_master_id_secret_key'),
    id.ed25519_master_id_secret_key,
  )
  writeFileSync(join(dir, 'pt_state/obfs4_state.json'), obfs4State())
  execSync(`tar czf ${dir}/b.tgz -C ${dir} keys pt_state/obfs4_state.json`)
  const back = archive.readArchive(readFileSync(join(dir, 'b.tgz')))
  assert.deepStrictEqual(back.obfs4State, obfs4State())
})
