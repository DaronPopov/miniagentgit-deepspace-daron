import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { publicViolations } from './public-boundary-policy'

it('restricts public dependencies to React, internal presentation and the narrow Lucide boundary', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(
      (path) =>
        path.startsWith('src/features/product-site/') && /\.tsx?$/.test(path),
    )
  expect(files.length).toBeGreaterThan(5)
  for (const file of files)
    expect(publicViolations(file, readFileSync(file, 'utf8')), file).toEqual([])
})
it('rejects server/auth/dashboard imports, re-exports, aliases, effects and mutable state', () => {
  for (const source of [
    "import x from '../../../server/storage/database'",
    "import x from 'hono'",
    "import x from 'deepspace/worker'",
    "import x from '@/server/app'",
    "export * from '../../dashboard/private'",
    "import x from '../../../client/identity'",
    "const x = import('../../auth-ui/credentials')",
    "fetch('/api/repositories')",
    "const get = globalThis['fetch']",
    'useEffect(() => {})',
    'let shared = 1',
    'interface Props { title: string }',
  ])
    expect(
      publicViolations('src/features/product-site/components/test.tsx', source)
        .length,
      source,
    ).toBeGreaterThan(0)
})
it('keeps the public route as thin feature composition and the browser entry provider-free', () => {
  const route = readFileSync('src/pages/index.tsx', 'utf8')
  expect(publicViolations('src/pages/index.tsx', route)).toEqual([])
  const syntax = ts.createSourceFile(
    'index.tsx',
    route,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  expect(syntax.statements).toHaveLength(2)
  const component = syntax.statements[1]
  expect(
    component &&
      ts.isFunctionDeclaration(component) &&
      component.body?.statements.length,
  ).toBe(1)
  const main = readFileSync('src/main.tsx', 'utf8')
  expect(main).toContain("from '@generouted/react-router/lazy'")
  expect(main).toContain('createBrowserRouter(routes)')
  expect(main).not.toMatch(
    /Provider.*from ['"]deepspace|fetch\(|useBrowserIdentity/,
  )
  const vite = readFileSync('vite.config.ts', 'utf8')
  expect(vite).not.toMatch(/ssr\s*:|dynamicWorker|renderToString/)
})
it('bundles the public route for browsers without SDK, server or credential code', async () => {
  const { build } = await import('esbuild')
  const bundle = await build({
    entryPoints: ['src/pages/index.tsx', 'src/styles.css'],
    outdir: 'public-bundle-check',
    bundle: true,
    platform: 'browser',
    format: 'esm',
    jsx: 'automatic',
    write: false,
    metafile: true,
  })
  expect(bundle.outputFiles.some((file) => file.path.endsWith('.css'))).toBe(
    true,
  )
  expect(bundle.warnings).toEqual([])
  const inputs = Object.keys(bundle.metafile.inputs)
  expect(
    inputs.some((path) => path.endsWith('components/product-foundation.tsx')),
  ).toBe(true)
  expect(
    inputs.filter((path) =>
      /src\/(server|client|application|domain)\/|node_modules\/(deepspace|hono)\//.test(
        path,
      ),
    ),
  ).toEqual([])
})
