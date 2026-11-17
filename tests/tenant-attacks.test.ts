import { expect, it } from 'vitest'
import { identityFixture } from './identity-fixture'
import { workerFixture } from './worker-fixture'

it('rejects real SDK JWT attacks, forged ownership claims, unauthenticated CI and missing trusted configuration in workerd', async () => {
  const identity = await identityFixture(),
    other = await identityFixture(),
    worker = await workerFixture(identity.env)
  try {
    const valid = await identity.token('Alice')
    for (const token of [
      '',
      'malformed.token',
      await other.token('Alice'),
      await identity.token('Alice', { exp: 1 }),
      await identity.token('Alice', { iss: 'https://wrong.test' }),
      await identity.token('Alice', { aud: 'wrong' }),
    ]) {
      const res = await worker.fetch('/api/me', {
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          'x-user-id': 'Alice',
          'x-owner-id': 'Alice',
          'x-role': 'admin',
        },
      })
      expect(res.status).toBe(401)
      const body = JSON.stringify(await res.json())
      expect(body).not.toMatch(/signature|SELECT|BEGIN PUBLIC|eyJ/)
    }
    const forged = await worker.fetch('/api/repositories', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${valid}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Private',
        idempotencyKey: 'forged_owner_key_1',
        ownerSubject: 'Bob',
      }),
    })
    expect(forged.status).toBe(400)
    expect(
      (
        await worker.fetch(
          `/api/repositories/repo_${'a'.repeat(32)}/ci/jobs/ci_${'b'.repeat(64)}`,
        )
      ).status,
    ).toBe(401)
  } finally {
    await worker.close()
  }
  const unconfigured = await workerFixture({})
  try {
    expect(
      (
        await unconfigured.fetch('/api/me', {
          headers: { authorization: `Bearer ${await identity.token('Alice')}` },
        })
      ).status,
    ).toBe(503)
  } finally {
    await unconfigured.close()
  }
}, 30000)
