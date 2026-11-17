import { DatabaseSync } from 'node:sqlite'
import { expect } from 'vitest'
import type { Database } from '../src/server/storage/database'
import { initializeDatabase } from '../src/server/storage/migrations'
import { createRepositoryAuthority } from '../src/server/storage/repository-authority'
import type { AuthorityOptions } from '../src/server/storage/repository-authority'
import { createRepositoryRuntime } from '../src/application/repository-runtime'
import { repositoryIdentity } from '../src/domain/commit-hashing'
import type { CommitRequest, Principal } from '../src/domain/repository'
import type { Result } from '../src/domain/result'

export const actor: Principal = { kind: 'user', subject: 'owner' }
export const creation = { name: 'demo', idempotencyKey: 'create_repository_1' }
export function unwrap<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}
export function nodeDatabase(path = ':memory:', initialize = true) {
  const sql = new DatabaseSync(path)
  sql.exec('PRAGMA foreign_keys=ON')
  const db: Database = {
    all: (query, ...values) => sql.prepare(query).all(...values),
    run: (query, ...values) => {
      sql.prepare(query).run(...values)
    },
    transaction: (closure) => {
      sql.exec('BEGIN IMMEDIATE')
      try {
        const value = closure()
        sql.exec('COMMIT')
        return value
      } catch (error) {
        sql.exec('ROLLBACK')
        throw error
      }
    },
  }
  if (initialize) initializeDatabase(db)
  return { db, sql, close: () => sql.close() }
}
export async function fixture(
  options: Partial<Pick<AuthorityOptions, 'limits' | 'beforeHead'>> = {},
  path?: string,
) {
  const database = nodeDatabase(path)
  const id = await repositoryIdentity(actor, creation.idempotencyKey)
  const authority = createRepositoryAuthority({
    ...options,
    id,
    db: database.db,
    now: () => '2026-11-17T00:00:00.000Z',
  })
  const runtime = createRepositoryRuntime({
    id,
    authority,
    limits: options.limits,
  })
  const context = { repositoryId: id, actor }
  return {
    ...database,
    id,
    authority,
    runtime,
    context,
    initialize: () => authority.initialize(actor, creation),
  }
}
export function request(
  key = 'commit_request_key_1',
  expectedHead: string | null = null,
  text = 'hello',
): CommitRequest {
  return {
    idempotencyKey: key,
    expectedHead,
    message: 'Update',
    changes: [{ kind: 'put', path: 'src/a.txt', text }],
  }
}
