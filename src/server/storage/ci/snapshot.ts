import type { CiJob, CiSnapshot } from '../../../contracts/ci'
import type { CiLimits } from '../../../application/ci/limits'
import type { Result } from '../../../domain/result'
import { success } from '../../../domain/result'
import type { Database } from '../database'
import { numberColumn, nullableString, stringColumn } from '../database'
import { missing } from '../repository-reads'

export function loadCiSnapshot(
  db: Database,
  job: CiJob,
  limits: CiLimits,
): Result<CiSnapshot> {
  const commit = db.all(
    'SELECT * FROM commits WHERE id=? AND LENGTH(CAST(message AS BLOB))<=1024 AND LENGTH(author_subject)<=128 AND LENGTH(created_at)<=64',
    job.commitId,
  )[0]
  if (!commit) return missing()
  const snapshot = db.all(
    'SELECT manifest_hash FROM snapshots WHERE commit_id=? AND LENGTH(manifest_hash)=64',
    job.commitId,
  )[0]
  // Read only bounded metadata first; never copy an oversized text cell into JS.
  const rows = db.all(
    `SELECT CASE WHEN LENGTH(m.path)<=240 THEN m.path ELSE '' END AS path, CASE WHEN LENGTH(m.content_hash)=64 THEN m.content_hash ELSE '' END AS content_hash,f.utf8_bytes,LENGTH(CAST(f.text AS BLOB)) AS actual_bytes
    FROM manifest_entries m LEFT JOIN file_contents f ON m.content_hash=f.hash WHERE m.commit_id=? ORDER BY m.path LIMIT ?`,
    job.commitId,
    limits.files + 1,
  )
  let total = 0
  if (rows.length > limits.files)
    return quota('ciFiles', rows.length, limits.files)
  for (const row of rows) {
    if (row.actual_bytes === null) continue
    const bytes = numberColumn(row, 'actual_bytes')
    if (bytes > limits.fileBytes)
      return quota('ciFileBytes', bytes, limits.fileBytes)
    total += bytes
    if (total > limits.inputBytes)
      return quota('ciInputBytes', total, limits.inputBytes)
  }
  const entries = rows.map((row) => {
    const hash = stringColumn(row, 'content_hash')
    const content =
      row.actual_bytes === null
        ? undefined
        : db.all(
            'SELECT text FROM file_contents WHERE hash=? AND LENGTH(CAST(text AS BLOB))<=?',
            hash,
            limits.fileBytes,
          )[0]
    return {
      path: stringColumn(row, 'path'),
      hash,
      bytes: row.utf8_bytes === null ? 0 : numberColumn(row, 'utf8_bytes'),
      content: content ? stringColumn(content, 'text') : null,
    }
  })
  const manifestHash = snapshot ? stringColumn(snapshot, 'manifest_hash') : null
  return success({
    repositoryId: job.repositoryId,
    commitId: job.commitId,
    manifestHash,
    entries,
    canonicalCommit: JSON.stringify([
      'commit-v1',
      job.repositoryId,
      nullableString(commit, 'parent_id'),
      stringColumn(commit, 'author_subject'),
      stringColumn(commit, 'message'),
      stringColumn(commit, 'created_at'),
      manifestHash,
    ]),
  })
}
function quota(
  resource: string,
  actual: number,
  maximum: number,
): Result<never> {
  return {
    ok: false,
    error: { code: 'QUOTA_EXCEEDED', resource, maximum, actual },
  }
}
