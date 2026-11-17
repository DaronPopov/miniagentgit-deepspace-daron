import { dirname, posix } from 'node:path'
import ts from 'typescript'

const root = 'src/features/product-site/'
const forbidden = new Set([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon',
  'eval',
  'Function',
  'require',
  'globalThis',
  'window',
  'document',
  'navigator',
  'useEffect',
  'useLayoutEffect',
])
/** A narrow presentation capability allowlist, including re-exports/dynamic imports. */
export function publicViolations(
  path: string,
  source: string,
): readonly string[] {
  const violations: string[] = []
  const syntax = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const name = node.moduleSpecifier
      if (name && ts.isStringLiteral(name)) {
        const resolved = posix.normalize(`${dirname(path)}/${name.text}`)
        if (
          name.text !== 'react' &&
          (!name.text.startsWith('.') || !resolved.startsWith(root))
        )
          violations.push(`forbidden dependency: ${name.text}`)
      }
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      violations.push('dynamic import')
    if (ts.isImportEqualsDeclaration(node)) violations.push('import assignment')
    if (ts.isIdentifier(node) && forbidden.has(node.text))
      violations.push(`forbidden capability: ${node.text}`)
    if (ts.isClassDeclaration(node)) violations.push('class declaration')
    if (
      ts.isVariableStatement(node) &&
      node.parent === syntax &&
      !(node.declarationList.flags & ts.NodeFlags.Const)
    )
      violations.push('mutable module state')
    if (
      ts.isPropertySignature(node) &&
      !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword)
    )
      violations.push('mutable presentation property')
    ts.forEachChild(node, visit)
  }
  visit(syntax)
  return violations
}
