/** SDK acquisition cannot accept AbortSignal: fence late completion explicitly. */
export function abortable<T>(
  work: Promise<T>,
  signal: AbortSignal,
): Promise<T | null> {
  if (signal.aborted) return Promise.resolve(null)
  return new Promise((resolve) => {
    const cancel = () => {
      signal.removeEventListener('abort', cancel)
      resolve(null)
    }
    signal.addEventListener('abort', cancel, { once: true })
    void work.then(
      (value) => {
        signal.removeEventListener('abort', cancel)
        resolve(signal.aborted ? null : value)
      },
      () => {
        signal.removeEventListener('abort', cancel)
        resolve(null)
      },
    )
  })
}
interface CredentialWaiter {
  readonly finish: (value: string | null) => void
}
interface Acquisition {
  readonly owner: string
  readonly waiters: Set<CredentialWaiter>
}
export function credentialAcquisition(
  getToken: () => Promise<string | null>,
  clear: () => void,
) {
  let pending: Acquisition | undefined
  function subscribe(
    state: Acquisition,
    signal: AbortSignal,
  ): Promise<string | null> {
    if (state.waiters.size >= 4 || signal.aborted) return Promise.resolve(null)
    return new Promise((resolve) => {
      const cancel = () => waiter.finish(null)
      const waiter: CredentialWaiter = {
        finish: (value) => {
          state.waiters.delete(waiter)
          signal.removeEventListener('abort', cancel)
          resolve(signal.aborted ? null : value)
        },
      }
      state.waiters.add(waiter)
      signal.addEventListener('abort', cancel, { once: true })
    })
  }
  return (signal: AbortSignal, owner: string): Promise<string | null> => {
    if (signal.aborted) return Promise.resolve(null)
    if (pending)
      return pending.owner === owner
        ? subscribe(pending, signal)
        : Promise.resolve(null)
    const state: Acquisition = { owner, waiters: new Set() }
    pending = state
    const result = subscribe(state, signal)
    void (async () => {
      let token: string | null = null
      try {
        clear()
        const value = await getToken()
        if (
          typeof value === 'string' &&
          value.length <= 8192 &&
          value.length > 0 &&
          !/\s/.test(value)
        )
          token = value
      } catch {
        /* SDK failures are unavailable, never diagnostic token text. */
      } finally {
        clear()
        pending = undefined
        for (const waiter of state.waiters) waiter.finish(token)
      }
    })()
    return result
  }
}
