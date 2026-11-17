import type { Principal } from '../../domain/repository'
import { invalid, success } from '../../domain/result'
import { repositoryIdentity, sha256 } from '../../domain/commit-hashing'
import { validateCreateRepository } from '../../application/validate-inputs'
import type { ResourceLimits } from '../../application/resource-limits'
import { utf8Bytes, withinQuota } from '../../application/resource-limits'
import type { Database } from './database'
import { authorizedMetadata, conflict } from './repository-reads'

export async function initializeRepository(
  db: Database,
  id: string,
  actor: Principal,
  input: unknown,
  limits: ResourceLimits,
  createdAt: string,
) {
  if (
    actor.kind !== 'user' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(actor.subject) ||
    actor.subject.startsWith('anon-')
  )
    return invalid('Invalid actor')
  const parsed = validateCreateRepository(input)
  if (!parsed.ok) return parsed
  const matchesIdentity =
    (await repositoryIdentity(actor, parsed.value.idempotencyKey)) === id
  const digest = await sha256(
    JSON.stringify(['create-v1', actor.subject, parsed.value.name]),
  )
  return db.transaction(() => {
    const existing = db.all('SELECT id FROM repository WHERE singleton=1')[0]
    if (existing) {
      const authorized = authorizedMetadata(db, id, actor)
      if (!authorized.ok) return authorized
      const receipt = db.all(
        'SELECT key, digest FROM creation_receipt WHERE singleton=1',
      )[0]
      return receipt?.key === parsed.value.idempotencyKey &&
        receipt.digest === digest
        ? authorized
        : conflict(
            null,
            'Repository already exists with different creation request',
          )
    }
    if (!matchesIdentity) return conflict(null, 'Creation identity mismatch')
    const metadata = {
      id,
      name: parsed.value.name,
      ownerSubject: actor.subject,
      createdAt,
    }
    const bytes =
      utf8Bytes(JSON.stringify(metadata)) +
      utf8Bytes(JSON.stringify([parsed.value.idempotencyKey, digest])) +
      256
    const quota = withinQuota(
      'repositoryLogicalBytes',
      bytes,
      limits.repositoryLogicalBytes,
    )
    if (!quota.ok) return quota
    db.run(
      'INSERT INTO repository VALUES (1,?,?,?,?,?)',
      id,
      metadata.name,
      actor.subject,
      createdAt,
      bytes,
    )
    db.run(
      'INSERT INTO creation_receipt VALUES (1,?,?)',
      parsed.value.idempotencyKey,
      digest,
    )
    db.run('INSERT INTO head VALUES (1,NULL,0)')
    return success(metadata)
  })
}
