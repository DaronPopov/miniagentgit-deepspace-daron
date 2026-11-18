import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { admissionRoom, limits } from '../src/server/admission/ledger'

const createPath = '/api/repositories'

it('closes without trusted configuration and admits only the verified subject', async () => {
  const keys = await identityFixture()
  const closed = await workerFixture({
    ...keys.env,
    MINIGIT_TRUSTED_SUBJECTS: '',
  })
  const restricted = await workerFixture({
    ...keys.env,
    MINIGIT_TRUSTED_SUBJECTS: 'Alice',
  })
  try {
    const alice = { authorization: 'Bearer ' + (await keys.token('Alice')) }
    expect((await closed.fetch('/api/me', { headers: alice })).status).toBe(503)
    expect((await restricted.fetch('/api/me')).status).toBe(401)
    expect((await restricted.fetch('/api/me', { headers: alice })).status).toBe(
      200,
    )
    const outsider = 'Bearer ' + (await keys.token('Bob'))
    const headers = {
      authorization: outsider,
      'content-type': 'application/json',
      'x-user-id': 'Alice',
    }
    const denied = await restricted.fetch(createPath, {
      method: 'POST',
      headers,
      body: 'malformed',
    })
    expect(denied.status).toBe(403)
    const discovery = await restricted.fetch('/_deepspace/agent/tools', {
      headers,
    })
    expect(discovery.status).toBe(403)
    expect(
      (
        await restricted.fetch('/route/repo_0123456789abcdef', {
          method: 'POST',
          headers,
        })
      ).status,
    ).toBe(404)
    const storage = await restricted.storage(admissionRoom)
    expect(await storage.exec('SELECT id FROM admission_routes')).toEqual([])
  } finally {
    await closed.close()
    await restricted.close()
  }
})

it('shares a durable creation ceiling across concurrent HTTP and MCP, preserving replay', async () => {
  const keys = await identityFixture()
  const f = await workerFixture({
    ...keys.env,
    MINIGIT_TRUSTED_SUBJECTS: 'Alice,Bob',
  })
  const alice = 'Bearer ' + (await keys.token('Alice'))
  const bob = 'Bearer ' + (await keys.token('Bob'))
  const input = (n: number) => ({
    name: 'Qualified repository',
    idempotencyKey: 'admission-creation-' + n,
  })
  async function create(n: number) {
    const http = n % 2 === 0
    return f.fetch(
      http
        ? createPath
        : '/_deepspace/agent/tools/miniagentgit.repository_create',
      {
        method: 'POST',
        headers: {
          authorization: http ? alice : bob,
          'content-type': 'application/json',
        },
        body: JSON.stringify(http ? input(n) : { input: input(n) }),
      },
    )
  }
  try {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, n) => create(n)),
    )
    expect(results.filter((r) => r.status === 200)).toHaveLength(
      limits.repositories,
    )
    expect(results.filter((r) => r.status === 429)).toHaveLength(
      8 - limits.repositories,
    )
    const winner = results.findIndex((r) => r.status === 200)
    const original = await results[winner]?.text()
    await f.restart()
    expect((await create(99)).status).toBe(429)
    expect(await (await create(winner)).text()).toBe(original)
    const storage = await f.storage(admissionRoom)
    expect(
      await storage.exec('SELECT count(*) AS count FROM admission_routes'),
    ).toEqual([{ count: limits.repositories }])
  } finally {
    await f.close()
  }
})

it('fails closed on retained slots across restart until a matching private release', async () => {
  const keys = await identityFixture()
  const f = await workerFixture(keys.env)
  const headers = { authorization: 'Bearer ' + (await keys.token()) }
  const lease = (n: number) => 'a'.repeat(34) + n.toString(16).padStart(2, '0')
  async function control(action: string, slot: string) {
    const namespace = await f.namespace()
    const stub = namespace.get(namespace.idFromName(admissionRoom))
    return stub.fetch(
      'https://miniagentgit-admission.invalid/' + action + '/' + slot,
      { method: 'POST' },
    )
  }
  try {
    for (let n = 0; n < limits.concurrency; n++) {
      expect((await control('acquire', lease(n))).status).toBe(204)
    }
    expect((await f.fetch('/api/me', { headers })).status).toBe(429)
    await f.restart()
    expect((await control('release', lease(99))).status).toBe(204)
    expect((await f.fetch('/api/me', { headers })).status).toBe(429)
    expect((await control('release', lease(0))).status).toBe(204)
    expect((await f.fetch('/api/me', { headers })).status).toBe(200)
    const storage = await f.storage(admissionRoom)
    await expect
      .poll(
        async () =>
          (await storage.exec('SELECT id FROM admission_active')).length,
      )
      .toBe(limits.concurrency - 1)
    expect((await f.fetch('/api/me', { headers })).status).toBe(200)
  } finally {
    await f.close()
  }
})
