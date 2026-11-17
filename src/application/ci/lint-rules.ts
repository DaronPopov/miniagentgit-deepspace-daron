import { staticSpecifier } from './analysis-parser'
import type { AstNode } from './analysis-parser'

export function lintFile() {
  const sideEffects = new Set<string>()
  return (node: AstNode): string | undefined => {
    if (node.type === 'DebuggerStatement') return 'debugger_statement'
    if (
      node.type !== 'ImportDeclaration' ||
      !Array.isArray(node.specifiers) ||
      node.specifiers.length !== 0 ||
      (Array.isArray(node.attributes) && node.attributes.length !== 0) ||
      node.importKind === 'type'
    )
      return
    const specifier = staticSpecifier(node)
    if (specifier === undefined) return
    if (sideEffects.has(specifier)) return 'duplicate_side_effect_import'
    sideEffects.add(specifier)
  }
}
