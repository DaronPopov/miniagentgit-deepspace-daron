import type { CommitMetadata, FileManifest } from '../../domain/repository'
import type { RepositoryService } from '../../application/repository-service'
import type { RepositoryContext } from '../../application/operations'
import { requireResourceLimits } from '../../application/resource-limits'
import type { ResourceLimits } from '../../application/resource-limits'
import { validateCommit } from '../../application/validate-commit'
import { validatePage } from '../../application/validate-inputs'
import { prepareCommit } from '../../application/prepare-commit'
import { canonicalRequest, sha256 } from '../../domain/commit-hashing'
import {
  commitId,
  filePath,
  idempotencyKey,
  repositoryId,
} from '../../domain/validation'
import { invalid, success } from '../../domain/result'
import type { Result } from '../../domain/result'
import type { Database } from './database'
import { stringColumn } from './database'
import {
  authorizedMetadata,
  commitMetadata,
  conflict,
  currentHead,
  lookupReplay,
  manifestAt,
  missing,
} from './repository-reads'
import { initializeRepository } from './repository-create'
import { persistCommit } from './commit-transaction'

export interface AuthorityOptions {
  readonly id: string
  readonly db: Database
  readonly limits?: ResourceLimits
  readonly now?: () => string
  readonly beforeHead?: () => void
}
export function createRepositoryAuthority(
  options: AuthorityOptions,
): RepositoryService & {
  readonly executeCommit: (
    context: RepositoryContext,
    input: unknown,
    signal: AbortSignal,
  ) => ReturnType<RepositoryService['createCommit']>
} {
  const { id, db } = options
  if (!repositoryId(id).ok) throw new Error('Invalid owner identity')
  const limits = requireResourceLimits(options.limits)
  const now = options.now ?? (() => new Date().toISOString())
  function read<T>(
    context: RepositoryContext,
    operation: () => Result<T>,
  ): Result<T> {
    if (
      context.repositoryId !== id ||
      context.actor.kind !== 'user' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(context.actor.subject)
    )
      return invalid('Invalid repository context')
    return db.transaction(() => {
      const authorized = authorizedMetadata(db, id, context.actor)
      return authorized.ok ? operation() : authorized
    })
  }
  async function executeCommit(
    context: RepositoryContext,
    input: unknown,
    signal?: AbortSignal,
  ) {
    const parsed = validateCommit(input, limits)
    if (!parsed.ok) return parsed
    const authorized = read(context, () => success(null))
    if (!authorized.ok) return authorized
    const digest = await sha256(
      canonicalRequest(id, context.actor, parsed.value),
    )
    const base = read<{
      replay: CommitMetadata | null
      manifest: FileManifest
    }>(context, () => {
      const replay = lookupReplay(
        db,
        context.actor,
        parsed.value.idempotencyKey,
        digest,
      )
      if (replay.ok) return success({ replay: replay.value, manifest: [] })
      if (replay.error.code !== 'NOT_FOUND') return replay
      const head = currentHead(db)
      return head.commitId === parsed.value.expectedHead
        ? success({ replay: null, manifest: manifestAt(db, head.commitId) })
        : conflict(head.commitId)
    })
    if (!base.ok) return base
    if (base.value.replay) return success(base.value.replay)
    const prepared = await prepareCommit(
      id,
      context.actor,
      parsed.value,
      base.value.manifest,
      now(),
    )
    if (signal?.aborted)
      return {
        ok: false as const,
        error: {
          code: 'UNAVAILABLE' as const,
          message: 'Execution cancelled before transaction',
        },
      }
    return persistCommit(
      db,
      id,
      context.actor,
      prepared,
      limits,
      options.beforeHead,
    )
  }
  return Object.freeze({
    initialize: async (actor, input) =>
      initializeRepository(db, id, actor, input, limits, now()),
    readRepository: async (context) =>
      read(context, () => authorizedMetadata(db, id, context.actor)),
    readHead: async (context) => read(context, () => success(currentHead(db))),
    readCommit: async (context, commit) =>
      read(context, () =>
        commitId(commit).ok
          ? commitMetadata(db, commit)
          : invalid('Invalid commit ID'),
      ),
    replay: async (context, key) =>
      read(context, () =>
        idempotencyKey(key).ok
          ? lookupReplay(db, context.actor, key)
          : invalid('Invalid idempotency key'),
      ),
    listTree: async (context, commit, page) =>
      read(context, () => {
        const parsed = validatePage(page, limits)
        if (!parsed.ok) return parsed
        const offset = page.cursor === null ? 0 : Number(page.cursor)
        if (
          !Number.isSafeInteger(offset) ||
          offset < 0 ||
          offset > limits.filesPerRepository ||
          (page.cursor !== null && !/^\d+$/.test(page.cursor))
        )
          return invalid('Invalid tree cursor')
        if (commit !== null && !commitId(commit).ok)
          return invalid('Invalid commit ID')
        const selected = commit ?? currentHead(db).commitId
        if (selected !== null && !commitMetadata(db, selected).ok)
          return missing()
        const tree = manifestAt(db, selected)
        return success({
          items: tree.slice(offset, offset + page.limit),
          nextCursor:
            offset + page.limit < tree.length
              ? String(offset + page.limit)
              : null,
        })
      }),
    readFile: async (context, commit, path) =>
      read(context, () => {
        if (!commitId(commit).ok || !filePath(path).ok)
          return invalid('Invalid file query')
        const row = db.all(
          `SELECT f.text FROM manifest_entries m JOIN file_contents f ON f.hash=m.content_hash WHERE m.commit_id=? AND m.path=?`,
          commit,
          path,
        )[0]
        return row ? success(stringColumn(row, 'text')) : missing()
      }),
    createCommit: executeCommit,
    executeCommit,
  })
}
