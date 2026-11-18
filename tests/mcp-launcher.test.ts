import { expect, it } from 'vitest'
import { mcpLauncher } from '../src/features/auth-ui/mcp-launcher'

const origin = 'https://miniagent.example'

it('generates launchers with the verified origin and only an environment reference', () => {
  for (const client of ['codex', 'claude'] as const) {
    const script = mcpLauncher(origin, client)
    expect(script).toContain(origin + '/_deepspace/agent/mcp')
    expect(script).toContain('Get-Clipboard -Raw')
    expect(script).toContain("Set-Clipboard -Value ''")
    expect(script).toContain('$env:MINIGIT_AGENT_TOKEN = $token')
    expect(script).toContain('Remove-Item Env:MINIGIT_AGENT_TOKEN')
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
    expect(() => mcpLauncher(invalid, 'codex')).toThrow()
  }
})
