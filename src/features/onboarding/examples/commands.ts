import type {
  CommandExample,
  HttpExample,
  JsonValue,
  ShellMode,
} from '../contracts/documentation'
import { httpExamples } from './requests'

export const environmentName = (name: string) => `MINIAGENTGIT_${name}`
const psVariable = (name: string) => `$env:${environmentName(name)}`
const psInterpolation = (name: string) => '${env:' + environmentName(name) + '}'
/** Serialize trusted sample JSON as PowerShell literals; never executes a command. */
function psLiteral(value: JsonValue): string {
  if (value === null) return '$null'
  if (typeof value === 'boolean') return value ? '$true' : '$false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    const placeholder = value.match(/^\{(CREATE_KEY|COMMIT_KEY)\}$/)?.[1]
    if (placeholder) return psVariable(placeholder)
    return (
      '"' +
      value
        .replace(/`/g, '``')
        .replace(/\$/g, '`$')
        .replace(/"/g, '`"')
        .replace(/\r/g, '`r')
        .replace(/\n/g, '`n') +
      '"'
    )
  }
  if (Array.isArray(value)) return '@(' + value.map(psLiteral).join(', ') + ')'
  return (
    '@{ ' +
    Object.entries(value)
      .map(([key, item]) => `${key} = ${psLiteral(item)}`)
      .join('; ') +
    ' }'
  )
}
export function commandExample(
  example: HttpExample,
  shell: ShellMode,
): CommandExample {
  const url =
    psInterpolation('BASE_URL') +
    example.route.replace(/\{([A-Z_]+)\}/g, (_match, key: string) =>
      psInterpolation(key),
    )
  const lines: string[] = []
  if (example.payload !== undefined)
    lines.push(
      `$json = ${psLiteral(example.payload)} | ConvertTo-Json -Depth 8 -Compress`,
    )
  const auth = example.authenticated
    ? ` -Headers @{ Authorization = "Bearer ${psInterpolation('TOKEN')}" }`
    : ''
  if (shell === 'powershell')
    lines.push(
      `$result = Invoke-RestMethod -Method ${example.method} -Uri "${url}"${auth}${example.payload !== undefined ? " -ContentType 'application/json' -Body ([System.Text.Encoding]::UTF8.GetBytes($json))" : ''}`,
    )
  else {
    lines.push(
      `$result = curl.exe --silent --show-error --fail-with-body --request ${example.method} "${url}"${example.authenticated ? ` --header "Authorization: Bearer ${psInterpolation('TOKEN')}"` : ''}${example.payload !== undefined ? ` --header "Content-Type: application/json" --data-binary "$json"` : ''} | ConvertFrom-Json`,
    )
    lines.push(
      "if ($LASTEXITCODE -ne 0) { throw 'HTTP request failed; inspect the response before retrying' }",
    )
  }
  if (example.authenticated)
    lines.push(
      "if (-not $result.ok) { throw 'API request was not successful' }",
    )
  if (example.capture)
    lines.push(`${psVariable(example.capture)} = $result.value.id`)
  lines.push('$result')
  return { ...example, shell, command: lines.join('\n') }
}
export const powershellExamples: readonly CommandExample[] = httpExamples.map(
  (example) => commandExample(example, 'powershell'),
)
export const curlExamples: readonly CommandExample[] = httpExamples.map(
  (example) => commandExample(example, 'curl'),
)
export function setupCommand(shell: ShellMode): string {
  return [
    ...(shell === 'curl'
      ? ["$PSNativeCommandArgumentPassing = 'Standard'"]
      : []),
    "$env:MINIAGENTGIT_BASE_URL = '<BASE_URL>'",
    "$env:MINIAGENTGIT_TOKEN = '<BEARER_JWT>'",
    "$env:MINIAGENTGIT_CREATE_KEY = [Guid]::NewGuid().ToString('N')",
    "$env:MINIAGENTGIT_COMMIT_KEY = [Guid]::NewGuid().ToString('N')",
  ].join('\n')
}

export const codexSetup =
  'codex mcp add miniagentgit --url https://YOUR-TRUSTED-HOST/_deepspace/agent/mcp --bearer-token-env-var MINIGIT_AGENT_TOKEN'
export const claudeSetup = JSON.stringify(
  {
    mcpServers: {
      miniagentgit: {
        type: 'http',
        url: 'https://YOUR-TRUSTED-HOST/_deepspace/agent/mcp',
        headers: { Authorization: 'Bearer ${MINIGIT_AGENT_TOKEN}' },
      },
    },
  },
  null,
  2,
)
