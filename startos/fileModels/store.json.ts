import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  /** Set by Configure Node. The service does not start before it. */
  configured: z.boolean().catch(false),
  mode: z.enum(['relay', 'bridge']).catch('relay'),
  nickname: z.string().nullable().catch(null),
  contactInfo: z.string().nullable().catch(null),
  /** KBytes per second. */
  bandwidthRate: z.number().catch(1024),
  bandwidthBurst: z.number().catch(2048),
  /** GBytes per month in each direction; null disables accounting. */
  accountingMax: z.number().nullable().catch(null),
  /** The public IPv4 the user confirmed. Tor runs only while it matches the ORPort's public address. */
  confirmedIp: z.string().nullable().catch(null),
})

export type Store = z.infer<typeof shape>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'store.json' },
  shape,
)
