import { test, expect, mock } from 'claude-code/testing'

import { addSample, burnRate, handoff, paceArrow, paceBar, resetLabel, runOut, MINUTE, HOUR } from '../hooks/meters'

test('burn rate: percent per hour over the last ten minutes', async () => {
  const now = 100 * MINUTE
  let h = addSample([], { at: now - 10 * MINUTE, five: 20 })
  h = addSample(h, { at: now - 5 * MINUTE, five: 22 })
  h = addSample(h, { at: now, five: 25 })
  // 5 points in 10 minutes = 30 %/h
  expect(burnRate(h, 'five', now)).toBe(30)
  // one sample: no rate; samples 10 s apart: only the first is kept
  expect(burnRate([{ at: now, five: 25 }], 'five', now)).toBeUndefined()
  expect(addSample(h, { at: now + 10_000, five: 26 })).toBe(h)
})

test('run-out: before the reset is a verdict, after it is nothing', async () => {
  const now = Date.UTC(2026, 9, 9, 12, 0)
  const resetsAt = new Date(now + 2 * HOUR).toISOString()
  // 40% used at 40 %/h: 100% in 1.5 h, before the 2 h reset
  expect(runOut(40, 40, resetsAt, now)).toBe(now + 1.5 * HOUR)
  // at 20 %/h it takes 3 h: the window resets first
  expect(runOut(40, 20, resetsAt, now)).toBeUndefined()
  expect(runOut(40, 0, resetsAt, now)).toBeUndefined()
  expect(runOut(40, undefined, resetsAt, now)).toBeUndefined()
})

test('pace bar: used, the gap to the time elapsed, the rest', async () => {
  const now = Date.UTC(2026, 9, 9, 12, 0)
  // 5h window with 2h34 left: 49% of it elapsed, 3 of 6 cells
  const resets = new Date(now + 154 * MINUTE).toISOString()
  const behind = paceBar(21, 'five_hour', resets, now)
  expect(behind.used + behind.gap + behind.rest).toBe('━╍╍───')
  expect(behind.color).toBe('green')
  expect(behind.ahead).toBe(false)
  // 75% used at 49% elapsed: ahead by more than 15 points, the gap in red
  const ahead = paceBar(75, 'five_hour', resets, now)
  expect(ahead.used + ahead.gap + ahead.rest).toBe('━━━╍╍─')
  expect(ahead.color).toBe('red')
  expect(ahead.ahead).toBe(true)
  // a little ahead: yellow
  expect(paceBar(55, 'five_hour', resets, now).color).toBe('yellow')
  // past 90% is red whatever the clock says
  expect(paceBar(92, 'seven_day', new Date(now + HOUR).toISOString(), now).color).toBe('red')
})

test('pace arrow against the sustainable rate (20 %/h for 5h)', async () => {
  expect(paceArrow(31, 'five_hour')?.arrow).toBe('↑')
  expect(paceArrow(31, 'five_hour')?.color).toBe('red')
  expect(paceArrow(23, 'five_hour')?.arrow).toBe('↗')
  expect(paceArrow(15, 'five_hour')?.arrow).toBe('→')
  expect(paceArrow(5, 'five_hour')?.arrow).toBe('↘')
  expect(paceArrow(0, 'five_hour')).toBeUndefined()
  // 7d: 100% over 168 h is about 0.6 %/h
  expect(paceArrow(1, 'seven_day')?.arrow).toBe('↑')
})

test('reset label and handoff banner, as the old HUD wrote them', async () => {
  const now = new Date(2026, 9, 9, 12, 0).getTime()
  expect(resetLabel(new Date(2026, 9, 9, 14, 20).toISOString(), now)).toBe('resets 14:20')
  expect(resetLabel(new Date(2026, 9, 16, 9, 0).toISOString(), now)).toBe('resets Fri 09:00')
  expect(resetLabel(undefined, now)).toBe('')
  expect(handoff(40, 50)).toBeUndefined()
  expect(handoff(55, 35)?.text).toBe('● handoff')
  expect(handoff(62, 0)?.text).toBe('● handoff')
  expect(handoff(86, 0)?.text).toBe('● handoff NOW: auto-compact imminent')
})

const USAGE = {
  startedAt: 0,
  context: { tokens: 470_000, window: 1_000_000, percent: 47 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 21, resetsAt: new Date(154 * MINUTE).toISOString() },
    { kind: 'seven_day', percentUsed: 58, resetsAt: new Date(3 * 24 * HOUR).toISOString() },
  ],
  cost: { usd: 1.23 },
}

function world(on: any) {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, {})
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd ?? '/tmp' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({ value: {} }))
  on('session.usage', () => ({ value: USAGE }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.render', ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }))
  return clock as any
}

async function lines($: any) {
  const ui = await $.ui.mount({ plugin: 'claudecodemonitor-hud-mod', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 200 } as any })
  return ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text).join('')
}

test('the meters line: context, limits against the clock, cost', async ($, on) => {
  world(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const text = await lines($)
  expect(text).toContain('ctx ━━━─── 47% of 1M · 530k safe')
  expect(text).not.toContain('handoff')
  expect(text).toContain(` │ 5h ▸ ━╍╍─── 21% · ${resetLabel(USAGE.rateLimits[0]!.resetsAt, 0)}`)
  expect(text).toContain(` │ 7d ▸ ━━━─── 58% · ${resetLabel(USAGE.rateLimits[1]!.resetsAt, 0)}`)
  expect(text).toContain(' · $1.23')
})

test('the meters line draws in the Desktop app too', async ($, on) => {
  world(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const ui = await $.ui.mount({ plugin: 'claudecodemonitor-hud-mod', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 120 } as any })
  const text = ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text).join('')
  expect(text).toContain('47% of 1M · 530k safe')
  expect(text).toContain('5h ▸ ')
})

test('the run-out verdict after a fast burn, and the handoff banner', async ($, on) => {
  const clock = world(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  // 21% -> 61% in 10 minutes: 240 %/h, 100% in under 10 minutes, long before the reset
  await clock.advance(10 * MINUTE)
  await $.session.measure({
    context: { tokens: 900_000, window: 1_000_000, percent: 90 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 61, resetsAt: USAGE.rateLimits[0]!.resetsAt }],
    changed: ['context', 'rateLimits'],
  } as any)
  const text = await lines($)
  expect(text).toContain('● handoff NOW: auto-compact imminent')
  expect(text).toContain('5h ▸ ━━━╍── 61% ↑240.0%/h ⚠ limit ~')
  expect(text).toContain(' before reset')
  expect(text).not.toContain('7d')
})
