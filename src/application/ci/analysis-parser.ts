import { parse } from '@babel/parser'
import type { ParserPlugin } from '@babel/parser'
import { objectValue } from '../../domain/validation'

export const analysisBounds = Object.freeze({
  nodesPerFile: 8192,
  nodesPerStage: 24576,
  depth: 128,
  importsPerFile: 64,
  importsPerStage: 256,
  parserBytesPerStage: 128 * 1024,
})

export const moduleExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json'] as const

export function parseSource(text: string, extension: string) {
  const plugins: ParserPlugin[] = []
  if (extension === '.ts' || extension === '.tsx')
    plugins.push(['typescript', { disallowAmbiguousJSXLike: false }])
  if (extension === '.jsx' || extension === '.tsx') plugins.push('jsx')
  return parse(text, {
    sourceType: 'module',
    plugins,
    attachComment: false,
    createImportExpressions: true,
  }).program
}

export function errorLine(error: unknown): number | undefined {
  if (!objectValue(error) || !objectValue(error.loc)) return
  const line = error.loc.line
  if (
    typeof line === 'number' &&
    Number.isSafeInteger(line) &&
    line > 0 &&
    line <= 32769
  )
    return line
}

export interface AstNode extends Record<string, unknown> {
  readonly type: string
}

function astNode(value: unknown): value is AstNode {
  return objectValue(value) && typeof value.type === 'string'
}

export function traverseAst(
  root: unknown,
  visit: (node: AstNode) => boolean,
): boolean {
  let count = 0
  function walk(value: unknown, depth: number): boolean {
    if (!astNode(value)) return true
    if (
      ++count > analysisBounds.nodesPerFile ||
      depth > analysisBounds.depth ||
      !visit(value)
    )
      return false
    for (const [key, child] of Object.entries(value)) {
      if (key === 'loc' || key === 'extra') continue
      if (Array.isArray(child)) {
        for (const item of child) if (!walk(item, depth + 1)) return false
      } else if (!walk(child, depth + 1)) return false
    }
    return true
  }
  return walk(root, 0)
}

export function staticSpecifier(node: AstNode): string | undefined {
  if (
    ![
      'ImportDeclaration',
      'ExportNamedDeclaration',
      'ExportAllDeclaration',
    ].includes(node.type)
  )
    return
  const source = node.source
  return astNode(source) &&
    source.type === 'StringLiteral' &&
    typeof source.value === 'string'
    ? source.value
    : undefined
}
