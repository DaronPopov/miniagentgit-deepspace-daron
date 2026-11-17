import type {
  CommitRequest,
  FileManifest,
  ManifestEntry,
  Principal,
} from '../domain/repository'
import type { PreparedCommit } from './repository-authority'
import {
  canonicalManifest,
  canonicalRequest,
  comparePaths,
  sha256,
} from '../domain/commit-hashing'
import { utf8Bytes } from './resource-limits'

/** All asynchronous hashing is outside the authority's synchronous transaction. */
export async function prepareCommit(
  id: string,
  actor: Principal,
  request: CommitRequest,
  previous: FileManifest,
  createdAt: string,
): Promise<PreparedCommit> {
  const tree = new Map<string, ManifestEntry>(
    previous.map((file) => [file.path, file]),
  )
  const contents: { hash: string; text: string; utf8Bytes: number }[] = []
  for (const change of request.changes) {
    if (change.kind === 'delete') tree.delete(change.path)
    else {
      const hash = await sha256(change.text)
      const size = utf8Bytes(change.text)
      contents.push(Object.freeze({ hash, text: change.text, utf8Bytes: size }))
      tree.set(
        change.path,
        Object.freeze({
          path: change.path,
          contentHash: hash,
          utf8Bytes: size,
        }),
      )
    }
  }
  const manifest = Object.freeze(
    [...tree.values()].sort((a, b) => comparePaths(a.path, b.path)),
  )
  const manifestHash = await sha256(canonicalManifest(manifest))
  const canonical = JSON.stringify([
    'commit-v1',
    id,
    request.expectedHead,
    actor.subject,
    request.message,
    createdAt,
    manifestHash,
  ])
  const commitId = await sha256(canonical)
  return Object.freeze({
    request,
    manifest,
    manifestHash,
    canonical,
    contents: Object.freeze(contents),
    requestDigest: await sha256(canonicalRequest(id, actor, request)),
    metadata: Object.freeze({
      id: commitId,
      parentId: request.expectedHead,
      author: Object.freeze({ ...actor }),
      message: request.message,
      createdAt,
    }),
  })
}
