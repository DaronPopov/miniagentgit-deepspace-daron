import { readBoundedBodyText } from 'deepspace/worker'
import { routeRepository } from '../storage/routing'
import { AGENT_REPOSITORIES } from '../../features/agent-tools/operation-inputs'
import { objectValue } from '../../domain/validation'
import { unavailable } from '../../features/agent-tools/repository-head'
import { ownerFailure } from './agent-errors'

export async function callOwner(
  rooms: DurableObjectNamespace,
  request: Request,
  operation: {
    readonly id: string
    readonly suffix: string
    readonly method: string
    readonly body?: unknown
  },
  resultCap: number,
) {
  try {
    const owner = routeRepository(rooms, operation.id)
    if (!owner.ok) return owner
    const url = new URL(
      AGENT_REPOSITORIES + '/' + operation.id + operation.suffix,
      request.url,
    )
    const headers = new Headers({
      authorization: request.headers.get('authorization') ?? '',
    })
    const body = JSON.stringify(operation.body)
    if (body !== undefined) headers.set('content-type', 'application/json')
    const response = await owner.value.fetch(
      new Request(url, {
        method: operation.method,
        signal: request.signal,
        redirect: 'manual',
        headers,
        body,
      }),
    )
    if (!response.ok) return ownerFailure(response)
    const data: unknown = JSON.parse(
      await readBoundedBodyText(response, resultCap),
    )
    return objectValue(data) &&
      data.ok === true &&
      Object.keys(data).length === 2
      ? { ok: true as const, value: data.value }
      : unavailable()
  } catch {
    return unavailable()
  }
}
