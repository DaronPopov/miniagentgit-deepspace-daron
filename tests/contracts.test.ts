import { expect, it } from 'vitest'
import {
  commitId,
  filePath,
  idempotencyKey,
  repositoryId,
} from '../src/domain/validation'
import { repositoryOwnerName } from '../src/domain/ownership'
import { validateCommit } from '../src/application/validate-commit'
import { authorizeOwner } from '../src/application/authorization'
import type { Result } from '../src/domain/result'

it('rejects invalid IDs and ambiguous or traversing paths', () => {
  for (const value of ['', '../repo', 'REPO_123', null, 10])
    expect(repositoryId(value).ok).toBe(false)
  expect(repositoryId('repo_abcdefghijklmnop').ok).toBe(true)
  expect(commitId('a'.repeat(64)).ok).toBe(true)
  expect(commitId('g'.repeat(64)).ok).toBe(false)
  expect(idempotencyKey('short').ok).toBe(false)
  for (const path of [
    '/root',
    '../a',
    'a/../b',
    'a//b',
    'a/./b',
    'a\\b',
    '%2e%2e/x',
    'C:/a',
    'a\0b',
    'a/',
    'é',
  ]) {
    expect(filePath(path).ok, path).toBe(false)
  }
  expect(filePath('src/index.ts').ok).toBe(true)
})

it('validates complete changes and rejects client ownership claims and malformed text', () => {
  const input = {
    expectedHead: null,
    idempotencyKey: 'unique_request_123',
    message: 'First',
    changes: [{ kind: 'put', path: 'a.txt', text: 'hello' }],
  }
  expect(validateCommit(input).ok).toBe(true)
  for (const change of [
    { kind: 'put', path: 'a', text: '\0' },
    { kind: 'put', path: 'a', text: '\ud800' },
    { kind: 'delete', path: 'a', owner: 'attacker' },
    { kind: 'unknown', path: 'a' },
  ])
    expect(validateCommit({ ...input, changes: [change] }).ok).toBe(false)
  expect(validateCommit({ ...input, ownerSubject: 'attacker' }).ok).toBe(false)
  expect(
    validateCommit({ ...input, changes: [...input.changes, ...input.changes] })
      .ok,
  ).toBe(false)
  expect(validateCommit({ ...input, expectedHead: undefined }).ok).toBe(false)
})

it('authorizes using persisted ownership and yields serializable discriminated results', () => {
  const repository = {
    id: 'repo_abcdefghijklmnop',
    name: 'demo',
    ownerSubject: 'owner',
    createdAt: '2026-11-17T00:00:00Z',
  }
  expect(
    authorizeOwner({ kind: 'user', subject: 'owner' }, repository, 'write').ok,
  ).toBe(true)
  const result: Result<void> = authorizeOwner(
    { kind: 'user', subject: 'other' },
    repository,
    'read',
  )
  expect(JSON.parse(JSON.stringify(result))).toMatchObject({
    ok: false,
    error: { code: 'FORBIDDEN' },
  })
  const conflict: Result<never> = {
    ok: false,
    error: { code: 'CONFLICT', message: 'Stale HEAD', actualHead: null },
  }
  expect(conflict.ok ? undefined : conflict.error.code).toBe('CONFLICT')
})

it('routes the same canonical repository to the same app-private owner name', () => {
  expect(repositoryOwnerName('repo_abcdefghijklmnop')).toEqual({
    ok: true,
    value: 'repo:repo_abcdefghijklmnop',
  })
  expect(repositoryOwnerName('repo_abcdefghijklmnop')).not.toEqual(
    repositoryOwnerName('repo_abcdefghijklmn00'),
  )
  expect(repositoryOwnerName('../repo_abcdefghijklmnop').ok).toBe(false)
})
