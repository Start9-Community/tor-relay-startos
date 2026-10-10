import { sdk } from '../sdk'
import { configureNode } from './configureNode'
import { confirmPublicIp } from './confirmPublicIp'
import { exportIdentity, importIdentity } from './identity'
import { nodeInfo } from './nodeInfo'

export const actions = sdk.Actions.of()
  .addAction(configureNode)
  .addAction(confirmPublicIp)
  .addAction(nodeInfo)
  .addAction(importIdentity)
  .addAction(exportIdentity)
