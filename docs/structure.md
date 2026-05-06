# Repository structure

```
.env.example                         Env var template — never commit actual values
hooks/
  session-start.sh                   Injects session context from env vars
  env-guard.sh                       PreToolUse hook — blocks .env file access via any tool
  writing-guard.sh                   Stop hook — flags AI writing tells, forces revision
plugins/
  xve/
    config/settings.json             Claude Code settings template
    statusline/xve-hud.sh            Handoff-urgency statusline script
    skills/
      session-handoff/SKILL.md       End-of-session handoff summary
      llm-council/SKILL.md           Multi-advisor decision framework
      diagram-design/SKILL.md        Diagram generation (+ assets/, references/)
      humanize-writing/SKILL.md      De-AI prose rewriting
      combell-db-import/SKILL.md     Combell MySQL dump import
      wp-combell-to-local/SKILL.md   WordPress Combell → local dev conversion
docs/
  plugins.md                         Skills reference
  configuration.md                   Model strategy, env toggles, var reference
  structure.md                       This file
  setup.md                           What /xve:setup does, step by step
  llm-council.md                     LLM Council guide
```
