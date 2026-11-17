import {
  encodeCheckpoint,
  readCheckpoint,
} from '../../../application/ci/checkpoint'
import type { CiDispatch } from '../../../application/ci/stages'
import { dispatchFor, stageBounds } from '../../../application/ci/stages'
import { ciLimits } from '../../../application/ci/limits'
import type { Database } from '../database'
import { stringColumn } from '../database'
import { findJob, writeTerminal } from './writes'
import { terminal, nextGeneration } from './rows'

const limits = ciLimits()

export function reserveDispatch(
  db: Database,
  id: string,
  now: number,
): CiDispatch | undefined {
  return db.transaction(() => {
    const job = findJob(db, id)
    const cursor = db.all(
      'SELECT ordinal, checkpoint FROM ci_stages WHERE job_id=?',
      id,
    )[0]
    if (!job || terminal(job) || job.pipeline.version !== 3 || !cursor) return
    const deadline = job.createdAt + stageBounds.elapsedMs
    if (now >= deadline) {
      writeTerminal(
        db,
        { ...job, generation: nextGeneration(job) },
        'expired',
        'deadline',
        now,
        limits,
      )
      return
    }
    if (
      job.attempts >= stageBounds.dispatchAttempts ||
      (job.state === 'running' &&
        now - job.updatedAt < stageBounds.dispatchLeaseMs)
    )
      return
    const ordinal = cursor.ordinal
    const prior =
      typeof ordinal === 'number' && typeof cursor.checkpoint === 'string'
        ? readCheckpoint(cursor.checkpoint, job, ordinal, limits)
        : undefined
    if (
      typeof ordinal !== 'number' ||
      (ordinal === 0 ? cursor.checkpoint !== '' : !prior)
    ) {
      writeTerminal(db, job, 'failed', 'validator_exception', now, limits)
      return
    }
    db.run(
      "UPDATE ci_jobs SET state='running', attempts=attempts+1, generation=generation+1, deadline_ms=?, updated_ms=? WHERE id=?",
      deadline,
      now,
      id,
    )
    const claimed = findJob(db, id)
    if (!claimed) throw new Error('Missing reserved dispatch')
    if (prior)
      db.run(
        'UPDATE ci_stages SET checkpoint=? WHERE job_id=?',
        encodeCheckpoint(claimed, ordinal, prior),
        id,
      )
    return dispatchFor(claimed)
  })
}

/** One repository-local wakeup for pending deadlines, including orphaned dispatches. */
export function reconcileStageDeadlines(
  db: Database,
  now: number,
): number | undefined {
  return db.transaction(() => {
    const rows = db.all(
      "SELECT j.id FROM ci_jobs j JOIN ci_stages s ON s.job_id=j.id WHERE j.state IN ('queued','running') ORDER BY j.deadline_ms LIMIT ?",
      limits.outstanding,
    )
    for (const row of rows) {
      const job = findJob(db, stringColumn(row, 'id'))
      if (!job) throw new Error('Missing staged job')
      if (job.deadline > now) return job.deadline
      writeTerminal(
        db,
        { ...job, generation: nextGeneration(job) },
        'expired',
        'deadline',
        now,
        limits,
      )
    }
    return undefined
  })
}
