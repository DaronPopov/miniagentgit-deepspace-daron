import type { Integration } from './contracts'
import { onboardingCopy } from './content'
import { SiteIcon } from '../product-site/components/site-icon'
import { HttpSetup } from './http-setup'

export function IntegrationPanel({
  integration,
}: {
  readonly integration: Integration
}) {
  return (
    <div
      id="agent-setup"
      className="agent-panel"
      aria-labelledby="agent-panel-title"
    >
      <div className="agent-panel-heading">
        <h3 id="agent-panel-title" className="site-icon-label">
          <SiteIcon name={integration.icon} />
          {integration.name}
        </h3>
        <span className="agent-badge">
          {onboardingCopy.statusLabels[integration.capability.state]}
        </span>
      </div>
      <p>{integration.purpose}</p>
      <p className="agent-availability" role="status">
        {integration.capability.message}
      </p>
      <h4>What you need</h4>
      <ul>
        {integration.prerequisites.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3>
        {integration.id === 'http'
          ? 'Your first commit and validation'
          : 'Connection path'}
      </h3>
      <ol className="agent-steps">
        {integration.instructions.map((step) => (
          <li key={step.title}>
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
      {integration.id === 'http' &&
      integration.capability.state === 'requires-configuration' ? (
        <HttpSetup />
      ) : (
        <a
          className="site-button site-button-secondary"
          href="/docs#quick-start"
        >
          Use the HTTP API instructions
        </a>
      )}
    </div>
  )
}
