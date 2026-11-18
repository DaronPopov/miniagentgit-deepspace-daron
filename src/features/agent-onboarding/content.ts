import type { Integration, SetupStep } from './contracts'
import { mcpConnection, agentPrerequisites, agentSteps } from './mcp-connection'

export const httpSteps = [
  {
    title: 'Choose a running service',
    description:
      'Deploy MiniAgentGit or use a running application supplied by your operator. The previous deployment is inactive.',
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
    capability: {
      state: 'unavailable',
      message:
        'Application currently undeployed. The repository and CI workflow is locally qualified with the DeepSpace SDK client; an actual Codex connection and hosted credential flow are not yet verified.',
    },
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
    capability: {
      state: 'unavailable',
      message:
        'Application currently undeployed. The repository and CI workflow is locally qualified with the DeepSpace SDK client; an actual Claude Code connection and hosted credential flow are not yet verified.',
    },
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
    capability: {
      state: 'requires-configuration',
      message:
        'Deployment required. The HTTP workflow is implemented and previously hosted-tested, but this application is currently undeployed.',
    },
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
  description:
    'Choose an integration, check its availability, then follow the setup instructions. Your agent stays in control of each commit.',
  statusLabels: {
    planned: 'Planned',
    available: 'Verified and available',
    'locally-qualified': 'Locally qualified',
    unavailable: 'Unavailable',
    'requires-configuration': 'Deployment required',
  },
  setupNote:
    'After deployment and credential acquisition, replace the two placeholders in your terminal. Run setup once per new workflow; retain existing keys after an uncertain response. These examples do not connect to an active endpoint as shown.',
  credentialNote:
    'The public page never signs you in, obtains credentials or calls the API. Copying only copies the visible text.',
} as const
