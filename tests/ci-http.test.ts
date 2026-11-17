import { expect, it } from 'vitest'
import { ciFixture } from './ci-fixture'
import { identityFixture } from './identity-fixture'
import { createOwnerRoutes } from '../src/server/api/repository-owner'
import { validateSnapshot } from '../src/application/ci/validation'
import { objectValue } from '../src/domain/validation'

it('serves durable async jobs, receipts, bounded pages and enforces JWT owner isolation', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const f = await ciFixture(
    {},
    {
      validate: async (...args) => {
        await gate
        return validateSnapshot(...args)
      },
    },
  )
  const identity = await identityFixture()
  const app = createOwnerRoutes(f.id, f.authority, identity.env, f.engine)
  const base = `/api/repositories/${f.id}/ci`
  const headers = {
    authorization: `Bearer ${await identity.token()}`,
    'content-type': 'application/json',
  }
  try {
    const response = await app.request(`${base}/commits/${f.commit.id}`, {
      method: 'POST',
      headers,
      body: '{}',
    })
    expect(response.status).toBe(202)
    const body: unknown = await response.json()
    if (
      !objectValue(body) ||
      !objectValue(body.value) ||
      typeof body.value.id !== 'string'
    )
      throw new Error('Missing job')
    const job = `${base}/jobs/${body.value.id}`
    expect(f.db.all('SELECT id FROM ci_jobs')).toHaveLength(1)
    expect((await app.request(job, { headers })).status).toBe(200)
    expect((await app.request(`${job}/receipt`, { headers })).status).toBe(409)
    release()
    await f.engine.whenIdle()
    expect(
      await (await app.request(`${job}/receipt`, { headers })).json(),
    ).toMatchObject({ ok: true, value: { state: 'passed', schemaVersion: 1 } })
    expect(
      await (
        await app.request(`${base}/jobs?limit=1&commit=${f.commit.id}`, {
          headers,
        })
      ).json(),
    ).toMatchObject({
      ok: true,
      value: { items: [{ id: body.value.id }], nextCursor: null },
    })
    for (const query of [
      'limit=99',
      'cursor=999',
      'limit=1&limit=2',
      'extra=1',
    ])
      expect(
        (await app.request(`${base}/jobs?${query}`, { headers })).status,
      ).toBe(400)
    expect((await app.request(job)).status).toBe(401)
    expect(
      (await app.request(job, { headers: { authorization: 'Bearer forged' } }))
        .status,
    ).toBe(401)
    expect(
      (
        await app.request(job, {
          headers: {
            authorization: `Bearer ${await identity.token('other')}`,
            'x-user-id': 'owner',
          },
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await app.request(`${base}/commits/${'f'.repeat(64)}`, {
          method: 'POST',
          headers,
          body: '{}',
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await app.request(`${base}/commits/${f.commit.id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ pipelineId: 'execute-shell' }),
        })
      ).status,
    ).toBe(400)
  } finally {
    release()
    await f.dispose()
  }
})
