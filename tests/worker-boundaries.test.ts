import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { creation, request } from './sqlite-fixture'
import { repositoryIdentity } from '../src/domain/commit-hashing'

it('rejects invalid routes, queries, payloads, spoofing and oversized bodies in the real local worker', async () => {
  const identity = await identityFixture()
  const worker = await workerFixture(identity.env)
  const headers = {
    authorization: `Bearer ${await identity.token()}`,
    'content-type': 'application/json',
  }
  const base = `/api/repositories/${await repositoryIdentity({ kind: 'user', subject: 'owner' }, creation.idempotencyKey)}`
  try {
    const create = () =>
      worker.fetch('/api/repositories', {
        method: 'POST',
        headers,
        body: JSON.stringify(creation),
      })
    expect((await create()).status).toBe(200)
    expect((await create()).status).toBe(200)
    expect(
      (
        await worker.fetch('/api/repositories', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...creation, name: 'other' }),
        })
      ).status,
    ).toBe(409)
    const invalidPaths: readonly (readonly [string, number])[] = [
      ['/api/repositories/bad/head', 400],
      [`${base}/head?owner=other`, 400],
      [`${base}/tree?limit=26`, 413],
      [`${base}/tree?limit=1&limit=2`, 400],
      [`${base}/tree?cursor=garbage`, 400],
      [`${base}/files/${'a'.repeat(64)}?path=..%2Fa`, 400],
      [`${base}/commits/invalid`, 400],
      [`${base}/tree?cursor=${'1'.repeat(2048)}`, 400],
    ]
    for (const [path, expected] of invalidPaths)
      expect((await worker.fetch(path, { headers })).status, path).toBe(
        expected,
      )
    const write = (body: string) =>
      worker.fetch(`${base}/commits`, { method: 'POST', headers, body })
    expect((await write('{')).status).toBe(400)
    expect(
      (await write(JSON.stringify({ ...request(), ownerSubject: 'other' })))
        .status,
    ).toBe(400)
    expect(
      (
        await write(
          JSON.stringify(
            request('request_large_file', null, 'x'.repeat(32769)),
          ),
        )
      ).status,
    ).toBe(413)
    expect((await write('x'.repeat(256 * 1024 + 1))).status).toBe(413)
    expect(
      (
        await worker.fetch(base, {
          headers: { authorization: 'Bearer forged', 'x-user-id': 'owner' },
        })
      ).status,
    ).toBe(401)
    expect(
      (
        await worker.fetch(`${base}/idempotency/nonexistent_key_123`, {
          headers,
        })
      ).status,
    ).toBe(404)
    expect((await worker.fetch(`${base}/sql`, { headers })).status).toBe(404)
    expect(
      await (await worker.fetch(`${base}/head`, { headers })).json(),
    ).toMatchObject({ value: { commitId: null, version: 0 } })
  } finally {
    await worker.close()
  }
}, 30000)
