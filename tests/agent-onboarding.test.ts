import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, expectTypeOf, it, vi } from 'vitest'
import Home from '../src/pages/index'
import { McpGuide } from '../src/features/onboarding/components/mcp-guide'
import {
  integrations,
  httpSteps,
} from '../src/features/agent-onboarding/content'
import type { Integration } from '../src/features/agent-onboarding/contracts'
import { IntegrationPanel } from '../src/features/agent-onboarding/integration-panel'
import { IntegrationSelector } from '../src/features/agent-onboarding/integration-selector'
import {
  commandExample,
  setupCommand,
} from '../src/features/onboarding/examples/commands'
import { httpExamples } from '../src/features/onboarding/examples/requests'
import { copyCommand } from '../src/features/onboarding/components/clipboard'

it('keeps integration metadata readonly, serializable and truthful', () => {
  expectTypeOf<Integration>().toEqualTypeOf<Readonly<Integration>>()
  expect(JSON.parse(JSON.stringify(integrations))).toEqual(integrations)
  expect(integrations.map((item) => [item.id, item.capability.state])).toEqual([
    ['codex', 'unavailable'],
    ['claude', 'unavailable'],
    ['http', 'requires-configuration'],
  ])
  expect(httpSteps).toHaveLength(8)
  expect(integrations[2].capability.message).toContain('currently undeployed')
})
it('renders native keyboard-operable radios and explicit selected state', () => {
  const choose = vi.fn()
  for (const selected of ['codex', 'claude', 'http'] as const) {
    const html = renderToStaticMarkup(
      createElement(IntegrationSelector, { selected, onSelect: choose }),
    )
    expect(html.match(/type="radio"/g)).toHaveLength(3)
    expect(html.match(/checked=""/g)).toHaveLength(1)
    expect(html).toContain(`checked="" value="${selected}"`)
    expect(html).toContain('<legend>Choose an integration</legend>')
    expect(html.match(/aria-controls="agent-setup"/g)).toHaveLength(3)
  }
  expect(choose).not.toHaveBeenCalled()
})
it('renders native MCP copy controls with honest qualification', () => {
  for (const integration of integrations.slice(0, 2)) {
    const html = renderToStaticMarkup(
      createElement(IntegrationPanel, { integration }),
    )
    expect(html).toContain(integration.name)
    expect(html).toContain('Unavailable')
    expect(html).toContain('passed locally')
    expect(html).toContain('Stateless HTTP MCP')
    for (const action of [
      'repository_create',
      'repository_head',
      'repository_commit',
      'ci_request',
      'ci_status',
      'ci_receipt',
    ])
      expect(html).toContain('miniagentgit.' + action)
    expect(html).toContain('Read its terminal receipt')
    expect(html).toContain('&lt;TRUSTED_BASE_URL&gt;/_deepspace/agent/mcp')
    expect(html).toContain('isError')
    expect(html).toContain('Official ')
    expect(html).toContain('same verified account subject')
    expect(html).not.toContain('https://miniagentgit-deepspace-daron.app.space')
    expect(html).toContain('href="/docs#mcp-guide"')
    expect(html).toContain('Copy command')
    expect(html).toContain('MINIGIT_AGENT_TOKEN')
    expect(html).toContain(
      integration.id === 'codex'
        ? 'codex mcp add miniagentgit --url'
        : 'Bearer ${MINIGIT_AGENT_TOKEN}',
    )
  }
})
it('reuses exact setup, command generation and clipboard handling without substitution', async () => {
  const identity = httpExamples.find((example) => example.id === 'identity')!
  for (const shell of ['powershell', 'curl'] as const) {
    const command =
      setupCommand(shell) + '\n\n' + commandExample(identity, shell).command
    const write = vi
      .fn<(text: string) => Promise<void>>()
      .mockResolvedValue(undefined)
    expect(await copyCommand(command, write)).toBe('copied')
    expect(write).toHaveBeenCalledExactlyOnceWith(command)
    expect(command).toContain('<BASE_URL>')
    expect(command).toContain('<BEARER_JWT>')
    expect(command).toContain('/api/me')
    if (shell === 'powershell')
      expect(renderToStaticMarkup(createElement(Home))).toContain(
        renderToStaticMarkup(createElement('code', null, command)),
      )
    expect(command).not.toContain('.app.space')
  }
})
it('composes onboarding before capabilities while preserving diagrams, docs and public security boundaries', () => {
  const network = vi.fn(() => {
    throw new Error('Unexpected public request')
  })
  vi.stubGlobal('fetch', network)
  try {
    const html = renderToStaticMarkup(createElement(Home))
    expect(html).toContain('Version control built for coding agents.')
    expect(html).toContain('Connect your coding agent')
    expect(html.indexOf('id="connect"')).toBeLessThan(
      html.indexOf('id="capabilities"'),
    )
    for (const id of [
      'workflow',
      'validation',
      'architecture',
      'security',
      'documentation',
    ])
      expect(html).toContain(`id="${id}"`)
    expect(html).toContain('href="/docs#mode-powershell"')
    expect(html).toContain('Owner-only access')
    expect(html.match(/role="img"/g)).toHaveLength(2)
    expect(html.match(/class="docs-code"/g)).toHaveLength(1)
    expect(html).not.toMatch(
      /eyJ[A-Za-z0-9_-]+\.|BEGIN PRIVATE|https:\/\/[^\s<"]+\.app\.space|npx miniagentgit|npm install|<iframe|<script/,
    )
    expect(network).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('renders native HTTP setup for both clients without embedding credentials', () => {
  const html = renderToStaticMarkup(createElement(McpGuide))
  expect(html).toContain('codex mcp add miniagentgit --url')
  expect(html).toContain('--bearer-token-env-var MINIGIT_AGENT_TOKEN')
  expect(html).toContain('&quot;type&quot;: &quot;http&quot;')
  expect(html).toContain('Bearer ${MINIGIT_AGENT_TOKEN}')
  expect(
    html.match(/https:\/\/YOUR-TRUSTED-HOST\/_deepspace\/agent\/mcp/g),
  ).toHaveLength(2)
  expect(html).not.toMatch(/eyJ[A-Za-z0-9_-]+\./)
})
