import { FileHelper, T, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const HOUR = 3_600_000
const DAY = 24 * HOUR
/** Hourly buckets feed the 24 h and 7 d figures and the daily chart. */
const KEEP_HOURLY = 31 * DAY
/** Daily buckets feed the weekly and monthly charts and the all-time total. */
const KEEP_DAILY = 3 * 366 * DAY
/** A stopped service loses at most this much unsaved traffic. */
const FLUSH_MS = 5 * 60_000

const bucket = z.object({
  /** Start of the bucket, epoch ms (UTC). */
  t: z.number(),
  read: z.number(),
  written: z.number(),
  /** Highest rate seen in either direction, bytes/s. */
  peak: z.number(),
})

const shape = z.looseObject({
  /** First recorded sample, epoch ms. */
  since: z.number().nullable().catch(null),
  /** How many times Tor has started since `since`. */
  starts: z.number().catch(0),
  hourly: z.array(bucket).catch([]),
  daily: z.array(bucket).catch([]),
})

export type History = z.infer<typeof shape>
type Bucket = z.infer<typeof bucket>

/** Traffic history for the dashboard; survives restarts, unlike Tor's own counters. */
export const historyJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'history.json' },
  shape,
)

function add(
  list: Bucket[],
  t: number,
  read: number,
  written: number,
  rate: number,
) {
  const last = list[list.length - 1]
  if (last && last.t === t) {
    last.read += read
    last.written += written
    last.peak = Math.max(last.peak, rate)
  } else {
    list.push({ t, read, written, peak: rate })
  }
}

/**
 * Turns Tor's since-start traffic counters into persistent hourly and daily totals.
 * One instance per run of main; counters that go backwards mean Tor restarted.
 */
export class HistoryRecorder {
  private history: History | null = null
  private last: { at: number; read: number; written: number } | null = null
  private flushedAt = 0

  constructor(private readonly effects: T.Effects) {}

  async sample(read: number | null, written: number | null) {
    if (read === null || written === null) return
    const at = Date.now()
    const h = (this.history ??= (await historyJson.read().once()) ?? {
      since: null,
      starts: 0,
      hourly: [],
      daily: [],
    })
    h.since ??= at

    const last = this.last
    this.last = { at, read, written }
    let dRead = read
    let dWritten = written
    let rate = 0
    if (!last || read < last.read || written < last.written) {
      // A fresh Tor: its counters started at zero.
      h.starts++
    } else {
      dRead = read - last.read
      dWritten = written - last.written
      if (at > last.at)
        rate = (Math.max(dRead, dWritten) * 1000) / (at - last.at)
    }

    add(h.hourly, at - (at % HOUR), dRead, dWritten, rate)
    add(h.daily, at - (at % DAY), dRead, dWritten, rate)
    h.hourly = h.hourly.filter((b) => b.t > at - KEEP_HOURLY)
    h.daily = h.daily.filter((b) => b.t > at - KEEP_DAILY)

    if (at - this.flushedAt >= FLUSH_MS) {
      this.flushedAt = at
      await historyJson.write(this.effects, h)
    }
  }
}
