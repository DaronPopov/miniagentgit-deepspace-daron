import { SiteIcon } from '../product-site/components/site-icon'
import { integrations } from './content'
import type { IntegrationId } from './contracts'

export function IntegrationSelector({
  selected,
  onSelect,
}: {
  readonly selected: IntegrationId
  readonly onSelect: (id: IntegrationId) => void
}) {
  return (
    <fieldset className="agent-selector">
      <legend>Choose an integration</legend>
      <div className="agent-options">
        {integrations.map((item) => (
          <label
            key={item.id}
            className="site-surface agent-option"
            data-selected={selected === item.id}
          >
            <input
              type="radio"
              name="agent-integration"
              value={item.id}
              checked={selected === item.id}
              onChange={() => onSelect(item.id)}
              aria-controls="agent-setup"
            />
            <span className="site-icon-label">
              <SiteIcon name={item.icon} />
              {item.name}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
