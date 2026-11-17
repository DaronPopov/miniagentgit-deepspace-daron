import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('has no static relative import cycles or framework dependencies in domain code', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(
      (path) =>
        /\.(ts|tsx)$/.test(path) &&
        (path.startsWith('src/') || path === 'worker.ts'),
    )
  const graph = new Map<string, string[]>()
  for (const file of files) {
    const syntax = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    )
    const edges: string[] = []
    for (const statement of syntax.statements) {
      if (
        !ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)
      )
        continue
      const specifier = statement.moduleSpecifier
      if (!specifier || !ts.isStringLiteral(specifier)) continue
      const target = specifier.text
      if (file.startsWith('src/domain/')) {
        expect(
          target.startsWith('./') ||
            target.startsWith('../domain/') ||
            (target.startsWith('../contracts/') &&
              ts.isImportDeclaration(statement) &&
              statement.importClause?.isTypeOnly === true),
          `${file}: ${target}`,
        ).toBe(true)
      }
      if (!target.startsWith('.')) continue
      const base = resolve(dirname(file), target)
      const found = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}/index.ts`,
      ].find(existsSync)
      if (found) edges.push(relative(process.cwd(), found))
    }
    graph.set(file, edges)
  }
  const visited = new Set<string>()
  function visit(file: string, path: readonly string[]) {
    expect(path.includes(file), [...path, file].join(' -> ')).toBe(false)
    if (visited.has(file)) return
    for (const dependency of graph.get(file) ?? [])
      visit(dependency, [...path, file])
    visited.add(file)
  }
  for (const file of graph.keys()) visit(file, [])
})
