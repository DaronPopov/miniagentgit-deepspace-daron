import type { RepositoryService } from './repository-service'
import type { RepositoryContext } from './operations'
import type { CommitMetadata, CommitRequest } from '../domain/repository'
import type { Result } from '../domain/result'
import { validateCommit } from './validate-commit'
import { createCommitScheduler } from './commit-scheduler'
import type {
  CommitScheduler,
  SchedulerOptions,
} from '../contracts/commit-scheduling'
import { requireResourceLimits } from './resource-limits'
import type { ResourceLimits } from './resource-limits'

interface PreparedSlot {
  readonly input: CommitRequest
  readonly context: RepositoryContext
  started: boolean
  result?: Result<CommitMetadata>
}
export interface RuntimeOptions {
  readonly id: string
  readonly authority: RepositoryService & {
    readonly executeCommit: (
      context: RepositoryContext,
      input: unknown,
      signal: AbortSignal,
    ) => Promise<Result<CommitMetadata>>
  }
  readonly limits?: ResourceLimits
  readonly retainExecution?: (promise: Promise<unknown>) => void
  readonly scheduler?: Pick<
    SchedulerOptions,
    'capacity' | 'eventCapacity' | 'deadlineMs' | 'clock'
  >
}
const unavailable = (): Result<never> => ({
  ok: false,
  error: {
    code: 'UNAVAILABLE',
    message: 'Outcome uncertain; retry the same idempotency key or look it up',
  },
})
export function createRepositoryRuntime(options: RuntimeOptions): {
  readonly service: RepositoryService
  readonly scheduler: CommitScheduler
  readonly retainedPayloads: () => number
} {
  const { id, authority } = options
  const slots = new Map<string, PreparedSlot>()
  const capacity = options.scheduler?.capacity ?? 8
  const limits = requireResourceLimits(options.limits)
  const scheduler = createCommitScheduler({
    ...options.scheduler,
    repositoryId: id,
    execute: async (descriptor, signal) => {
      const slot = slots.get(descriptor.preparedRef)
      if (!slot) throw new Error('Missing owned payload')
      slot.started = true
      try {
        const execution = authority.executeCommit(
          slot.context,
          slot.input,
          signal,
        )
        try {
          options.retainExecution?.(
            execution.then(
              () => undefined,
              () => undefined,
            ),
          )
        } finally {
          // A lifetime-hook failure must still await the real executor before retirement.
          slot.result = await execution
        }
        if (slot.result.ok)
          return { kind: 'committed', commitId: slot.result.value.id }
        const error = slot.result.error
        if (error.code === 'CONFLICT')
          return { kind: 'conflict', actualHead: error.actualHead }
        if (error.code === 'UNAVAILABLE')
          throw new Error('Execution unavailable')
        return {
          kind: 'rejected',
          reason:
            error.code === 'QUOTA_EXCEEDED'
              ? 'quota'
              : error.code === 'FORBIDDEN'
                ? 'forbidden'
                : error.code === 'NOT_FOUND'
                  ? 'not-found'
                  : 'invalid',
        }
      } finally {
        slots.delete(descriptor.preparedRef)
      }
    },
  })
  async function submit(
    context: RepositoryContext,
    input: CommitRequest,
    signal?: AbortSignal,
  ): Promise<Result<CommitMetadata>> {
    if (context.repositoryId !== id)
      return {
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'Wrong repository owner' },
      }
    if (slots.size >= capacity)
      return {
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          resource: 'pendingCommits',
          maximum: capacity,
          actual: slots.size + 1,
        },
      }
    if (signal?.aborted) return unavailable()
    const parsed = validateCommit(input, limits)
    if (!parsed.ok) return parsed
    // Only this bounded map owns payloads. Scheduler slots contain opaque references.
    const ref = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    if (slots.has(ref)) return unavailable()
    const slot: PreparedSlot = {
      input: parsed.value,
      context: {
        repositoryId: context.repositoryId,
        actor: { ...context.actor },
      },
      started: false,
    }
    slots.set(ref, slot)
    const admission = scheduler.submit({
      requestId: `req_${ref.slice(0, 32)}`,
      repositoryId: id,
      preparedRef: ref,
      actorSubject: context.actor.subject,
      expectedHead: parsed.value.expectedHead,
      idempotencyKey: parsed.value.idempotencyKey,
    })
    if (admission.kind === 'rejected') {
      slots.delete(ref)
      return admission.code === 'QUOTA_EXCEEDED'
        ? {
            ok: false,
            error: {
              code: 'QUOTA_EXCEEDED',
              resource: 'pendingCommits',
              maximum: capacity,
            },
          }
        : unavailable()
    }
    const abort = () => {
      admission.cancel()
    }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    try {
      const outcome = await admission.completion
      if (outcome.kind === 'cancelled' || outcome.kind === 'failed')
        return unavailable()
      return slot.result ?? unavailable()
    } finally {
      signal?.removeEventListener('abort', abort)
      if (!slot.started) slots.delete(ref)
    }
  }
  return Object.freeze({
    service: Object.freeze({ ...authority, createCommit: submit }),
    scheduler,
    retainedPayloads: () => slots.size,
  })
}
