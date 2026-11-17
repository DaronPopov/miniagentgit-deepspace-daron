import { describe, expect, it } from 'vitest'
import {
  configureLimits,
  FREE_TIER_LIMITS,
  withinQuota,
} from '../src/application/resource-limits'
import { validateCommit } from '../src/application/validate-commit'
import { readJsonRequest } from '../src/server/api/request'

const request = (text = 'hello') => ({
  expectedHead: null,
  idempotencyKey: 'first_commit_key_1',
  message: 'Initial',
  changes: [{ kind: 'put', path: 'README.md', text }],
})

describe('FREE-TIER-001 resource controls', () => {
  it('accepts lower-only immutable configuration and rejects unsafe limits', () => {
    const configured = configureLimits({ fileBytes: 4 })
    expect(configured.ok && configured.value.fileBytes).toBe(4)
    expect(configured.ok && Object.isFrozen(configured.value)).toBe(true)
    for (const value of [
      0,
      -1,
      NaN,
      Infinity,
      1.5,
      FREE_TIER_LIMITS.fileBytes + 1,
    ]) {
      expect(configureLimits({ fileBytes: value }).ok).toBe(false)
    }
    expect(withinQuota('storage', Number.MAX_SAFE_INTEGER + 1, 10).ok).toBe(
      false,
    )
  })

  it('counts UTF-8 bytes and accepts the exact file limit', () => {
    expect(
      validateCommit(request('a'.repeat(FREE_TIER_LIMITS.fileBytes))).ok,
    ).toBe(true)
    expect(
      validateCommit(request('é'.repeat(FREE_TIER_LIMITS.fileBytes / 2 + 1))),
    ).toMatchObject({
      ok: false,
      error: { code: 'QUOTA_EXCEEDED', resource: 'fileBytes' },
    })
  })

  it('limits aggregate text, changes, and message bytes independently', () => {
    const base = request('a'.repeat(32768))
    expect(
      validateCommit({
        ...base,
        changes: Array.from({ length: 5 }, (_, i) => ({
          kind: 'put',
          path: `file${i}`,
          text: 'a'.repeat(32768),
        })),
      }),
    ).toMatchObject({ error: { resource: 'commitTextBytes' } })
    expect(
      validateCommit({ ...base, message: 'x'.repeat(1025) }),
    ).toMatchObject({ error: { resource: 'messageBytes' } })
    expect(
      validateCommit({
        ...base,
        changes: Array.from({ length: 17 }, (_, i) => ({
          kind: 'delete',
          path: `file${i}`,
        })),
      }),
    ).toMatchObject({ error: { resource: 'changesPerCommit' } })
  })

  it('enforces actual streamed bytes even without a truthful Content-Length', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('"123456789"'))
        controller.close()
      },
    })
    const init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '1' },
      body,
      duplex: 'half',
    }
    const result = await readJsonRequest(
      new Request('https://example.test', init),
      10,
    )
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'QUOTA_EXCEEDED', resource: 'requestBytes', maximum: 10 },
    })
  })

  it('accepts exact request bytes, rejects bad JSON and unsupported content types', async () => {
    const make = (body: string, type = 'application/json') =>
      new Request('https://example.test', {
        method: 'POST',
        headers: { 'content-type': type },
        body,
      })
    expect(await readJsonRequest(make('{}'), 2)).toEqual({
      ok: true,
      value: {},
    })
    expect(await readJsonRequest(make('{'))).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    })
    expect(await readJsonRequest(make('{}', 'text/plain'))).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    })
  })
})
