import type { HealthCheckResult } from '@start9labs/start-sdk/lib/health/checkFns/HealthCheckResult'
import { statusFile, torrcFile } from './fileModels/torrc'
import { storeJson } from './fileModels/store.json'
import { HistoryRecorder } from './fileModels/history.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { dataMount, modeDir, uiPort } from './utils'
import { NodeStatus, probe } from './control'
import { obfs4Exposure, orExposure } from './utils'
import { blocker } from './utils'
import { renderTorrc } from './fileModels/torrc'

/** Tor first warns of an unreachable ORPort this long after starting. */
const SELF_TEST_MS = 20 * 60_000
/** Tor drops an unreachable IPv6 ORPort only at a later 20-minute check, after IPv4 passes. */
const SELF_TEST_WITH_IPV6_MS = 45 * 60_000

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Tor Relay!'))

  const store = await storeJson.read().const(effects)
  const or = await orExposure(effects).const()
  const obfs4 =
    store?.mode === 'bridge' ? await obfs4Exposure(effects).const() : null

  const sub = sdk.SubContainer.of(
    effects,
    { imageId: 'tor' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: dataMount,
      readonly: false,
    }),
    'tor-sub',
  )

  const writeStatus = (status: NodeStatus | null, block: string | null) =>
    statusFile.write(
      effects,
      JSON.stringify({
        updated: new Date().toISOString(),
        mode: store?.mode ?? null,
        nickname: store?.nickname ?? null,
        address: store?.confirmedIp ?? null,
        blocked: block,
        /** KBytes/s per direction, as in the torrc. */
        bandwidthRate: store?.bandwidthRate ?? null,
        bandwidthBurst: store?.bandwidthBurst ?? null,
        tor: status,
      }),
    )

  const daemons = sdk.Daemons.of(effects).addDaemon('dashboard', {
    subcontainer: sub,
    exec: {
      command: [
        'busybox-extras',
        'httpd',
        '-f',
        '-p',
        String(uiPort),
        '-h',
        '/www',
      ],
    },
    ready: {
      display: i18n('Dashboard'),
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, uiPort, {
          successMessage: i18n('The dashboard is ready'),
          errorMessage: i18n('The dashboard is not ready'),
        }),
    },
    requires: [],
  })

  const block = blocker(store, or, obfs4)
  if (block || !store?.nickname || !store.confirmedIp) {
    await writeStatus(null, block)
    return daemons.addHealthCheck('setup', {
      ready: {
        display: i18n('Node Setup'),
        // The result only changes when main restarts, so check once.
        gracePeriod: 0,
        trigger: async function* () {
          yield
        },
        fn: async (): Promise<HealthCheckResult> => ({
          result: 'failure',
          message: block ?? i18n('Run Configure Node first.'),
        }),
      },
      requires: [],
    })
  }

  const mode = store.mode
  const ip = store.confirmedIp
  await torrcFile.write(
    effects,
    renderTorrc({
      mode,
      nickname: store.nickname,
      contactInfo: store.contactInfo,
      bandwidthRate: store.bandwidthRate,
      bandwidthBurst: store.bandwidthBurst,
      accountingMax: store.accountingMax,
      address: ip,
      assignedOrPort: or?.assignedPort ?? null,
      ipv6: or?.ipv6 ?? false,
    }),
  )

  const dir = `${dataMount}/${modeDir(mode)}`
  let latest: NodeStatus | null = null
  const history = new HistoryRecorder(effects)
  let unreachableSince: number | null = null

  return daemons
    .addOneshot('prepare', {
      subcontainer: sub,
      exec: {
        command: [
          'sh',
          '-c',
          `mkdir -p ${dir} && chown -R tor:tor ${dir} && chmod 700 ${dir} && chmod 644 ${dataMount}/torrc`,
        ],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('tor', {
      subcontainer: sub,
      exec: { command: ['tor', '-f', `${dataMount}/torrc`], user: 'tor' },
      ready: {
        display: i18n('Tor'),
        fn: async (): Promise<HealthCheckResult> => {
          latest = await probe(mode)
          await writeStatus(latest, null)
          if (latest)
            await history.sample(latest.bytesRead, latest.bytesWritten)
          if (!latest)
            return { result: 'starting', message: i18n('Waiting for Tor') }
          if ((latest.bootstrap ?? 0) < 100)
            return {
              result: 'loading',
              message: i18n('Bootstrapping ${pct}%', {
                pct: latest.bootstrap ?? 0,
              }),
            }
          return {
            result: 'success',
            message: i18n('Connected to the Tor network'),
          }
        },
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 2_000,
          waiting: 2_000,
          loading: 2_000,
          failure: 5_000,
        }),
      },
      requires: ['prepare'],
    })
    .addHealthCheck('reachability', {
      ready: {
        display: i18n('Reachability'),
        fn: async (): Promise<HealthCheckResult> => {
          if (!latest)
            return { result: 'loading', message: i18n('Waiting for Tor') }
          if (latest.reachable && latest.published) {
            unreachableSince = null
            return {
              result: 'success',
              message: i18n('Reachable at ${ip} and published', { ip }),
            }
          }
          unreachableSince ??= Date.now()
          if (
            Date.now() - unreachableSince <
            (latest.ipv6 ? SELF_TEST_WITH_IPV6_MS : SELF_TEST_MS)
          )
            return {
              result: 'loading',
              message: i18n(
                'Tor is testing whether the ORPort is reachable from the internet',
              ),
            }
          return {
            result: 'failure',
            message: i18n(
              'Tor could not reach ${ip} from the internet. Check the port forward on your gateway.',
              { ip },
            ),
          }
        },
        trigger: sdk.trigger.cooldownTrigger(30_000),
      },
      requires: ['tor'],
    })
})
