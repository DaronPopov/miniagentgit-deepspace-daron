import type { CiJob, CiValidation } from '../../../contracts/ci'
import { ciPipeline } from '../../../application/ci/pipelines'
import { ciLimits } from '../../../application/ci/limits'
import { stageBounds } from '../../../application/ci/stages'
import type {
  CiDispatch,
  CiStage,
  StageReply,
} from '../../../application/ci/stages'
import {
  failedValidation,
  validateIntegrity,
  validateSource,
} from '../../../application/ci/validation'
import type { Database } from '../database'
import { numberColumn, stringColumn } from '../database'
import { loadCiSnapshot } from './snapshot'
import { findJob, writeTerminal } from './writes'
import { nextGeneration } from './rows'

const limits = ciLimits()

function matches(job: CiJob | undefined, dispatch: CiDispatch): job is CiJob {
  return (
    !!job &&
    job.state === 'running' &&
    job.generation === dispatch.generation &&
    job.repositoryId === dispatch.repositoryId &&
    job.commitId === dispatch.commitId &&
    job.pipeline.fingerprint === dispatch.pipelineFingerprint &&
    job.pipeline.version === 2
  )
}

export async function runStage(
  db: Database,
  dispatch: CiDispatch,
  now = Date.now,
): Promise<StageReply> {
  const start = now()
  const pipeline = await ciPipeline(limits, true)
  const input = db.transaction(() => {
    const job = findJob(db, dispatch.ciJobId)
    if (!matches(job, dispatch)) return
    if (job.pipeline.fingerprint !== pipeline.fingerprint) {
      writeTerminal(
        db,
        { ...job, generation: nextGeneration(job) },
        'interrupted',
        'pipeline_unavailable',
        now(),
        limits,
      )
      return
    }
    if (now() >= job.deadline) {
      writeTerminal(
        db,
        { ...job, generation: nextGeneration(job) },
        'expired',
        'deadline',
        now(),
        limits,
      )
      return
    }
    const cursor = db.all('SELECT * FROM ci_stages WHERE job_id=?', job.id)[0]
    if (!cursor) throw new Error('Missing CI stage cursor')
    const sequence = numberColumn(cursor, 'sequence')
    if (sequence !== 0 && sequence !== 1)
      throw new Error('Invalid CI stage cursor')
    return {
      sequence,
      stage: (sequence === 0 ? 'integrity' : 'source-policy') satisfies CiStage,
      prior: stringColumn(cursor, 'checkpoint'),
      snapshot: loadCiSnapshot(db, job, limits),
    }
  })
  if (!input) return 'stale'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), stageBounds.stageMs)
  let validation: CiValidation
  try {
    if (!input.snapshot.ok) {
      validation = failedValidation(
        input.snapshot.error.code === 'QUOTA_EXCEEDED'
          ? 'input_limit'
          : 'integrity_failed',
      )
    } else if (input.stage === 'integrity') {
      validation = await validateIntegrity(
        input.snapshot.value,
        limits,
        controller.signal,
      )
    } else {
      // Only the successful fixed integrity stage writes this local SQL value.
      const prior = JSON.parse(input.prior) as CiValidation
      validation = validateSource(
        input.snapshot.value,
        limits,
        controller.signal,
        prior,
      )
    }
  } catch {
    validation = failedValidation('validator_exception')
  } finally {
    clearTimeout(timer)
  }
  return db.transaction(() => {
    const job = findJob(db, dispatch.ciJobId)
    if (!matches(job, dispatch)) return 'stale'
    const cursor = db.all(
      'SELECT sequence FROM ci_stages WHERE job_id=?',
      job.id,
    )[0]
    if (!cursor || numberColumn(cursor, 'sequence') !== input.sequence)
      return 'stale'
    const completed = now()
    if (
      completed >= job.deadline ||
      completed - start >= stageBounds.stageMs ||
      controller.signal.aborted
    ) {
      writeTerminal(
        db,
        { ...job, generation: nextGeneration(job) },
        'expired',
        'deadline',
        completed,
        limits,
      )
      return 'done'
    }
    const continuing = input.sequence === 0 && validation.state === 'passed'
    db.run(
      `UPDATE ci_stages SET sequence=?, completed_ms=?, checkpoint=?,
        integrity_ms=COALESCE(integrity_ms,?),
        integrity_duration_ms=COALESCE(integrity_duration_ms,?),
        source_duration_ms=? WHERE job_id=?`,
      continuing ? 1 : 2,
      completed,
      JSON.stringify(validation),
      input.sequence === 0 ? completed : null,
      input.sequence === 0 ? completed - start : null,
      input.sequence === 1 ? completed - start : null,
      job.id,
    )
    if (continuing) return 'continue'
    writeTerminal(
      db,
      job,
      validation.state,
      validation.code,
      completed,
      limits,
      validation,
    )
    return 'done'
  })
}
