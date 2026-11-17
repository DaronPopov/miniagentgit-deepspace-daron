import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, posix } from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('isolates SDK auth and browser capabilities from public presentation and backend authority', () => {
  const root = 'src/features/auth-ui/'
  const shared = new Set(
    ['site-container', 'site-icon'].map(
      (name) => 'src/features/product-site/components/' + name,
    ),
  )
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((path) => path.startsWith(root) && /\.tsx?$/.test(path))
  expect(files.length).toBeGreaterThan(8)
  for (const path of files) {
    const source = readFileSync(path, 'utf8')
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
          expect(
            name.text === 'react' ||
              (path === root + 'sdk.ts' && name.text === 'deepspace') ||
              (name.text.startsWith('.') &&
                (resolved.startsWith(root) || shared.has(resolved))),
            `${path}: ${name.text}`,
          ).toBe(true)
        }
      }
      if (ts.isIdentifier(node))
        expect(
          [
            'localStorage',
            'sessionStorage',
            'indexedDB',
            'console',
            'atob',
            'eval',
          ].includes(node.text),
          `${path}: ${node.text}`,
        ).toBe(false)
      ts.forEachChild(node, visit)
    }
    visit(syntax)
    expect(source).not.toContain('dangerouslySetInnerHTML')
  }
  expect(readFileSync('src/main.tsx', 'utf8')).not.toMatch(
    /AuthProvider|auth-ui/,
  )
  expect(
    readFileSync('src/pages/dashboard.tsx', 'utf8').trim().split('\n'),
  ).toHaveLength(5)
})
