import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { copyCommand } from '../src/features/onboarding/components/clipboard'
import { CodePanel } from '../src/features/onboarding/components/code-panel'
import { createApp } from '../src/server/app'

it('renders public documentation without credentials or protected requests and preserves semantic controls', async () => {
  const fetch = vi.fn(() => {
    throw new Error('No request allowed')
  })
  vi.stubGlobal('fetch', fetch)
  try {
    vi.resetModules()
    const { default: Docs } = await import('../src/pages/docs')
    const html = renderToStaticMarkup(createElement(Docs))
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('Connect your agent')
    expect(html).toContain('Windows PowerShell 5.1+')
    expect(html).toContain('PowerShell 7.3+ on Windows')
    expect(html).toContain('HTTP 202')
    expect(html).toContain('not proof of rollback')
    expect(html).toContain('not automatically a user API credential')
    expect(html).toContain('Hosted user authentication')
    expect(html.match(/<button /g)).toHaveLength(24)
    expect(html.match(/role="status"/g)).toHaveLength(24)
    expect(html.match(/<pre tabindex="0"/g)).toHaveLength(24)
    expect(html).not.toMatch(
      /eyJ[A-Za-z0-9_-]+\.|BEGIN (?:PRIVATE|PUBLIC) KEY|issuer\.test|npm install|npx miniagentgit|dangerouslySetInnerHTML|<script/,
    )
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})
it('copies exactly the supplied visible command and handles clipboard denial without exposing errors', async () => {
  const command = 'curl.exe "<BASE_URL>"\n# <script>do not execute</script>'
  const write = vi
    .fn<(text: string) => Promise<void>>()
    .mockResolvedValue(undefined)
  expect(await copyCommand(command, write)).toBe('copied')
  expect(write).toHaveBeenCalledExactlyOnceWith(command)
  expect(
    await copyCommand(command, async () => {
      throw new Error('private clipboard details')
    }),
  ).toBe('failed')
  const html = renderToStaticMarkup(
    createElement(CodePanel, { id: 'test', title: 'Safe example', command }),
  )
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).toContain('aria-label="Copy command: Safe example"')
  expect(html).toContain('aria-describedby="test-status"')
})
it('routes direct docs navigation only to the existing static shell, leaving unknown API paths as errors', async () => {
  const assets = {
    fetch: vi.fn(
      async (request: Request) =>
        new Response(
          new URL(request.url).pathname === '/' ? 'static shell' : 'wrong path',
        ),
    ),
  }
  const app = createApp()
  const response = await app.request('/docs', undefined, { ASSETS: assets })
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('static shell')
  expect(assets.fetch).toHaveBeenCalledOnce()
  expect(
    (await app.request('/api/docs', undefined, { ASSETS: assets })).status,
  ).toBe(404)
})
it('contains long commands within keyboard-scrollable panels and supplies a thin public route', () => {
  const css = readFileSync(
    'src/features/onboarding/styles/documentation.css',
    'utf8',
  )
  expect(css).toContain('overflow-x: auto')
  expect(css).toContain('max-inline-size: 100%')
  expect(css).toContain('flex-wrap: wrap')
  expect(css).not.toMatch(/https?:|@font-face|animation:/)
  expect(
    readFileSync('src/pages/docs.tsx', 'utf8').trim().split('\n'),
  ).toHaveLength(5)
  expect(
    readFileSync('src/features/product-site/content/landing.ts', 'utf8'),
  ).toContain("href: '/docs'")
})
