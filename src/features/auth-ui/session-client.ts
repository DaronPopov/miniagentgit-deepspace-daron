import type { BrowserSession, ProtectedResult } from './contracts'
import { abortable, credentialAcquisition } from './api-credential'
import { protectedRead, protectedUrl } from './request-pipeline'

export interface SessionClientOptions {
  readonly origin: string
  readonly getToken: () => Promise<string | null>
  readonly clearToken: () => void
  readonly fetch: typeof fetch
  readonly now?: () => number
  readonly deadlineMs?: number
}
/** Owned by one route/session instance. No results or credentials are cached. */
export function createSessionClient(options: SessionClientOptions) {
  const now = options.now ?? Date.now
  const deadline = options.deadlineMs ?? 10000
  if (!Number.isSafeInteger(deadline) || deadline < 1 || deadline > 10000)
    throw new RangeError('Invalid auth request deadline')
  const acquire = credentialAcquisition(options.getToken, options.clearToken)
  const active = new Set<AbortController>()
  let current: BrowserSession | null = null,
    generation = 0
  function invalidate() {
    generation++
    current = null
    for (const controller of active) controller.abort()
    options.clearToken()
  }
  function update(session: BrowserSession | null) {
    if (
      current?.subject === session?.subject &&
      current?.sessionId === session?.sessionId &&
      current?.expiresAt === session?.expiresAt
    )
      return
    invalidate()
    current = session ? Object.freeze({ ...session }) : null
  }
  async function read(
    path: string,
    signal?: AbortSignal,
  ): Promise<ProtectedResult> {
    if (signal?.aborted) return { status: 'cancelled' }
    const url = protectedUrl(path, options.origin)
    if (!url) return { status: 'invalid' }
    const session = current,
      epoch = generation
    if (!session) return { status: 'signed-out' }
    if (session.expiresAt <= now()) {
      invalidate()
      return { status: 'expired' }
    }
    if (active.size >= 4) return { status: 'unavailable' }
    const controller = new AbortController()
    active.add(controller)
    let timedOut = false
    const cancel = () => controller.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(() => {
      timedOut = true
      cancel()
    }, deadline)
    const aborted = () => ({
      status:
        timedOut && !signal?.aborted && epoch === generation
          ? ('timeout' as const)
          : ('cancelled' as const),
    })
    let execution: Promise<ProtectedResult> | undefined
    try {
      const token = await acquire(
        controller.signal,
        JSON.stringify([session.subject, session.sessionId]),
      )
      if (controller.signal.aborted || epoch !== generation) return aborted()
      if (!token) return { status: 'unavailable' }
      if (session.expiresAt <= now()) {
        invalidate()
        return { status: 'expired' }
      }
      execution = protectedRead(options, url, session, token, controller.signal)
      const result = await abortable(execution, controller.signal)
      if (controller.signal.aborted || epoch !== generation) return aborted()
      if (session.expiresAt <= now()) {
        invalidate()
        return { status: 'expired' }
      }
      if (!result) return { status: 'error' }
      if (result.status === 'expired' || result.status === 'identity-mismatch')
        invalidate()
      return result
    } catch {
      return controller.signal.aborted ? aborted() : { status: 'error' }
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      if (execution)
        void execution.then(
          () => active.delete(controller),
          () => active.delete(controller),
        )
      else active.delete(controller)
    }
  }
  return Object.freeze({ update, invalidate, read })
}
