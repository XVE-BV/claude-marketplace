import type { EngineInterface, Register } from 'claude-code'

import { addSample, burnRate, clock, compact, contextColor, handoff, paceArrow, paceBar, resetLabel, runOut, HOUR, MINUTE, PACE_CELLS } from './meters'
import type { Reading, Sample } from './meters'

// The meters: the latest reading and the limit samples behind the burn rate.
// Samples live in $.store so a reload or a new session keeps the rate.
const SAMPLES_KEY = 'samples'
let reading: Reading | undefined
let samples: Sample[] = []
// When the session began, for the cost per hour.
let startedAt: number | undefined

// What the band shows. Session values come from the engine as the session
// runs; config values from the settings files, merged as the engine reads them.
let sessionModel: string | undefined
let sessionEffort: string | undefined
let configModel: string | undefined
let configEffort: string | undefined
let advisorModel: string | undefined
let advisorCalls = 0

const nonEmpty = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined)

const LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']
const LEVEL_COLORS = ['green', 'cyan', 'yellow', 'magenta', 'red']
const FAMILY_COLORS: Record<string, string> = { opus: 'magenta', sonnet: 'blue', haiku: 'green', fable: 'yellow' }

const family = (name: string) => /opus|sonnet|haiku|fable/.exec(name.toLowerCase())?.[0]
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// "claude-opus-5-5[1m]" reads "Opus 5.5 [1m]"; an alias such as "haiku" reads "Haiku".
function pretty(name: string) {
  const id = /^(?:claude-)?([a-z]+)-(\d+)-(\d+)(.*)$/.exec(name)
  if (!id) return capitalize(name)
  const [, base = '', major, minor, rest = ''] = id
  return `${capitalize(base)} ${major}.${minor}${rest ? ` ${rest}` : ''}`
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

// Takes a measurement into the reading and the samples, and redraws.
async function measure($: EngineInterface, usage: { context: { tokens?: number; window: number; percent?: number }; rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]; cost?: { usd: number } }) {
  const now = await $.clock.now()
  reading = { ...usage.context, rateLimits: [...usage.rateLimits], costUsd: usage.cost?.usd }
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
    advisorCalls = 0
    const saved = await $.store.get(SAMPLES_KEY).catch(() => undefined)
    if (Array.isArray(saved)) samples = saved as Sample[]
    await refresh($)
    const usage = await $.session.usage().catch(() => undefined)
    if (usage) {
      startedAt = usage.startedAt
      await measure($, usage)
    }
    // The countdowns and the burn rate move with the clock.
    $.clock.every(30_000, () => $.ui.invalidate('ui.render'))
    // A safety net for anything the two hooks below miss. Both reads are
    // in-process and cheap, and refresh redraws only when a value moved.
    $.clock.every(1000, () => refresh($))
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
    return result
  })

  // A settings file changed: /effort saving, or an edit by hand.
  on('classic.ConfigChange', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
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

  // Each main-loop request carries the effort it asks for, and lists the
  // advisor calls the API ran inside it. Subagents' requests are skipped.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId) return result
    const effort = e.effort === undefined ? undefined : String(e.effort)
    const calls = (result?.serverToolUses ?? []).filter(use => use.name === 'advisor').length
    if (effort !== sessionEffort || calls > 0) {
      sessionEffort = effort
      advisorCalls += calls
      $.ui.invalidate('ui.render')
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || sessionModel === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const dim = (s: string) => Text({ dimColor: true, children: [s] })
    // What the settings hold, in gray beside the session's value.
    const saved = (value: string | undefined) => dim(` (${value ?? 'default'})`)

    const modelColor = FAMILY_COLORS[family(sessionModel) ?? ''] ?? 'white'
    const level = LEVELS.indexOf(sessionEffort ?? '')
    const meter = '▰'.repeat(level + 1) + '▱'.repeat(LEVELS.length - level - 1)
    // An unknown level draws dimmed rather than in a level's color.
    const effortStyle = level >= 0 ? { color: LEVEL_COLORS[level] } : { dimColor: true }

    const line = Box({
      flexDirection: 'row',
      children: [
        Text({ backgroundColor: modelColor, color: 'black', bold: true, children: [` ◆ ${pretty(sessionModel)} `] }),
        saved(configModel && pretty(configModel)),
        dim('   effort '),
        Text({ ...effortStyle, children: [meter] }),
        Text({ ...effortStyle, bold: true, children: [` ${sessionEffort ?? '—'}`] }),
        saved(configEffort),
        dim('   advisor '),
        advisorModel
          ? Text({ color: 'cyan', bold: true, children: [pretty(advisorModel)] })
          : dim('off'),
        dim(` · ${advisorCalls} ${advisorCalls === 1 ? 'call' : 'calls'}`),
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

      // One limit, as the old HUD wrote it: "5h ▸ 21% ↗24.0%/h · resets 14:20",
      // with the pace bar in front of the percent and the run-out warning when
      // the burn reaches 100% before the reset.
      const limit = (label: string, kind: string, key: 'five' | 'seven') => {
        const l = reading!.rateLimits.find(x => x.kind === kind)
        if (!l) return []
        const p = paceBar(l.percentUsed, kind, l.resetsAt, now)
        const rate = burnRate(samples, key, now)
        const pace = paceArrow(rate, kind)
        const out = runOut(l.percentUsed, rate, l.resetsAt, now)
        const usedColor = l.percentUsed >= 90 ? 'red' : l.percentUsed >= 70 ? 'yellow' : 'green'
        const reset = resetLabel(l.resetsAt, now)
        return [
          sep(),
          dim(`${label} ▸ `),
          Text({ color: p.color, children: [p.used] }),
          p.ahead ? Text({ color: p.color, children: [p.gap] }) : dim(p.gap),
          dim(p.rest),
          Text({ color: usedColor, bold: true, children: [` ${Math.round(l.percentUsed)}%`] }),
          ...(pace && rate !== undefined
            ? [Text({ ...(pace.color ? { color: pace.color } : {}), ...(pace.dim ? { dimColor: true } : {}), children: [` ${pace.arrow}${rate.toFixed(1)}%/h`] })]
            : []),
          ...(out !== undefined ? [Text({ color: 'red', bold: true, children: [` ⚠ limit ~${clock(out)} before reset`] })] : []),
          ...(reset ? [dim(` · ${reset}`)] : []),
        ]
      }

      // The session cost, and per hour once the session is five minutes old.
      const cost: ReturnType<typeof dim>[] = []
      if (reading.costUsd !== undefined && reading.costUsd > 0) {
        const hours = startedAt !== undefined ? (now - startedAt) / HOUR : 0
        const perHour = hours * HOUR > 5 * MINUTE ? ` ($${(reading.costUsd / hours).toFixed(1)}/h)` : ''
        cost.push(dim(` · $${reading.costUsd.toFixed(2)}${perHour}`))
      }
      rows.push(Box({ flexDirection: 'row', flexWrap: 'wrap', children: [...context, ...limit('5h', 'five_hour', 'five'), ...limit('7d', 'seven_day', 'seven'), ...cost] }))
    }

    // Keep what the mods after this one draw in the band, under these lines.
    const below = await next(e)
    if (below) rows.push(below)
    return rows.length === 1 ? line : Box({ flexDirection: 'column', children: rows })
  })
}
