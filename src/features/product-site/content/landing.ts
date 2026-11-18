import type {
  FeatureDescription,
  NavigationLink,
  SectionMetadata,
} from '../contracts/presentation'

const repository = 'https://github.com/DaronPopov/miniagentgit-deepspace-daron'
export const productLinks = {
  github: repository,
  api: `${repository}/blob/main/docs/api.md`,
  architecture: `${repository}/blob/main/docs/architecture.md`,
  ci: `${repository}/blob/main/docs/ci-pipeline.md`,
} as const
export const productNavigation = [
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Docs', href: '/docs' },
  { label: 'Account', href: '/dashboard' },
  { label: 'GitHub', href: productLinks.github, icon: 'external' },
] as const satisfies readonly NavigationLink[]
export const hero = {
  eyebrow: 'Git-inspired infrastructure · For coding agents',
  title: 'Version control built for coding agents.',
  description:
    'Immutable repository snapshots, conflict-safe commits, and bounded asynchronous CI in one lightweight service.',
  primary: 'Connect your coding agent',
  secondary: 'Read the API',
  scope: 'Text-only snapshots. Headless HTTP API.',
  asideTitle: 'One repository. One HEAD authority.',
  asideDescription:
    'Give agents explicit concurrency boundaries, immutable inputs, and durable outcomes.',
  asideSteps: ['expected HEAD', 'atomic comparison', 'immutable commit'],
  asideNote: 'Commit lifecycle',
} as const
export const sections = {
  capabilities: {
    id: 'capabilities',
    title: 'Small surface. Explicit guarantees.',
    description: 'Ownership and persistence rules stay close to the data.',
  },
  workflow: {
    id: 'workflow',
    title: 'A commit is a deliberate state transition.',
    description:
      'Agents submit intent. The repository owner decides whether it can safely become the next HEAD.',
  },
  ci: {
    id: 'validation',
    title: 'Validate a commit. Keep its history.',
    description:
      'CI addresses an immutable snapshot, never a moving HEAD. A correction is a new commit, not a rewrite of a failed one.',
  },
  architecture: {
    id: 'architecture',
    title: 'Two lifecycles. One repository owner.',
    description:
      'Repository commits and validation jobs share a canonical repository-owned Durable Object, with separate persistence responsibilities.',
  },
  documentation: {
    id: 'documentation',
    title: 'Documentation.',
    description: 'Explore the API, architecture, and CI pipeline.',
  },
} as const satisfies Readonly<Record<string, SectionMetadata>>
export const capabilities = [
  {
    id: 'snapshots',
    icon: 'source',
    title: 'Immutable text snapshots',
    description:
      'SHA-256 content and manifests keep committed text addressable without changing earlier snapshots.',
  },
  {
    id: 'atomic',
    icon: 'persistence',
    title: 'Transactional HEAD updates',
    description:
      'Commit metadata, replay outcomes, resource counters, and HEAD advance in one synchronous SQLite transaction.',
  },
  {
    id: 'conflicts',
    icon: 'concurrency',
    title: 'Expected-HEAD conflicts',
    description:
      'A stale expected HEAD is rejected. Queue order alone is never treated as proof of correctness.',
  },
  {
    id: 'replay',
    icon: 'commit',
    title: 'Durable successful replay',
    description:
      'Retry the same semantic request and idempotency key to recover a successful outcome after an uncertain response.',
  },
  {
    id: 'scheduling',
    icon: 'repository',
    title: 'Repository-level scheduling',
    description:
      'Bounded FIFO admission and one active commit executor per repository keep work and ownership explicit.',
  },
  {
    id: 'validation',
    icon: 'validation',
    title: 'Commit-addressed CI',
    description:
      'Validate an immutable snapshot asynchronously and retrieve a persistent result.',
  },
] as const satisfies readonly FeatureDescription[]
export const documentation = [
  { label: 'HTTP API', href: '/docs', icon: 'api' },
  {
    label: 'Architecture & ownership',
    href: productLinks.architecture,
    icon: 'repository',
  },
  { label: 'CI pipeline', href: productLinks.ci, icon: 'validation' },
] as const satisfies readonly NavigationLink[]
export const footer = {
  brand: 'MiniAgentGit',
  description: 'Git-inspired. Text-only. Agent-focused.',
  source: 'View source on GitHub',
} as const
