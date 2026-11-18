import type { AgentConnection, SetupStep } from './contracts'

/** Evidence-backed presentation only; no credential acquisition or client config. */
export const mcpConnection = {
  transport: 'Stateless HTTP MCP (POST JSON-RPC)',
  qualification:
    'Locally qualified with the DeepSpace SDK test client; hosted and actual coding-client connections are not yet verified.',
  endpoint: '<TRUSTED_BASE_URL>/_deepspace/agent/mcp',
  authentication:
    'Origin-bound DeepSpace agent Bearer JWT for the account that owns the repository. Existing supported user Bearer JWTs also work. Agent scope alone grants no repository access.',
  tools: [
    'miniagentgit.repository_create',
    'miniagentgit.repository_head',
    'miniagentgit.repository_commit',
    'miniagentgit.ci_request',
    'miniagentgit.ci_status',
    'miniagentgit.ci_receipt',
  ],
  limitations:
    'A CI request returns a job. Read its terminal receipt for the validation outcome.',
} as const satisfies AgentConnection

export const agentPrerequisites = [
  'An activated MiniAgentGit service and an operator-confirmed trusted base URL. This application is currently undeployed.',
  'An unexpired credential issued for that exact origin, with the same verified account subject as the persisted repository owner.',
  'Create a repository for the signed account or use the ID of a repository it already owns.',
  'Client configuration and credential renewal qualified by your operator before use. Keep tokens out of project files and URLs.',
] as const

export const agentSteps = [
  {
    title: 'Wait for service activation',
    description:
      'The DeepSpace SDK test client completed repository creation, commits and failing-to-passing CI locally. This service is currently undeployed.',
  },
  {
    title: 'Confirm credentials and client setup',
    description:
      'After activation, use the client’s documented HTTP MCP configuration with a privately supplied Bearer credential. DeepSpace developer login is not itself a token to paste here.',
  },
  {
    title: 'Verify discovery and ownership',
    description:
      'Initialize MCP and discover the six tools. Create a repository or read HEAD for one you own. Check isError before using any tool result.',
  },
  {
    title: 'Keep the connection bounded',
    description:
      'Commit with the expected HEAD and an idempotency key. Request CI for the returned commit ID, then read the terminal receipt. Replay an uncertain commit with its original key and arguments.',
  },
] as const satisfies readonly SetupStep[]
