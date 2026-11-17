import { expect, expectTypeOf, it, vi } from 'vitest'
import type { RepositoryHeadResult } from '../src/features/agent-tools/contracts'
import {
  TOOL_RESULT_BYTES,
  validateHeadInput,
  validateHead,
  validateHeadResult,
} from '../src/features/agent-tools/contracts'
import { repositoryHead } from '../src/features/agent-tools/repository-head'
import {
  headInputSchema,
  headOutputSchema,
} from '../src/features/agent-tools/schemas'

const id = 'repo_' + 'a'.repeat(32)
it('validates only a bounded repository ID without owner or namespace overrides', async () => {
  expectTypeOf<RepositoryHeadResult>().toEqualTypeOf<
    Readonly<RepositoryHeadResult>
  >()
  expect(validateHeadInput({ repositoryId: id })).toEqual({
    ok: true,
    value: { repositoryId: id },
  })
  const read = vi.fn()
  for (const input of [
    null,
    [],
    {},
    'repository',
    { repositoryId: 'bad' },
    { repositoryId: 'repo_' + 'a'.repeat(33) },
    { repositoryId: id, userId: 'Alice' },
    { repositoryId: id, namespace: 'other' },
    { repositoryId: id, owner: 'Alice' },
  ]) {
    expect((await repositoryHead(input, read)).ok).toBe(false)
    expect(() => headInputSchema['~standard'].validate(input)).toThrow(
      'Expected only a valid repositoryId',
    )
  }
  expect(read).not.toHaveBeenCalled()
})
it('returns readonly bounded serializable HEAD values and rejects inconsistent results', async () => {
  const empty = { repositoryId: id, commitId: null, version: 0 }
  expect(
    await repositoryHead({ repositoryId: id }, async () => ({
      ok: true,
      value: { commitId: null, version: 0 },
    })),
  ).toEqual({ ok: true, value: empty })
  expect(headOutputSchema['~standard'].validate(empty)).toEqual({
    value: empty,
  })
  expect(validateHeadResult(empty).ok).toBe(true)
  for (const value of [
    { commitId: null, version: 1 },
    { commitId: 'a'.repeat(64), version: 0 },
    { commitId: null, version: -1 },
    { commitId: null, version: NaN },
    { commitId: null, version: Number.MAX_SAFE_INTEGER + 1 },
    { commitId: 'invalid', version: 1 },
    { commitId: null, version: 0, token: 'private' },
  ])
    expect(validateHead(value).ok).toBe(false)
  expect(validateHeadResult({ ...empty, jwt: 'private' }).ok).toBe(false)
  const maximum = {
    repositoryId: id,
    commitId: 'f'.repeat(64),
    version: Number.MAX_SAFE_INTEGER,
  }
  expect(validateHeadResult(maximum).ok).toBe(true)
  expect(
    new TextEncoder().encode(JSON.stringify(maximum)).byteLength,
  ).toBeLessThan(TOOL_RESULT_BYTES)
})
it('keeps refusals typed and never treats dependency exceptions as success', async () => {
  const forbidden = {
    ok: false,
    error: { code: 'FORBIDDEN', message: 'Repository access denied' },
  } as const
  expect(
    await repositoryHead({ repositoryId: id }, async () => forbidden),
  ).toEqual(forbidden)
  const failure = await repositoryHead({ repositoryId: id }, async () => {
    throw new Error('private SQL and credential detail')
  })
  expect(failure).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } })
  expect(JSON.stringify(failure)).not.toContain('private SQL')
})
