import type { ReactNode } from 'react'
import type { Integration } from './contracts'
import { SiteIcon } from '../product-site/components/site-icon'
import { ConnectionDetails } from './connection-details'
import { HttpSetup } from './http-setup'

export function IntegrationPanel({
  integration,
  setup,
}: {
  readonly integration: Integration
  readonly setup?: ReactNode
}) {
  return (
    <div
      id="agent-setup"
      className="site-surface agent-panel"
      aria-labelledby="agent-panel-title"
    >
      <div className="agent-panel-heading">
        <h3 id="agent-panel-title" className="site-icon-label">
          <SiteIcon name={integration.icon} />
          {integration.name}
        </h3>
      </div>
      <p>{integration.purpose}</p>
      {integration.connection && (
        <ConnectionDetails connection={integration.connection} />
      )}
      {setup}
      <h4>What you need</h4>
      <ul>
        {integration.prerequisites.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3>
        {integration.id === 'http'
          ? 'Your first commit and validation'
          : 'Setup and verification prerequisites'}
      </h3>
      <ol className="agent-steps">
        {integration.instructions.map((step) => (
          <li key={step.title}>
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
      {integration.clientGuide && (
        <p>
          <a href={integration.clientGuide.href}>
            {integration.clientGuide.label}
          </a>
        </p>
      )}
      {integration.id === 'http' ? (
        <HttpSetup />
      ) : (
        <a className="site-button site-button-secondary" href="/docs#mcp-guide">
          View native MCP setup
        </a>
      )}
    </div>
  )
}
