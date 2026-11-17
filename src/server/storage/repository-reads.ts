import type {
  CommitMetadata,
  FileManifest,
  Principal,
  RepositoryMetadata,
} from '../../domain/repository'
import { success } from '../../domain/result'
import type { Result } from '../../domain/result'
import { authorizeOwner } from '../../application/authorization'
import type { Database, SqlRow } from './database'
import { nullableString, numberColumn, stringColumn } from './database'

export const missing = (): Result<never> => ({
  ok: false,
  error: { code: 'NOT_FOUND', message: 'Repository resource not found' },
})
export const conflict = (
  actualHead: string | null,
  message = 'Expected HEAD does not match',
): Result<never> => ({
  ok: false,
  error: { code: 'CONFLICT', message, actualHead },
})
export function metadataRow(row: SqlRow): RepositoryMetadata {
  return {
    id: stringColumn(row, 'id'),
    name: stringColumn(row, 'name'),
    ownerSubject: stringColumn(row, 'owner_subject'),
    createdAt: stringColumn(row, 'created_at'),
  }
}
export function authorizedMetadata(
  db: Database,
  id: string,
  actor: Principal,
): Result<RepositoryMetadata> {
  const row = db.all('SELECT * FROM repository WHERE singleton=1')[0]
  if (!row) return missing()
  const metadata = metadataRow(row)
  if (metadata.id !== id)
    throw new Error('Repository routing identity mismatch')
  const permission = authorizeOwner(actor, metadata, 'read')
  return permission.ok ? success(metadata) : permission
}
export function currentHead(db: Database) {
  const row = db.all('SELECT commit_id, version FROM head WHERE singleton=1')[0]
  if (!row) throw new Error('Missing authoritative HEAD')
  return {
    commitId: nullableString(row, 'commit_id'),
    version: numberColumn(row, 'version'),
  }
}
export function commitMetadata(
  db: Database,
  id: string,
): Result<CommitMetadata> {
  const row = db.all('SELECT * FROM commits WHERE id=?', id)[0]
  return row
    ? success({
        id: stringColumn(row, 'id'),
        parentId: nullableString(row, 'parent_id'),
        author: { kind: 'user', subject: stringColumn(row, 'author_subject') },
        message: stringColumn(row, 'message'),
        createdAt: stringColumn(row, 'created_at'),
      })
    : missing()
}
export function manifestAt(db: Database, commit: string | null): FileManifest {
  if (commit === null) return []
  return db
    .all(
      `SELECT m.path, m.content_hash, f.utf8_bytes FROM manifest_entries m
    JOIN file_contents f ON m.content_hash=f.hash WHERE m.commit_id=? ORDER BY m.path`,
      commit,
    )
    .map((row) => ({
      path: stringColumn(row, 'path'),
      contentHash: stringColumn(row, 'content_hash'),
      utf8Bytes: numberColumn(row, 'utf8_bytes'),
    }))
}
export function lookupReplay(
  db: Database,
  actor: Principal,
  key: string,
  digest?: string,
): Result<CommitMetadata> {
  const row = db.all(
    'SELECT request_digest, commit_id FROM idempotency WHERE actor_subject=? AND key=?',
    actor.subject,
    key,
  )[0]
  if (!row) return missing()
  if (digest !== undefined && row.request_digest !== digest)
    return conflict(
      currentHead(db).commitId,
      'Idempotency key reused with different request',
    )
  return commitMetadata(db, stringColumn(row, 'commit_id'))
}
