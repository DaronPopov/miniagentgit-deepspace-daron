import type {
  CommitMetadata,
  ManifestEntry,
  RepositoryHead,
  RepositoryMetadata,
} from '../../domain/repository'

export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
export function id(value: unknown): value is string {
  return typeof value === 'string' && /^repo_[a-z0-9]{16,32}$/.test(value)
}
export function hash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}
export function uint(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
export function repository(value: unknown): RepositoryMetadata | undefined {
  if (
    !record(value) ||
    !id(value.id) ||
    typeof value.name !== 'string' ||
    typeof value.ownerSubject !== 'string' ||
    typeof value.createdAt !== 'string'
  )
    return
  return {
    id: value.id,
    name: value.name,
    ownerSubject: value.ownerSubject,
    createdAt: value.createdAt,
  }
}
export function head(value: unknown): RepositoryHead | undefined {
  if (
    !record(value) ||
    (value.commitId !== null && !hash(value.commitId)) ||
    !uint(value.version)
  )
    return
  return { commitId: value.commitId, version: value.version }
}
export function commit(value: unknown): CommitMetadata | undefined {
  if (
    !record(value) ||
    !hash(value.id) ||
    (value.parentId !== null && !hash(value.parentId)) ||
    typeof value.message !== 'string' ||
    typeof value.createdAt !== 'string' ||
    !record(value.author) ||
    value.author.kind !== 'user' ||
    typeof value.author.subject !== 'string'
  )
    return
  return {
    id: value.id,
    parentId: value.parentId,
    message: value.message,
    createdAt: value.createdAt,
    author: { kind: 'user', subject: value.author.subject },
  }
}
export function file(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length <= 32768) return value
}
export interface Page<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
}
export function page<T>(
  value: unknown,
  decode: (entry: unknown) => T | undefined,
  limit: number,
): Page<T> | undefined {
  if (
    !record(value) ||
    !Array.isArray(value.items) ||
    value.items.length > limit ||
    (value.nextCursor !== null &&
      (typeof value.nextCursor !== 'string' || value.nextCursor.length > 512))
  )
    return
  const items: T[] = []
  for (const raw of value.items) {
    const item = decode(raw)
    if (item === undefined) return
    items.push(item)
  }
  return { items, nextCursor: value.nextCursor }
}
function entry(value: unknown): ManifestEntry | undefined {
  if (
    !record(value) ||
    typeof value.path !== 'string' ||
    value.path.length > 240 ||
    !hash(value.contentHash) ||
    !uint(value.utf8Bytes)
  )
    return
  return {
    path: value.path,
    contentHash: value.contentHash,
    utf8Bytes: value.utf8Bytes,
  }
}
export const treePage = (value: unknown) => page(value, entry, 12)
