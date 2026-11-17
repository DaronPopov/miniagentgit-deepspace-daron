import type { Principal, RepositoryMetadata } from '../domain/repository'
import type { Result } from '../domain/result'
import { success } from '../domain/result'

export type RepositoryPermission = 'read' | 'write' | 'restore'
export type AuthorizeRepository = (
  actor: Principal,
  repository: RepositoryMetadata,
  permission: RepositoryPermission,
) => Result<void>

/** Metadata must come from the authority, never the request body. */
export const authorizeOwner: AuthorizeRepository = (actor, repository) =>
  actor.subject === repository.ownerSubject
    ? success(undefined)
    : {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Repository access denied' },
      }
