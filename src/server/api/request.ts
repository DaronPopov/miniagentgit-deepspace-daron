import { BodyTooLargeError, readBoundedBodyText } from 'deepspace/worker'
import type { Result } from '../../domain/result'
import { invalid } from '../../domain/result'
import { FREE_TIER_LIMITS } from '../../application/resource-limits'

export function checkedUtf8Body(
  request: Request,
  maximum: number,
  onInvalid: () => void = () => undefined,
) {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let inspected = 0
  function inspect(chunk?: Uint8Array) {
    if (inspected > maximum) return
    try {
      decoder.decode(chunk, { stream: chunk !== undefined })
    } catch (error) {
      onInvalid()
      throw error
    }
  }
  return (
    request.body?.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          inspected += chunk.byteLength
          inspect(chunk)
          // The SDK owns the size check and stops reading oversize streams.
          controller.enqueue(chunk)
        },
        flush() {
          inspect()
        },
      }),
    ) ?? null
  )
}

/** Bounded JSON parsing shared by authenticated repository transports. */
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
  let invalidUtf8 = false
  try {
    const body = checkedUtf8Body(request, maximum, () => {
      invalidUtf8 = true
    })
    const text = await readBoundedBodyText(
      { headers: request.headers, body },
      maximum,
    )
    const value: unknown = JSON.parse(text)
    return { ok: true, value }
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      return {
        ok: false,
        error: { code: 'QUOTA_EXCEEDED', resource: 'requestBytes', maximum },
      }
    if (invalidUtf8) return invalid('Invalid UTF-8 JSON')
    if (error instanceof SyntaxError) return invalid('Invalid JSON')
    return {
      ok: false,
      error: { code: 'UNAVAILABLE', message: 'Request body could not be read' },
    }
  }
}
