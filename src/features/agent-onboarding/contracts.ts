import type { SiteIconName } from '../product-site/contracts/icons'

export type IntegrationId = 'codex' | 'claude' | 'http'
export interface AgentConnection {
  readonly transport: string
  readonly endpoint: string
  readonly authentication: string
  readonly tools: readonly string[]
  readonly limitations: string
}
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
  readonly connection?: AgentConnection
  readonly clientGuide?: { readonly label: string; readonly href: string }
  readonly prerequisites: readonly string[]
  readonly instructions: readonly SetupStep[]
}
