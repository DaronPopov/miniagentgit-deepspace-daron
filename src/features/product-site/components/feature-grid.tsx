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
          <h3>{item.title}</h3>
          <p className="site-muted">{item.description}</p>
        </li>
      ))}
    </ul>
  )
}
