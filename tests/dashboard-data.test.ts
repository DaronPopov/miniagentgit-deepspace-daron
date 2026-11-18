import { expect, it } from 'vitest'
import { file, head, treePage } from '../src/features/dashboard/repository-data'
import { receipt } from '../src/features/dashboard/ci-data'

const commit = 'a'.repeat(64)
const base = {
  jobId: 'ci_' + commit,
  repositoryId: 'repo_abcdefghijklmnop',
  commitId: commit,
  generation: 1,
  terminalState: 'failed',
  completedAt: 1,
  pipeline: { id: 'miniagentgit-ci-v1', version: 3, fingerprint: commit },
  code: 'checks_failed',
  diagnostics: [
    { check: 'imports', code: 'missing_import', path: 'src/main.ts' },
  ],
  truncated: false,
  files: 1,
  bytes: 25,
  work: 385,
}

it('decodes historical and current receipts with their actual check sets', () => {
  const checks = {
    manifest: 'passed',
    source: 'passed',
    typescript: 'deferred',
  }
  const old = { ...base, schemaVersion: 1, checks, diagnostics: [] }
  const current = {
    ...base,
    schemaVersion: 2,
    checks: { ...checks, syntax: 'passed', lint: 'passed', imports: 'failed' },
  }
  expect(receipt(old)?.checks).toEqual(checks)
  expect(receipt(current)?.checks).toEqual(current.checks)
  expect(receipt({ ...current, checks })).toBeUndefined()
  expect(receipt({ ...current, terminalState: 'running' })).toBeUndefined()
})
it('accepts empty HEAD and literal bounded text while rejecting malformed data', () => {
  expect(head({ commitId: null, version: 0 })).toEqual({
    commitId: null,
    version: 0,
  })
  expect(head({ commitId: 'invalid', version: 1 })).toBeUndefined()
  expect(file('<b>literal</b>')).toBe('<b>literal</b>')
  expect(file('a'.repeat(32769))).toBeUndefined()
  expect(
    treePage({
      items: [{ path: 'x', contentHash: 'invalid', utf8Bytes: 1 }],
      nextCursor: null,
    }),
  ).toBeUndefined()
})
