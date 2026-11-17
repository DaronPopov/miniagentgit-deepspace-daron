import type { HeadReader, RepositoryHeadResult } from './contracts'
import { validateHead, validateHeadInput } from './contracts'
import type { Result } from '../../domain/result'

/** The injected reader must remain bound to the transport's verified bearer. */
export async function repositoryHead(
  input: unknown,
  read: HeadReader,
): Promise<Result<RepositoryHeadResult>> {
  const parsed = validateHeadInput(input)
  if (!parsed.ok) return parsed
  try {
    const result = await read(parsed.value.repositoryId)
    if (!result.ok) return result
    const head = validateHead(result.value)
    if (!head.ok) return unavailable()
    return { ok: true, value: { ...parsed.value, ...head.value } }
  } catch {
    return unavailable()
  }
}
export function unavailable(): Result<never> {
  return {
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Repository HEAD unavailable' },
  }
}
