import type { AgentConnection, SetupStep } from './contracts'

/** Evidence-backed presentation only; no credential acquisition or client config. */
export const mcpConnection = {
  transport: 'Stateless HTTP MCP (POST JSON-RPC)',
  qualification:
    'Locally qualified with the DeepSpace SDK test client; hosted and actual coding-client connections are not yet verified.',
  endpoint: '<TRUSTED_BASE_URL>/_deepspace/agent/mcp',
  authentication:
    'Origin-bound DeepSpace agent Bearer JWT for the account that owns the repository. Existing supported user Bearer JWTs also work. Agent scope alone grants no repository access.',
  tools: ['miniagentgit.repository_head'],
  limitations:
    'HEAD reads only. No commit, CI, file or repository-list tools. No browser sign-in, token refresh, OAuth discovery or installation automation is provided by this panel.',
} as const satisfies AgentConnection

export const agentPrerequisites = [
  'An activated MiniAgentGit service and an operator-confirmed trusted base URL. This application is currently undeployed.',
  'An unexpired credential issued for that exact origin, with the same verified account subject as the persisted repository owner.',
  'The repository ID returned by the existing authenticated HTTP workflow. A separate agent account does not inherit a human owner’s access.',
  'Client configuration and credential renewal qualified by your operator before use. Keep tokens out of project files and URLs.',
] as const

export const agentSteps = [
  {
    title: 'Wait for service activation',
    description:
      'The native MCP transport and scoped HEAD read are locally qualified. No live connection or installation command is available while the service is inactive.',
  },
  {
    title: 'Confirm credentials and client setup',
    description:
      'After activation, use the client’s documented HTTP MCP configuration with a privately supplied Bearer credential. DeepSpace developer login is not itself a token to paste here.',
  },
  {
    title: 'Verify discovery and ownership',
    description:
      'Initialize the MCP connection, discover miniagentgit.repository_head, then read your known repository ID. Check commitId and version; an isError response is a failed call, not a successful read.',
  },
  {
    title: 'Keep the connection bounded',
    description:
      'Use only the read-only HEAD tool. Renew expired credentials through a verified credential flow; do not replace them with a user ID, cookie or app-server credential.',
  },
] as const satisfies readonly SetupStep[]
