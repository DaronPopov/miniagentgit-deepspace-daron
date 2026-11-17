import { DatabaseSync } from 'node:sqlite'
import { expect, it } from 'vitest'
import { REPOSITORY_SCHEMA } from '../src/server/storage/schema'

it('accepts the DDL in real local SQLite and enforces singleton and foreign keys', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('PRAGMA foreign_keys = ON')
    for (const sql of REPOSITORY_SCHEMA) db.exec(sql)
    for (const sql of REPOSITORY_SCHEMA) db.exec(sql)
    expect(() => db.exec("INSERT INTO head VALUES (1, 'missing', 0)")).toThrow()
    db.exec('INSERT INTO head VALUES (1, NULL, 0)')
    expect(() => db.exec('INSERT INTO head VALUES (2, NULL, 0)')).toThrow()
    expect(() => db.exec('UPDATE head SET version = -1')).toThrow()
  } finally {
    db.close()
  }
})
