import { expect, it } from 'vitest'
import { nodeDatabase } from './sqlite-fixture'
import {
  initializeAdmission,
  limits,
  reserveRoute,
  spendWindow,
} from '../src/server/admission/ledger'

it('bounds fixed windows independently, including backward clock samples', () => {
  const { db, close } = nodeDatabase()
  try {
    initializeAdmission(db)
    for (const lane of ['auth', 'token', 'protected', 'ci'] as const) {
      for (let n = 0; n < limits[lane]; n++)
        expect(spendWindow(db, lane, 60_000)).toBe(true)
      expect(spendWindow(db, lane, 60_000)).toBe(false)
      expect(spendWindow(db, lane, 59_999)).toBe(false)
      expect(spendWindow(db, lane, 120_000)).toBe(true)
    }
    expect(db.all('SELECT lane FROM admission_windows')).toHaveLength(4)
  } finally {
    close()
  }
})

it('caps failed-lookup allocation paths and permits promotion within the creation budget', () => {
  const { db, close } = nodeDatabase()
  try {
    initializeAdmission(db)
    for (let n = 0; n < limits.routes; n++)
      expect(
        reserveRoute(db, 'repo_' + String(n).padStart(16, '0'), false),
      ).toBe('accepted')
    expect(reserveRoute(db, 'repo_0000000000000100', false)).toBe('routes')
    expect(reserveRoute(db, 'repo_0000000000000100', true)).toBe('routes')
    for (let n = 0; n < limits.repositories; n++)
      expect(
        reserveRoute(db, 'repo_' + String(n).padStart(16, '0'), true),
      ).toBe('accepted')
    expect(reserveRoute(db, 'repo_0000000000000004', true)).toBe('repositories')
    expect(reserveRoute(db, 'repo_0000000000000000', true)).toBe('accepted')
  } finally {
    close()
  }
})
