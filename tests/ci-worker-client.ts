import { expect } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { objectValue } from '../src/domain/validation'

export async function ciWorkerClient() {
  const identity = await identityFixture()
  const worker = await workerFixture(identity.env, true)
  const headers = {
    authorization: `Bearer ${await identity.token()}`,
    'content-type': 'application/json',
  }
  async function value(path: string, body?: unknown, status = 200) {
    const response = await worker.fetch(
      path,
      body === undefined
        ? { headers }
        : {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          },
    )
    const json: unknown = await response.json()
    expect(response.status, JSON.stringify(json)).toBe(status)
    if (!objectValue(json) || !objectValue(json.value))
      throw new Error('Missing value')
    return json.value
  }
  return { identity, worker, headers, value }
}
