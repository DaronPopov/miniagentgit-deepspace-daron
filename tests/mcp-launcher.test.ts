import { expect, it } from 'vitest'
import { mcpLauncher } from '../src/features/auth-ui/mcp-launcher'

const origin = 'https://miniagent.example'
const token = 'fixture.header.signature'

it('generates one-line commands that use the credential only in the client environment', () => {
  for (const client of ['codex', 'claude'] as const) {
    const script = mcpLauncher(origin, client, token)
    expect(script).toContain(origin + '/_deepspace/agent/mcp')
    expect(script).not.toMatch(/[\r\n]/)
    expect(script).toContain("Set-Clipboard -Value ''")
    expect(script).toContain(`$env:MINIGIT_AGENT_TOKEN = '${token}'`)
    expect(script).toContain('finally { $env:MINIGIT_AGENT_TOKEN = $previous }')
    expect(script).toContain(
      client === 'codex'
        ? 'bearer_token_env_var="MINIGIT_AGENT_TOKEN"'
        : 'Bearer ${MINIGIT_AGENT_TOKEN}',
    )
  }
})

it('requires an exact HTTPS origin without path, userinfo or command delimiters', () => {
  for (const invalid of [
    'http://miniagent.example',
    origin + '/other',
    'https://user@miniagent.example',
    "https://ex'ample.com",
  ]) {
    expect(() => mcpLauncher(invalid, 'codex', token)).toThrow()
  }
})

it('rejects credentials that could alter the pasted command', () => {
  expect(() => mcpLauncher(origin, 'codex', "a.b.c'; echo bad")).toThrow()
})
