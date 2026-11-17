import type { Principal } from '../../domain/repository'
import type { PreparedCommit } from '../../application/repository-authority'
import type { ResourceLimits } from '../../application/resource-limits'
import { utf8Bytes, withinQuota } from '../../application/resource-limits'
import { canonicalManifest } from '../../domain/commit-hashing'
import { invalid, success } from '../../domain/result'
import { validateCommit } from '../../application/validate-commit'
import type { Database } from './database'
import { numberColumn } from './database'
import {
  authorizedMetadata,
  conflict,
  currentHead,
  lookupReplay,
} from './repository-reads'

/** The only function that advances HEAD. No asynchronous work inside closure. */
export function persistCommit(
  db: Database,
  id: string,
  actor: Principal,
  commit: PreparedCommit,
  limits: ResourceLimits,
  beforeHead?: () => void,
) {
  return db.transaction(() => {
    const authorized = authorizedMetadata(db, id, actor)
    if (!authorized.ok) return authorized
    const replay = lookupReplay(
      db,
      actor,
      commit.request.idempotencyKey,
      commit.requestDigest,
    )
    if (replay.ok || replay.error.code !== 'NOT_FOUND') return replay
    const head = currentHead(db)
    if (head.commitId !== commit.request.expectedHead)
      return conflict(head.commitId)
    const checked = validateCommit(commit.request, limits)
    if (!checked.ok) return checked
    const paths = new Set(commit.manifest.map((file) => file.path))
    for (const path of paths) {
      const parts = path.split('/')
      for (let i = 1; i < parts.length; i++)
        if (paths.has(parts.slice(0, i).join('/')))
          return invalid('File and directory path collision')
    }
    const contents = [
      ...new Map(
        commit.contents.map((content) => [content.hash, content]),
      ).values(),
    ].filter(
      (content) =>
        !db.all('SELECT hash FROM file_contents WHERE hash=?', content.hash)[0],
    )
    const receipt = [
      actor.subject,
      commit.request.idempotencyKey,
      commit.requestDigest,
      commit.metadata.id,
    ]
    const bytes =
      contents.reduce(
        (total, content) =>
          total +
          utf8Bytes(
            JSON.stringify([content.hash, content.text, content.utf8Bytes]),
          ) +
          64,
        0,
      ) +
      utf8Bytes(canonicalManifest(commit.manifest)) +
      commit.manifest.length * 64 +
      utf8Bytes(commit.canonical) +
      utf8Bytes(JSON.stringify(receipt)) +
      256
    const repository = db.all(
      'SELECT logical_bytes FROM repository WHERE singleton=1',
    )[0]
    if (!repository) throw new Error('Missing repository counter')
    const totalBytes = numberColumn(repository, 'logical_bytes') + bytes
    for (const quota of [
      withinQuota(
        'filesPerRepository',
        commit.manifest.length,
        limits.filesPerRepository,
      ),
      withinQuota(
        'commitsPerRepository',
        head.version + 1,
        limits.commitsPerRepository,
      ),
      withinQuota(
        'repositoryLogicalBytes',
        totalBytes,
        limits.repositoryLogicalBytes,
      ),
    ]) {
      if (!quota.ok) return quota
    }
    for (const content of contents)
      db.run(
        'INSERT INTO file_contents VALUES (?,?,?)',
        content.hash,
        content.text,
        content.utf8Bytes,
      )
    const meta = commit.metadata
    db.run(
      'INSERT INTO commits VALUES (?,?,?,?,?)',
      meta.id,
      meta.parentId,
      actor.subject,
      meta.message,
      meta.createdAt,
    )
    db.run('INSERT INTO snapshots VALUES (?,?)', meta.id, commit.manifestHash)
    for (const file of commit.manifest)
      db.run(
        'INSERT INTO manifest_entries VALUES (?,?,?)',
        meta.id,
        file.path,
        file.contentHash,
      )
    db.run('INSERT INTO idempotency VALUES (?,?,?,?)', ...receipt)
    beforeHead?.() // Test-only injected fault: throwing here must roll back every insert.
    db.run(
      'UPDATE head SET commit_id=?, version=version+1 WHERE singleton=1 AND version=?',
      meta.id,
      head.version,
    )
    if (db.all('SELECT changes() AS count')[0]?.count !== 1)
      throw new Error('HEAD compare-and-swap failed')
    db.run(
      'UPDATE repository SET logical_bytes=? WHERE singleton=1',
      totalBytes,
    )
    return success(meta)
  })
}
