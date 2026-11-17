import type {
  CodeExampleDescriptor,
  NavigationLink,
  SectionMetadata,
} from '../contracts/presentation'

export const foundationNavigation = [
  { label: 'Foundation', href: '#foundation' },
] as const satisfies readonly NavigationLink[]
export const foundationSection = {
  id: 'foundation',
  title: 'Interface foundation',
  description: 'A small public layout for the next product-site pass.',
} as const satisfies SectionMetadata
export const examplePlaceholder = {
  id: 'example-placeholder',
  title: 'Code example surface',
  language: 'text',
  description: 'Onboarding examples will be added in a later pass.',
} as const satisfies CodeExampleDescriptor
