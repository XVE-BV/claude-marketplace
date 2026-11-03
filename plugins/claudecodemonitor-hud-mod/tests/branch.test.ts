import { test, expect } from 'claude-code/testing'

import { branchLabel, clip, kindOf, probeLines, rowParts, rowText, stdoutOf, KIND_ARGS, MAX_LABEL, SKYRIFT_MARKER } from '../hooks/branch'

test('stdout of a git run: trimmed on success, nothing on any failure', async () => {
  expect(stdoutOf({ exitCode: 0, stdout: 'feat/x\n' })).toBe('feat/x')
  // a detached HEAD prints nothing from `branch --show-current`, and that is not a failure
  expect(stdoutOf({ exitCode: 0, stdout: '\n' })).toBe('')
  // not a repository
  expect(stdoutOf({ exitCode: 128, stdout: '' })).toBeUndefined()
  // an old git without --show-current
  expect(stdoutOf({ exitCode: 129, stdout: 'usage: git branch' })).toBeUndefined()
  expect(stdoutOf(undefined)).toBeUndefined()
})

test('clip: names up to 35 characters stay, longer ones are cut to 34 plus an ellipsis', async () => {
  expect(MAX_LABEL).toBe(35)
  const edge = 'a'.repeat(35)
  expect(clip(edge)).toBe(edge)
  expect(clip('a'.repeat(36))).toBe(`${'a'.repeat(34)}…`)
  expect(clip('feat/' + 'x'.repeat(60))).toHaveLength(35)
  expect(clip('feat/x')).toBe('feat/x')
})

test('clip: never cuts a character in half', async () => {
  const wide = '🌿'.repeat(40)
  expect(clip(wide)).toBe(`${'🌿'.repeat(34)}…`)
})

test('branch label: the current branch, clipped', async () => {
  expect(branchLabel('main')).toBe('main')
  expect(branchLabel('feat/x', '')).toBe('feat/x')
  expect(branchLabel('b'.repeat(50))).toBe(`${'b'.repeat(34)}…`)
})

test('branch label: a detached HEAD reads the short hash in parentheses', async () => {
  expect(branchLabel('', 'abc1234')).toBe('(abc1234)')
  // a hash is never cut: it is short already
  expect(branchLabel('', 'abc1234def')).toBe('(abc1234def)')
})

test('branch label: absent when git failed or has nothing to say', async () => {
  // git failed (not a repo, git missing): no current answer at all
  expect(branchLabel(undefined)).toBeUndefined()
  expect(branchLabel(undefined, 'abc1234')).toBeUndefined()
  // detached, and rev-parse failed or printed nothing
  expect(branchLabel('', undefined)).toBeUndefined()
  expect(branchLabel('', '')).toBeUndefined()
})

// What `git rev-parse --path-format=absolute --show-toplevel --git-dir
// --git-common-dir --show-superproject-working-tree` prints, line by line.
const PLAIN = ['/work/repo', '/work/repo/.git', '/work/repo/.git']
const WORKTREE = ['/work/wt', '/work/repo/.git/worktrees/wt', '/work/repo/.git']
const SUBMODULE = ['/work/super/subm', '/work/super/.git/modules/subm', '/work/super/.git/modules/subm', '/work/super']

test('kind probe: one rev-parse, the marker file named', async () => {
  expect(KIND_ARGS).toEqual(['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir', '--show-superproject-working-tree'])
  expect(SKYRIFT_MARKER).toBe('.skyrift-workspace')
})

test('kind of: a plain repository has none', async () => {
  expect(kindOf(PLAIN, false)).toBeUndefined()
})

test('kind of: a linked worktree, git dir apart from the common dir', async () => {
  expect(kindOf(WORKTREE, false)).toEqual({ kind: 'worktree', name: 'wt' })
})

test('kind of: a submodule, the fourth line names the superproject', async () => {
  expect(kindOf(SUBMODULE, false)).toEqual({ kind: 'submodule', name: 'subm' })
})

test('kind of: the skyrift marker names a skyrift workspace, which git sees as a plain repo', async () => {
  expect(kindOf(PLAIN, true)).toEqual({ kind: 'skyrift', name: 'repo' })
})

test('kind of: the marker wins over a worktree, and a worktree over a submodule', async () => {
  expect(kindOf(WORKTREE, true)).toEqual({ kind: 'skyrift', name: 'wt' })
  expect(kindOf(SUBMODULE, true)).toEqual({ kind: 'skyrift', name: 'subm' })
  // a worktree whose git dir also sits in a superproject: still the worktree
  expect(kindOf([...WORKTREE, '/work/super'], false)).toEqual({ kind: 'worktree', name: 'wt' })
})

test('kind of: the name is the last folder of the toplevel, whichever way the path is written', async () => {
  expect(kindOf(['/work/repo/', '/work/repo/.git', '/work/repo/.git'], true)?.name).toBe('repo')
  expect(kindOf(['C:/work/repo', 'C:/work/repo/.git', 'C:/work/repo/.git'], true)?.name).toBe('repo')
  expect(kindOf(['C:\\work\\repo', 'C:\\work\\repo\\.git', 'C:\\work\\repo\\.git'], true)?.name).toBe('repo')
})

test('kind of: a git error or a missing line is no kind, marker or not', async () => {
  for (const hasMarker of [false, true]) {
    // git failed: nothing printed
    expect(kindOf([], hasMarker)).toBeUndefined()
    expect(kindOf([''], hasMarker)).toBeUndefined()
    // an old git printed a part of it
    expect(kindOf(['/work/repo'], hasMarker)).toBeUndefined()
    expect(kindOf(['/work/repo', '/work/repo/.git'], hasMarker)).toBeUndefined()
    // a toplevel with no name
    expect(kindOf(['/', '/.git', '/.git'], hasMarker)).toBeUndefined()
    expect(kindOf(['', '/work/repo/.git', '/work/repo/.git'], hasMarker)).toBeUndefined()
  }
})

test('kind of: git before 2.31 echoes the flag as line 1, which is not a path: no kind, marker or not', async () => {
  for (const hasMarker of [false, true]) {
    expect(kindOf(['--path-format=absolute', '/w/r', '.git', '.git'], hasMarker)).toBeUndefined()
    // in a subdirectory the git dir is absolute, the common dir is not
    expect(kindOf(['--path-format=absolute', '/w/r', '/w/r/.git', '../../.git'], hasMarker)).toBeUndefined()
    // any of the first three lines relative: no kind
    expect(kindOf(['/w/r', '.git', '.git'], hasMarker)).toBeUndefined()
    expect(kindOf(['/w/r', '/w/r/.git', '../../.git'], hasMarker)).toBeUndefined()
    expect(kindOf(['w/r', '/w/r/.git', '/w/r/.git'], hasMarker)).toBeUndefined()
  }
})

test('kind of: a Windows path, with a drive or a network share, is absolute', async () => {
  expect(kindOf(['C:\\work\\wt', 'C:\\work\\repo\\.git\\worktrees\\wt', 'C:\\work\\repo\\.git'], false)).toEqual({ kind: 'worktree', name: 'wt' })
  expect(kindOf(['c:/work/wt', 'c:/work/repo/.git/worktrees/wt', 'c:/work/repo/.git'], false)).toEqual({ kind: 'worktree', name: 'wt' })
  expect(kindOf(['\\\\server\\share\\repo', '\\\\server\\share\\repo\\.git', '\\\\server\\share\\repo\\.git'], true)).toEqual({ kind: 'skyrift', name: 'repo' })
})

test('probe lines: a git that answered is exit 0 with three lines or more', async () => {
  expect(probeLines({ exitCode: 0, stdout: '/work/repo\n/work/repo/.git\n/work/repo/.git\n' })).toEqual(PLAIN)
  expect(probeLines({ exitCode: 0, stdout: `${SUBMODULE.join('\n')}\n` })).toEqual(SUBMODULE)
  expect(probeLines({ exitCode: 0, stdout: `${WORKTREE.join('\r\n')}\r\n` })).toEqual(WORKTREE)
})

test('probe lines: a git that did not answer is a failed exit, a run that never came back, or too little', async () => {
  // a timeout, a git that cannot start: no run at all
  expect(probeLines(undefined)).toBeUndefined()
  // not a repository, a bare repository, an unknown option
  expect(probeLines({ exitCode: 128, stdout: '' })).toBeUndefined()
  expect(probeLines({ exitCode: 129, stdout: `${PLAIN.join('\n')}\n` })).toBeUndefined()
  // a stdout that is not text
  expect(probeLines({ exitCode: 0, stdout: undefined as unknown as string })).toBeUndefined()
  // exit 0 with less than the three lines every git prints
  expect(probeLines({ exitCode: 0, stdout: '' })).toBeUndefined()
  expect(probeLines({ exitCode: 0, stdout: '\n' })).toBeUndefined()
  expect(probeLines({ exitCode: 0, stdout: '/work/repo\n/work/repo/.git\n' })).toBeUndefined()
})

test('probe lines: answered is not the same as recognized, git before 2.31 answers with lines kindOf refuses', async () => {
  // exit 0 and four lines: answered (the folder is not asked again), though the lines are shifted
  const old = probeLines({ exitCode: 0, stdout: '--path-format=absolute\n/w/r\n.git\n.git\n' })
  expect(old).toEqual(['--path-format=absolute', '/w/r', '.git', '.git'])
  expect(kindOf(old!, false)).toBeUndefined()
})

test('row: the branch alone when there is no kind', async () => {
  expect(rowText('feat/x')).toBe('feat/x')
  expect(rowText('feat/x', undefined)).toBe('feat/x')
  expect(rowParts('feat/x')).toEqual([{ text: 'feat/x', tone: 'branch' }])
})

test('row: each kind reads branch, dim dot, the kind word, the name dim', async () => {
  expect(rowText('feat/x', { kind: 'skyrift', name: 'hudbr-pr' })).toBe('feat/x · skyrift hudbr-pr')
  expect(rowText('main', { kind: 'submodule', name: 'subm' })).toBe('main · submodule subm')
  expect(rowText('dev', { kind: 'worktree', name: 'wt' })).toBe('dev · worktree wt')
  expect(rowParts('feat/x', { kind: 'skyrift', name: 'hudbr-pr' })).toEqual([
    { text: 'feat/x', tone: 'branch' },
    { text: ' · ', tone: 'dim' },
    { text: 'skyrift', tone: 'kind' },
    { text: ' hudbr-pr', tone: 'dim' },
  ])
})

test('row: a detached HEAD keeps its hash in parentheses beside the kind', async () => {
  expect(rowText('(abc1234)', { kind: 'worktree', name: 'wt' })).toBe('(abc1234) · worktree wt')
})

test('row: the name is cut like the branch, 35 stay whole, more go to 34 plus an ellipsis', async () => {
  const edge = 'n'.repeat(MAX_LABEL)
  expect(rowText('b', { kind: 'skyrift', name: edge })).toBe(`b · skyrift ${edge}`)
  const cut = rowText('b', { kind: 'skyrift', name: 'n'.repeat(60) })
  expect(cut).toBe(`b · skyrift ${'n'.repeat(34)}…`)
  expect(rowParts('b', { kind: 'skyrift', name: 'n'.repeat(60) })[3]?.text).toBe(` ${clip('n'.repeat(60))}`)
  // wide characters are not split either
  expect(rowText('b', { kind: 'worktree', name: '🌿'.repeat(40) })).toBe(`b · worktree ${'🌿'.repeat(34)}…`)
})
