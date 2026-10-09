# claudecodemonitor-hud-mod

A Claude Code mod that draws one line above the prompt:

```
model opus-5-5 · config haiku │ effort xhigh · config default │ advisor fable · 2 calls
```

| Part | Session value | Config value |
|------|---------------|--------------|
| model | The main loop's model, as `/model` shows it | `model` in your settings |
| effort | The effort the last main-loop request asked for (`—` before the first request) | `effortLevel` in your settings |
| advisor | How many times the advisor ran this session | `advisorModel` in your settings, or `off` |

Config values are your settings files merged the way Claude Code reads them (user, project, local, managed). `default` means the setting isn't set. The session model and the settings are re-read every 5 seconds, so `/model` and settings edits show up while idle. Effort and advisor calls update after each request. Subagents' requests don't count.

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
