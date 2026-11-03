// The branch segment: what git printed, turned into the text the band shows.
// Pure functions; register.ts runs git and feeds them.

export type GitRun = { exitCode: number; stdout: string }

// A name is shown whole up to this many characters, then cut to one less
// plus an ellipsis.
export const MAX_LABEL = 35

// What a git run printed, trimmed. undefined when git failed (not a
// repository, git missing, a run that never answered); '' when it ran fine
// and had nothing to say, as `branch --show-current` does on a detached HEAD.
export function stdoutOf(run: GitRun | undefined): string | undefined {
  if (!run || run.exitCode !== 0 || typeof run.stdout !== 'string') return undefined
  return run.stdout.trim()
}

// Counted in characters, not UTF-16 units, so a cut never splits a pair.
export function clip(name: string): string {
  const chars = [...name]
  return chars.length > MAX_LABEL ? `${chars.slice(0, MAX_LABEL - 1).join('')}…` : name
}

// `current` is the stdout of `branch --show-current`, `head` that of
// `rev-parse --short HEAD`, asked only when `current` came back empty.
// A branch reads as its name, a detached HEAD as `(abc1234)`, anything
// else as nothing.
export function branchLabel(current: string | undefined, head?: string): string | undefined {
  if (current === undefined) return undefined
  if (current !== '') return clip(current)
  return head ? `(${head})` : undefined
}
