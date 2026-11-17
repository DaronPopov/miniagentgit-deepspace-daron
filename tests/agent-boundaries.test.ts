import { expect, it } from 'vitest'
import { publicViolations } from './public-boundary-policy'

it('permits only narrow shared commands and primitives, never sibling feature pages', () => {
  const path = 'src/features/agent-onboarding/test.tsx'
  for (const name of [
    '../onboarding/components/documentation-page',
    '../onboarding/components/clipboard',
    '../auth-ui/auth-boundary',
    '../../server/app',
    'deepspace',
    'deepspace/worker',
    'hono',
    '../product-site/components/product-foundation',
  ])
    expect(
      publicViolations(path, `import x from '${name}'`).length,
      name,
    ).toBeGreaterThan(0)
  for (const name of [
    '../onboarding/components/code-panel',
    '../onboarding/examples/commands',
    '../onboarding/examples/requests',
    '../product-site/components/site-icon',
  ])
    expect(publicViolations(path, `import x from '${name}'`), name).toEqual([])
  for (const file of [
    'src/features/product-site/components/test.tsx',
    'src/features/onboarding/components/test.tsx',
  ])
    expect(
      publicViolations(
        file,
        "import x from '../../agent-onboarding/agent-onboarding'",
      ).length,
    ).toBeGreaterThan(0)
})
it('rejects network, effects, hidden credential access and dynamic loaders in integration UI', () => {
  for (const source of [
    "fetch('/api/me')",
    "const x = globalThis['fetch']",
    'useEffect(() => {})',
    "import('../../auth-ui/sdk')",
    'navigator.credentials.get()',
    'localStorage.getItem("token")',
    'console.log("token")',
    'let session = null',
  ])
    expect(
      publicViolations('src/features/agent-onboarding/test.tsx', source).length,
    ).toBeGreaterThan(0)
})
