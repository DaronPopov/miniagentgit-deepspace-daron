import { repositoryOwnerName } from '../../domain/ownership'
import type { Result } from '../../domain/result'

export function routeRepository(
  namespace: DurableObjectNamespace,
  id: unknown,
): Result<DurableObjectStub> {
  const name = repositoryOwnerName(id)
  if (!name.ok) return name
  return { ok: true, value: namespace.get(namespace.idFromName(name.value)) }
}
