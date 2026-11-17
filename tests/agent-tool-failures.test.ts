import { createApp } from '../src/server/app'
import { identityFixture } from './identity-fixture'
import {
  REPOSITORY_HEAD_TOOL,
  TOOL_RESULT_BYTES,
} from '../src/features/agent-tools/contracts'
import { expect, it, vi } from 'vitest'

it('preserves the bearer and canonical GET while sanitizing failed owner responses', async () => {
  const identity = await identityFixture(),
    token = await identity.token('Alice')
  const id = 'repo_' + 'a'.repeat(32)
  const seen: Request[] = []
  let response = () =>
    Promise.resolve(
      Response.json({ ok: true, value: { commitId: null, version: 0 } }),
    )
  const get = vi.fn((routedId: string) => {
    expect(routedId).toBe(`canonical:repo:${id}`)
    return {
      fetch: async (request: Request) => {
        seen.push(request)
        return response()
      },
    }
  })
  // Structural namespace fixture isolates transport faults; SQLite proof is separate.
  const namespace = { idFromName: (name: string) => `canonical:${name}`, get }
  const app = createApp(),
    env = {
      ...identity.env,
      APP_NAME: 'Local tools',
      DEEPSPACE_APP_ID: 'local-service',
      REPOSITORY_ROOMS: namespace,
    }
  const invoke = () =>
    app.request(
      `/_deepspace/agent/tools/${REPOSITORY_HEAD_TOOL}`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-user-id': 'Bob',
          cookie: 'private-cookie',
        },
        body: JSON.stringify({ input: { repositoryId: id } }),
      },
      env,
    )
  const valid = await invoke()
  expect(valid.status).toBe(200)
  expect(await valid.json()).toEqual({
    ok: true,
    result: { repositoryId: id, commitId: null, version: 0 },
  })
  const forwarded = seen[0]
  if (!forwarded) throw new Error('Missing owner request')
  expect(forwarded.method).toBe('GET')
  expect(new URL(forwarded.url).pathname).toBe(`/api/repositories/${id}/head`)
  expect([...forwarded.headers]).toEqual([['authorization', `Bearer ${token}`]])
  for (const bad of [
    () => Promise.reject(new Error('secret SQL capability')),
    () =>
      Promise.resolve(
        Response.json({ error: 'secret SQL capability' }, { status: 500 }),
      ),
    () => Promise.resolve(new Response('not JSON')),
    () =>
      Promise.resolve(
        Response.json({ ok: false, error: 'secret SQL capability' }),
      ),
    () =>
      Promise.resolve(
        Response.json({ ok: true, value: { commitId: null, version: 1 } }),
      ),
    () =>
      Promise.resolve(
        Response.json({
          ok: true,
          value: { commitId: null, version: 0, jwt: token },
        }),
      ),
    () => Promise.resolve(new Response('x'.repeat(TOOL_RESULT_BYTES + 1))),
    () =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: 'https://external.test' },
        }),
      ),
  ]) {
    response = bad
    const failure = await invoke(),
      text = await failure.text()
    expect(failure.status).toBe(503)
    expect(JSON.parse(text)).toMatchObject({ ok: false, code: 'UNAVAILABLE' })
    expect(text).not.toMatch(/secret|SQL|capability|cookie/)
    expect(text).not.toContain(token)
  }
  const rpc = await app.request(
    '/_deepspace/agent/mcp',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: REPOSITORY_HEAD_TOOL, arguments: { repositoryId: id } },
      }),
    },
    env,
  )
  expect(rpc.status).toBe(200)
  expect(await rpc.json()).toMatchObject({ result: { isError: true } })
  for (const status of [401, 403, 404]) {
    response = () =>
      Promise.resolve(Response.json({ message: 'secret' }, { status }))
    expect((await invoke()).status).toBe(status)
  }
})
