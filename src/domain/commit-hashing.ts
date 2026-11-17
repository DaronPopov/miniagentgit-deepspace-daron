import type { CommitRequest, FileManifest, Principal } from './repository'

export const comparePaths = (a: string, b: string) =>
  a < b ? -1 : a > b ? 1 : 0
export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
export function canonicalRequest(
  repositoryId: string,
  actor: Principal,
  request: CommitRequest,
): string {
  return JSON.stringify([
    'request-v1',
    repositoryId,
    actor.subject,
    request.expectedHead,
    request.message,
    [...request.changes]
      .sort((a, b) => comparePaths(a.path, b.path))
      .map((change) =>
        change.kind === 'put'
          ? ['put', change.path, change.text]
          : ['delete', change.path],
      ),
  ])
}
export const canonicalManifest = (manifest: FileManifest) =>
  JSON.stringify([
    'manifest-v1',
    [...manifest]
      .sort((a, b) => comparePaths(a.path, b.path))
      .map((file) => [file.path, file.contentHash, file.utf8Bytes]),
  ])
export const repositoryIdentity = async (actor: Principal, key: string) =>
  `repo_${(await sha256(JSON.stringify(['repository-v1', actor.subject, key]))).slice(0, 32)}`
