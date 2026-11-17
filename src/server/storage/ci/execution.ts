import type { CiJob, CiPipeline, CiValidation } from '../../../contracts/ci'
import type { CiLimits } from '../../../application/ci/limits'
import type { Result } from '../../../domain/result'
import { success } from '../../../domain/result'
import { conflict, missing } from '../repository-reads'
import type { Database } from '../database'
import { jobRow, nextGeneration, terminal } from './rows'
import { findJob, writeTerminal } from './writes'

export function recoverCi(
  db: Database,
  now: number,
  limits: CiLimits,
): Result<null> {
  const jobs = db
    .all(
      "SELECT * FROM ci_jobs WHERE state='running' ORDER BY seq LIMIT ?",
      limits.outstanding,
    )
    .map(jobRow)
  for (const job of jobs) {
    const generation = nextGeneration(job)
    if (
      job.attempts >= limits.attempts ||
      generation === Number.MAX_SAFE_INTEGER
    ) {
      writeTerminal(
        db,
        { ...job, generation },
        'interrupted',
        generation === Number.MAX_SAFE_INTEGER
          ? 'generation_exhausted'
          : 'attempts_exhausted',
        now,
        limits,
      )
    } else
      db.run(
        "UPDATE ci_jobs SET state='queued', generation=?, updated_ms=?, deadline_ms=0, code='recovered' WHERE id=?",
        generation,
        now,
        job.id,
      )
  }
  return success(null)
}
export function claimCi(
  db: Database,
  pipeline: CiPipeline,
  now: number,
  limits: CiLimits,
): Result<CiJob | null> {
  if (db.all("SELECT id FROM ci_jobs WHERE state='running' LIMIT 1")[0])
    return success(null)
  const row = db.all(
    "SELECT * FROM ci_jobs WHERE state='queued' ORDER BY seq LIMIT 1",
  )[0]
  if (!row) return success(null)
  const job = jobRow(row)
  if (
    job.pipeline.version !== pipeline.version ||
    job.pipeline.fingerprint !== pipeline.fingerprint ||
    job.attempts >= limits.attempts ||
    job.generation >= Number.MAX_SAFE_INTEGER - 1
  ) {
    writeTerminal(
      db,
      { ...job, generation: nextGeneration(job) },
      'interrupted',
      job.pipeline.version !== pipeline.version ||
        job.pipeline.fingerprint !== pipeline.fingerprint
        ? 'pipeline_unavailable'
        : job.attempts >= limits.attempts
          ? 'attempts_exhausted'
          : 'generation_exhausted',
      now,
      limits,
    )
    return success(null)
  }
  db.run(
    "UPDATE ci_jobs SET state='running', generation=generation+1, attempts=attempts+1, updated_ms=?, deadline_ms=?, code='none' WHERE id=?",
    now,
    now + limits.deadlineMs,
    job.id,
  )
  return success(findJob(db, job.id) ?? null)
}
export function finishCi(
  db: Database,
  original: CiJob,
  validation: CiValidation,
  now: number,
  limits: CiLimits,
): Result<CiJob> {
  const job = findJob(db, original.id)
  if (!job) return missing()
  if (job.state !== 'running' || job.generation !== original.generation)
    return conflict(null, 'Stale CI execution generation')
  if (now >= job.deadline)
    return success(
      writeTerminal(
        db,
        { ...job, generation: nextGeneration(job) },
        'expired',
        'deadline',
        now,
        limits,
      ),
    )
  return success(
    writeTerminal(
      db,
      job,
      validation.state,
      validation.code,
      now,
      limits,
      validation,
    ),
  )
}
export function stopCi(
  db: Database,
  id: string,
  reason: 'cancelled' | 'expired',
  now: number,
  limits: CiLimits,
  generation?: number,
): Result<CiJob> {
  const job = findJob(db, id)
  if (!job) return missing()
  if (generation !== undefined && job.generation !== generation)
    return conflict(null, 'Stale CI execution generation')
  if (terminal(job)) return success(job)
  if (reason === 'expired' && (job.state !== 'running' || now < job.deadline))
    return conflict(null, 'CI deadline not reached')
  return success(
    writeTerminal(
      db,
      { ...job, generation: nextGeneration(job) },
      reason,
      reason === 'expired' ? 'deadline' : 'cancelled',
      now,
      limits,
    ),
  )
}
