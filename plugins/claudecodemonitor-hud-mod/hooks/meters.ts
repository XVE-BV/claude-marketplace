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
// One sample per 20 s at most, kept twice as long as the rate looks back.
export const SAMPLE_GAP = 20_000
export const KEEP_MS = 2 * RATE_SPAN

export const CONTEXT_WARN = 60
export const CONTEXT_HANDOFF = 85

// Appends a sample unless the last one is too recent, and drops what is older
// than KEEP_MS. Returns the new history.
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

export const SPANS: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }
export const PACE_CELLS = 6
export const PACE_ALERT = 15

export type PaceBar = { used: string; gap: string; rest: string; color: string; ahead: boolean }

// A limit against the clock, after token-weather-usage: `━` what is used,
// `╍` the gap between usage and the time elapsed in the window, `─` the rest.
// Behind the clock the gap is dim; ahead of it, it takes the bar's color.
// Green while usage keeps behind time, yellow ahead, red more than 15 points
// ahead or past 90%.
export function paceBar(percentUsed: number, kind: string, resetsAt: string | undefined, now: number, cells = PACE_CELLS): PaceBar {
  const span = SPANS[kind]
  const reset = resetsAt ? Date.parse(resetsAt) : NaN
  const elapsedPct = span && Number.isFinite(reset) ? Math.min(100, Math.max(0, (100 * (span - (reset - now))) / span)) : percentUsed
  const toCells = (p: number) => Math.min(cells, Math.max(0, Math.round((p / 100) * cells)))
  const used = toCells(percentUsed)
  const elapsed = toCells(elapsedPct)
  const ahead = percentUsed > elapsedPct
  const color = percentUsed >= 90 || percentUsed - elapsedPct > PACE_ALERT ? 'red' : ahead ? 'yellow' : 'green'
  const low = Math.min(used, elapsed)
  const high = Math.max(used, elapsed)
  return { used: '━'.repeat(low), gap: '╍'.repeat(high - low), rest: '─'.repeat(cells - high), color, ahead }
}

// The burn rate against the pace that would spend the whole window exactly by
// its reset (100% over 5 h is 20 %/h), as the old status-line HUD drew it:
// ↑ red past 1.5×, ↗ amber past 1.1×, → plain past 0.5×, ↘ dim below.
export function paceArrow(rate: number | undefined, kind: string): { arrow: string; color?: string; dim?: boolean } | undefined {
  const span = SPANS[kind]
  if (rate === undefined || rate <= 0 || !span) return undefined
  const sustainable = 100 / (span / HOUR)
  if (rate > sustainable * 1.5) return { arrow: '↑', color: 'red' }
  if (rate > sustainable * 1.1) return { arrow: '↗', color: 'yellow' }
  if (rate > sustainable * 0.5) return { arrow: '→' }
  return { arrow: '↘', dim: true }
}

// "resets 14:20" today, "resets Fri 09:00" on another day; "" when unknown.
export function resetLabel(iso: string | undefined, now: number): string {
  const at = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(at)) return ''
  const sameDay = new Date(at).toDateString() === new Date(now).toDateString()
  const day = new Date(at).toLocaleDateString('en-US', { weekday: 'short' })
  return `resets ${sameDay ? '' : `${day} `}${clock(at)}`
}

// The old HUD's handoff banner: soon from 60% (or 50% on a hot 5h burn), now from 85%.
export function handoff(percent: number, fiveHourRate: number | undefined): { text: string; color: string; bold?: boolean } | undefined {
  if (percent >= CONTEXT_HANDOFF) return { text: '● handoff NOW: auto-compact imminent', color: 'red', bold: true }
  if (percent >= CONTEXT_WARN) return { text: '● handoff', color: 'yellow' }
  if (percent >= 50 && (fiveHourRate ?? 0) > 30) return { text: '● handoff', color: 'yellow' }
  return undefined
}

export const contextColor = (percent: number) => (percent >= CONTEXT_HANDOFF ? 'red' : percent >= CONTEXT_WARN ? 'yellow' : 'green')

export const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

export function clock(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
