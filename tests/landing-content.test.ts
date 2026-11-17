import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import Home from '../src/pages/index'
import {
  capabilities,
  documentation,
  hero,
  productLinks,
  productNavigation,
  sections,
  verification,
} from '../src/features/product-site/content/landing'
import {
  validation,
  workflow,
} from '../src/features/product-site/content/workflows'

it('explains the real local capabilities, commit workflow and bounded non-executing CI', () => {
  const html = renderToStaticMarkup(createElement(Home))
  expect(html).toContain(hero.title)
  expect(html).toContain(hero.description)
  for (const item of [...capabilities, ...workflow, ...validation.checks])
    expect(html).toContain(item.title)
  for (const section of Object.values(sections))
    expect(html).toContain(`id="${section.id}"`)
  expect(html).toContain('Persistent versioned')
  expect(html).toContain('durable job ID before the checks finish')
  expect(html).toContain('Pipeline fingerprints')
  expect(html).toContain(validation.boundary)
  expect(html).toContain(validation.recovery)
  expect(html).toContain(verification.description)
  expect(html).toContain(verification.upcoming)
  expect(html.match(/<footer\b/g)).toHaveLength(1)
})
it('uses real documentation links and in-page anchors without protected API navigation', () => {
  const html = renderToStaticMarkup(createElement(Home))
  const ids = new Set(
    [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
  )
  for (const link of productNavigation) {
    expect(html).toContain(`href="${link.href}"`)
    if (link.href.startsWith('#'))
      expect(ids.has(link.href.slice(1))).toBe(true)
  }
  for (const link of documentation) {
    expect(html).toContain(`href="${link.href}"`)
    const file = link.href.split('/blob/main/')[1]
    expect(file && existsSync(file), link.href).toBeTruthy()
  }
  expect(productLinks.github).toBe(
    'https://github.com/DaronPopov/miniagentgit-deepspace-daron',
  )
  expect(html).not.toMatch(
    /href="\/(api|dashboard|login|auth)\b|<button|<form|target="_blank"/,
  )
})
it('does not fabricate live data, advertise unavailable execution, or require hosted configuration', () => {
  vi.stubEnv('DEEPSPACE_APP_ID', '')
  vi.stubEnv('AUTH_JWT_PUBLIC_KEY', '')
  try {
    const html = renderToStaticMarkup(createElement(Home))
    expect(html).toContain('Conceptual commit path · no live repository data')
    expect(html).toContain('not Git wire-protocol compatibility')
    expect(html).toContain('MCP support are not implemented')
    expect(html).toContain('TypeScript syntax parsing is deferred')
    expect(html).not.toMatch(
      /repo_[a-z0-9]{16,32}|ci_[a-f0-9]{64}|[a-f0-9]{64}|100% uptime|production.ready|npm install|npm test|hosted runner|container execution|Try live|Sign in/,
    )
    expect(html).not.toMatch(
      /<input|<script|data-repository|data-commit|data-ci-job/,
    )
  } finally {
    vi.unstubAllEnvs()
  }
})
