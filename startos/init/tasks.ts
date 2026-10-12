import { configureNode } from '../actions/configureNode'
import { confirmPublicIp } from '../actions/confirmPublicIp'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { orExposure, singleIp } from '../utils'

const confirmTaskId = 'tor-relay:confirm-public-ip'

/**
 * Both tasks are critical, so StartOS keeps the service stopped while either is open.
 * The IP task re-arms whenever the ORPort's public IPv4 stops matching the confirmed one.
 */
export const watchTasks = sdk.setupOnInit(async (effects) => {
  const configured = await storeJson.read((s) => s.configured).const(effects)
  if (configured) {
    await sdk.action.clearTask(effects, 'tor-relay:configure-node')
  } else {
    await sdk.action.createOwnTask(effects, configureNode, 'critical', {
      reason: i18n('Choose relay or bridge mode and name your node.'),
    })
  }

  const confirmed = await storeJson.read((s) => s.confirmedIp).const(effects)
  const detected = singleIp(await orExposure(effects).const())

  // A match clears the task outright: StartOS does not re-run an
  // input-not-matches check when only the address comes back, as after a restore.
  if (detected && detected === confirmed) {
    await sdk.action.clearTask(effects, confirmTaskId)
    return
  }

  await sdk.action.createOwnTask(effects, confirmPublicIp, 'critical', {
    reason: detected
      ? i18n('Confirm ${ip} as the public IPv4 this node advertises.', {
          ip: detected,
        })
      : i18n(
          'Enable exactly one public IPv4 on the Tor ORPort interface, then confirm it here.',
        ),
    input: {
      kind: 'partial',
      accept: [{ ip: detected ?? '' }],
      set: detected ? { ip: detected } : {},
    },
    when: { condition: 'input-not-matches', once: false },
    replayId: confirmTaskId,
  })
})
