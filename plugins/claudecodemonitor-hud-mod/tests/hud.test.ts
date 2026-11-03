import { test, expect, mock } from 'claude-code/testing'

// How often the band was asked to redraw, for the tests that count redraws.
let invalidations = 0

// `model` may be a function, for a test that switches the session's model.
function world(on: any, settings: Record<string, unknown>, model: string | (() => string) = 'claude-opus-5-5') {
  invalidations = 0
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, {})
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd ?? '/tmp' }))
  on('session.model', () => ({ value: typeof model === 'function' ? model() : model }))
  on('settings.read', () => ({ value: settings }))
  on('ui.invalidate', () => {
    invalidations++
    return { value: undefined }
  })
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

// The engine's answer to each request.
function engineSteps(on: any) {
  on('turn.step', async function* () {
    return { turnId: 't', index: 0, answer: '', toolUses: [], serverToolUses: [], stopReason: 'end_turn', usage: null }
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
  expect(line).toContain(' opus 5.5 ')
  expect(line).toContain(' haiku')
  expect(line).toContain('effort  —')
  expect(line).toContain(' default')
  expect(line).toContain('fable ')
})

test('colors the model pill by family and boxes the config value', async ($, on) => {
  world(on, { model: 'haiku' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = (await (await mount($)).findAll({ type: 'Text' })) as any[]
  expect(texts.find(t => t.text === ' opus 5.5 ')?.props?.backgroundColor).toBe('magenta')
  const config = texts.find(t => t.text === ' haiku ')
  expect(config?.props?.backgroundColor).toBe('black')
  expect(config?.props?.color).toBe('white')
})

test('takes the effort from main-loop requests only', async ($, on) => {
  world(on, { model: 'opus', effortLevel: 'high', advisorModel: 'fable' })
  engineSteps(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await step($, 'xhigh')
  await step($, 'low', 'subagent-1')
  const line = await band($)
  expect(line).toContain(' opus 5.5   opus ')
  expect(line).toContain('effort  xhigh   high')
  expect(line).not.toContain(' low')
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
  expect(await band($)).toContain('effort  high   high')
})

test('catches settings that land just after /effort', async ($, on) => {
  const settings: Record<string, unknown> = { effortLevel: 'medium' }
  const clock = world(on, settings)
  on('command.run', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await $.command.run({ command: 'effort', args: 'low' } as any)
  settings.effortLevel = 'low'
  await clock.advance(300)
  expect(await band($)).toContain('effort  low   low')
})

test('draws a rule above the band in the composer border color', async ($, on) => {
  world(on, {})
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = (await (await mount($)).findAll({ type: 'Text' })) as any[]
  const rule = texts.find(t => t.props?.color === 'promptBorder')
  expect(rule?.text).toBe('─'.repeat(200))
})

test('draws the Sonnet badge in white on blue', async ($, on) => {
  world(on, {}, () => 'claude-sonnet-5-5')
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = (await (await mount($)).findAll({ type: 'Text' })) as any[]
  const badge = texts.find(t => t.text === ' sonnet 5.5 ')
  expect(badge?.props?.backgroundColor).toBe('blue')
  expect(badge?.props?.color).toBe('white')
})

test('boxes the effort and advisor like the model', async ($, on) => {
  world(on, { effortLevel: 'high', advisorModel: 'fable' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const texts = (await (await mount($)).findAll({ type: 'Text' })) as any[]
  const effort = texts.find(t => t.text === ' high ')
  expect(effort?.props?.backgroundColor).toBe('yellow')
  expect(effort?.props?.color).toBe('black')
  const advisor = texts.find(t => t.text === ' fable ')
  expect(advisor?.props?.backgroundColor).toBe('cyan')
  expect(advisor?.props?.color).toBe('white')
})

test('re-reads a settings file edited by hand within a second', async ($, on) => {
  const settings: Record<string, unknown> = { effortLevel: 'medium' }
  const clock = world(on, settings)
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  settings.effortLevel = 'max'
  await clock.advance(1000)
  expect(await band($)).toContain('effort  max   max')
})

test('reads the effort /effort saves for the session model', async ($, on) => {
  world(on, { effortLevel: 'high', modelSettings: { 'claude-opus-5-5': { effortLevel: 'medium' }, 'claude-fable-5-1': { effortLevel: 'max' } } })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  expect(await band($)).toContain(' medium   medium')
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
  expect(await band($)).toContain('effort  xhigh   xhigh')
  await $.command.run({ command: 'model', args: 'fable' } as any)
  await clock.advance(300)
  const line = await band($)
  expect(line).toContain(' fable 5.1 ')
  expect(line).toContain('effort  xhigh   high')
})

test('shows /effort <level> the moment it runs', async ($, on) => {
  world(on, {})
  on('command.run', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  await $.command.run({ command: 'effort', args: 'low' } as any)
  expect(await band($)).toContain('effort  low')
})

test('shows the configured effort before the first request', async ($, on) => {
  world(on, { effortLevel: 'medium' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const line = await band($)
  expect(line).toContain('effort  medium')
  expect(line).not.toContain('—')
})

test('draws the same line in the Desktop app', async ($, on) => {
  world(on, { model: 'haiku', advisorModel: 'fable' })
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const ui = await $.ui.mount({ plugin: 'claudecodemonitor-hud-mod', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 200 } as any })
  const line = ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text).join('')
  expect(line).toContain(' opus 5.5 ')
  expect(line).toContain('fable')
})

test('shows the advisor as off when no advisor model is set', async ($, on) => {
  world(on, {})
  await $.session.start({ source: 'startup', cwd: '/tmp' } as any)
  const line = await band($)
  expect(line).toContain('advisor off')
  expect(line).toContain(' default')
})

// The engine's git: `answer` gets the subcommand ("branch --show-current") and
// returns the run. Every call is kept.
type GitRun = { exitCode: number; stdout: string }
const GIT = ['git', '-C', '/repo', '--no-optional-locks']

function gitWorld(on: any, answer: (subcommand: string) => GitRun) {
  const calls: { argv: string[]; timeoutMs?: number }[] = []
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', (_$: any, e: any) => {
    calls.push({ argv: e.argv, timeoutMs: e.init?.timeoutMs })
    const run = answer(e.argv.slice(GIT.length).join(' '))
    return { value: { stderr: '', isStdoutTruncated: false, isStderrTruncated: false, ...run } }
  })
  return calls
}

const onBranch = (name: string) => (subcommand: string): GitRun =>
  subcommand === 'branch --show-current' ? { exitCode: 0, stdout: `${name}\n` } : { exitCode: 1, stdout: '' }

test('ends the first row with the branch: a dim glyph, the name in cyan', async ($, on) => {
  world(on, {})
  const calls = gitWorld(on, onBranch('feat/x'))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  const texts = (await (await mount($)).findAll({ type: 'Text' })) as any[]
  const line = texts.map(t => t.text).join('')
  expect(line).toContain('advisor off  ⎇ feat/x')
  // the branch belongs to the first row: it comes before the meters row
  expect(line.indexOf('⎇')).toBeLessThan(line.indexOf('ctx '))
  expect(texts.find(t => t.text === '  ⎇ ')?.props?.dimColor).toBe(true)
  expect(texts.find(t => t.text === 'feat/x')?.props?.color).toBe('cyan')
  // one run on a branch, by argv, with a timeout
  expect(calls.map(c => c.argv)).toEqual([[...GIT, 'branch', '--show-current']])
  expect(calls[0]!.timeoutMs).toBeGreaterThan(0)
  expect(calls[0]!.timeoutMs).toBeLessThanOrEqual(5000)
})

test('cuts a branch name over 35 characters to 34 plus an ellipsis', async ($, on) => {
  world(on, {})
  gitWorld(on, onBranch('feat/' + 'x'.repeat(60)))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain(`⎇ feat/${'x'.repeat(29)}…`)
  expect(await band($)).not.toContain('x'.repeat(30))
})

test('keeps a branch name of exactly 35 characters whole', async ($, on) => {
  world(on, {})
  const name = 'feat/' + 'y'.repeat(30)
  gitWorld(on, onBranch(name))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain(`⎇ ${name}`)
  expect(await band($)).not.toContain('…')
})

test('shows a detached HEAD as the short hash in parentheses', async ($, on) => {
  world(on, {})
  const calls = gitWorld(on, subcommand => ({ exitCode: 0, stdout: subcommand === 'branch --show-current' ? '\n' : 'abc1234\n' }))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain('advisor off  ⎇ (abc1234)')
  expect(calls.map(c => c.argv)).toEqual([[...GIT, 'branch', '--show-current'], [...GIT, 'rev-parse', '--short', 'HEAD']])
})

test('draws no branch outside a git repository', async ($, on) => {
  world(on, {})
  const calls = gitWorld(on, () => ({ exitCode: 128, stdout: '' }))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  const line = await band($)
  expect(line).not.toContain('⎇')
  expect(line).toContain('advisor off')
  // git said no: there is no hash to fall back to
  expect(calls).toHaveLength(1)
})

test('draws no branch, and throws nothing, when git gives no answer', async ($, on) => {
  world(on, {})
  // Nothing answers `process.run` here (the older tests above leave `session.cwd`
  // unanswered too, which rejects): either way the band simply has no branch.
  on('session.cwd', () => ({ value: '/repo' }))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  const line = await band($)
  expect(line).not.toContain('⎇')
  expect(line).toContain('advisor off')
})

test('drops a slow read that lands after a newer one', async ($, on) => {
  let branch = 'main'
  let slow = false
  let release = () => {}
  let isHeld = () => {}
  const held = new Promise<void>(resolve => (isHeld = resolve))
  const clock = world(on, {})
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', async () => {
    // git answers with the branch it found when it started
    const stdout = `${branch}\n`
    if (slow) {
      slow = false
      isHeld()
      await new Promise<void>(resolve => (release = resolve))
    }
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('command.run', () => ({}))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain('⎇ main')

  // the clock's look finds `old` and hangs on its way back
  branch = 'old'
  slow = true
  const look = clock.advance(3000)
  await held
  // meanwhile the branch moves on and a command reads it at once
  branch = 'new'
  await $.command.run({ command: 'worktree', args: '' } as any)

  // the old answer lands last and must not undo the new one
  release()
  await look
  expect(await band($)).toContain('⎇ new')
  expect(await band($)).not.toContain('⎇ old')
})

test('follows a branch switch within three seconds, redrawing only on a change', async ($, on) => {
  let branch = 'main'
  const clock = world(on, {})
  const calls = gitWorld(on, subcommand => onBranch(branch)(subcommand))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain('⎇ main')
  const drawn = invalidations
  const ran = calls.length

  // git is not spawned every second
  await clock.advance(2000)
  expect(calls.length).toBe(ran)
  // the same branch at the next look: git runs, nothing redraws
  await clock.advance(1000)
  expect(calls.length).toBe(ran + 1)
  expect(invalidations).toBe(drawn)

  // a switch made by a tool shows at the next look, with one redraw
  branch = 'feat/y'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 1)
  expect(await band($)).toContain('⎇ feat/y')
  expect(await band($)).not.toContain('⎇ main')

  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 1)
})

test('reads the branch again after a command, without waiting for the clock', async ($, on) => {
  let branch = 'main'
  world(on, {})
  gitWorld(on, subcommand => onBranch(branch)(subcommand))
  on('command.run', () => {
    branch = 'feat/z'
    return {}
  })
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain('⎇ main')
  await $.command.run({ command: 'worktree', args: '' } as any)
  expect(await band($)).toContain('⎇ feat/z')
})

test('draws the branch in the Desktop app too', async ($, on) => {
  world(on, {})
  gitWorld(on, onBranch('feat/x'))
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  const ui = await $.ui.mount({ plugin: 'claudecodemonitor-hud-mod', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 200 } as any })
  const line = ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text).join('')
  expect(line).toContain('advisor off  ⎇ feat/x')
})