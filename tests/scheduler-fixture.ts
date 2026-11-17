import { expect } from 'vitest'
import type {
  Admission,
  CommitDescriptor,
  ExecutionOutcome,
} from '../src/contracts/commit-scheduling'

export const repo = 'repo_abcdefghijklmnop'
export const committed: ExecutionOutcome = {
  kind: 'committed',
  commitId: 'a'.repeat(64),
}
export function descriptor(
  index: number,
  repositoryId = repo,
): CommitDescriptor {
  return {
    requestId: `req_${String(index).padStart(16, '0')}`,
    repositoryId,
    preparedRef: 'b'.repeat(64),
    actorSubject: 'agent',
    expectedHead: null,
    idempotencyKey: `key_${String(index).padStart(16, '0')}`,
  }
}
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
export function admitted(result: Admission) {
  expect(result.kind).toBe('admitted')
  if (result.kind !== 'admitted') throw new Error('Expected admission')
  return result
}
export const checkpoint = () => Promise.resolve()
