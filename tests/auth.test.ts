import { webcrypto } from 'node:crypto'
import { beforeAll, expect, it } from 'vitest'
import { createPrincipalRoutes } from '../src/server/api/principal'
import type { AuthEnvironment } from '../src/server/deepspace/auth'

let env: AuthEnvironment
let privateKey: webcrypto.CryptoKey
beforeAll(async () => {
  const keys = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )
  privateKey = keys.privateKey
  const publicBytes = await webcrypto.subtle.exportKey('spki', keys.publicKey)
  env = {
    AUTH_JWT_PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----\n${Buffer.from(publicBytes).toString('base64')}\n-----END PUBLIC KEY-----`,
    AUTH_JWT_ISSUER: 'https://issuer.test',
    AUTH_JWT_AUDIENCE: 'miniagentgit-test',
  }
})
async function token(overrides: Record<string, unknown> = {}) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const input = `${encode({ alg: 'ES256', typ: 'JWT' })}.${encode({
    sub: 'verified-owner',
    iss: env.AUTH_JWT_ISSUER,
    aud: env.AUTH_JWT_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) + 60,
    ...overrides,
  })}`
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(input),
  )
  return `${input}.${Buffer.from(signature).toString('base64url')}`
}
const app = createPrincipalRoutes()
it('verifies a signed JWT with the actual SDK and ignores client identity headers', async () => {
  const response = await app.request(
    '/me',
    {
      headers: {
        authorization: `Bearer ${await token()}`,
        'x-user-id': 'attacker',
        'x-role': 'admin',
      },
    },
    env,
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    ok: true,
    value: { kind: 'user', subject: 'verified-owner' },
  })
})
it('rejects missing, forged, expired, wrong issuer and wrong audience identities', async () => {
  expect(
    (await app.request('/me', { headers: { 'x-user-id': 'owner' } }, env))
      .status,
  ).toBe(401)
  for (const value of [
    'forged',
    await token({ exp: 1 }),
    await token({ iss: 'https://other.test' }),
    await token({ aud: 'other' }),
    await token({ sub: 'anon-123' }),
  ]) {
    expect(
      (
        await app.request(
          '/me',
          { headers: { authorization: `Bearer ${value}` } },
          env,
        )
      ).status,
    ).toBe(401)
  }
})
it('fails closed when trusted verification configuration is absent', async () => {
  expect(
    (
      await app.request(
        '/me',
        { headers: { authorization: `Bearer ${await token()}` } },
        {},
      )
    ).status,
  ).toBe(503)
})
