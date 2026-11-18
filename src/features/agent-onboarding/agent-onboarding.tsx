import { useState } from 'react'
import type { ReactNode } from 'react'
import type { IntegrationId } from './contracts'
import { integrations, onboardingCopy } from './content'
import { IntegrationSelector } from './integration-selector'
import { IntegrationPanel } from './integration-panel'

export function AgentOnboarding({
  agentSetup,
}: {
  readonly agentSetup?: (client: 'codex' | 'claude') => ReactNode
}) {
  const [selected, setSelected] = useState<IntegrationId>('http')
  const integration =
    integrations.find((item) => item.id === selected) ?? integrations[2]
  return (
    <section
      id="connect"
      className="agent-onboarding site-section"
      aria-labelledby="connect-title"
    >
      <p className="site-eyebrow">{onboardingCopy.eyebrow}</p>
      <h2 id="connect-title">{onboardingCopy.title}</h2>
      <p className="site-lead">{onboardingCopy.description}</p>
      <IntegrationSelector selected={selected} onSelect={setSelected} />
      <IntegrationPanel
        key={selected}
        integration={integration}
        setup={
          integration.id === 'http' ? undefined : agentSetup?.(integration.id)
        }
      />
    </section>
  )
}
