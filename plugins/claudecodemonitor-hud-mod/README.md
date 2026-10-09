# claudecodemonitor-hud-mod

A Claude Code mod that draws one line above the prompt:

```
 ◆ Opus 5.5  ≠ saved Haiku   effort ▰▰▰▰▱ xhigh ✓ saved   advisor Fable · 2 calls
```

Under it, once the session has a reading, the meters line: token-weather-usage's bars with the old status-line HUD's text.

```
ctx ━━━─── 47% of 1M · 530k safe │ 5h ▸ ━╍╍─── 21% ↗24.0%/h · resets 14:20 │ 7d ▸ ━━━─── 58% · resets Fri 09:00 · $1.23 ($0.8/h)
```

- **ctx**: context filled (green, yellow from 60%, red from 85%), the window, and the tokens left. Then the handoff banner: `● handoff` from 60% (or 50% while the 5h burn is past 30 %/h), `● handoff NOW: auto-compact imminent` from 85%.
- **5h / 7d**: each limit against the clock. `━` is what you used, `╍` the gap between that and the time elapsed in the window, `─` the rest; green while usage keeps behind the clock (the gap dim), yellow ahead of it (the gap in color), red more than 15 points ahead or past 90%. Then the percent used, the burn rate over the last 10 minutes with an arrow against the pace that would spend the window exactly by its reset (`↑` past 1.5×, `↗` past 1.1×, `→` past 0.5×, `↘` below), `⚠ limit ~HH:MM before reset` when that rate reaches 100% first, and the reset time.
- **$**: the session's cost as `/cost` totals it, and per hour once the session is five minutes old.

The line wraps when the terminal is too narrow for it.

Readings come from Claude Code after each turn and whenever a limit moves a point; the burn-rate samples live in the plugin's store so a reload keeps them. Rate limits appear only on a claude.ai subscription, after the first response.

The model is a pill colored by family (Opus magenta, Sonnet blue, Haiku green, Fable yellow). Effort is a five-step meter from green (low) to red (max). Beside each, `✓ saved` means your settings hold the same value; a yellow `≠ saved …` names the different one they hold.

| Part | Session value | Config value |
|------|---------------|--------------|
| model | The main loop's model, as `/model` shows it | `model` in your settings |
| effort | What `/effort` set, or the effort the last main-loop request asked for | The session model's `modelSettings.<model>.effortLevel` (where `/effort` saves it), else the top-level `effortLevel` |
| advisor | How many times the advisor ran this session | `advisorModel` in your settings, or `off` |

Config values are your settings files merged the way Claude Code reads them (user, project, local, managed). `default` means the setting isn't set. The band updates right after `/model`, `/effort` or `/advisor`, when a settings file changes, and at most a second later otherwise, so changes show up while idle. Effort and advisor calls also update after each request. Subagents' requests don't count.

Other mods' bands stay visible under this line.

## Install

```
/plugin install claudecodemonitor-hud-mod@xve-claude-marketplace
/reload-plugins
```

Needs Claude Code 2.1.287 or later. Works in the terminal and the Desktop app's Code tab, on Windows and macOS.

## Check

```
claude plugin validate ./plugins/claudecodemonitor-hud-mod
claude plugin test ./plugins/claudecodemonitor-hud-mod
```
