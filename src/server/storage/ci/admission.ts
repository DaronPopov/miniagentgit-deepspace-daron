import type { CiPipeline, CiJob } from '../../../contracts/ci'
import type { CiLimits } from '../../../application/ci/limits'
import type { Result } from '../../../domain/result'
import { success } from '../../../domain/result'
import { commitId } from '../../../domain/validation'
import type { Database } from '../database'
import { numberColumn } from '../database'
import { commitMetadata } from '../repository-reads'
import { jobRow } from './rows'
import { findJob } from './writes'

/** Caller owns the authorization+SQL transaction. Never evicts durable identity rows. */
export function admitCi(
  db: Database,
  repository: string,
  commit: string,
  pipeline: CiPipeline,
  id: string,
  now: number,
  limits: CiLimits,
): Result<CiJob> {
  if (
    !commitId(commit).ok ||
    !commitId(pipeline.fingerprint).ok ||
    pipeline.id !== 'miniagentgit-ci-v1' ||
    !Number.isSafeInteger(pipeline.version) ||
    pipeline.version < 1 ||
    pipeline.version > 1000000 ||
    !/^ci_[a-f0-9]{64}$/.test(id)
  )
    return {
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'Invalid CI identity' },
    }
  const exists = commitMetadata(db, commit)
  if (!exists.ok) return exists
  const previous = db.all(
    'SELECT * FROM ci_jobs WHERE repository_id=? AND commit_id=? AND pipeline_id=? AND pipeline_version=? AND fingerprint=?',
    repository,
    commit,
    pipeline.id,
    pipeline.version,
    pipeline.fingerprint,
  )[0]
  if (previous) return success(jobRow(previous))
  const counts =
    db.all(`SELECT COUNT(*) AS stored, COALESCE(SUM(storage_bytes),0) AS bytes,
    COALESCE(SUM(CASE WHEN state IN ('queued','running') THEN 1 ELSE 0 END),0) AS pending FROM ci_jobs`)[0]
  if (!counts) throw new Error('Missing CI counters')
  const reservation = 1024 + limits.receiptBytes
  for (const [resource, actual, maximum] of [
    ['ciOutstanding', numberColumn(counts, 'pending') + 1, limits.outstanding],
    ['ciStoredJobs', numberColumn(counts, 'stored') + 1, limits.storedJobs],
    [
      'ciStoredBytes',
      numberColumn(counts, 'bytes') + reservation,
      limits.storedBytes,
    ],
  ] as const)
    if (actual > maximum)
      return {
        ok: false,
        error: { code: 'QUOTA_EXCEEDED', resource, maximum, actual },
      }
  db.run(
    `INSERT INTO ci_jobs(id,repository_id,commit_id,pipeline_id,fingerprint,pipeline_version,state,generation,attempts,created_ms,updated_ms,deadline_ms,code,storage_bytes)
    VALUES (?,?,?,?,?,?,'queued',0,0,?,?,0,'none',?)`,
    id,
    repository,
    commit,
    pipeline.id,
    pipeline.fingerprint,
    pipeline.version,
    now,
    now,
    reservation,
  )
  const job = findJob(db, id)
  if (!job) throw new Error('CI acceptance not persisted')
  return success(job)
}
