// String aliases are serializable; all external values must pass validators.
export type RepositoryId = string
export type CommitId = string
export type FilePath = string
export type IdempotencyKey = string

export interface Principal {
  readonly kind: 'user'
  readonly subject: string
}
export interface RepositoryMetadata {
  readonly id: RepositoryId
  readonly name: string
  readonly ownerSubject: string
  readonly createdAt: string
}
export interface RepositoryHead {
  readonly commitId: CommitId | null
  readonly version: number
}
export type FileChange =
  | { readonly kind: 'put'; readonly path: FilePath; readonly text: string }
  | { readonly kind: 'delete'; readonly path: FilePath }
export interface ManifestEntry {
  readonly path: FilePath
  readonly contentHash: string
  readonly utf8Bytes: number
}
export type FileManifest = readonly ManifestEntry[]
export interface CommitMetadata {
  readonly id: CommitId
  readonly parentId: CommitId | null
  readonly author: Principal
  readonly message: string
  readonly createdAt: string
}
export interface CommitRequest {
  readonly expectedHead: CommitId | null
  readonly idempotencyKey: IdempotencyKey
  readonly message: string
  readonly changes: readonly FileChange[]
}
