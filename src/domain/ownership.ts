import { repositoryId } from './validation'
import type { Result } from './result'

/** One canonical owner name in the app-private repository namespace. */
export function repositoryOwnerName(id: unknown): Result<string> {
  const parsed = repositoryId(id)
  return parsed.ok ? { ok: true, value: `repo:${parsed.value}` } : parsed
}
