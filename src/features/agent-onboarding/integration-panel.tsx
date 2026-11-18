import { CodePanel } from '../onboarding/components/code-panel'
import { claudeSetup, codexSetup } from '../onboarding/examples/commands'
import type { Integration } from './contracts'
import { onboardingCopy } from './content'
import { SiteIcon } from '../product-site/components/site-icon'
import { ConnectionDetails } from './connection-details'
import { HttpSetup } from './http-setup'

export function IntegrationPanel({
  integration,
}: {
  readonly integration: Integration
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
        <span className="agent-badge">
          {onboardingCopy.statusLabels[integration.capability.state]}
        </span>
      </div>
      <p>{integration.purpose}</p>
      <p className="agent-availability" role="status">
        {integration.capability.message}
      </p>
      {integration.connection && (
        <ConnectionDetails connection={integration.connection} />
      )}
      {integration.id !== 'http' && (
        <>
          <p>
            Replace <code>YOUR-TRUSTED-HOST</code> with your app hostname. Set{' '}
            <code>MINIGIT_AGENT_TOKEN</code> in the environment that launches
            your client.
            {integration.id === 'claude' && (
              <>
                {' '}
                Merge the copied entry into your project’s{' '}
                <code>.mcp.json</code>.
              </>
            )}
          </p>
          <CodePanel
            key={integration.id}
            id={`agent-${integration.id}-setup`}
            title={
              integration.id === 'codex'
                ? 'Codex CLI · Terminal'
                : 'Claude Code · .mcp.json'
            }
            command={integration.id === 'codex' ? codexSetup : claudeSetup}
          />
        </>
      )}
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
      {integration.id === 'http' &&
      integration.capability.state === 'requires-configuration' ? (
        <HttpSetup />
      ) : (
        <a className="site-button site-button-secondary" href="/docs#mcp-guide">
          View native MCP setup
        </a>
      )}
    </div>
  )
}
