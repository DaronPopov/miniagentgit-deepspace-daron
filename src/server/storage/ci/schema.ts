import type { Database } from '../database'

export function initializeCiSchema(db: Database) {
  db.run(`CREATE TABLE ci_jobs (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
    repository_id TEXT NOT NULL, commit_id TEXT NOT NULL REFERENCES commits(id),
    pipeline_id TEXT NOT NULL CHECK(pipeline_id='miniagentgit-ci-v1'), fingerprint TEXT NOT NULL,
    pipeline_version INTEGER NOT NULL CHECK(pipeline_version BETWEEN 1 AND 1000000),
    state TEXT NOT NULL CHECK(state IN ('queued','running','passed','failed','cancelled','expired','interrupted')),
    generation INTEGER NOT NULL CHECK(generation>=0), attempts INTEGER NOT NULL CHECK(attempts>=0),
    created_ms INTEGER NOT NULL, updated_ms INTEGER NOT NULL, deadline_ms INTEGER NOT NULL,
    code TEXT NOT NULL CHECK(length(code)<=32), storage_bytes INTEGER NOT NULL CHECK(storage_bytes>0),
    UNIQUE(repository_id,commit_id,pipeline_id,pipeline_version,fingerprint))`)
  db.run('CREATE INDEX ci_pending ON ci_jobs(state,seq)')
  db.run('CREATE INDEX ci_commit ON ci_jobs(commit_id,seq)')
  db.run(`CREATE TABLE ci_receipts (job_id TEXT PRIMARY KEY REFERENCES ci_jobs(id),
    generation INTEGER NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload) AND length(CAST(payload AS BLOB))<=16384))`)
  db.run(`CREATE TRIGGER ci_legal_transition BEFORE UPDATE ON ci_jobs WHEN NOT (
    (OLD.state='queued' AND NEW.state IN ('running','cancelled','expired','interrupted')) OR
    (OLD.state='running' AND NEW.state IN ('queued','passed','failed','cancelled','expired','interrupted'))
    ) BEGIN SELECT RAISE(ABORT,'invalid CI transition'); END`)
  db.run(`CREATE TRIGGER ci_identity BEFORE UPDATE OF seq,id,repository_id,commit_id,pipeline_id,fingerprint,pipeline_version,created_ms,storage_bytes
    ON ci_jobs BEGIN SELECT RAISE(ABORT,'immutable CI identity'); END`)
  db.run(`CREATE TRIGGER ci_generation BEFORE UPDATE ON ci_jobs WHEN NEW.generation<OLD.generation OR
    (NEW.state='running' AND (NEW.generation!=OLD.generation+1 OR NEW.attempts!=OLD.attempts+1)) OR
    (NEW.state='queued' AND (NEW.generation!=OLD.generation+1 OR NEW.attempts!=OLD.attempts))
    BEGIN SELECT RAISE(ABORT,'invalid CI generation'); END`)
  for (const table of ['ci_jobs', 'ci_receipts']) {
    db.run(
      `CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'durable CI retention'); END`,
    )
  }
  db.run(
    "CREATE TRIGGER ci_receipts_immutable BEFORE UPDATE ON ci_receipts BEGIN SELECT RAISE(ABORT,'immutable CI receipt'); END",
  )
}
