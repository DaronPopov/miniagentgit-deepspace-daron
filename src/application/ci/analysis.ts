import type { CiSnapshot, CiValidation } from '../../contracts/ci'
import type { AnalysisStage } from './stages'
import type { CiLimits } from './limits'
import { diagnosticCollector } from '../../domain/ci/diagnostics'
import { objectValue } from '../../domain/validation'
import {
  analysisBounds,
  errorLine,
  moduleExtensions,
  parseSource,
  staticSpecifier,
  traverseAst,
} from './analysis-parser'
import { lintFile } from './lint-rules'
import { relativeIssue } from './import-resolution'

export function analyzeSnapshot(
  stage: AnalysisStage,
  snapshot: CiSnapshot,
  limits: CiLimits,
  prior: CiValidation,
  signal: AbortSignal,
): CiValidation {
  const diagnostics = diagnosticCollector(
    limits.diagnostics,
    limits.diagnosticBytes,
  )
  const files = new Set(snapshot.entries.map((entry) => entry.path))
  let work = prior.work,
    bytes = 0,
    nodes = 0,
    imports = 0
  function charge(amount: number) {
    work += amount
    return work <= limits.workBytes
  }
  function result(code: CiValidation['code']): CiValidation {
    const passed = code === 'none'
    return {
      ...prior,
      state: passed ? 'passed' : 'failed',
      code,
      checks: { ...prior.checks, [stage]: passed ? 'passed' : 'failed' },
      work: Math.min(work, limits.workBytes),
      diagnostics: diagnostics.snapshot(),
      truncated: diagnostics.truncated(),
    }
  }
  for (const { path, content, bytes: size } of snapshot.entries) {
    if (signal.aborted) return result('cancelled')
    const extension = moduleExtensions.find((ext) => path.endsWith(ext))
    if (!extension || (extension === '.json' && stage !== 'syntax')) continue
    if (content === null) return result('integrity_failed')
    bytes += size
    if (
      bytes > analysisBounds.parserBytesPerStage ||
      !charge(1 + Math.ceil(size / 16))
    )
      return result('work_limit')
    let fileImports = 0
    try {
      if (extension === '.json') {
        JSON.parse(content)
        continue
      }
      const ast = parseSource(content, extension)
      const lint = stage === 'lint' ? lintFile() : undefined
      const complete = traverseAst(ast, (node) => {
        if (++nodes > analysisBounds.nodesPerStage || !charge(1)) return false
        const line = errorLine({
          loc: objectValue(node.loc) ? node.loc.start : undefined,
        })
        const lintIssue = lint?.(node)
        if (lintIssue) {
          diagnostics.add(stage, lintIssue, path, line)
          return charge(32)
        }
        if (stage !== 'imports') return true
        const specifier = staticSpecifier(node)
        if (specifier === undefined) return true
        if (
          ++fileImports > analysisBounds.importsPerFile ||
          ++imports > analysisBounds.importsPerStage ||
          !charge(12 + Math.ceil(specifier.length / 16))
        )
          return false
        const issue = relativeIssue(path, specifier, files)
        if (!issue) return true
        diagnostics.add(stage, issue, path, line)
        return charge(32)
      })
      if (!complete) return result('work_limit')
    } catch (error) {
      if (error instanceof RangeError) return result('work_limit')
      if (!(error instanceof SyntaxError)) return result('validator_exception')
      diagnostics.add(
        stage,
        extension === '.json' ? 'invalid_json' : 'invalid_syntax',
        path,
        errorLine(error),
      )
      if (!charge(32)) return result('work_limit')
    }
  }
  return result(diagnostics.failed() ? 'checks_failed' : 'none')
}
