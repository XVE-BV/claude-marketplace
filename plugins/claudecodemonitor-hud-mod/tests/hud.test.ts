import { test, expect, mock } from 'claude-code/testing'

// How often the band was asked to redraw, for the tests that count redraws.
let invalidations = 0
// The clock of the test's world. The branch is looked up unawaited, so a test
// lets a look that is under way finish (`clockNow.settle()`) before it reads
// the band; `mount` does so.
let clockNow: any
// A redraw asked for after this many milliseconds on the clock is refused (it
// rejects): infinity, a redraw is never refused.
let refuseRedrawAfter = Infinity

// `model` may be a function, for a test that switches the session's model.
function world(on: any, settings: Record<string, unknown>, model: string | (() => string) = 'claude-opus-5-5') {
  invalidations = 0
  refuseRedrawAfter = Infinity
  const clock = mock.clock(on, { now: 0 })
  clockNow = clock
  mock.store(on, {})
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd ?? '/tmp' }))
  on('session.model', () => ({ value: typeof model === 'function' ? model() : model }))
  on('settings.read', () => ({ value: settings }))
  on('ui.invalidate', () => {
    invalidations++
    return clock.now() > refuseRedrawAfter ? { deny: 'redraw refused' } : { value: undefined }
  })
  on('ui.render', ($: any, e: any) => $.ui.resolve(e).Box({ children: [] }))
  return clock as any
}


async function mount($: any, columns = 200) {
  // a look that is under way finishes first
  await clockNow.settle()
  return $.ui.mount({
    plugin: 'claudecodemonitor-hud-mod',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { bodyColumns: columns } as any,
  })
}

// The band's line as one string.
async function band($: any) {
  const ui = await mount($)
  return ((await ui.findAll({ type: 'Text' })) as any[]).map(t => t.text).join('')
}

// The branch row's text: what follows the glyph on the first row, up to the
// meters row ('ctx ' starts it). undefined when the row draws no branch.
async function branchRow($: any) {
  const line = await band($)
  const from = line.indexOf('⎇ ')
  if (from < 0) return undefined
  const to = line.indexOf('ctx ', from)
  return line.slice(from + 2, to < 0 ? undefined : to)
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
// The one call that tells the kind of checkout, asked once per session folder.
const PROBE = ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir', '--show-superproject-working-tree']

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
  // the branch by argv with a timeout, then the one kind probe (this fake git does not know it)
  expect(calls.map(c => c.argv)).toEqual([[...GIT, 'branch', '--show-current'], [...GIT, ...PROBE]])
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
  // the kind probe follows the branch lookups, once
  expect(calls.map(c => c.argv)).toEqual([[...GIT, 'branch', '--show-current'], [...GIT, 'rev-parse', '--short', 'HEAD'], [...GIT, ...PROBE]])
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
  // the command does not wait for git: let its read finish before the old one lands
  await clock.settle()

  // the old answer lands last and must not undo the new one
  release()
  await look
  expect(await band($)).toContain('⎇ new')
  expect(await band($)).not.toContain('⎇ old')
})

test('follows a branch switch within three seconds, redrawing only on a change', async ($, on) => {
  let branch = 'main'
  const clock = world(on, {})
  // the kind probe is answered (a plain repository): one that is not is asked again at every look
  const calls = gitWorld(on, subcommand => (subcommand === PROBE.join(' ') ? { exitCode: 0, stdout: `${PLAIN.join('\n')}\n` } : onBranch(branch)(subcommand)))
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

// ── what kind of checkout the folder is ──
// The line `rev-parse` prints for a plain repository, a linked worktree and a
// submodule, in the order the probe asks: toplevel, git dir, common dir, and a
// 4th line (the superproject) only inside a submodule.
const PLAIN = ['/work/repo', '/work/repo/.git', '/work/repo/.git']
const WORKTREE = ['/work/wt', '/work/repo/.git/worktrees/wt', '/work/repo/.git']
const SUBMODULE = ['/work/super/subm', '/work/super/.git/modules/subm', '/work/super/.git/modules/subm', '/work/super']
const MARKER = '.skyrift-workspace'

type Probe = string[] | 'fail' | 'timeout'
type Folder = { branch: string; sha?: string; probe: Probe | (() => Probe); markers?: string[] | 'unreadable' }

// Folders by path: what git answers in each, and which marker files exist. The
// session folder is `state.cwd`; `probes` keeps the folder of every kind probe
// and `looked` every marker path asked about. `slow` makes git answer `slow.ms`
// late, for the subcommand `slow.on` or, unset, for every one. `state.down`
// makes every git run reject, as a timeout does; a probe may time out too.
function folderWorld(on: any, folders: Record<string, Folder>, cwd: string, slow: { ms: number | ((subcommand: string) => number); on?: string } = { ms: 0 }) {
  const state = { cwd, down: false, isCwdDown: false }
  const probes: string[] = []
  const looked: string[] = []
  const calls: { argv: string[]; timeoutMs?: number }[] = []
  on('session.cwd', () => (state.isCwdDown ? { deny: 'no folder' } : { value: state.cwd }))
  on('command.run', () => ({}))
  // `flight` counts the git runs under way and keeps the most there ever were at once
  const flight = { now: 0, max: 0 }
  on('process.run', async (_$: any, e: any) => {
    calls.push({ argv: e.argv, timeoutMs: e.init?.timeoutMs })
    flight.now++
    flight.max = Math.max(flight.max, flight.now)
    try {
      return await answer(e)
    } finally {
      flight.now--
    }
  })
  const answer = async (e: any) => {
    const folder = folders[e.argv[2]]
    const subcommand = e.argv.slice(4).join(' ')
    const done = (run: GitRun) => ({ value: { stderr: '', isStdoutTruncated: false, isStderrTruncated: false, ...run } })
    const lateBy = typeof slow.ms === 'function' ? slow.ms(subcommand) : slow.ms
    if (lateBy > 0 && (slow.on === undefined || slow.on === subcommand)) await clockNow.sleep(lateBy)
    if (state.down) return { deny: 'timed out' }
    if (!folder) return done({ exitCode: 128, stdout: '' })
    if (subcommand === 'branch --show-current') return done({ exitCode: 0, stdout: folder.branch === '' ? '\n' : `${folder.branch}\n` })
    if (subcommand === 'rev-parse --short HEAD') return done({ exitCode: 0, stdout: `${folder.sha ?? 'abc1234'}\n` })
    if (subcommand === PROBE.join(' ')) {
      probes.push(e.argv[2])
      const probe = typeof folder.probe === 'function' ? folder.probe() : folder.probe
      if (probe === 'timeout') return { deny: 'timed out' }
      return probe === 'fail' ? done({ exitCode: 128, stdout: '' }) : done({ exitCode: 0, stdout: `${probe.join('\n')}\n` })
    }
    return done({ exitCode: 1, stdout: '' })
  }
  on('fs.exists', (_$: any, e: any) => {
    looked.push(e.path)
    if (Object.values(folders).some(f => f.markers === 'unreadable')) return { deny: 'EACCES' }
    return { value: Object.values(folders).some(f => Array.isArray(f.markers) && f.markers.includes(e.path)) }
  })
  return { state, probes, looked, calls, flight }
}

test('says skyrift and the folder name after the branch: a dim dot, the kind in yellow, the name dim', async ($, on) => {
  world(on, {})
  const folders = { '/repo': { branch: 'feat/x', probe: PLAIN, markers: [`/work/repo/${MARKER}`] } }
  const { calls, looked } = folderWorld(on, folders, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  const texts = (await (await mount($)).findAll({ type: 'Text' })) as any[]
  expect(texts.map(t => t.text).join('')).toContain('advisor off  ⎇ feat/x · skyrift repo')
  expect(texts.find(t => t.text === 'feat/x')?.props?.color).toBe('cyan')
  expect(texts.find(t => t.text === ' · ')?.props?.dimColor).toBe(true)
  expect(texts.find(t => t.text === 'skyrift')?.props?.color).toBe('yellow')
  expect(texts.find(t => t.text === ' repo')?.props?.dimColor).toBe(true)
  // the marker is looked for at the toplevel git printed
  expect(looked).toEqual([`/work/repo/${MARKER}`])
  // one probe, by argv, with a timeout, after the branch
  expect(calls.map(c => c.argv)).toEqual([[...GIT, 'branch', '--show-current'], [...GIT, ...PROBE]])
  expect(calls[1]!.timeoutMs).toBeGreaterThan(0)
  expect(calls[1]!.timeoutMs).toBeLessThanOrEqual(5000)
})

test('says worktree for a linked worktree', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: 'main', probe: WORKTREE } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain('advisor off  ⎇ main · worktree wt')
})

test('says submodule for a submodule', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: 'main', probe: SUBMODULE } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain('advisor off  ⎇ main · submodule subm')
})

test('a skyrift marker wins over a worktree', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: 'main', probe: WORKTREE, markers: [`/work/wt/${MARKER}`] } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  const line = await band($)
  expect(line).toContain('⎇ main · skyrift wt')
  expect(line).not.toContain('worktree')
})

test('a plain repository shows the branch alone', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: 'feat/x', probe: PLAIN } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await branchRow($)).toBe('feat/x')
})

test('a detached HEAD keeps its hash and gets the kind too', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: '', probe: WORKTREE } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await band($)).toContain('advisor off  ⎇ (abc1234) · worktree wt')
})

test('keeps a folder name of exactly 35 characters whole', async ($, on) => {
  world(on, {})
  const edge = 'e'.repeat(35)
  folderWorld(on, { '/a': { branch: 'main', probe: [`/work/${edge}`, '/x/.git/worktrees/w', '/x/.git'] } }, '/a')
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(await band($)).toContain(`⎇ main · worktree ${edge}`)
  expect(await band($)).not.toContain('…')
})

test('cuts a folder name over 35 characters', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/b': { branch: 'main', probe: [`/work/${'n'.repeat(60)}`, '/x/.git/worktrees/w', '/x/.git'] } }, '/b')
  await $.session.start({ source: 'startup', cwd: '/b' } as any)
  expect(await band($)).toContain(`⎇ main · worktree ${'n'.repeat(34)}…`)
  expect(await band($)).not.toContain('n'.repeat(35))
})

test('any failure to learn the kind shows the branch alone and throws nothing', async ($, on) => {
  world(on, {})
  // git says no to the probe: the marker is not even looked for
  const { looked } = folderWorld(on, { '/repo': { branch: 'feat/x', probe: 'fail' } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await branchRow($)).toBe('feat/x')
  expect(looked).toEqual([])
})

test('a marker that cannot be read reads as no marker: the git-derived kind still shows', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: 'feat/x', probe: WORKTREE, markers: 'unreadable' } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await branchRow($)).toBe('feat/x · worktree wt')
})

test('a probe that prints too little shows the branch alone', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: 'feat/x', probe: ['/work/repo', '/work/repo/.git'], markers: [`/work/repo/${MARKER}`] } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await branchRow($)).toBe('feat/x')
})

test('outside a repository there is no row and no probe', async ($, on) => {
  world(on, {})
  const { probes, looked } = folderWorld(on, {}, '/nowhere')
  await $.session.start({ source: 'startup', cwd: '/nowhere' } as any)
  expect(await band($)).not.toContain('⎇')
  expect(probes).toEqual([])
  expect(looked).toEqual([])
})

test('looks up the kind once per folder, not on the 3 s tick', async ($, on) => {
  const clock = world(on, {})
  const folders: Record<string, Folder> = {
    '/a': { branch: 'main', probe: WORKTREE },
    '/b': { branch: 'main', probe: SUBMODULE },
  }
  const { state, probes, looked } = folderWorld(on, folders, '/a')
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(probes).toEqual(['/a'])
  // the branch is read on every tick, the kind is not
  for (let i = 0; i < 4; i++) await clock.advance(3000)
  await $.command.run({ command: 'anything', args: '' } as any)
  expect(probes).toEqual(['/a'])
  expect(looked).toHaveLength(1)
  // the folder changes: looked up again, at the next look
  state.cwd = '/b'
  await clock.advance(3000)
  expect(probes).toEqual(['/a', '/b'])
  expect(await band($)).toContain('⎇ main · submodule subm')
  await clock.advance(3000)
  expect(probes).toEqual(['/a', '/b'])
})

test('redraws only when the whole label changed, a kind change included', async ($, on) => {
  const clock = world(on, {})
  const folders: Record<string, Folder> = {
    '/a': { branch: 'main', probe: WORKTREE },
    '/b': { branch: 'main', probe: [...SUBMODULE] },
    // another folder with the same name and kind: the same label
    '/c': { branch: 'main', probe: ['/elsewhere/wt', '/elsewhere/.git/worktrees/wt', '/elsewhere/.git'] },
    '/d': { branch: 'main', probe: PLAIN },
  }
  const { state } = folderWorld(on, folders, '/a')
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(await band($)).toContain('⎇ main · worktree wt')
  const drawn = invalidations

  // the same label at the next looks: nothing redraws
  await clock.advance(3000)
  await clock.advance(3000)
  expect(invalidations).toBe(drawn)

  // the kind changes under the same branch: one redraw
  state.cwd = '/b'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 1)
  expect(await band($)).toContain('⎇ main · submodule subm')

  // a folder that reads the same as the one before it: no redraw
  state.cwd = '/a'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 2)
  state.cwd = '/c'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 2)
  expect(await band($)).toContain('⎇ main · worktree wt')

  // the kind goes away: one redraw, the branch alone
  state.cwd = '/d'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 3)
  expect(await branchRow($)).toBe('main')

  // the branch changes and the kind stays: one redraw, no new probe needed
  state.cwd = '/a'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 4)
  folders['/a']!.branch = 'feat/y'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 5)
  expect(await band($)).toContain('⎇ feat/y · worktree wt')
})

// ── the first row wraps, the branch is looked up unawaited, and what counts as an answer ──
test('wraps the first row like the meters row, so the branch drops to the next line whole', async ($, on) => {
  world(on, {})
  folderWorld(on, { '/repo': { branch: 'feat/hud-branch-segment', probe: PLAIN, markers: [`/work/repo/${MARKER}`] } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  for (const columns of [80, 100]) {
    const [outer] = (await (await mount($, columns)).findAll({ type: 'Box' })) as any[]
    // the band's children: the rule, the first row, the meters row
    const [, first, meters] = outer.children
    expect(JSON.stringify(first)).toContain('feat/hud-branch-segment')
    expect(first.props.flexWrap).toBe('wrap')
    expect(meters.props.flexWrap).toBe('wrap')
    // the branch segment is one item of that row, so the wrap moves it whole: the glyph, the name and the tag together
    const segment = first.children[first.children.length - 1]
    expect(segment.type).toBe('Box')
    const shown = JSON.stringify(segment)
    expect(shown).toContain('⎇')
    expect(shown).toContain('feat/hud-branch-segment')
    expect(shown).toContain('skyrift')
    expect(JSON.stringify(first.children.slice(0, -1))).not.toContain('⎇')
  }
})

test('session.start returns without waiting for git, and the label lands when git answers', async ($, on) => {
  const clock = world(on, {})
  // the branch is 1900 ms away; the kind probe answers at once
  folderWorld(on, { '/repo': { branch: 'main', probe: WORKTREE } }, '/repo', { ms: 1900, on: 'branch --show-current' })
  let isReturned = false
  const started = $.session.start({ source: 'startup', cwd: '/repo' } as any).then(() => {
    isReturned = true
  })
  await clock.settle()
  expect(isReturned).toBe(true)
  expect(await branchRow($)).toBeUndefined()
  await clock.advance(1900)
  await started
  expect(await branchRow($)).toBe('main · worktree wt')
})

test('a command does not wait for git, and the new branch lands when git answers', async ($, on) => {
  const clock = world(on, {})
  const folders: Record<string, Folder> = { '/repo': { branch: 'main', probe: PLAIN } }
  const slow = { ms: 0, on: 'branch --show-current' }
  folderWorld(on, folders, '/repo', slow)
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await branchRow($)).toBe('main')
  // a command switches branch; git is 1900 ms away
  folders['/repo']!.branch = 'feat/z'
  slow.ms = 1900
  let isReturned = false
  const ran = $.command.run({ command: 'anything', args: '' } as any).then(() => {
    isReturned = true
  })
  await clock.settle()
  expect(isReturned).toBe(true)
  expect(await branchRow($)).toBe('main')
  await clock.advance(1900)
  await ran
  expect(await branchRow($)).toBe('feat/z')
})

// Real time passes, the mock clock does not.
const wait = (ms: number) => new Promise<void>(resolve => (globalThis as any).setTimeout(resolve, ms))

// The redraw is the one call of a lookup that is not guarded by a try: `$.ui.invalidate`
// returns nothing, so a refusal never reaches the caller (the lookup cannot reject; the
// `.catch` at the two unawaited calls is a guard that cannot be reached from here). What
// is asserted is what an operator sees: the hooks return, the lookup still finishes, and
// the runner, which reports a rejection nothing handled as a failure when the file ends,
// has none to report.
test('a refused redraw leaves session.start and a command untouched, and no rejection behind', async ($, on) => {
  const clock = world(on, {})
  const folders: Record<string, Folder> = { '/repo': { branch: 'main', probe: PLAIN } }
  const slow = { ms: 500, on: 'branch --show-current' }
  folderWorld(on, folders, '/repo', slow)
  // the redraw the lookup asks for is refused from the first millisecond on
  refuseRedrawAfter = 0
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  await clock.advance(500)
  expect(await branchRow($)).toBe('main')
  folders['/repo']!.branch = 'feat/z'
  await $.command.run({ command: 'anything', args: '' } as any)
  await clock.advance(500)
  expect(await branchRow($)).toBe('feat/z')
  // a rejection is reported on a later turn of the event loop
  await wait(20)
})

test('a probe that times out is asked again at the next look, and the tag lands then', async ($, on) => {
  const clock = world(on, {})
  let asked = 0
  const folders: Record<string, Folder> = { '/repo': { branch: 'main', probe: () => (++asked === 1 ? 'timeout' : WORKTREE) } }
  const { probes } = folderWorld(on, folders, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  // the branch shows, the tag does not
  expect(await branchRow($)).toBe('main')
  expect(probes).toEqual(['/repo'])
  await clock.advance(3000)
  expect(probes).toEqual(['/repo', '/repo'])
  expect(await branchRow($)).toBe('main · worktree wt')
  // answered now: not asked again
  await clock.advance(3000)
  await clock.advance(3000)
  expect(probes).toHaveLength(2)
})

// A probe that does not answer: a timeout, a nonzero exit, an exit 0 with less
// than the three lines every git prints.
for (const [what, probe] of [['times out', 'timeout'], ['exits nonzero', 'fail'], ['prints too little', ['/work/repo', '/work/repo/.git']]] as [string, Probe][]) {
  test(`a probe that ${what} is asked again at every look, one process per look, and the branch stays`, async ($, on) => {
    const clock = world(on, {})
    const { probes } = folderWorld(on, { '/repo': { branch: 'main', probe } }, '/repo')
    await $.session.start({ source: 'startup', cwd: '/repo' } as any)
    expect(probes).toHaveLength(1)
    for (let i = 2; i <= 4; i++) {
      await clock.advance(3000)
      expect(probes).toHaveLength(i)
      expect(await branchRow($)).toBe('main')
    }
  })
}

test('git before 2.31 answers with shifted lines: no tag, and the folder is not asked again', async ($, on) => {
  const clock = world(on, {})
  // the flag comes back as line 1, exit 0, four lines
  const { probes } = folderWorld(on, { '/repo': { branch: 'main', probe: ['--path-format=absolute', '/work/repo', '.git', '.git'], markers: [`/work/repo/${MARKER}`] } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  expect(await branchRow($)).toBe('main')
  await clock.advance(3000)
  await clock.advance(3000)
  expect(await branchRow($)).toBe('main')
  expect(probes).toEqual(['/repo'])
})

test('a marker that cannot be read leaves a plain repository plain, and the folder is not asked again', async ($, on) => {
  const clock = world(on, {})
  const { probes } = folderWorld(on, { '/repo': { branch: 'feat/x', probe: PLAIN, markers: 'unreadable' } }, '/repo')
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  await clock.advance(3000)
  expect(await branchRow($)).toBe('feat/x')
  expect(probes).toEqual(['/repo'])
})

test('moving to a folder whose probe does not answer drops the old tag at once, and asks again', async ($, on) => {
  const clock = world(on, {})
  const folders: Record<string, Folder> = {
    '/a': { branch: 'main', probe: WORKTREE },
    '/b': { branch: 'main', probe: 'timeout' },
  }
  const { state, probes } = folderWorld(on, folders, '/a')
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(await branchRow($)).toBe('main · worktree wt')
  // a tag from another folder never stays on screen
  state.cwd = '/b'
  await clock.advance(3000)
  expect(await branchRow($)).toBe('main')
  await clock.advance(3000)
  expect(probes).toEqual(['/a', '/b', '/b'])
  expect(await branchRow($)).toBe('main')
  // back where it was: asked again, and the tag is back
  state.cwd = '/a'
  await clock.advance(3000)
  expect(probes).toEqual(['/a', '/b', '/b', '/a'])
  expect(await branchRow($)).toBe('main · worktree wt')
})

test('a git run that fails at session start leaves the clocks running', async ($, on) => {
  const settings: Record<string, unknown> = {}
  const clock = world(on, settings)
  on('session.cwd', () => ({ value: '/repo' }))
  // process.run is not answered: the call fails, as a timeout or a missing git does
  await $.session.start({ source: 'startup', cwd: '/repo' } as any)
  settings.advisorModel = 'claude-fable-5-1'
  await clock.advance(1000)
  expect(await band($)).toContain('fable')
})

test('leaving a repository for a plain folder removes the branch, with one redraw', async ($, on) => {
  const clock = world(on, {})
  const { state } = folderWorld(on, { '/a': { branch: 'main', probe: PLAIN } }, '/a')
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(await band($)).toContain('⎇ main')
  const drawn = invalidations
  state.cwd = '/nowhere'
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 1)
  expect(await band($)).not.toContain('⎇')
})

test('a git that stops answering takes the branch off the row, with one redraw', async ($, on) => {
  const clock = world(on, {})
  const { state } = folderWorld(on, { '/a': { branch: 'main', probe: WORKTREE } }, '/a')
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(await band($)).toContain('⎇ main · worktree wt')
  const drawn = invalidations
  // every git run now rejects, as a timeout does: a stale label does not stay
  state.down = true
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 1)
  expect(await band($)).not.toContain('⎇')
})

test('a session folder that cannot be read takes the branch off the row, with one redraw', async ($, on) => {
  const clock = world(on, {})
  const { state } = folderWorld(on, { '/a': { branch: 'main', probe: WORKTREE } }, '/a')
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(await band($)).toContain('⎇ main · worktree wt')
  const drawn = invalidations
  // the engine has no folder to give: a stale label does not stay
  state.isCwdDown = true
  await clock.advance(3000)
  expect(invalidations).toBe(drawn + 1)
  expect(await band($)).not.toContain('⎇')
})

test('a kind read that was dropped for a newer look is not taken as read: the newer look reads it', async ($, on) => {
  const clock = world(on, {})
  const folders: Record<string, Folder> = {
    '/a': { branch: 'main', probe: PLAIN },
    '/b': { branch: 'main', probe: WORKTREE },
  }
  // how late git answers, by subcommand, as the test moves on
  const plan = { branch: 0, probe: 0 }
  const { state } = folderWorld(on, folders, '/a', { ms: sub => (sub === 'branch --show-current' ? plan.branch : sub === PROBE.join(' ') ? plan.probe : 0) })
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  expect(await branchRow($)).toBe('main')
  // the look at the next tick reads the new folder's branch at once and its kind in 100 ms...
  state.cwd = '/b'
  plan.probe = 100
  await clock.advance(3000)
  // ...a command starts a newer look 50 ms into it, whose branch read takes 150 ms
  plan.branch = 150
  await clock.advance(50)
  await $.command.run({ command: 'anything', args: '' } as any)
  // the older look's kind lands first and is dropped; the newer look must still read the kind itself
  await clock.advance(100)
  await clock.advance(100)
  await clock.advance(200)
  expect(await branchRow($)).toBe('main · worktree wt')
})

// Moves the virtual clock in small steps, so a wait a step registers is crossed too.
async function run(clock: any, ms: number, step = 100) {
  for (let at = 0; at < ms; at += step) await clock.advance(step)
}

test('git at 1900 ms per call: the first label is on screen within about four seconds, not never', async ($, on) => {
  const clock = world(on, {})
  const { flight } = folderWorld(on, { '/a': { branch: 'main', probe: WORKTREE } }, '/a', { ms: 1900 })
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  // one look of two calls (the branch, then the kind probe); the 3 s tick must not supersede it
  await run(clock, 3700)
  expect(await branchRow($)).toBeUndefined()
  await run(clock, 300)
  expect(await branchRow($)).toBe('main · worktree wt')
  // and it stays: the ticks after it start looks of one call
  await run(clock, 20_000)
  expect(await branchRow($)).toBe('main · worktree wt')
  expect(flight.max).toBe(1)
})

test('git at 1600 ms per call, detached HEAD: a move is seen within two looks, one git run at a time', async ($, on) => {
  const clock = world(on, {})
  const folders: Record<string, Folder> = { '/a': { branch: '', sha: 'aaaaaaa', probe: PLAIN } }
  const { flight, calls } = folderWorld(on, folders, '/a', { ms: 1600 })
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  // the first look: the branch, the short hash and the kind probe, three calls
  await run(clock, 5000)
  expect(await branchRow($)).toBe('(aaaaaaa)')
  // HEAD moves; a look is under way or the next tick starts one, and it ends within two looks
  folders['/a']!.sha = 'bbbbbbb'
  await run(clock, 10_000)
  expect(await branchRow($)).toBe('(bbbbbbb)')
  // over 30 s the tick never started a second look beside one under way
  await run(clock, 30_000)
  expect(flight.max).toBe(1)
  // no look is started before the previous one ended: the runs are the looks' calls, two each after the first
  expect(calls.length).toBeLessThanOrEqual(3 + 2 * 14)
})

test('a command still supersedes a look in flight, so two looks may overlap but never three', async ($, on) => {
  const clock = world(on, {})
  const { flight } = folderWorld(on, { '/a': { branch: 'main', probe: PLAIN } }, '/a', { ms: 1600 })
  await $.session.start({ source: 'startup', cwd: '/a' } as any)
  await run(clock, 5000)
  expect(await branchRow($)).toBe('main')
  // a command starts a look while the tick's look is under way
  await run(clock, 1500)
  await $.command.run({ command: 'anything', args: '' } as any)
  await run(clock, 20_000)
  expect(flight.max).toBeLessThanOrEqual(2)
  expect(await branchRow($)).toBe('main')
})