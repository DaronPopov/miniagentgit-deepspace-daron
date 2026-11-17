import type {
  FeatureDescription,
  SectionMetadata,
} from '../contracts/presentation'

export const securitySection = {
  id: 'security',
  title: 'Private ownership. Bounded work.',
  description:
    'Authentication identifies the caller. Repository authority decides what they can access.',
} as const satisfies SectionMetadata
export const securityNotes = [
  {
    id: 'owner',
    icon: 'repository',
    title: 'Owner-only access',
    description:
      'Every repository operation checks the verified subject against persisted ownership. Knowing an ID does not grant access.',
  },
  {
    id: 'checks',
    icon: 'validation',
    title: 'Inspect, never execute',
    description:
      'Fixed CI checks treat submitted text as data. They do not run package scripts, install dependencies or load plugins.',
  },
  {
    id: 'bounds',
    icon: 'persistence',
    title: 'Explicit resource limits',
    description:
      'Text inputs, scheduling and retained CI records are bounded. Application limits do not guarantee provider quotas or free hosting.',
  },
] as const satisfies readonly FeatureDescription[]
