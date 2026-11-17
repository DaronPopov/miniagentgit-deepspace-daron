import type { SiteIconName } from './icons'

/** Public display data only; no repository, identity or CI authority. */
export interface NavigationLink {
  readonly label: string
  readonly href: `/${string}` | `#${string}` | `https://${string}`
  readonly current?: boolean
  readonly icon?: SiteIconName
}
export interface FeatureDescription {
  readonly icon?: SiteIconName
  readonly id: string
  readonly title: string
  readonly description: string
}
export interface SectionMetadata {
  readonly id: string
  readonly title: string
  readonly description?: string
}
export interface CodeExampleDescriptor {
  readonly id: string
  readonly title: string
  readonly language: 'text' | 'shell' | 'typescript'
  readonly description: string
}
export interface ArchitectureDiagramMetadata {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly nodes: readonly { readonly id: string; readonly label: string }[]
  readonly connections: readonly {
    readonly from: string
    readonly to: string
    readonly label: string
  }[]
}
