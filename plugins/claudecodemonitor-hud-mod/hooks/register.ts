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
    $.clock.every(5000, () => refresh($))
    return next(e)
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
