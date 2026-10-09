import { test, expect, mock } from 'claude-code/testing'

import { addSample, bar, burnRate, runOut, sparkline, until, MINUTE, HOUR } from '../hooks/meters'

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

test('sparkline: eight buckets, newest on the right, scaled to the peak', async () => {
  const now = 100 * MINUTE
  const h = [
    // oldest bucket: 24 to 21 minutes ago
    { at: now - 23 * MINUTE, five: 0 },
    { at: now - 22 * MINUTE, five: 4 },
    { at: now - 2 * MINUTE, five: 10 },
    { at: now - MINUTE, five: 12 },
  ]
  const s = sparkline(h, now)
  expect(s.length).toBe(8)
  expect(s[0]).toBe('█')
  // a delta of 2 against a peak of 4: 3.5 of 7 rounds to the fifth bar
  expect(s[7]).toBe('▅')
  expect(s.slice(1, 7)).toBe('▁▁▁▁▁▁')
})

test('bar and countdown', async () => {
  expect(bar(0).length).toBe(24)
  expect(bar(100)).toBe('█'.repeat(24))
  expect(bar(50)).toBe('█'.repeat(12) + ' '.repeat(12))
  // 52% of 24 cells is 12.48: twelve full cells and four eighths
  expect(bar(52)).toBe('█'.repeat(12) + '▌' + ' '.repeat(11))
  const now = Date.UTC(2026, 9, 9, 12, 0)
  expect(until(new Date(now + 154 * MINUTE).toISOString(), now)).toBe('2h34')
  expect(until(new Date(now + 3 * 24 * HOUR + 2 * HOUR).toISOString(), now)).toBe('3d02h')
  expect(until(new Date(now - MINUTE).toISOString(), now)).toBe('')
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

test('the meters line: context bar, limits with reset, cost', async ($, on) => {
  world(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const text = await lines($)
  expect(text).toContain('ctx ' + '█'.repeat(11) + '▎')
  expect(text).toContain(' 47% of 1.0M · 530k left')
  expect(text).not.toContain('HANDOFF')
  expect(text).toContain('5h 21%')
  expect(text).toContain('→ 2h34')
  expect(text).toContain('7d 58%')
  expect(text).toContain('→ 3d00h')
  expect(text).toContain('$1.23')
})

test('the run-out verdict after a fast burn, and the handoff tag', async ($, on) => {
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
  expect(text).toContain('HANDOFF')
  expect(text).toContain('5h 61% 240.0%/h')
  expect(text).toContain('⚠ limit ')
  expect(text).not.toContain('7d')
})
