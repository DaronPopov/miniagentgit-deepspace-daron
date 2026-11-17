import { agentTokenIssuer, verifyAgentToken } from 'deepspace/worker'
import { expect, it } from 'vitest'
import { tenantFixture } from './tenant-fixture'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import {
  REPOSITORY_HEAD_TOOL,
  TOOL_REQUEST_BYTES,
} from '../src/features/agent-tools/contracts'

const base = '/_deepspace/agent'
it('rejects unauthenticated, forged, expired, mis-scoped and untrusted tool access', async () => {
  const f = await tenantFixture(),
    other = await identityFixture()
  try {
    const repo = await f.create('Alice')
    const { AUTH_JWT_PUBLIC_KEY: publicKey, AUTH_JWT_ISSUER: issuer } =
      f.identity.env
    if (!publicKey || !issuer) throw new Error('Missing controlled verifier')
    const agent = await f.identity.token('Alice', {
      iss: agentTokenIssuer(issuer),
      aud: 'http://localhost',
      scope: 'agent',
    })
    expect(
      (await verifyAgentToken({ publicKey, issuer }, agent, 'http://localhost'))
        .result?.userId,
    ).toBe('Alice')
    expect(
      (
        await f.fetch(`${base}/tools`, {
          headers: { authorization: `Bearer ${agent}` },
        })
      ).status,
    ).toBe(200)
    for (const token of [
      undefined,
      'forged',
      await other.token('Alice'),
      await f.identity.token('Alice', { exp: 1 }),
      await f.identity.token('Alice', { iss: 'https://other.test' }),
      await f.identity.token('Alice', { aud: 'other' }),
      await f.identity.token('Alice', {
        scope: 'agent',
        aud: 'http://localhost',
      }),
      await f.identity.token('Alice', { scope: 'app:private' }),
    ]) {
      for (const [path, body] of [
        [`${base}/tools`, undefined],
        [`${base}/tools.md`, undefined],
        [
          `${base}/tools/${REPOSITORY_HEAD_TOOL}`,
          { input: { repositoryId: repo.id } },
        ],
        [`${base}/mcp`, { jsonrpc: '2.0', id: 1, method: 'tools/list' }],
      ] as const) {
        const response = await f.fetch(path, {
          method: body ? 'POST' : 'GET',
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            'x-user-id': 'Alice',
            'content-type': 'application/json',
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        })
        expect(response.status).toBe(401)
        const text = await response.text()
        expect(text).not.toMatch(/BEGIN|issuer|Alice|SQL|claims/)
        if (token) expect(text).not.toContain(token)
      }
    }
    const spoofed = await f.fetch(`${base}/tools/${REPOSITORY_HEAD_TOOL}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${f.tokens.Bob}`,
        'x-user-id': 'Alice',
      },
      body: JSON.stringify({ input: { repositoryId: repo.id } }),
    })
    expect(spoofed.status).toBe(403)
  } finally {
    await f.close()
  }
  const unconfigured = await workerFixture({})
  try {
    expect(
      (
        await unconfigured.fetch(`${base}/tools`, {
          headers: { authorization: `Bearer ${await other.token()}` },
        })
      ).status,
    ).toBe(503)
  } finally {
    await unconfigured.close()
  }
}, 30000)
it('bounds arguments and rejects owner overrides, unknown tools, origins and malformed protocol data', async () => {
  const f = await tenantFixture()
  try {
    const repo = await f.create('Alice')
    const headers = {
      authorization: `Bearer ${f.tokens.Alice}`,
      'content-type': 'application/json',
    }
    const endpoint = `${base}/tools/${REPOSITORY_HEAD_TOOL}`
    for (const input of [
      null,
      [],
      {},
      { repositoryId: 'invalid' },
      { repositoryId: repo.id, namespace: 'alternate' },
      { repositoryId: repo.id, ownerSubject: 'Alice' },
      { repositoryId: repo.id, token: f.tokens.Alice },
    ]) {
      const res = await f.fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ input }),
      })
      expect(res.status).toBe(400)
      const text = await res.text()
      expect(text).not.toContain(f.tokens.Alice)
      expect(text).not.toContain(repo.id)
    }
    expect(
      (
        await f.fetch(endpoint, {
          method: 'POST',
          headers,
          body: 'x'.repeat(TOOL_REQUEST_BYTES + 1),
        })
      ).status,
    ).toBe(413)
    expect(
      (await f.fetch(endpoint, { method: 'POST', headers, body: '{' })).status,
    ).toBe(400)
    for (const name of [
      'records_create',
      'constructor',
      '__proto__',
      'toString',
      'miniagentgit.create_commit',
    ])
      expect(
        (await f.response('Alice', `${base}/tools/${name}`, { input: {} }))
          .status,
      ).toBe(404)
    expect(
      (
        await f.fetch(`${base}/tools`, {
          headers: { ...headers, origin: 'https://foreign.test' },
        })
      ).status,
    ).toBe(403)
    for (const query of ['owner=Alice', 'x=' + 'x'.repeat(2048)])
      expect((await f.response('Alice', `${base}/tools?${query}`)).status).toBe(
        400,
      )
    const mcp = await f.fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { ...headers, 'mcp-protocol-version': 'unknown' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    expect(mcp.status).toBe(400)
    const badCall = await f.response('Alice', `${base}/mcp`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: REPOSITORY_HEAD_TOOL,
        arguments: { repositoryId: repo.id, token: f.tokens.Alice },
      },
    })
    const text = await badCall.text()
    expect(JSON.parse(text)).toMatchObject({ result: { isError: true } })
    expect(text).not.toContain(f.tokens.Alice)
  } finally {
    await f.close()
  }
}, 30000)
