import { test, expect } from 'claude-code/testing'

import { branchLabel, clip, stdoutOf, MAX_LABEL } from '../hooks/branch'

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
