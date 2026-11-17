import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { creation, request } from './sqlite-fixture'
import { objectValue } from '../src/domain/validation'
import { stringColumn } from '../src/server/storage/database'

async function value(response: {
  status: number
  json: () => Promise<unknown>
}) {
  const body = await response.json()
  expect(response.status, JSON.stringify(body)).toBe(200)
  if (!objectValue(body) || body.ok !== true || !objectValue(body.value))
    throw new Error('Expected object response')
  return body.value
}
it('executes the authenticated HTTP vertical slice using actual workerd Durable Object SQLite and survives recreation', async () => {
  const identity = await identityFixture()
  const worker = await workerFixture(identity.env)
  const bearer = await identity.token()
  const headers = {
    authorization: `Bearer ${bearer}`,
    'content-type': 'application/json',
  }
  try {
    const created = await value(
      await worker.fetch('/api/repositories', {
        method: 'POST',
        headers,
        body: JSON.stringify(creation),
      }),
    )
    const id = stringColumn(created, 'id')
    const base = `/api/repositories/${id}`
    expect(
      await value(await worker.fetch(`${base}/head`, { headers })),
    ).toEqual({ commitId: null, version: 0 })
    const commit = await value(
      await worker.fetch(`${base}/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request()),
      }),
    )
    const commitId = stringColumn(commit, 'id')
    expect(
      await value(await worker.fetch(`${base}/head`, { headers })),
    ).toEqual({ commitId, version: 1 })
    expect(
      await value(
        await worker.fetch(`${base}/commits/${commitId}`, { headers }),
      ),
    ).toEqual(commit)
    const tree = await value(await worker.fetch(`${base}/tree`, { headers }))
    expect(tree.items).toMatchObject([{ path: 'src/a.txt', utf8Bytes: 5 }])
    expect(
      await (
        await worker.fetch(`${base}/files/${commitId}?path=src%2Fa.txt`, {
          headers,
        })
      ).json(),
    ).toEqual({ ok: true, value: 'hello' })
    const competing = await Promise.all(
      ['workerd_commit_key_2', 'workerd_commit_key_3'].map((key) =>
        worker.fetch(`${base}/commits`, {
          method: 'POST',
          headers,
          body: JSON.stringify(request(key, commitId, key)),
        }),
      ),
    )
    expect(competing.map((response) => response.status).sort()).toEqual([
      200, 409,
    ])
    expect(
      (await value(await worker.fetch(`${base}/head`, { headers }))).version,
    ).toBe(2)
    await worker.restart()
    expect(
      await value(
        await worker.fetch(`${base}/idempotency/commit_request_key_1`, {
          headers,
        }),
      ),
    ).toEqual(commit)
    expect(
      await value(
        await worker.fetch(`${base}/commits`, {
          method: 'POST',
          headers,
          body: JSON.stringify(request()),
        }),
      ),
    ).toEqual(commit)
    const other = {
      ...headers,
      authorization: `Bearer ${await identity.token('other')}`,
      'x-user-id': 'owner',
    }
    expect((await worker.fetch(base, { headers: other })).status).toBe(403)
    expect((await worker.fetch(base)).status).toBe(401)
    // Calling the correct class through a noncanonical object ID cannot bind a second owner.
    const namespace = await worker.namespace()
    const wrong = namespace.get(namespace.idFromName('wrong-owner'))
    expect(
      (await wrong.fetch(`http://localhost${base}`, { headers })).status,
    ).toBe(400)
  } finally {
    await worker.close()
  }
}, 30000)
