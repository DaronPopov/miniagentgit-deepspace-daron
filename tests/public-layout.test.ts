import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { HeaderShell } from '../src/features/product-site/components/header-shell'
import { SiteSection } from '../src/features/product-site/components/site-section'
import { CodeSurface } from '../src/features/product-site/components/code-surface'

it('renders one main landmark, ordered headings, labelled navigation and a skip target without requests', async () => {
  const fetch = vi.fn(() => {
    throw new Error('Public layout must not request data')
  })
  vi.stubGlobal('fetch', fetch)
  try {
    vi.resetModules()
    const { default: Home } = await import('../src/features/product-home')
    const html = renderToStaticMarkup(createElement(Home))
    expect(html.match(/<main\b/g)).toHaveLength(1)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('<nav aria-label="Primary navigation">')
    expect(html).toContain('href="#main-content">Skip to content')
    expect(html).toContain('<main id="main-content" tabindex="-1">')
    expect(html).toContain(
      'id="capabilities" aria-labelledby="capabilities-title"',
    )
    expect(html).toContain('<h2 id="capabilities-title">')
    expect(html).not.toMatch(/<script|<form|<iframe|onload=|autofocus=/)
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})
it('uses native links and an explicit current-page hint without custom keyboard state', () => {
  const html = renderToStaticMarkup(
    createElement(HeaderShell, {
      brand: 'MiniAgentGit',
      links: [{ label: 'Home', href: '/', current: true }],
    }),
  )
  expect(html).toContain('<ul class="site-navigation">')
  expect(html).toContain('<a href="/" aria-current="page">Home</a>')
  expect(html).not.toContain('tabindex="0"')
})
it('escapes display content and labels code placeholders without runnable code', () => {
  const code = createElement(CodeSurface, {
    example: {
      id: 'example',
      title: '<script>',
      language: 'text',
      description: '<img onerror="run()">',
    },
  })
  const html = renderToStaticMarkup(
    createElement(SiteSection, {
      metadata: { id: 'examples', title: 'Examples' },
      children: code,
    }),
  )
  expect(html).toContain('aria-labelledby="example-caption"')
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).toContain('id="examples-title"')
})
it('defines complete light/dark tokens, responsive constraints and visible keyboard focus', () => {
  const tokens = readFileSync(
    'src/features/product-site/styles/tokens.css',
    'utf8',
  )
  const layout = readFileSync(
    'src/features/product-site/styles/layout.css',
    'utf8',
  )
  const base = readFileSync('src/styles.css', 'utf8')
  for (const name of [
    'font-body',
    'font-code',
    'text-title',
    'text-section',
    'space-4',
    'surface',
    'text',
    'muted',
    'border',
    'radius',
    'width',
    'prose-width',
    'focus',
  ])
    expect(tokens).toContain(`--site-${name}:`)
  expect(tokens).toContain('prefers-color-scheme: dark')
  expect(tokens).toContain('color-scheme: light dark')
  expect(layout).toContain('@media (min-width: 40rem)')
  expect(layout).toContain('@media (min-width: 64rem)')
  expect(layout).toContain('.site-skip-link:focus')
  expect(base).toContain(':focus-visible')
  expect(base).toContain(
    'outline: var(--site-focus-width) solid var(--site-focus)',
  )
  expect(base).toContain('forced-colors: active')
  for (const css of [tokens, layout, base])
    expect(css).not.toMatch(/https?:|url\(|@font-face/)
  const defined = new Set(
    [...tokens.matchAll(/(--site-[\w-]+)\s*:/g)].map((match) => match[1]),
  )
  for (const match of (base + layout).matchAll(/var\((--site-[\w-]+)\)/g))
    expect(defined.has(match[1]), match[1]).toBe(true)
})
