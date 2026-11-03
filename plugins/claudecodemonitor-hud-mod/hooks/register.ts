import type { EngineInterface, Register } from 'claude-code'

import { branchLabel, KIND_ARGS, kindOf, rowParts, rowText, SKYRIFT_MARKER, stdoutOf } from './branch'
import type { Kind } from './branch'
import { addSample, burnRate, compact, contextColor, handoff, paceBar, resetLabel, PACE_CELLS } from './meters'
import type { Reading, Sample } from './meters'

// The meters: the latest reading and the limit samples behind the burn rate.
// Samples live in $.store so a reload or a new session keeps the rate.
const SAMPLES_KEY = 'samples'
let reading: Reading | undefined
let samples: Sample[] = []

// What the band shows. Session values come from the engine as the session
// runs; config values from the settings files, merged as the engine reads them.
let sessionModel: string | undefined
let sessionEffort: string | undefined
let configModel: string | undefined
let configEffort: string | undefined
let advisorModel: string | undefined

// The git branch, or undefined where there is none to show. branchSeq numbers
// the reads so one that lands after a newer one began is dropped.
let branch: string | undefined
let branchSeq = 0
const GIT_TIMEOUT_MS = 2000
const BRANCH_EVERY_MS = 3000

// The kind of checkout (skyrift workspace, linked worktree, submodule), read for
// the folder `kindCwd` and kept until the session folder changes.
let kind: Kind | undefined
let kindCwd: string | undefined
// How the parts of the branch row are drawn.
const TONES = { branch: { color: 'cyan' }, dim: { dimColor: true }, kind: { color: 'yellow' } } as const

const nonEmpty = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined)

const LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']
const LEVEL_COLORS = ['greenBright', 'cyan', 'yellow', 'magenta', 'red']
// White text on the dark backgrounds, black on the light ones.
const textOn = (bg: string) => (['red', 'magenta', 'blue'].includes(bg) ? 'white' : 'black')
const FAMILY_COLORS: Record<string, string> = { opus: 'magenta', sonnet: 'blue', haiku: 'greenBright', fable: 'yellow' }

const family = (name: string) => /opus|sonnet|haiku|fable/.exec(name.toLowerCase())?.[0]

// "claude-opus-5-5[1m]" reads "Opus 5.5 [1m]"; an alias such as "haiku" reads "Haiku".
function pretty(name: string) {
  const id = /^(?:claude-)?([a-z]+)-(\d+)-(\d+)(.*)$/.exec(name)
  if (!id) return name
  const [, base = '', major, minor, rest = ''] = id
  return `${base} ${major}.${minor}${rest ? ` ${rest}` : ''}`
}


// Re-reads what can change with no event this mod receives: /model and edits
// to the settings files. Redraws only when something moved.
async function refresh($: EngineInterface) {
  const settings = await $.settings.read()
  const fullModel = await $.session.model()
  // /effort saves per model, under modelSettings.<model id>.effortLevel; the
  // top-level effortLevel applies to models without an entry of their own.
  const perModel = settings.modelSettings as Record<string, { effortLevel?: unknown }> | undefined
  const effort = nonEmpty(perModel?.[fullModel.replace(/\[.*\]$/, '')]?.effortLevel) ?? nonEmpty(settings.effortLevel)
  const next = [fullModel, nonEmpty(settings.model), effort, nonEmpty(settings.advisorModel)]
  const now = [sessionModel, configModel, configEffort, advisorModel]
  if (next.every((value, i) => value === now[i])) return
  // /effort saves to the settings: take a new level now, not at the next
  // request. Not on a model switch: the session keeps its level, and the
  // new model's saved entry is just what now shows beside it.
  const sameModel = sessionModel === undefined || fullModel === sessionModel
  if (sameModel && next[2] !== configEffort && next[2] !== undefined) sessionEffort = next[2]
  ;[sessionModel, configModel, configEffort, advisorModel] = next
  $.ui.invalidate('ui.render')
}

// The session's directory, or undefined where the engine has none to give.
async function sessionCwd($: EngineInterface) {
  try {
    return await $.session.cwd()
  } catch {
    return undefined
  }
}

// The branch of `cwd`: `branch --show-current`, else the short hash of a
// detached HEAD. Any failure (no repository, no git, a run that times out)
// reads as no branch; this never throws.
async function readBranch($: EngineInterface, cwd: string) {
  try {
    const git = (...args: string[]) => $.process.run(['git', '-C', cwd, '--no-optional-locks', ...args], { timeoutMs: GIT_TIMEOUT_MS })
    const current = stdoutOf(await git('branch', '--show-current'))
    const head = current === '' ? stdoutOf(await git('rev-parse', '--short', 'HEAD')) : undefined
    return branchLabel(current, head)
  } catch {
    return undefined
  }
}

// What kind of checkout `cwd` is: one rev-parse, then the skyrift marker in the
// toplevel it printed (`$.fs.exists`, in the mod's process, no spawn). Any
// failure (git, an unreadable marker, a line missing) reads as no kind; this
// never throws.
async function readKind($: EngineInterface, cwd: string) {
  try {
    const printed = stdoutOf(await $.process.run(['git', '-C', cwd, '--no-optional-locks', ...KIND_ARGS], { timeoutMs: GIT_TIMEOUT_MS }))
    const lines = printed?.split(/\r?\n/)
    const top = lines?.[0]
    if (!lines || lines.length < 3 || !top) return undefined
    return kindOf(lines, await $.fs.exists(`${top}/${SKYRIFT_MARKER}`))
  } catch {
    return undefined
  }
}

// The text of the whole label, branch and kind, or undefined with no branch.
const labelOf = (name: string | undefined, of: Kind | undefined) => (name === undefined ? undefined : rowText(name, of))

// Nothing tells this mod when a tool switches branch, so it looks: redraws
// only when the whole label moved. The kind is read once per folder, when the
// session folder differs from the one it was read for, never on the tick alone;
// outside a repository there is no branch and so no kind to ask for.
async function refreshBranch($: EngineInterface) {
  const seq = ++branchSeq
  const cwd = await sessionCwd($)
  let next: string | undefined
  let nextKind = kind
  if (cwd !== undefined) {
    next = await readBranch($, cwd)
    if (next !== undefined && cwd !== kindCwd) nextKind = await readKind($, cwd)
  }
  if (seq !== branchSeq) return
  const before = labelOf(branch, kind)
  branch = next
  if (next !== undefined) {
    kind = nextKind
    kindCwd = cwd
  }
  if (labelOf(branch, kind) === before) return
  $.ui.invalidate('ui.render')
}

// Takes a measurement into the reading and the samples, and redraws.
async function measure($: EngineInterface, usage: { context: { tokens?: number; window: number; percent?: number }; rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[] }) {
  const now = await $.clock.now()
  reading = { ...usage.context, rateLimits: [...usage.rateLimits] }
  const five = usage.rateLimits.find(l => l.kind === 'five_hour')?.percentUsed
  const seven = usage.rateLimits.find(l => l.kind === 'seven_day')?.percentUsed
  if (five !== undefined || seven !== undefined) {
    const next = addSample(samples, { at: now, five, seven })
    if (next !== samples) {
      samples = next
      await $.store.set(SAMPLES_KEY, samples).catch(() => undefined)
    }
  }
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    sessionEffort = undefined
    const saved = await $.store.get(SAMPLES_KEY).catch(() => undefined)
    if (Array.isArray(saved)) samples = saved as Sample[]
    await refresh($)
    await refreshBranch($)
    const usage = await $.session.usage().catch(() => undefined)
    if (usage) await measure($, usage)
    // The countdowns and the burn rate move with the clock.
    $.clock.every(30_000, () => $.ui.invalidate('ui.render'))
    // A safety net for anything the two hooks below miss. Both reads are
    // in-process and cheap, and refresh redraws only when a value moved.
    $.clock.every(1000, () => refresh($))
    // git is a process: look every few seconds, not every second.
    $.clock.every(BRANCH_EVERY_MS, () => refreshBranch($))
    return next(e)
  })

  // The commands that change what the band shows: re-read as soon as one is done.
  on('command.run', async ($, e, next) => {
    const result = await next(e)
    // `/effort <level>` applies at once: show it without waiting for the save.
    const level = e.args.trim().toLowerCase()
    if (e.command === 'effort' && ['low', 'medium', 'high', 'xhigh', 'max'].includes(level) && level !== sessionEffort) {
      sessionEffort = level
      $.ui.invalidate('ui.render')
    }
    if (['effort', 'model', 'advisor', 'config'].includes(e.command)) {
      await refresh($)
      // The settings may reach the engine a moment after the command saved them.
      $.clock.after(250, () => refresh($))
    }
    // A command may have switched branch (a worktree, a checkout).
    await refreshBranch($)
    return result
  })

  // The engine pushes a measurement after each turn and when a limit moves a
  // point; a compaction changes the context at once.
  on('session.measure', async ($, e, next) => {
    await measure($, e)
    return next(e)
  })
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId) await measure($, await $.session.usage()).catch(() => undefined)
    return result
  })

  // Each main-loop request carries the effort it asks for. Subagents' requests
  // are skipped.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId) return result
    const effort = e.effort === undefined ? undefined : String(e.effort)
    if (effort !== sessionEffort) {
      sessionEffort = effort
      $.ui.invalidate('ui.render')
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || sessionModel === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const dim = (s: string) => Text({ dimColor: true, children: [s] })
    // What the settings hold, in a black box beside the session's value.
    const saved = (value: string | undefined) => Box({
      flexDirection: 'row',
      children: [Text({ children: [' '] }), Text({ backgroundColor: 'black', color: 'white', children: [` ${value ?? 'default'} `] })],
    })

    const modelColor = FAMILY_COLORS[family(sessionModel) ?? ''] ?? 'white'
    const level = LEVELS.indexOf(sessionEffort ?? '')
    // An unknown level draws dimmed rather than in a level's color.
    const effortWord = level >= 0
      ? Text({ backgroundColor: LEVEL_COLORS[level], color: textOn(LEVEL_COLORS[level]), bold: true, children: [` ${sessionEffort} `] })
      : Text({ dimColor: true, bold: true, children: [` ${sessionEffort ?? '—'}`] })

    const line = Box({
      flexDirection: 'row',
      children: [
        dim('model '),
        Text({ backgroundColor: modelColor, color: textOn(modelColor), bold: true, children: [` ${pretty(sessionModel)} `] }),
        saved(configModel && pretty(configModel)),
        dim('  effort '),
        effortWord,
        saved(configEffort),
        dim('  advisor '),
        advisorModel
          ? Text({ backgroundColor: 'cyan', color: 'white', bold: true, children: [` ${pretty(advisorModel)} `] })
          : dim('off'),
        ...(branch ? [dim('  ⎇ '), ...rowParts(branch, kind).map(({ text, tone }) => Text({ ...TONES[tone], children: [text] }))] : []),
      ],
    })

    const rows = [line]
    if (reading) {
      const now = await $.clock.now()
      const pct = reading.percent ?? (reading.tokens !== undefined ? Math.round((100 * reading.tokens) / reading.window) : 0)
      const color = contextColor(pct)
      const sep = () => dim(' │ ')
      // The context bar in the limits' glyphs: `━` filled, `─` free.
      const filled = Math.min(PACE_CELLS, Math.round((pct / 100) * PACE_CELLS))
      // The text follows the old status-line HUD: "47% of 1M · 530k safe",
      // then its handoff banner; the bar is the token-weather style.
      const banner = handoff(pct, burnRate(samples, 'five', now))
      const left = reading.tokens !== undefined ? reading.window - reading.tokens : Math.round(((100 - pct) / 100) * reading.window)
      const context = [
        dim('ctx '),
        Text({ color, children: ['━'.repeat(filled)] }),
        dim('─'.repeat(PACE_CELLS - filled)),
        Text({ bold: true, children: [` ${pct}%`] }),
        dim(` of ${compact(reading.window)} · ${compact(left)} safe`),
        ...(banner ? [Text({ color: banner.color, bold: banner.bold, children: [`  ${banner.text}`] })] : []),
      ]

      // One limit, as the old HUD wrote it: "5h ▸ 21% · resets 14:20",
      // with the pace bar in front of the percent.
      const limit = (label: string, kind: string, lead: ReturnType<typeof dim>) => {
        const l = reading!.rateLimits.find(x => x.kind === kind)
        if (!l) return []
        const p = paceBar(l.percentUsed, kind, l.resetsAt, now)
        const usedColor = l.percentUsed >= 90 ? 'red' : l.percentUsed >= 70 ? 'yellow' : 'greenBright'
        const reset = resetLabel(l.resetsAt, now)
        return [
          lead,
          dim(`${label} ▸ `),
          Text({ color: p.color, children: [p.used] }),
          p.ahead ? Text({ color: p.color, children: [p.gap] }) : dim(p.gap),
          dim(p.rest),
          Text({ color: usedColor, bold: true, children: [` ${Math.round(l.percentUsed)}%`] }),
          ...(reset ? [dim(` · ${reset}`)] : []),
        ]
      }

      rows.push(Box({ flexDirection: 'row', flexWrap: 'wrap', children: [...context, ...limit('5h', 'five_hour', sep()), ...limit('7d', 'seven_day', dim('   '))] }))
    }

    // Keep what the mods after this one draw in the band, under these lines.
    const below = await next(e)
    if (below) rows.push(below)
    // A rule above the band, in the composer's border color.
    const rule = Text({ color: 'promptBorder', children: ['─'.repeat(e.props.bodyColumns)] })
    return Box({ flexDirection: 'column', children: [rule, ...rows] })
  })
}
