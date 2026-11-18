import type { Result } from '../../domain/result'
export function resultResponse<T>(
  result: Result<T>,
  successfulStatus = 200,
): Response {
  if (result.ok) return Response.json(result, { status: successfulStatus })
  const error = result.error
  const status =
    error.code === 'INVALID_INPUT'
      ? 400
      : error.code === 'UNAUTHENTICATED'
        ? 401
        : error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'CONFLICT'
              ? 409
              : error.code === 'QUOTA_EXCEEDED'
                ? error.resource === 'pendingCommits' ||
                  error.resource === 'ciOutstanding' ||
                  error.resource.startsWith('admission:')
                  ? 429
                  : 413
                : 503
  return Response.json(result, { status })
}
