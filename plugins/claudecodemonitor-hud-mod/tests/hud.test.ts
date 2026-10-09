import { test, expect, mock } from 'claude-code/testing'

// `model` may be a function, for a test that switches the session's model.
function world(on: any, settings: Record<string, unknown>, model: string | (() => string) = 'claude-opus-5-5') {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, {})
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd ?? '/tmp' }))
  on('session.model', () => ({ value: typeof model === 'function' ? model() : model }))
  on('settings.read', () => ({ value: settings }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.render', ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }))
  return clock as any
}


async function mount($: any) {
  return $.ui.mount({
    plugin: 'claudecodemonitor-hud-mod',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { bodyColumns: 200 } as any,
  })
}

// The band's line as one string.
async function band($: any) {
  const ui = await mount($)
  return ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text).join('')
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
  const line = await band($)
  expect(line).toContain(' ◆ Opus 5.5 ')
  expect(line).toContain(' (Haiku)')
  expect(line).toContain('▱▱▱▱▱ —')
  expect(line).toContain(' (default)')
  expect(line).toContain('Fable · 0 calls')
})

test('colors the model pill by family and grays the config value', async ($, on) => {
  world(on, { model: 'haiku' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = (await (await mount($)).findAll({ type: 'Text' })) as any[]
  expect(texts.find(t => t.text === ' ◆ Opus 5.5 ')?.props?.backgroundColor).toBe('magenta')
  expect(texts.find(t => t.text === ' (Haiku)')?.props?.dimColor).toBe(true)
})

test('takes the effort and advisor calls from main-loop requests only', async ($, on) => {
  world(on, { model: 'opus', effortLevel: 'high', advisorModel: 'fable' })
  engineSteps(on, [1, 3])
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await step($, 'xhigh')
  await step($, 'low', 'subagent-1')
  const line = await band($)
  expect(line).toContain(' ◆ Opus 5.5  (Opus)')
  expect(line).toContain('▰▰▰▰▱ xhigh (high)')
  expect(line).not.toContain(' low')
  expect(line).toContain(' · 1 call')
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
  expect(await band($)).toContain('▰▰▰▱▱ high (high)')
})

test('catches settings that land just after /effort', async ($, on) => {
  const settings: Record<string, unknown> = { effortLevel: 'medium' }
  const clock = world(on, settings)
  on('command.run', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await $.command.run({ command: 'effort', args: 'low' } as any)
  settings.effortLevel = 'low'
  await clock.advance(300)
  expect(await band($)).toContain('▰▱▱▱▱ low (low)')
})

test('re-reads when a settings file changes', async ($, on) => {
  const settings: Record<string, unknown> = { effortLevel: 'medium' }
  world(on, settings)
  on('classic.ConfigChange', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  settings.effortLevel = 'max'
  await ($ as any).classic.ConfigChange({ hook_event_name: 'ConfigChange', source: 'user_settings' })
  expect(await band($)).toContain('▰▰▰▰▰ max (max)')
})

test('reads the effort /effort saves for the session model', async ($, on) => {
  world(on, { effortLevel: 'high', modelSettings: { 'claude-opus-5-5': { effortLevel: 'medium' }, 'claude-fable-5-1': { effortLevel: 'max' } } })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  expect(await band($)).toContain(' medium (medium)')
})

test('keeps the session effort across a model switch', async ($, on) => {
  let model = 'claude-opus-5-5'
  const settings = { modelSettings: { 'claude-opus-5-5': { effortLevel: 'xhigh' }, 'claude-fable-5-1': { effortLevel: 'high' } } }
  const clock = world(on, settings, () => model)
  on('command.run', () => {
    model = 'claude-fable-5-1'
    return {}
  })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  expect(await band($)).toContain('▰▰▰▰▱ xhigh (xhigh)')
  await $.command.run({ command: 'model', args: 'fable' } as any)
  await clock.advance(300)
  const line = await band($)
  expect(line).toContain(' ◆ Fable 5.1 ')
  expect(line).toContain('▰▰▰▰▱ xhigh (high)')
})

test('shows /effort <level> the moment it runs', async ($, on) => {
  world(on, {})
  on('command.run', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await $.command.run({ command: 'effort', args: 'low' } as any)
  expect(await band($)).toContain('▰▱▱▱▱ low')
})

test('shows the configured effort before the first request', async ($, on) => {
  world(on, { effortLevel: 'medium' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const line = await band($)
  expect(line).toContain('▰▰▱▱▱ medium')
  expect(line).not.toContain('—')
})

test('draws the same line in the Desktop app', async ($, on) => {
  world(on, { model: 'haiku', advisorModel: 'fable' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const ui = await $.ui.mount({ plugin: 'claudecodemonitor-hud-mod', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 200 } as any })
  const line = ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text).join('')
  expect(line).toContain(' ◆ Opus 5.5 ')
  expect(line).toContain('Fable')
})

test('shows the advisor as off when no advisor model is set', async ($, on) => {
  world(on, {})
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const line = await band($)
  expect(line).toContain('advisor off')
  expect(line).toContain(' (default)')
})