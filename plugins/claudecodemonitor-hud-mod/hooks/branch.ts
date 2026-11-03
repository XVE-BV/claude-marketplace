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

// BEGIN kind: one block, copied verbatim between the HUD mod's hooks/branch.ts and the branch-band mod's hooks/register.ts

// What kind of checkout the session folder is, besides a plain repository.
// Pure; register.ts runs git and the marker lookup and feeds them.
export type Kind = { kind: 'skyrift' | 'worktree' | 'submodule'; name: string }

// The one git call that tells. Its stdout lines are the toplevel, the git dir,
// the common dir and, only inside a submodule, the superproject's root.
export const KIND_ARGS = ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir', '--show-superproject-working-tree']

// A skyrift workspace is a clone that git takes for a plain repository; only
// this file at its toplevel tells.
export const SKYRIFT_MARKER = '.skyrift-workspace'

const baseName = (path: string) => path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? ''

// `lines` is what KIND_ARGS printed, `hasMarker` whether SKYRIFT_MARKER exists
// in the toplevel (lines[0]). A skyrift marker beats a linked worktree (the git
// dir is not the common dir), which beats a submodule (a 4th line). A line that
// is missing, or a toplevel with no name, reads as no kind.
export function kindOf(lines: string[], hasMarker: boolean): Kind | undefined {
  const [top, gitDir, commonDir, superproject] = lines
  if (!top || !gitDir || !commonDir) return undefined
  const name = baseName(top)
  if (name === '') return undefined
  if (hasMarker) return { kind: 'skyrift', name }
  if (gitDir !== commonDir) return { kind: 'worktree', name }
  if (superproject) return { kind: 'submodule', name }
  return undefined
}

export type Part = { text: string; tone: 'branch' | 'dim' | 'kind' }

// The row after its glyph, as the parts to draw. `branch` is a branch label,
// cut already. With a kind: a dim dot, the kind word, the folder's name dim,
// cut to the same length as the branch.
export function rowParts(branch: string, kind?: Kind): Part[] {
  const parts: Part[] = [{ text: branch, tone: 'branch' }]
  if (kind) parts.push({ text: ' · ', tone: 'dim' }, { text: kind.kind, tone: 'kind' }, { text: ` ${clip(kind.name)}`, tone: 'dim' })
  return parts
}

// The same row as plain text; the band redraws only when this changes.
export function rowText(branch: string, kind?: Kind): string {
  return rowParts(branch, kind).map(part => part.text).join('')
}

// END kind
