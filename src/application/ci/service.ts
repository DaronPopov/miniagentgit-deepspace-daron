import type { CiJob, CiSnapshot, CiValidation } from '../../contracts/ci'
import type { RepositoryContext } from '../operations'
import { commitId } from '../../domain/validation'
import { invalid, success } from '../../domain/result'
import type { Result } from '../../domain/result'
import type { CiStore } from './store'
import { ciPipeline, ciJobIdentity } from './pipelines'
import { ciLimits } from './limits'
import type { CiLimits } from './limits'
import { failedValidation, validateSnapshot } from './validation'

export interface CiEngineOptions {
  readonly dispatch?: (job: CiJob) => Promise<void>
  readonly store: CiStore
  readonly limits?: Partial<CiLimits>
  readonly now?: () => number
  readonly retain?: (work: Promise<void>) => void
  readonly schedule?: (ms: number, callback: () => void) => () => void
  readonly validate?: (
    snapshot: CiSnapshot,
    limits: CiLimits,
    signal: AbortSignal,
  ) => Promise<CiValidation>
}
export function createCiEngine(options: CiEngineOptions) {
  const limits = ciLimits(options.limits),
    store = options.store
  const pipeline = ciPipeline(limits)
  const now = options.now ?? Date.now
  const validate = options.validate ?? validateSnapshot
  const schedule =
    options.schedule ??
    ((ms, callback) => {
      const timer = setTimeout(callback, ms)
      return () => clearTimeout(timer)
    })
  let recovered = false
  let work: Promise<void> | undefined
  let active:
    | { readonly job: CiJob; readonly abort: AbortController }
    | undefined
  function activate(context: RepositoryContext): Result<null> {
    if (recovered) return success(null)
    const result = store.recover(context)
    if (result.ok) recovered = true
    return result
  }
  async function drain(context: RepositoryContext) {
    const definition = await pipeline
    let remaining = limits.workBytes
    for (let count = 0; count < limits.jobsPerDrain && remaining > 0; count++) {
      const claimed = store.claim(context, definition)
      if (!claimed.ok || !claimed.value) return
      const job = claimed.value,
        abort = new AbortController()
      active = { job, abort }
      const stopTimer = schedule(limits.deadlineMs, () => {
        try {
          store.stop(context, job.id, 'expired', job.generation)
        } catch {
          // An unavailable store cannot establish a result; abort and recover later.
        } finally {
          abort.abort()
        }
      })
      try {
        const snapshot = store.snapshot(context, job)
        const result = snapshot.ok
          ? await validate(
              snapshot.value,
              { ...limits, workBytes: remaining },
              abort.signal,
            )
          : failedValidation(
              snapshot.error.code === 'QUOTA_EXCEEDED'
                ? 'input_limit'
                : 'integrity_failed',
            )
        remaining -= result.work
        store.finish(context, job, result)
      } catch {
        store.finish(context, job, failedValidation('validator_exception'))
      } finally {
        stopTimer()
        active = undefined
      }
    }
  }
  function kick(context: RepositoryContext) {
    if (work) return
    work = Promise.resolve()
      .then(() => drain(context))
      .catch(() => {
        // DB/driver failures leave a nonpassing persisted row for recovery/expiry.
      })
      .finally(() => {
        work = undefined
      })
    try {
      options.retain?.(work)
    } catch {
      /* Durable admission remains valid; recovery is request-driven. */
    }
  }
  async function request(
    context: RepositoryContext,
    commit: string,
    pipelineId = 'miniagentgit-ci-v1',
  ) {
    if (!commitId(commit).ok || pipelineId !== 'miniagentgit-ci-v1')
      return invalid('Invalid CI request')
    const activated = activate(context)
    if (!activated.ok) return activated
    const definition = options.dispatch
      ? await ciPipeline(limits, true)
      : await pipeline
    const id = await ciJobIdentity(context.repositoryId, commit, definition)
    const result = store.admit(context, commit, definition, id)
    if (result.ok && options.dispatch) await options.dispatch(result.value)
    if (result.ok) kick(context)
    return result
  }
  function status(context: RepositoryContext, id: string) {
    const activated = activate(context)
    if (!activated.ok) return activated
    let result = store.get(context, id)
    if (
      result.ok &&
      (result.value.state === 'running' ||
        (result.value.state === 'queued' && result.value.deadline > 0)) &&
      now() >= result.value.deadline
    ) {
      result = store.stop(context, id, 'expired', result.value.generation)
      if (active?.job.id === id) active.abort.abort()
    }
    if (result.ok) kick(context)
    return result
  }
  function receipt(context: RepositoryContext, id: string) {
    const activated = activate(context)
    if (!activated.ok) return activated
    const result = store.receipt(context, id)
    // Enforce deadlines on authorized observation without a polling loop.
    const observed = status(context, id)
    return observed.ok && observed.value.state === 'expired'
      ? store.receipt(context, id)
      : result
  }
  function list(
    context: RepositoryContext,
    offset: number,
    limit: number,
    commit?: string,
  ) {
    const activated = activate(context)
    if (!activated.ok) return activated
    const result = store.list(context, offset, limit, commit)
    if (result.ok) kick(context)
    return result
  }
  function cancel(context: RepositoryContext, id: string) {
    const activated = activate(context)
    if (!activated.ok) return activated
    const result = store.stop(context, id, 'cancelled')
    if (result.ok && active?.job.id === id) active.abort.abort()
    return result
  }
  return Object.freeze({
    request,
    status,
    receipt,
    list,
    cancel,
    whenIdle: () => work ?? Promise.resolve(),
    inspect: () =>
      Object.freeze({
        active: active !== undefined,
        working: work !== undefined,
      }),
  })
}
export type CiEngine = ReturnType<typeof createCiEngine>
