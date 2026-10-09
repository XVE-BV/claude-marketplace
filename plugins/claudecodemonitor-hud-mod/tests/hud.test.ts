import { test, expect, mock } from 'claude-code/testing'

function world(on: any, settings: Record<string, unknown>, model = 'claude-opus-5-5') {
  const clock = mock.clock(on, { now: 0 })
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd ?? '/tmp' }))
  on('session.model', () => ({ value: model }))
  on('settings.read', () => ({ value: settings }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.render', ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }))
  return clock as any
}

async function band($: any) {
  const ui = await $.ui.mount({
    plugin: 'claudecodemonitor-hud-mod',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { bodyColumns: 200 } as any,
  })
  return ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text)
}

// The engine's answers to the requests, in order: each with this many advisor calls.
function engineSteps(on: any, advisorCalls: number[]) {
  let call = 0
  on('turn.step', async function* () {
    const n = advisorCalls[call++] ?? 0
    const serverToolUses = Array.from({ length: n }, (_, i) => ({ id: `a${i}`, name: 'advisor', input: {}, startedAt: 0, endedAt: 1 }))
    return { turnId: 't', index: 0, answer: '', toolUses: [], serverToolUses, stopReason: 'end_turn', usage: null }
  })
}

// One request through the plugins and the engine.
async function step($: any, effort: string | undefined, agentId?: string) {
  const stream = $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort, messageCount: 2, agentId })
  for await (const _ of stream) {
  }
}

test('shows session and config values before any request', async ($, on) => {
  world(on, { model: 'haiku', advisorModel: 'fable' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = await band($)
  expect(texts).toContain('opus-5-5')
  expect(texts).toContain(' · config haiku')
  expect(texts).toContain('—')
  expect(texts).toContain(' · config default')
  expect(texts).toContain('fable')
  expect(texts).toContain(' · 0 calls')
})

test('takes the effort and advisor calls from main-loop requests only', async ($, on) => {
  world(on, { model: 'opus', effortLevel: 'high', advisorModel: 'fable' })
  engineSteps(on, [1, 3])
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await step($, 'xhigh')
  await step($, 'low', 'subagent-1')
  const texts = await band($)
  expect(texts).toContain('xhigh')
  expect(texts).not.toContain('low')
  expect(texts).toContain(' · config high')
  expect(texts).toContain(' · 1 call')
})

test('re-reads the effort as soon as /effort is done', async ($, on) => {
  const settings: Record<string, unknown> = { effortLevel: 'medium' }
  world(on, settings)
  on('command.run', () => {
    settings.effortLevel = 'high'
    return {}
  })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await $.command.run({ command: 'effort', args: 'high' } as any)
  const texts = await band($)
  expect(texts).toContain('high')
  expect(texts).toContain(' · config high')
})

test('catches settings that land just after /effort', async ($, on) => {
  const settings: Record<string, unknown> = { effortLevel: 'medium' }
  const clock = world(on, settings)
  on('command.run', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await $.command.run({ command: 'effort', args: 'low' } as any)
  settings.effortLevel = 'low'
  await clock.advance(300)
  const texts = await band($)
  expect(texts).toContain('low')
  expect(texts).toContain(' · config low')
})

test('re-reads when a settings file changes', async ($, on) => {
  const settings: Record<string, unknown> = { effortLevel: 'medium' }
  world(on, settings)
  on('classic.ConfigChange', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  settings.effortLevel = 'max'
  await ($ as any).classic.ConfigChange({ hook_event_name: 'ConfigChange', source: 'user_settings' })
  const texts = await band($)
  expect(texts).toContain('max')
  expect(texts).toContain(' · config max')
})

test('shows the configured effort before the first request', async ($, on) => {
  world(on, { effortLevel: 'medium' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = await band($)
  expect(texts).toContain('medium')
  expect(texts).not.toContain('—')
})

test('shows the advisor as off when no advisor model is set', async ($, on) => {
  world(on, {})
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = await band($)
  expect(texts).toContain('off')
  expect(texts).toContain(' · config default')
})
