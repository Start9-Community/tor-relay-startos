import { i18n } from './i18n'
import { sdk } from './sdk'
import { obfs4HostId, obfs4Port, orHostId, orPort, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const uiOrigin = await sdk.MultiHost.of(effects, 'ui-multi').bindPort(
    uiPort,
    {
      protocol: 'http',
    },
  )
  const ui = sdk.createInterface(effects, {
    name: i18n('Dashboard'),
    id: 'ui',
    description: i18n(
      'Mode, fingerprint, reachability and traffic of this node',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })
  const uiReceipt = await uiOrigin.export([ui])

  // Tor's OR protocol is TLS it negotiates itself, so the port is passed through as is.
  const orOrigin = await sdk.MultiHost.of(effects, orHostId).bindPort(orPort, {
    protocol: null,
    preferredExternalPort: orPort,
    addSsl: null,
    secure: { ssl: false },
  })
  const orReceipt = await orOrigin.export([
    sdk.createInterface(effects, {
      name: i18n('Tor ORPort'),
      id: 'or',
      description: i18n(
        'Where the Tor network reaches this node. Enable exactly one public IPv4 here, for example through a StartTunnel gateway; Tor will not start without it.',
      ),
      type: 'p2p',
      masked: false,
      schemeOverride: null,
      username: null,
      path: '',
      query: {},
    }),
  ])

  const obfs4Origin = await sdk.MultiHost.of(effects, obfs4HostId).bindPort(
    obfs4Port,
    {
      protocol: null,
      preferredExternalPort: obfs4Port,
      addSsl: null,
      secure: { ssl: false },
    },
  )
  const obfs4Receipt = await obfs4Origin.export([
    sdk.createInterface(effects, {
      name: i18n('obfs4 Bridge Port'),
      id: 'obfs4',
      description: i18n(
        'Where censored users reach this node in bridge mode. Enable the same public IPv4 as on the ORPort. Unused in relay mode.',
      ),
      type: 'p2p',
      masked: false,
      schemeOverride: null,
      username: null,
      path: '',
      query: {},
    }),
  ])

  return [uiReceipt, orReceipt, obfs4Receipt]
})
