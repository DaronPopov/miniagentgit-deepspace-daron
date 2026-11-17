import type { FeatureDescription } from '../contracts/presentation'

export const workflow = [
  {
    id: 'prepare',
    icon: 'source',
    title: 'Name the expected state',
    description:
      'Submit bounded text changes, an expected HEAD, and an idempotency key.',
  },
  {
    id: 'admit',
    icon: 'validation',
    title: 'Authorize and admit',
    description:
      'Verify identity and persisted ownership, then enter the repository’s bounded commit scheduler.',
  },
  {
    id: 'persist',
    icon: 'persistence',
    title: 'Compare and persist',
    description:
      'The authority rechecks permission and expected HEAD, then atomically stores immutable data and advances HEAD.',
  },
  {
    id: 'recover',
    icon: 'concurrency',
    title: 'Resolve the outcome',
    description:
      'On conflict, read current state and prepare again. After an uncertain response, retry the same request and key.',
  },
] as const satisfies readonly FeatureDescription[]
export const validation = {
  label: 'Commit-addressed asynchronous CI',
  steps: [
    'Request validation for a specific commit ID.',
    'Receive a durable job ID before the checks finish.',
    'Retrieve status and a persistent versioned receipt.',
  ],
  checks: [
    {
      id: 'integrity',
      icon: 'validation',
      title: 'Manifest integrity',
      description:
        'Recalculate content hashes and verify paths, ordering, byte counts, and snapshot metadata.',
    },
    {
      id: 'policy',
      icon: 'source',
      title: 'Fixed source policy',
      description:
        'Check supported text paths, size and line limits, malformed text, whitespace, and final newlines.',
    },
    {
      id: 'receipts',
      icon: 'commit',
      title: 'Versioned outcomes',
      description:
        'Pipeline fingerprints identify the check implementation and policy. Duplicate requests reuse the same job or receipt.',
    },
  ],
  boundary:
    'Validation treats source as data. It does not execute submitted code, install packages, or run ESLint, tests, or TypeScript type checking. TypeScript syntax parsing is deferred.',
  recovery:
    'Recovery is request-driven after runtime recreation. Background progress without another authorized request is not guaranteed.',
} as const satisfies {
  readonly label: string
  readonly steps: readonly string[]
  readonly checks: readonly FeatureDescription[]
  readonly boundary: string
  readonly recovery: string
}
