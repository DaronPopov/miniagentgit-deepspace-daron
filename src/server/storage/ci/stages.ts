import {
  encodeCheckpoint,
  readCheckpoint,
} from '../../../application/ci/checkpoint'
import { analyzeSnapshot } from '../../../application/ci/analysis'
import type { CiJob, CiValidation } from '../../../contracts/ci'
import { ciPipeline } from '../../../application/ci/pipelines'
import { ciLimits } from '../../../application/ci/limits'
import { ciStages, stageBounds } from '../../../application/ci/stages'
import type { CiDispatch, StageReply } from '../../../application/ci/stages'
import {
  failedValidation,
  validateIntegrity,
  validateSource,
} from '../../../application/ci/validation'
import type { Database } from '../database'
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
    (job.pipeline.version === 2 || job.pipeline.version === 3)
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
    if (
      job.pipeline.version !== pipeline.version ||
      job.pipeline.fingerprint !== pipeline.fingerprint
    ) {
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
    const ordinal = cursor?.ordinal
    const stage =
      typeof ordinal === 'number' && Number.isInteger(ordinal)
        ? ciStages[ordinal]
        : undefined
    const raw = cursor?.checkpoint
    const prior =
      typeof raw === 'string' && typeof ordinal === 'number'
        ? readCheckpoint(raw, job, ordinal, limits)
        : undefined
    if (
      typeof ordinal !== 'number' ||
      !stage ||
      (ordinal === 0 ? raw !== '' : !prior)
    ) {
      writeTerminal(db, job, 'failed', 'validator_exception', now(), limits)
      return
    }
    return { ordinal, stage, prior, snapshot: loadCiSnapshot(db, job, limits) }
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
    } else if (!input.prior) {
      validation = failedValidation('validator_exception')
    } else if (input.stage === 'source-policy') {
      validation = validateSource(
        input.snapshot.value,
        limits,
        controller.signal,
        input.prior,
      )
    } else {
      validation = analyzeSnapshot(
        input.stage,
        input.snapshot.value,
        limits,
        input.prior,
        controller.signal,
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
      'SELECT ordinal FROM ci_stages WHERE job_id=?',
      job.id,
    )[0]
    if (!cursor || cursor.ordinal !== input.ordinal) return 'stale'
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
    const next = input.ordinal + 1
    const continuing = next < ciStages.length && validation.state === 'passed'
    const checkpoint = continuing
      ? encodeCheckpoint(job, next, validation)
      : JSON.stringify(validation)
    db.run(
      `UPDATE ci_stages SET ordinal=?, completed_ms=?, checkpoint=?,
        stage_timings=json_set(stage_timings, ?, ?) WHERE job_id=?`,
      next,
      completed,
      checkpoint,
      '$.' + input.stage,
      completed - start,
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
