---
name: create-skill
description: Create or edit skill in xve-claude-marketplace repo (plugins/<plugin>/skills/<skill>/SKILL.md) with its plugin.json, marketplace.json entry and README row. Use when asked to add, write, scaffold or rewrite skill for this marketplace; use instead of generic skill-creator here.
argument-hint: "[what the skill does]"
---

Every skill file written is read by LLM, never skimmed by human. Optimize comprehension per token.

Root = nearest ancestor of cwd holding `.claude-plugin/marketplace.json` named `xve-claude-marketplace`. No root -> ask for clone path; write nowhere else.

Layout: `plugins/<plugin>/skills/<skill>/SKILL.md`; bundled scripts and reference files sit beside SKILL.md. One skill per directory. Directory name = frontmatter `name` = lowercase letters, digits, hyphens. `name` never repeats plugin name (invocation is `/<plugin>:<skill>`).

Unknown purpose, trigger, target plugin, or side effects -> ask, only what request and repo leave open. Discrete choice -> AskUserQuestion, recommended option first. Request states it -> never ask.

Before writing: read target plugin's existing skills and `plugin.json`. Topic fits existing plugin -> add there. No fit -> new plugin named by lowercase hyphenated topic noun.

Editing existing skill: read it whole first; change only what request names; never restyle untouched lines.

New skill in existing plugin touches: SKILL.md; `plugin.json` version (minor bump); `marketplace.json` entry version (equal to plugin.json); every description or README row enumerating plugin's skills.

Edit to existing skill touches: SKILL.md; patch bump in both version fields; enumerations only if edit changes what they say.

New plugin touches: `plugins/<plugin>/.claude-plugin/plugin.json`; SKILL.md; `marketplace.json` entry appended last in `plugins[]`; README table row appended; README `claude plugin install <plugin>@xve-claude-marketplace` line appended after last install line.

plugin.json fields exactly: name, description, version (new plugin `0.1.0`), author `{"name": "XVE"}`. marketplace.json entry fields exactly: name, source `./plugins/<plugin>`, description (identical to plugin.json), version (identical), author, tags (1 to 3 lowercase words). No other fields. JSON indented 4 spaces, LF endings, final newline.

README is only human-facing file: plain prose, existing row style, no hype. Everything else follows SKILL.md rules below.

Frontmatter: `---` is line 1, closed by `---`. Invalid YAML drops every field silently. Field names exact and hyphenated. Never invent field names because unknown names are ignored silently. Valid: name, description, when_to_use, argument-hint, arguments, disable-model-invocation, user-invocable, allowed-tools, disallowed-tools, model, effort, context, agent, background, hooks, paths, shell. Set only fields skill needs; default pair is name and description.

description: starts with what skill does, then trigger phrases user says. Third person, no "I" or "you". Never summarizes body. Target under 300 characters; hard cap 1,536 shared with `when_to_use`. Name concrete nouns and verbs of task because routing sees only descriptions.

Skill deletes, overwrites, pushes, deploys, sends, or spends -> `disable-model-invocation: true`. Skill only helps Claude, never user -> `user-invocable: false`. `allowed-tools` lists only tools skill's own commands need, never destructive command because permission prompt is its guard; grant ends at next user message.

Skill takes input -> set `argument-hint`; reference input with arguments placeholder (`$` immediately followed by `ARGUMENTS`), indexed placeholder (`$` plus digit), or named `arguments`. No placeholder -> harness appends `ARGUMENTS: <value>`.

Body cap 500 lines, target under 60, because body stays in context all session after load. Hardest rules first because compaction keeps only first 5,000 tokens.

Body form, this file is reference: one rule per line, no hard wrapping, related constraints joined by semicolons when they fit one line. Never use bullets, numbered or ordered lists, tables, headings, bold, or blockquotes. Never use step, phase, workflow, option, menu, or checklist framing; skill is rules, not playbook.

Order-dependent actions: state as `Before X: Y.` or `After X: Y.` lines; never number them.

Wording: drop articles, filler, hedges, pleasantries, intros, outros, persona lines, restatements of description. Never use should, could, may, might, can, consider, try, prefer (as soft advice), please, you. Use imperatives, `Never`, `Always`, `Must`, `condition -> action`. Every rule checkable: pass or fail decidable from output alone.

Precision: name exact tools, flags, paths, field names, literal strings in backticks. Never write vague references like "relevant file". Define term once; never alias it. State positive action; negate only for hard prohibitions.

Reasons: only when rule's edge-case behavior depends on it; one trailing clause starting `because`. Examples: only when exact output format needs one to be stated; then literal output alone.

Body over 60 lines: move conditional detail to reference file beside SKILL.md; add rule `Before <trigger>: read <skill dir path>/<file>`, path written as in scripts rule. Reference files follow same form rules.

Scripts: bundled paths are `$` immediately followed by `{CLAUDE_SKILL_DIR}`, then `/<file>`; harness substitutes it before model reads body. Path unsubstituted -> use "Base directory for this skill" from load header. Never CLAUDE_PLUGIN_ROOT variable in shell command because tool shells lack it. Needed on Windows and POSIX -> ship `.ps1` and `.sh` with identical output, pick by OS.

In new skill write placeholders and `CLAUDE_SKILL_DIR` paths joined, as single literal token. This body splits them only because harness substitutes it at load; never copy that split.

Never use inline shell injection (bang before backticked command) unless output needed on every invocation, because harness runs it at load. Any non-zero exit aborts whole skill; append `|| true` when failure tolerable.

Before finishing: run `claude plugin validate <root>`; fix every error. Confirm both JSON files parse, plugin.json and marketplace.json versions equal, SKILL.md line 1 is `---`, new SKILL.md after closing `---` has zero lines starting with `-`, `*`, `|`, `#`, or digits followed by `.`.

Then report in at most 3 lines: files written, invocation `/<plugin>:<skill>`, new version. Never commit unless asked.
