export function mcpLauncher(origin: string, client: 'codex' | 'claude') {
  const url = new URL(origin)
  if (
    url.origin !== origin ||
    url.protocol !== 'https:' ||
    !/^[a-z0-9.-]+$/.test(url.hostname)
  )
    throw new Error('An HTTPS app origin is required')
  const endpoint = new URL('/_deepspace/agent/mcp', url).href
  const launch =
    client === 'codex'
      ? [
          `  & codex -c 'mcp_servers.miniagentgit.url="${endpoint}"' \``,
          `    -c 'mcp_servers.miniagentgit.bearer_token_env_var="MINIGIT_AGENT_TOKEN"'`,
        ]
      : [
          `  & claude --mcp-config '${JSON.stringify({
            mcpServers: {
              miniagentgit: {
                type: 'http',
                url: endpoint,
                headers: { Authorization: 'Bearer ${MINIGIT_AGENT_TOKEN}' },
              },
            },
          })}'`,
        ]
  return [
    '# Requires PowerShell 7.3+ on Windows.',
    '# Copy a fresh connection token from the signed-in MiniAgentGit dashboard first.',
    "$ErrorActionPreference = 'Stop'",
    `Get-Command ${client} -ErrorAction Stop | Out-Null`,
    '$token = ([string](Get-Clipboard -Raw)).Trim()',
    "if ($token -notmatch '^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$' -or $token.Length -gt 8192) {",
    "  throw 'Copy a fresh MiniAgentGit connection token before running this script.'",
    '}',
    "Set-Clipboard -Value ''",
    '$env:MINIGIT_AGENT_TOKEN = $token',
    'Remove-Variable token',
    'try {',
    ...launch,
    '  exit $LASTEXITCODE',
    '} finally {',
    '  Remove-Item Env:MINIGIT_AGENT_TOKEN -ErrorAction SilentlyContinue',
    '}',
    '',
  ].join('\r\n')
}
