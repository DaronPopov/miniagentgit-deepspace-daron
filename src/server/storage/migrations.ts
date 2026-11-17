import type { Database } from './database'
import { numberColumn } from './database'
import { REPOSITORY_SCHEMA } from './schema'

/** Additive v2 upgrade from Pass 02; no fabricated commits or data rewrites. */
export function initializeDatabase(db: Database) {
  db.transaction(() => {
    db.run(
      'CREATE TABLE IF NOT EXISTS repository_migrations (version INTEGER PRIMARY KEY)',
    )
    const version = db.all(
      'SELECT MAX(version) AS version FROM repository_migrations',
    )[0]
    const current =
      version?.version === null
        ? 0
        : version
          ? numberColumn(version, 'version')
          : 0
    if (current > 2) throw new Error('Unsupported repository schema')
    for (const statement of REPOSITORY_SCHEMA) db.run(statement)
    if (current < 2) {
      db.run(
        'CREATE TABLE IF NOT EXISTS creation_receipt (singleton INTEGER PRIMARY KEY CHECK(singleton=1), key TEXT NOT NULL, digest TEXT NOT NULL)',
      )
      db.run(
        'CREATE TABLE IF NOT EXISTS snapshots (commit_id TEXT PRIMARY KEY REFERENCES commits(id), manifest_hash TEXT NOT NULL)',
      )
      for (const table of [
        'commits',
        'file_contents',
        'manifest_entries',
        'idempotency',
        'snapshots',
        'creation_receipt',
      ]) {
        for (const action of ['UPDATE', 'DELETE']) {
          // Table/action names are fixed literals, never request input.
          db.run(
            `CREATE TRIGGER IF NOT EXISTS immutable_${table}_${action} BEFORE ${action} ON ${table} BEGIN SELECT RAISE(ABORT, 'immutable repository data'); END`,
          )
        }
      }
      db.run('INSERT INTO repository_migrations(version) VALUES (2)')
    }
  })
}
