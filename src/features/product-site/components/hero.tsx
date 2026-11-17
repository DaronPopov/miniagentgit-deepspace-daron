import { hero, productLinks } from '../content/landing'

export function Hero() {
  return (
    <div className="site-hero site-intro">
      <div>
        <p className="site-eyebrow">{hero.eyebrow}</p>
        <h1>{hero.title}</h1>
        <p className="site-lead">{hero.description}</p>
        <div className="site-actions">
          <a className="site-button" href="#architecture">
            {hero.primary}
          </a>
          <a
            className="site-button site-button-secondary"
            href={productLinks.api}
          >
            {hero.secondary}
          </a>
        </div>
        <p className="site-muted site-small">{hero.scope}</p>
      </div>
      <aside className="site-contract" aria-labelledby="contract-title">
        <p className="site-eyebrow">{hero.asideNote}</p>
        <h2 id="contract-title">{hero.asideTitle}</h2>
        <p className="site-muted">{hero.asideDescription}</p>
        <ol className="site-contract-steps">
          {hero.asideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
