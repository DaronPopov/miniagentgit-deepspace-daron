/** Single repository per database. Not the SDK's generic records tables. */
export const REPOSITORY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS repository (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, owner_subject TEXT NOT NULL,
    created_at TEXT NOT NULL, logical_bytes INTEGER NOT NULL DEFAULT 0 CHECK (logical_bytes >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS commits (
    id TEXT PRIMARY KEY, parent_id TEXT REFERENCES commits(id),
    author_subject TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS head (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    commit_id TEXT REFERENCES commits(id), version INTEGER NOT NULL CHECK (version >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS file_contents (
    hash TEXT PRIMARY KEY, text TEXT NOT NULL, utf8_bytes INTEGER NOT NULL CHECK (utf8_bytes >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS manifest_entries (
    commit_id TEXT NOT NULL REFERENCES commits(id), path TEXT NOT NULL,
    content_hash TEXT NOT NULL REFERENCES file_contents(hash),
    PRIMARY KEY (commit_id, path)
  )`,
  `CREATE TABLE IF NOT EXISTS idempotency (
    actor_subject TEXT NOT NULL, key TEXT NOT NULL, request_digest TEXT NOT NULL,
    commit_id TEXT NOT NULL REFERENCES commits(id), PRIMARY KEY (actor_subject, key)
  )`,
] as const
