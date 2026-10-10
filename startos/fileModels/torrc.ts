import { FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/** Rendered from store.json by main; never parsed back. */
export const torrcFile = FileHelper.string({
  base: sdk.volumes.main,
  subpath: 'torrc',
})

/** Read by the dashboard. */
export const statusFile = FileHelper.string({
  base: sdk.volumes.main,
  subpath: 'status.json',
})
