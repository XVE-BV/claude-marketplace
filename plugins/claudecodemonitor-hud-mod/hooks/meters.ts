// The meters line: context bar, 5h and 7d limits with burn rate and run-out
// verdict, session cost. Pure functions over readings; register.ts feeds them.

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Sample = { at: number; five?: number; seven?: number }
export type Reading = { tokens?: number; window: number; percent?: number; rateLimits: Limit[]; costUsd?: number }

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
// Burn rate over the last ten minutes of samples, which reacts within a few
// renders; the whole-window average would hide a sudden burst.
export const RATE_SPAN = 10 * MINUTE
// One sample per 20 s at most, and the sparkline's eight 3-minute buckets.
export const SAMPLE_GAP = 20_000
export const SPARK_BUCKETS = 8
export const SPARK_BUCKET_MS = 3 * MINUTE
export const KEEP_MS = SPARK_BUCKETS * SPARK_BUCKET_MS + RATE_SPAN

export const BAR_CELLS = 24
export const CONTEXT_WARN = 60
export const CONTEXT_HANDOFF = 85

// Appends a sample unless the last one is too recent, and drops what is older
// than the sparkline's span. Returns the new history.
export function addSample(history: Sample[], sample: Sample): Sample[] {
  const last = history[history.length - 1]
  if (last && sample.at - last.at < SAMPLE_GAP) return history
  return [...history, sample].filter(s => sample.at - s.at <= KEEP_MS)
}

// Percent per hour over the last RATE_SPAN, from the oldest sample inside
// it to the newest; undefined with fewer than two samples or no movement.
export function burnRate(history: Sample[], key: 'five' | 'seven', now: number): number | undefined {
  const recent = history.filter(s => now - s.at <= RATE_SPAN && s[key] !== undefined)
  const first = recent[0]
  const last = recent[recent.length - 1]
  if (!first || !last || first === last || last.at === first.at) return undefined
  const delta = (last[key] as number) - (first[key] as number)
  if (delta <= 0) return 0
  return (delta * HOUR) / (last.at - first.at)
}

// When usage reaches 100% at this rate, as a time; undefined when it won't
// move or the window resets first.
export function runOut(used: number, rate: number | undefined, resetsAt: string | undefined, now: number): number | undefined {
  if (!rate || rate <= 0 || used >= 100) return undefined
  const at = now + ((100 - used) / rate) * HOUR
  const reset = resetsAt ? Date.parse(resetsAt) : NaN
  return Number.isFinite(reset) && at >= reset ? undefined : at
}

// Eight 3-minute buckets of 5h-quota deltas, newest on the right, as bars.
export function sparkline(history: Sample[], now: number): string {
  const deltas: number[] = []
  for (let i = SPARK_BUCKETS - 1; i >= 0; i--) {
    const end = now - i * SPARK_BUCKET_MS
    const inBucket = history.filter(s => s.five !== undefined && s.at > end - SPARK_BUCKET_MS && s.at <= end)
    const first = inBucket[0]
    const last = inBucket[inBucket.length - 1]
    deltas.push(first && last ? Math.max(0, (last.five as number) - (first.five as number)) : 0)
  }
  const peak = Math.max(...deltas)
  const bars = '▁▂▃▄▅▆▇█'
  return deltas.map(d => (peak > 0 ? bars[Math.min(7, Math.round((d / peak) * 7))] : '▁')).join('')
}

// A bar of BAR_CELLS cells with eighth-cell resolution on the last filled one.
export function bar(percent: number, cells = BAR_CELLS): string {
  const eighths = Math.round((Math.min(100, Math.max(0, percent)) / 100) * cells * 8)
  const full = Math.floor(eighths / 8)
  const partial = eighths % 8
  const partials = ' ▏▎▍▌▋▊▉'
  return '█'.repeat(full) + (partial > 0 ? partials[partial] : '') + ' '.repeat(cells - full - (partial > 0 ? 1 : 0))
}

export const contextColor = (percent: number) => (percent >= CONTEXT_HANDOFF ? 'red' : percent >= CONTEXT_WARN ? 'yellow' : 'green')

export const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

// "2h34" / "14h54" / "3d02h" until a time; "" when it is past or unknown.
export function until(iso: string | undefined, now: number): string {
  const at = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(at) || at <= now) return ''
  const minutes = Math.round((at - now) / MINUTE)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h >= 48) return `${Math.floor(h / 24)}d${String(h % 24).padStart(2, '0')}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

export function clock(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
