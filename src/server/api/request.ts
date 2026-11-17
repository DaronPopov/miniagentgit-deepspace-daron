import { BodyTooLargeError, readBoundedBodyText } from 'deepspace/worker'
import type { Result } from '../../domain/result'
import { invalid } from '../../domain/result'
import { FREE_TIER_LIMITS } from '../../application/resource-limits'

/** Use before parsing any future repository request; no mutation route exists yet. */
export async function readJsonRequest(
  request: Request,
  maximum = FREE_TIER_LIMITS.requestBytes,
): Promise<Result<unknown>> {
  if (
    !Number.isSafeInteger(maximum) ||
    maximum <= 0 ||
    maximum > FREE_TIER_LIMITS.requestBytes
  ) {
    return invalid('Invalid request byte limit')
  }
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
    'application/json'
  ) {
    return invalid('Expected application/json')
  }
  try {
    const text = await readBoundedBodyText(request, maximum)
    const value: unknown = JSON.parse(text)
    return { ok: true, value }
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      return {
        ok: false,
        error: { code: 'QUOTA_EXCEEDED', resource: 'requestBytes', maximum },
      }
    if (error instanceof SyntaxError) return invalid('Invalid JSON')
    return {
      ok: false,
      error: { code: 'UNAVAILABLE', message: 'Request body could not be read' },
    }
  }
}
