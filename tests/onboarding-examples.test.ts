import { expect, it } from 'vitest'
import { httpExamples } from '../src/features/onboarding/examples/requests'
import {
  powershellExamples,
  curlExamples,
  setupCommand,
} from '../src/features/onboarding/examples/commands'
import { validateCreateRepository } from '../src/application/validate-inputs'
import { validateCommit } from '../src/application/validate-commit'
import { publicViolations } from './public-boundary-policy'

it('documents exactly the eleven implemented request shapes and validates mutation payloads', () => {
  expect(httpExamples.map((e) => [e.method, e.route])).toEqual([
    ['GET', '/api/health'],
    ['GET', '/api/me'],
    ['POST', '/api/repositories'],
    ['POST', '/api/repositories/{REPOSITORY_ID}/commits'],
    ['GET', '/api/repositories/{REPOSITORY_ID}/head'],
    ['GET', '/api/repositories/{REPOSITORY_ID}/commits/{COMMIT_ID}'],
    [
      'GET',
      '/api/repositories/{REPOSITORY_ID}/tree?commit={COMMIT_ID}&limit=25',
    ],
    [
      'GET',
      '/api/repositories/{REPOSITORY_ID}/files/{COMMIT_ID}?path=src%2Fmain.ts',
    ],
    ['POST', '/api/repositories/{REPOSITORY_ID}/ci/commits/{COMMIT_ID}'],
    ['GET', '/api/repositories/{REPOSITORY_ID}/ci/jobs/{JOB_ID}'],
    ['GET', '/api/repositories/{REPOSITORY_ID}/ci/jobs/{JOB_ID}/receipt'],
  ])
  const substitute = (input: unknown) =>
    JSON.parse(
      JSON.stringify(input)
        .replace('{CREATE_KEY}', 'create_example_key_1')
        .replace('{COMMIT_KEY}', 'commit_example_key_1'),
    )
  expect(validateCreateRepository(substitute(httpExamples[2].payload)).ok).toBe(
    true,
  )
  expect(validateCommit(substitute(httpExamples[3].payload)).ok).toBe(true)
  expect(httpExamples[3].payload.changes[0].text).toBe(
    'export const value = 1\n',
  )
  expect(httpExamples[8].payload).toEqual({})
  expect(new Set(httpExamples.map((e) => e.id)).size).toBe(11)
})
it('keeps both modes explicitly PowerShell with valid JSON serialization and native curl quoting setup', () => {
  for (const [examples, shell] of [
    [powershellExamples, 'powershell'],
    [curlExamples, 'curl'],
  ] as const) {
    expect(examples).toHaveLength(11)
    for (const example of examples) {
      expect(example.shell).toBe(shell)
      expect(example.command).toContain('${env:MINIAGENTGIT_BASE_URL}')
      expect(example.command).not.toMatch(
        /^export |%TOKEN%|\\\n|\bnpm |\biwr\b|\bcurl /m,
      )
      expect(example.command.includes('Authorization')).toBe(
        example.authenticated,
      )
      if (example.payload !== undefined) {
        expect(example.command).toContain('ConvertTo-Json -Depth 8 -Compress')
        expect(example.command).toContain('application/json')
      }
      if (shell === 'curl') {
        expect(example.command).toContain(
          'curl.exe --silent --show-error --fail-with-body',
        )
        expect(example.command).toContain('$LASTEXITCODE')
        expect(example.command).not.toContain('Invoke-RestMethod')
      } else expect(example.command).toContain('Invoke-RestMethod')
    }
  }
  expect(setupCommand('curl')).toContain(
    "$PSNativeCommandArgumentPassing = 'Standard'",
  )
  expect(setupCommand('powershell')).toContain("'<BEARER_JWT>'")
  expect(setupCommand('powershell')).toContain(
    "[Guid]::NewGuid().ToString('N')",
  )
  expect(powershellExamples[3]?.command).toContain(
    'text = "export const value = 1`n"',
  )
})
it('permits only clipboard access in the dedicated docs adapter and presentation imports elsewhere', () => {
  const path = 'src/features/onboarding/components/code-panel.tsx'
  for (const source of [
    "import x from '../../../server/app'",
    "import x from '../../auth-ui/credentials'",
    "import x from '../../../application/validate-commit'",
    "import x from '../../product-site/content/landing'",
    "fetch('/api/me')",
    'navigator.clipboard.readText()',
    "import { useAuth } from 'deepspace'",
  ])
    expect(publicViolations(path, source).length).toBeGreaterThan(0)
  expect(
    publicViolations(
      path,
      "import { SiteIcon } from '../../product-site/components/site-icon'",
    ),
  ).toEqual([])
  expect(
    publicViolations(
      'src/features/product-site/components/hero.tsx',
      "import x from '../../onboarding/components/documentation-page'",
    ).length,
  ).toBeGreaterThan(0)
})
