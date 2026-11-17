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
  budget: `${repository}/blob/main/docs/free-tier-budget.md`,
  evidence: `${repository}/blob/main/docs/passes/pass05-results.md`,
} as const
export const productNavigation = [
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Docs', href: '#documentation' },
  { label: 'GitHub', href: productLinks.github, icon: 'external' },
] as const satisfies readonly NavigationLink[]
export const hero = {
  eyebrow: 'Git-inspired infrastructure · For coding agents',
  title: 'Version control built for coding agents.',
  description:
    'Immutable repository snapshots, conflict-safe commits, and bounded asynchronous CI in one lightweight service.',
  primary: 'Explore the architecture',
  secondary: 'Read the API',
  scope:
    'Text-only. Headless HTTP API. Verified locally with SQLite and workerd.',
  asideTitle: 'One repository. One HEAD authority.',
  asideDescription:
    'Give agents explicit concurrency boundaries, immutable inputs, and durable outcomes.',
  asideSteps: ['expected HEAD', 'atomic comparison', 'immutable commit'],
  asideNote: 'Conceptual commit path · no live repository data',
} as const
export const sections = {
  capabilities: {
    id: 'capabilities',
    title: 'Small surface. Explicit guarantees.',
    description:
      'The local engine keeps ownership and persistence rules close to the data.',
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
      'Repository commits and validation jobs share a canonical repository-scoped Durable Object, with separate persistence responsibilities.',
  },
  philosophy: {
    id: 'philosophy',
    title: 'Deliberately bounded.',
    description:
      'A small take-home service with visible limits and evidence you can inspect.',
  },
  documentation: {
    id: 'documentation',
    title: 'Follow the implementation.',
    description:
      'Read the contracts, limits, and local test evidence directly in the repository.',
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
    title: 'Repository-scoped scheduling',
    description:
      'Bounded FIFO admission and one active commit executor per repository keep work and ownership explicit.',
  },
  {
    id: 'testing',
    icon: 'validation',
    title: 'Local integration evidence',
    description:
      'Real SQLite rollback and concurrency tests sit alongside authenticated HTTP tests in local workerd Durable Objects.',
  },
] as const satisfies readonly FeatureDescription[]
export const philosophy = [
  {
    id: 'free-tier',
    icon: 'repository',
    title: 'One app, fewer moving parts',
    description:
      'Free-tier-first design: one intended deployment, bounded text storage, and no paid integrations, external brokers, or background polling service.',
  },
  {
    id: 'limits',
    icon: 'persistence',
    title: 'Budgets are part of the contract',
    description:
      'Admission, input, diagnostics, work, and retained records have application limits. Reported plan allowances are planning inputs, not verified runtime quotas.',
  },
  {
    id: 'scope',
    icon: 'repository',
    title: 'Git-inspired, deliberately scoped',
    description:
      'This is not Git wire-protocol compatibility. Branches, merges, binaries, and MCP support are not implemented.',
  },
] as const satisfies readonly FeatureDescription[]
export const verification = {
  title: 'Local evidence, clear boundaries',
  description:
    'Hosted authentication, live deployment, and runtime quotas remain unverified. The production build requires an owner-registered DeepSpace app ID.',
  upcoming:
    'Upcoming: onboarding, browser authentication integration, and an authenticated repository/CI dashboard.',
} as const
export const documentation = [
  { label: 'HTTP API', href: productLinks.api, icon: 'api' },
  {
    label: 'Architecture & ownership',
    href: productLinks.architecture,
    icon: 'repository',
  },
  { label: 'CI pipeline', href: productLinks.ci, icon: 'validation' },
  { label: 'Free-tier budget', href: productLinks.budget, icon: 'persistence' },
  {
    label: 'Local test evidence',
    href: productLinks.evidence,
    icon: 'documentation',
  },
] as const satisfies readonly NavigationLink[]
export const footer = {
  brand: 'MiniAgentGit',
  description: 'Git-inspired. Text-only. Locally verified.',
  source: 'View source on GitHub',
} as const
