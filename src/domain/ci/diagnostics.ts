import type { CiDiagnostic } from '../../contracts/ci'
import { filePath } from '../validation'

export function diagnosticCollector(maximum: number, bytes: number) {
  const values: CiDiagnostic[] = []
  let truncated = false,
    failed = false,
    used = 2
  return {
    add(
      check: CiDiagnostic['check'],
      code: string,
      path?: string,
      line?: number,
    ) {
      failed = true
      const value: CiDiagnostic = {
        check,
        code,
        ...(path && filePath(path).ok ? { path } : {}),
        ...(line !== undefined ? { line } : {}),
      }
      const size = new TextEncoder().encode(JSON.stringify(value)).length + 1
      if (values.length >= maximum || used + size > bytes) {
        truncated = true
        return
      }
      used += size
      values.push(Object.freeze(value))
    },
    snapshot: () => Object.freeze([...values]),
    failed: () => failed,
    truncated: () => truncated,
  }
}
export type DiagnosticCollector = ReturnType<typeof diagnosticCollector>
