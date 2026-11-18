import { dirname, posix } from 'node:path'
import ts from 'typescript'

const root = 'src/features/product-site/'
const onboarding = 'src/features/onboarding/'
const agents = 'src/features/agent-onboarding/'
const reusedOnboarding = new Set(
  [
    'components/code-panel',
    'examples/commands',
    'examples/requests',
    'contracts/documentation',
  ].map((name) => onboarding + name),
)
function allowedDependency(path: string, resolved: string, typeOnly: boolean) {
  if (path === 'src/features/product-home.tsx')
    return (
      resolved === root + 'components/product-foundation' ||
      resolved === agents + 'agent-onboarding'
    )
  if (path.startsWith(agents))
    return (
      resolved.startsWith(agents) ||
      shared.has(resolved) ||
      reusedOnboarding.has(resolved) ||
      (typeOnly && resolved === root + 'contracts/icons')
    )
  if (path.startsWith(onboarding) || path === 'src/pages/docs.tsx')
    return (
      resolved.startsWith(onboarding) ||
      shared.has(resolved) ||
      (typeOnly && resolved === root + 'contracts/presentation')
    )
  return resolved.startsWith(root)
}
const shared = new Set(
  ['header-shell', 'site-container', 'site-footer', 'site-icon'].map(
    (name) => root + 'components/' + name,
  ),
)
const forbidden = new Set([
  'fetch',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'console',
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
        if (
          name.text === 'lucide-react' &&
          (!ts.isImportDeclaration(node) ||
            !node.importClause?.namedBindings ||
            !ts.isNamedImports(node.importClause.namedBindings))
        )
          violations.push('Lucide requires static named imports')
        const resolved = posix.normalize(`${dirname(path)}/${name.text}`)
        if (
          name.text !== 'react' &&
          !(
            path === 'src/features/product-site/components/site-icon.tsx' &&
            name.text === 'lucide-react'
          ) &&
          (!name.text.startsWith('.') ||
            !allowedDependency(
              path,
              resolved,
              ts.isImportDeclaration(node) && !!node.importClause?.isTypeOnly,
            ))
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
    if (
      ts.isIdentifier(node) &&
      forbidden.has(node.text) &&
      !(
        node.text === 'navigator' &&
        path === onboarding + 'components/clipboard.ts'
      )
    )
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
