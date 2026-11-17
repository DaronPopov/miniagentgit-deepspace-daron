import { expect } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { request } from './sqlite-fixture'
import { objectValue } from '../src/domain/validation'
import { stringColumn } from '../src/server/storage/database'

export async function tenantFixture() {
  const identity = await identityFixture(),
    worker = await workerFixture(identity.env)
  const tokens = {
    Alice: await identity.token('Alice'),
    Bob: await identity.token('Bob'),
    Charlie: await identity.token('Charlie'),
  }
  async function response(
    subject: keyof typeof tokens,
    path: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ) {
    return worker.fetch(path, {
      method,
      headers: {
        authorization: `Bearer ${tokens[subject]}`,
        'content-type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  }
  async function value(
    subject: keyof typeof tokens,
    path: string,
    body?: unknown,
    status = 200,
  ) {
    const res = await response(subject, path, body),
      json: unknown = await res.json()
    expect(res.status, JSON.stringify(json)).toBe(status)
    if (!objectValue(json) || json.ok !== true || !objectValue(json.value))
      throw new Error('Missing object result')
    return json.value
  }
  async function create(
    subject: keyof typeof tokens,
    key = 'tenant_creation_key_1',
  ) {
    const metadata = await value(subject, '/api/repositories', {
      name: 'Private repository',
      idempotencyKey: key,
    })
    const id = stringColumn(metadata, 'id'),
      base = `/api/repositories/${id}`
    return { id, base, metadata }
  }
  async function commit(
    subject: keyof typeof tokens,
    base: string,
    key: string,
    head: string | null = null,
  ) {
    return value(subject, `${base}/commits`, request(key, head, 'hello\n'))
  }
  async function ci(
    subject: keyof typeof tokens,
    base: string,
    commitId: string,
  ) {
    const job = await value(subject, `${base}/ci/commits/${commitId}`, {}, 202),
      id = stringColumn(job, 'id')
    for (let n = 0; n < 20; n++) {
      const res = await response(subject, `${base}/ci/jobs/${id}/receipt`)
      if (res.status === 409) continue
      expect(res.status).toBe(200)
      const json: unknown = await res.json()
      if (!objectValue(json) || !objectValue(json.value))
        throw new Error('Missing receipt')
      expect(json.value.state).toBe('passed')
      return { id, receipt: json.value }
    }
    throw new Error('CI did not finish during bounded observations')
  }
  return { ...worker, identity, tokens, response, value, create, commit, ci }
}
