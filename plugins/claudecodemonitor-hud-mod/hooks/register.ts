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

// Re-reads what can change with no event this mod receives: /model and edits
// to the settings files. Redraws only when something moved.
async function refresh($: EngineInterface) {
  const settings = await $.settings.read()
  const model = (await $.session.model()).replace(/^claude-/, '')
  const next = [model, nonEmpty(settings.model), nonEmpty(settings.effortLevel), nonEmpty(settings.advisorModel)]
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
    const plain = (s: string) => Text({ children: [s] })

    const line = Box({
      flexDirection: 'row',
      children: [
        dim('model '),
        plain(sessionModel),
        dim(` · config ${configModel ?? 'default'}`),
        dim(' │ effort '),
        plain(sessionEffort ?? '—'),
        dim(` · config ${configEffort ?? 'default'}`),
        dim(' │ advisor '),
        plain(advisorModel ?? 'off'),
        dim(` · ${advisorCalls} ${advisorCalls === 1 ? 'call' : 'calls'}`),
      ],
    })

    // Keep what the mods after this one draw in the band, under this line.
    const below = await next(e)
    return below ? Box({ flexDirection: 'column', children: [line, below] }) : line
  })
}
