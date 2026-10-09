Sources behind rules in SKILL.md, retrieved 2026-10-09. Rules live in SKILL.md; this file records origin and verdicts only.

Guide (PDF, 33 pages): https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf

Guide adopted: angle-bracket ban, reserved words, 1,024 description cap, scripts/references/assets layout, exact SKILL.md name, no README.md in skill directory, negative triggers, deterministic checks as scripts.

Guide rejected: numbered steps, templates with headings, worked examples, troubleshooting sections, repeated key points, because form rules in SKILL.md ban them.

Platform best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

Platform adopted: name and description limits, one-level-deep references, contents line over 100 lines, forward slashes, third-person descriptions. Platform rejected: gerund names, checklists, workflow framing.

Claude Code skills docs: https://code.claude.com/docs/en/skills

Claude Code docs adopted: frontmatter field list, substitution variables, 500-line cap, 5,000-token compaction budget, shell-injection behavior.

Claude Code changelog (read for Oct 1 to 8, 2026 only): https://code.claude.com/docs/en/changelog

Before changing frontmatter, layout, or limit rules: re-read these sources, diff against SKILL.md, change only what moved, because guide revisions arrive unannounced.
