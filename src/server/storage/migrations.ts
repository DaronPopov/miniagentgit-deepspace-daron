import { initializeCiSchema } from './ci/schema'
import type { Database } from './database'
import { numberColumn } from './database'
import { REPOSITORY_SCHEMA } from './schema'

/** Additive v2 repository / v3 CI migrations; no fabricated commits or data rewrites. */
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
    if (current > 4) throw new Error('Unsupported repository schema')
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
    if (current < 3) {
      initializeCiSchema(db)
      db.run('INSERT INTO repository_migrations(version) VALUES (3)')
    }
    if (current < 4) {
      db.run(`CREATE TABLE ci_stages (
        job_id TEXT PRIMARY KEY REFERENCES ci_jobs(id),
        sequence INTEGER NOT NULL DEFAULT 0 CHECK(sequence BETWEEN 0 AND 2),
        integrity_ms INTEGER,
        integrity_duration_ms INTEGER,
        source_duration_ms INTEGER,
        completed_ms INTEGER,
        checkpoint TEXT NOT NULL DEFAULT '',
        CHECK(length(CAST(checkpoint AS BLOB)) <= 4096)
      )`)
      db.run('DROP TRIGGER ci_legal_transition')
      db.run(`CREATE TRIGGER ci_legal_transition BEFORE UPDATE ON ci_jobs WHEN NOT (
        (OLD.state='queued' AND NEW.state IN ('running','cancelled','expired','interrupted')) OR
        (OLD.state='running' AND NEW.state IN ('queued','passed','failed','cancelled','expired','interrupted')) OR
        (OLD.state='running' AND NEW.state='running' AND OLD.attempts=1 AND
          EXISTS (SELECT 1 FROM ci_stages WHERE job_id=OLD.id))
      ) BEGIN SELECT RAISE(ABORT,'invalid CI transition'); END`)
      db.run('INSERT INTO repository_migrations(version) VALUES (4)')
    }
  })
}
