import type { CiStore } from '../../../application/ci/store'
import type { RepositoryContext } from '../../../application/operations'
import type { CiLimits } from '../../../application/ci/limits'
import type { Result } from '../../../domain/result'
import { invalid, success } from '../../../domain/result'
import { commitId } from '../../../domain/validation'
import type { Database } from '../database'
import { stringColumn } from '../database'
import {
  authorizedMetadata,
  conflict,
  commitMetadata,
  missing,
} from '../repository-reads'
import { admitCi } from './admission'
import { claimCi, finishCi, recoverCi, stopCi } from './execution'
import { loadCiSnapshot } from './snapshot'
import { findJob } from './writes'
import { jobRow, terminal } from './rows'
import { readReceipt } from './receipt-read'

export function createCiStore(
  db: Database,
  id: string,
  limits: CiLimits,
  now: () => number,
): CiStore {
  function access<T>(
    context: RepositoryContext,
    operation: () => Result<T>,
  ): Result<T> {
    if (context.repositoryId !== id || context.actor.kind !== 'user')
      return invalid('Invalid CI context')
    return db.transaction(() => {
      const auth = authorizedMetadata(db, id, context.actor)
      return auth.ok ? operation() : auth
    })
  }
  return Object.freeze<CiStore>({
    admit: (context, commit, pipeline, jobId) =>
      access(context, () =>
        admitCi(db, id, commit, pipeline, jobId, now(), limits),
      ),
    get: (context, job) =>
      access(context, () => {
        const value = findJob(db, job)
        return value ? success(value) : missing()
      }),
    receipt: (context, id) =>
      access(context, () => {
        const job = findJob(db, id)
        if (!job) return missing()
        if (!terminal(job)) return conflict(null, 'CI receipt not ready')
        const row = db.all(
          'SELECT payload FROM ci_receipts WHERE job_id=?',
          id,
        )[0]
        return row
          ? success(readReceipt(stringColumn(row, 'payload'), job))
          : missing()
      }),
    list: (context, offset, limit, commit) =>
      access(context, () => {
        if (
          !Number.isSafeInteger(offset) ||
          offset < 0 ||
          offset > limits.storedJobs ||
          !Number.isSafeInteger(limit) ||
          limit < 1 ||
          limit > limits.pageSize
        )
          return invalid('Invalid CI page')
        if (commit !== undefined) {
          if (!commitId(commit).ok) return invalid('Invalid commit')
          const exists = commitMetadata(db, commit)
          if (!exists.ok) return exists
        }
        const rows =
          commit === undefined
            ? db.all(
                'SELECT * FROM ci_jobs ORDER BY seq LIMIT ? OFFSET ?',
                limit + 1,
                offset,
              )
            : db.all(
                'SELECT * FROM ci_jobs WHERE commit_id=? ORDER BY seq LIMIT ? OFFSET ?',
                commit,
                limit + 1,
                offset,
              )
        return success({
          items: rows.slice(0, limit).map(jobRow),
          nextCursor: rows.length > limit ? String(offset + limit) : null,
        })
      }),
    recover: (context) => access(context, () => recoverCi(db, now(), limits)),
    claim: (context, pipeline) =>
      access(context, () => claimCi(db, pipeline, now(), limits)),
    snapshot: (context, job) =>
      access(context, () => loadCiSnapshot(db, job, limits)),
    finish: (context, job, result) =>
      access(context, () => finishCi(db, job, result, now(), limits)),
    stop: (context, job, reason, generation) =>
      access(context, () => stopCi(db, job, reason, now(), limits, generation)),
  })
}
