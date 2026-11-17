import type { SiteIconName } from '../product-site/contracts/icons'

export type IntegrationId = 'codex' | 'claude' | 'http'
export type Capability =
  | { readonly state: 'planned'; readonly message: string }
  | { readonly state: 'requires-configuration'; readonly message: string }
export interface SetupStep {
  readonly title: string
  readonly description: string
}
/** Trusted presentation metadata; never an installation or execution registry. */
export interface Integration {
  readonly id: IntegrationId
  readonly name: string
  readonly icon: SiteIconName
  readonly purpose: string
  readonly capability: Capability
  readonly prerequisites: readonly string[]
  readonly instructions: readonly SetupStep[]
}
