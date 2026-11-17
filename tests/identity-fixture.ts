import { webcrypto } from 'node:crypto'
import type { AuthEnvironment } from '../src/server/deepspace/auth'

/** Ephemeral test keys; no platform session or credentials. */
export async function identityFixture() {
  const keys = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )
  const bytes = await webcrypto.subtle.exportKey('spki', keys.publicKey)
  const env: AuthEnvironment = {
    AUTH_JWT_PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----\n${Buffer.from(bytes).toString('base64')}\n-----END PUBLIC KEY-----`,
    AUTH_JWT_ISSUER: 'https://issuer.test',
    AUTH_JWT_AUDIENCE: 'miniagentgit-test',
  }
  async function token(subject = 'owner') {
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString('base64url')
    const payload = `${encode({ alg: 'ES256', typ: 'JWT' })}.${encode({
      sub: subject,
      iss: env.AUTH_JWT_ISSUER,
      aud: env.AUTH_JWT_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 600,
    })}`
    const signature = await webcrypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      keys.privateKey,
      new TextEncoder().encode(payload),
    )
    return `${payload}.${Buffer.from(signature).toString('base64url')}`
  }
  return { env, token }
}
