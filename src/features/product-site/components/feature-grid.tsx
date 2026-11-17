import { SiteIcon } from './site-icon'
import type { FeatureDescription } from '../contracts/presentation'

export function FeatureGrid({
  items,
}: {
  readonly items: readonly FeatureDescription[]
}) {
  return (
    <ul className="site-feature-grid">
      {items.map((item) => (
        <li className="site-card" key={item.id}>
          <h3 className="site-icon-title">
            {item.icon && <SiteIcon name={item.icon} />}
            <span>{item.title}</span>
          </h3>
          <p className="site-muted">{item.description}</p>
        </li>
      ))}
    </ul>
  )
}
