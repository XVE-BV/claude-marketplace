import type { EngineInterface, Register } from 'claude-code'

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

// Whether a saved model names the session's: by family, since an alias such
// as "opus" resolves to an id. Undefined when the alias can't be compared.
function sameModel(saved: string | undefined, session: string) {
  const savedFamily = family(saved ?? '')
  return savedFamily ? savedFamily === family(session) : undefined
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
  // /effort saves to the settings: take a new level now, not at the next request.
  if (next[2] !== configEffort && next[2] !== undefined) sessionEffort = next[2]
  ;[sessionModel, configModel, configEffort, advisorModel] = next
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    sessionEffort = undefined
    advisorCalls = 0
    await refresh($)
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
    // What the settings hold beside the session's value: a quiet tick when
    // they agree, a yellow warning when they don't.
    const saved = (same: boolean | undefined, value: string | undefined) =>
      same === true
        ? dim(' ✓ saved')
        : same === false
          ? Text({ color: 'yellow', children: [` ≠ saved ${value}`] })
          : dim(` saved ${value ?? 'default'}`)

    const modelColor = FAMILY_COLORS[family(sessionModel) ?? ''] ?? 'white'
    const level = LEVELS.indexOf(sessionEffort ?? '')
    const meter = '▰'.repeat(level + 1) + '▱'.repeat(LEVELS.length - level - 1)
    // An unknown level draws dimmed rather than in a level's color.
    const effortStyle = level >= 0 ? { color: LEVEL_COLORS[level] } : { dimColor: true }

    const line = Box({
      flexDirection: 'row',
      children: [
        Text({ backgroundColor: modelColor, color: 'black', bold: true, children: [` ◆ ${pretty(sessionModel)} `] }),
        saved(sameModel(configModel, sessionModel), configModel && pretty(configModel)),
        dim('   effort '),
        Text({ ...effortStyle, children: [meter] }),
        Text({ ...effortStyle, bold: true, children: [` ${sessionEffort ?? '—'}`] }),
        saved(configEffort === undefined || sessionEffort === undefined ? undefined : configEffort === sessionEffort, configEffort),
        dim('   advisor '),
        advisorModel
          ? Text({ color: 'cyan', bold: true, children: [pretty(advisorModel)] })
          : dim('off'),
        dim(` · ${advisorCalls} ${advisorCalls === 1 ? 'call' : 'calls'}`),
      ],
    })

    // Keep what the mods after this one draw in the band, under this line.
    const below = await next(e)
    return below ? Box({ flexDirection: 'column', children: [line, below] }) : line
  })
}
