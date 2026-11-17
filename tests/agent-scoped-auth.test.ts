import { agentTokenIssuer, verifyAgentToken } from 'deepspace/worker'
import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'
import { agentCredentialFixture } from './agent-credential-fixture'
import { authenticateTool } from '../src/server/deepspace/agent-auth'

it('qualifies the actual SDK verifier, strict agent claims and the unchanged user policy in workerd', async () => {
  const f = await agentCredentialFixture()
  try {
    const a = await f.create('Alice'),
      scoped = await f.token()
    const verified = await verifyAgentToken(
      {
        publicKey: String(f.identity.env.AUTH_JWT_PUBLIC_KEY),
        issuer: String(f.identity.env.AUTH_JWT_ISSUER),
      },
      scoped,
      'http://localhost',
    )
    expect(verified.result).toMatchObject({
      userId: 'Alice',
      claims: { scope: 'agent' },
    })
    expect((await f.head(scoped, a.id)).status).toBe(200)
    expect((await f.head(f.tokens.Alice, a.id)).status).toBe(200)
    for (const path of [
      '/api/me',
      a.base,
      `${a.base}/head`,
      `${a.base}/ci/jobs`,
    ])
      expect((await f.send(scoped, path)).status).toBe(401)
    for (const overrides of [
      { exp: 1 },
      { exp: Math.floor(Date.now() / 1000) - 1 },
      { exp: undefined },
      { iss: 'https://untrusted.test/agent' },
      { iss: f.identity.env.AUTH_JWT_ISSUER },
      { aud: 'https://other.test' },
      { scope: 'app:owner' },
      { scope: 'user' },
      { scope: undefined },
      { sub: 'anon-Alice' },
      { sub: '' },
      { sub: ' ' },
      { nbf: Math.floor(Date.now() / 1000) + 600 },
    ]) {
      const response = await f.head(await f.token('Alice', overrides), a.id)
      expect(response.status, JSON.stringify(overrides)).toBe(401)
    }
    const other = await identityFixture()
    const invalidSignature = await other.token('Alice', {
      iss: agentTokenIssuer(String(f.identity.env.AUTH_JWT_ISSUER)),
      aud: 'http://localhost',
      scope: 'agent',
    })
    for (const credential of [
      '',
      'forged',
      'a.b.c',
      scoped + '.extra',
      invalidSignature,
    ])
      expect((await f.head(credential, a.id)).status).toBe(401)
    const forged = await f.fetch('/_deepspace/agent/tools', {
      headers: { 'x-user-id': 'Alice', cookie: 'session=forged' },
    })
    expect(forged.status).toBe(401)
    // Signed Bob with misleading delegation/owner claims is still only Bob.
    const bob = await f.token('Bob', {
      userId: 'Alice',
      ownerSubject: 'Alice',
      act: { sub: 'Alice' },
    })
    expect((await f.head(bob, a.id)).status).toBe(403)
    const response = await f.head(scoped, a.id),
      text = await response.text()
    expect(text).not.toContain(scoped)
    expect(text).not.toContain('Alice')
  } finally {
    await f.close()
  }
}, 30000)

it('fails closed for every missing verifier setting at the actual Worker transport', async () => {
  const identity = await identityFixture()
  for (const setting of [
    'AUTH_JWT_PUBLIC_KEY',
    'AUTH_JWT_ISSUER',
    'AUTH_JWT_AUDIENCE',
  ] as const) {
    const env = { ...identity.env }
    delete env[setting]
    const f = await workerFixture(env)
    try {
      const token = await identity.token('Alice', {
        iss: agentTokenIssuer(String(identity.env.AUTH_JWT_ISSUER)),
        aud: 'http://localhost',
        scope: 'agent',
      })
      expect(
        (
          await f.fetch('/_deepspace/agent/tools', {
            headers: { authorization: `Bearer ${token}` },
          })
        ).status,
      ).toBe(503)
    } finally {
      await f.close()
    }
  }
}, 30000)

it('rejects unrecognized Authorization formats without trusting an identity header', async () => {
  const identity = await identityFixture()
  const token = await identity.token('Alice')
  for (const authorization of [
    `Basic ${token}`,
    `Bearer ${token} extra`,
    'Bearer',
    `Bearer ${'x'.repeat(8193)}`,
  ]) {
    const result = await authenticateTool(
      new Request('http://localhost/_deepspace/agent/tools', {
        headers: { authorization, 'x-user-id': 'Alice' },
      }),
      identity.env,
    )
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHENTICATED' },
    })
  }
})
