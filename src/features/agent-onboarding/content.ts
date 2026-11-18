import type { Integration, SetupStep } from './contracts'
import { mcpConnection, agentPrerequisites, agentSteps } from './mcp-connection'

export const httpSteps = [
  {
    title: 'Choose a running service',
    description: 'Use the trusted MiniAgentGit URL supplied by your operator.',
  },
  {
    title: 'Obtain an API credential',
    description:
      'Use the supported DeepSpace session-to-Bearer authentication flow on that application. Developer CLI login alone is not a user API credential.',
  },
  {
    title: 'Configure your terminal',
    description:
      'Replace BASE_URL and BEARER_JWT locally. Keep credentials out of source files, URLs and screenshots.',
  },
  {
    title: 'Verify your identity',
    description:
      'Call /api/me before connecting your agent. Continue only when the API verifies your subject.',
  },
  {
    title: 'Create a private repository',
    description:
      'The verified subject becomes its owner. Save the repository ID returned by the API.',
  },
  {
    title: 'Commit a text snapshot',
    description:
      'Use expected HEAD and an idempotency key. Retain the same key and body when retrying an uncertain response.',
  },
  {
    title: 'Request CI for the commit',
    description:
      'A durable job ID means accepted, not passed. Fixed checks inspect the immutable snapshot without executing its code.',
  },
  {
    title: 'Read the completed receipt',
    description:
      'Inspect status and the stored receipt. Correct a failed check in a new commit; CI does not change HEAD.',
  },
] as const satisfies readonly SetupStep[]
export const integrations = [
  {
    id: 'codex',
    name: 'OpenAI Codex',
    icon: 'source',
    purpose:
      'Create repositories, commit changes and check CI from OpenAI Codex.',
    connection: mcpConnection,
    clientGuide: {
      label: 'Official Codex MCP configuration',
      href: 'https://developers.openai.com/codex/mcp',
    },
    prerequisites: agentPrerequisites,
    instructions: agentSteps,
  },
  {
    id: 'claude',
    name: 'Claude Code',
    icon: 'api',
    purpose:
      'Create repositories, commit changes and check CI from Claude Code.',
    connection: mcpConnection,
    clientGuide: {
      label: 'Official Claude Code MCP configuration',
      href: 'https://code.claude.com/docs/en/mcp',
    },
    prerequisites: agentPrerequisites,
    instructions: agentSteps,
  },
  {
    id: 'http',
    name: 'HTTP API',
    icon: 'api',
    purpose:
      'Connect any coding agent that can send authenticated HTTP requests.',
    prerequisites: [
      'A running MiniAgentGit application and its trusted base URL.',
      'A supported Bearer JWT and Windows PowerShell or curl.exe in PowerShell.',
    ],
    instructions: httpSteps,
  },
] as const satisfies readonly Integration[]

export const onboardingCopy = {
  eyebrow: 'Choose your connection',
  title: 'Connect your coding agent',
  description: 'Choose a client or use the HTTP API.',
  setupNote:
    'Replace the URL and token placeholders in your terminal. Keep the same idempotency key when retrying an uncertain response.',
  credentialNote:
    'The HTTP copy button copies the visible template. Supply your token locally.',
} as const
