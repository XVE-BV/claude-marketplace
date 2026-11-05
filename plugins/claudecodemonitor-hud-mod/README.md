# claudecodemonitor-hud-mod

A Claude Code mod that draws one line above the prompt, under a rule in the composer's border color:

```
model opus 5.5  haiku   effort  xhigh xhigh   advisor fable  ⎇ feat/x
```

Under it, once the session has a reading, the meters line: token-weather-usage's bars with the old status-line HUD's text.

```
ctx ━━━─── 47% of 1m · 530k safe │ 5h ▸ ━╍╍─── 21% · resets 14:20   7d ▸ ━━━─── 58% · resets fri 09:00
```

- **ctx**: context filled (green, yellow from 60%, red from 85%), the window, and the tokens left. Then the handoff banner: `handoff` from 60% (or 50% while the 5h burn is past 30 %/h), `handoff now` from 85%.
- **5h / 7d**: each limit against the clock. `━` is what you used, `╍` the gap between that and the time elapsed in the window, `─` the rest; green while usage keeps behind the clock (the gap dim), yellow ahead of it (the gap in color), red more than 15 points ahead or past 90%. Then the percent used and the reset time.

The line wraps when the terminal is too narrow for it.

Readings come from Claude Code after each turn and whenever a limit moves a point; the 5h burn-rate samples behind the handoff banner live in the plugin's store so a reload keeps them. Rate limits appear only on a claude.ai subscription, after the first response.

The model is a pill colored by family (Opus purple, Sonnet blue, Haiku green, Fable yellow). Effort is a pill colored from green (low) to red (max). Text on the model, effort and advisor pills is white. Beside the model and effort, in a black box with white text, is the value your settings hold (`default` when unset).

| Part | Session value | Config value |
|------|---------------|--------------|
| model | The main loop's model, as `/model` shows it | `model` in your settings |
| effort | What `/effort` set, or the effort the last main-loop request asked for | The session model's `modelSettings.<model>.effortLevel` (where `/effort` saves it), else the top-level `effortLevel` |
| advisor | The advisor model | `advisorModel` in your settings, or `off` |

The branch at the end of the first row is the git branch of the session's directory: a dim `⎇`, then the name in cyan, cut to 34 characters and `…` when it is longer than 35. A detached HEAD shows the short hash, `(abc1234)`. It is absent outside a git repository, when git is not installed, and on any git error. It reads `git branch --show-current` (else `git rev-parse --short HEAD`) in the session's directory, with a 2 s timeout, when the session starts, after each command, and every 3 s, so a branch switch made by a tool shows within a few seconds. A tag follows it when the folder is not a plain repository: a dim `·`, then `skyrift` (a skyrift workspace, found by its `.skyrift-workspace` file), `worktree` (a linked git worktree) or `submodule` in yellow, and the folder's name dim, cut like the branch (`⎇ feat/x · skyrift hudbr-pr`); it is read once per session folder with one `git rev-parse`, not on the 3 s look, and any failure shows the branch alone. The tag needs git 2.31 or newer; an older git shows the branch alone. A lookup that did not answer (git timed out or failed) is not remembered for the folder: the next look, within 3 s, asks again. The band redraws only when the branch or the tag changed.

Config values are your settings files merged the way Claude Code reads them (user, project, local, managed). `default` means the setting isn't set. The band updates right after `/model`, `/effort` or `/advisor`, and at most a second later otherwise (a settings file edited by hand included), so changes show up while idle. Effort also updates after each request. Subagents' requests don't count.

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
