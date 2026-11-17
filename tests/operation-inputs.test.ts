import { expect, it } from 'vitest'
import {
  validateCreateRepository,
  validatePage,
  validateRestore,
} from '../src/application/validate-inputs'

it('rejects ownership injection and validates repository names', () => {
  const input = { name: 'takehome', idempotencyKey: 'unique_create_123' }
  expect(validateCreateRepository(input).ok).toBe(true)
  expect(
    validateCreateRepository({ ...input, ownerSubject: 'attacker' }).ok,
  ).toBe(false)
  expect(validateCreateRepository({ ...input, name: '' }).ok).toBe(false)
})
it('bounds page results and cursors', () => {
  expect(validatePage({ cursor: null, limit: 25 }).ok).toBe(true)
  expect(validatePage({ cursor: null, limit: 26 })).toMatchObject({
    error: { code: 'QUOTA_EXCEEDED' },
  })
  expect(validatePage({ cursor: null, limit: 0 }).ok).toBe(false)
  expect(validatePage({ cursor: '../escape', limit: 1 }).ok).toBe(false)
})
it('requires restore source, expected HEAD, and idempotency key', () => {
  const input = {
    source: 'a'.repeat(64),
    expectedHead: null,
    idempotencyKey: 'unique_restore_1',
  }
  expect(validateRestore(input).ok).toBe(true)
  expect(validateRestore({ ...input, expectedHead: 'invalid' }).ok).toBe(false)
  expect(validateRestore({ ...input, source: undefined }).ok).toBe(false)
})
