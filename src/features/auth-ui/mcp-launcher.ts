export function mcpLauncher(
  origin: string,
  client: 'codex' | 'claude',
  token: string,
) {
  if (token.length > 8192 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token))
    throw new Error('Invalid connection credential')
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
      ? `codex -c 'mcp_servers.miniagentgit.url="${endpoint}"' -c 'mcp_servers.miniagentgit.bearer_token_env_var="MINIGIT_AGENT_TOKEN"'`
      : `claude --mcp-config '${JSON.stringify({
          mcpServers: {
            miniagentgit: {
              type: 'http',
              url: endpoint,
              headers: { Authorization: 'Bearer ${MINIGIT_AGENT_TOKEN}' },
            },
          },
        })}'`
  return [
    '& {',
    '$previous = $env:MINIGIT_AGENT_TOKEN;',
    'try {',
    "Set-Clipboard -Value '' -ErrorAction Stop;",
    `$env:MINIGIT_AGENT_TOKEN = '${token}';`,
    `& ${launch};`,
    '} finally { $env:MINIGIT_AGENT_TOKEN = $previous }',
    '}',
  ].join(' ')
}
