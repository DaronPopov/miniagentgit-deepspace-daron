import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { SiteIcon } from '../src/features/product-site/components/site-icon'
import type { SiteIconName } from '../src/features/product-site/contracts/icons'
import { HeaderShell } from '../src/features/product-site/components/header-shell'
import { Hero } from '../src/features/product-site/components/hero'
import { FeatureGrid } from '../src/features/product-site/components/feature-grid'
import { CommitWorkflow } from '../src/features/product-site/components/commit-workflow'
import { CiExplanation } from '../src/features/product-site/components/ci-explanation'
import { DocumentationLinks } from '../src/features/product-site/components/documentation-links'
import { SiteFooter } from '../src/features/product-site/components/site-footer'
import {
  capabilities,
  productNavigation,
  sections,
} from '../src/features/product-site/content/landing'
import {
  workflow,
  validation,
} from '../src/features/product-site/content/workflows'
import Home from '../src/features/product-home'
import { publicViolations } from './public-boundary-policy'

const vocabulary = {
  repository: 'git-branch',
  commit: 'git-commit-horizontal',
  validation: 'shield-check',
  source: 'file-code-2',
  api: 'terminal',
  persistence: 'database',
  concurrency: 'git-compare-arrows',
  documentation: 'book-open',
  next: 'arrow-right',
  external: 'external-link',
} as const satisfies Readonly<Record<SiteIconName, string>>

it('renders the finite semantic vocabulary as consistently sized decorative SVGs', () => {
  for (const name of Object.keys(vocabulary) as SiteIconName[]) {
    const html = renderToStaticMarkup(createElement(SiteIcon, { name }))
    expect(html).toContain(`lucide-${vocabulary[name]}`)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('focusable="false"')
    expect(html).toContain('width="20" height="20"')
    expect(html).toContain('stroke-width="1.75"')
    expect(html).not.toMatch(/<title|tabindex|aria-label=/)
  }
})
it('enhances each major component without removing visible labels or changing semantic selection', () => {
  const components = [
    createElement(HeaderShell, {
      brand: 'MiniAgentGit',
      links: productNavigation,
    }),
    createElement(Hero),
    createElement(FeatureGrid, { items: capabilities }),
    createElement(CommitWorkflow),
    createElement(CiExplanation),
    createElement(DocumentationLinks),
    createElement(SiteFooter),
  ]
  for (const element of components)
    expect(renderToStaticMarkup(element)).toContain('class="lucide ')
  expect(capabilities.map((item) => item.icon)).toEqual([
    'source',
    'persistence',
    'concurrency',
    'commit',
    'repository',
    'validation',
  ])
  expect(workflow.map((item) => item.icon)).toEqual([
    'repository',
    'source',
    'validation',
    'persistence',
    'concurrency',
  ])
  expect(validation.checks.map((item) => item.icon)).toEqual([
    'validation',
    'source',
    'api',
    'commit',
  ])
  const html = renderToStaticMarkup(createElement(Home))
  const icons = [...html.matchAll(/<svg\b[^>]*class="lucide [^>]+>/g)]
  expect(icons.length).toBeGreaterThan(10)
  for (const [tag] of icons) expect(tag).toContain('aria-hidden="true"')
  expect(html.match(/role="img"/g)).toHaveLength(2) // Architecture diagrams remain accessible images.
  expect(html).toContain('aria-label="MiniAgentGit home"')
  expect(html).toContain('Skip to content')
  const actualSections = [...html.matchAll(/<section[^>]*\bid="([^"]+)"/g)].map(
    (match) => match[1],
  )
  expect(actualSections).toEqual([
    'connect',
    ...Object.values(sections).flatMap((section) =>
      section.id === 'documentation' ? ['security', section.id] : [section.id],
    ),
  ])
})
it('allows Lucide only through static named imports in the dedicated icon boundary', () => {
  const path = 'src/features/product-site/components/site-icon.tsx'
  const source = readFileSync(path, 'utf8')
  expect(publicViolations(path, source)).toEqual([])
  for (const invalid of [
    "import * as icons from 'lucide-react'",
    "import icons from 'lucide-react'",
    "export * from 'lucide-react'",
    "import { DynamicIcon } from 'lucide-react/dynamic'",
    "const icons = import('lucide-react')",
  ])
    expect(publicViolations(path, invalid).length).toBeGreaterThan(0)
  expect(
    publicViolations(
      'src/features/product-site/components/hero.tsx',
      "import { ArrowRight } from 'lucide-react'",
    ).length,
  ).toBeGreaterThan(0)
  const syntax = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const values: string[] = []
  for (const statement of syntax.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'lucide-react' &&
      !statement.importClause?.isTypeOnly
    ) {
      const names = statement.importClause?.namedBindings
      if (names && ts.isNamedImports(names))
        for (const name of names.elements) values.push(name.name.text)
    }
  }
  expect(values.sort()).toEqual(
    [
      'ArrowRight',
      'BookOpen',
      'Database',
      'ExternalLink',
      'FileCode2',
      'GitBranch',
      'GitCommitHorizontal',
      'GitCompareArrows',
      'ShieldCheck',
      'Terminal',
    ].sort(),
  )
  const declarations = syntax.statements.filter(ts.isVariableStatement)
  expect(declarations).toHaveLength(1)
  const initializer =
    declarations[0]?.declarationList.declarations[0]?.initializer
  expect(
    initializer &&
      ts.isSatisfiesExpression(initializer) &&
      ts.isAsExpression(initializer.expression) &&
      ts.isObjectLiteralExpression(initializer.expression.expression) &&
      initializer.expression.expression.properties.length,
  ).toBe(10)
})
