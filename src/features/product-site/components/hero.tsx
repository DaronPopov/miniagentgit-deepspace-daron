import { SiteIcon } from './site-icon'
import { hero } from '../content/landing'

export function Hero() {
  return (
    <div className="site-hero site-intro">
      <div>
        <p className="site-eyebrow">{hero.eyebrow}</p>
        <h1>{hero.title}</h1>
        <p className="site-lead">{hero.description}</p>
        <div className="site-actions">
          <a className="site-button" href="#connect">
            {hero.primary}
            <SiteIcon name="next" />
          </a>
          <a className="site-button site-button-secondary" href="/docs">
            <SiteIcon name="api" />
            {hero.secondary}
          </a>
          <a href="/dashboard" className="site-button site-button-secondary">
            Open your account
          </a>
        </div>
      </div>
      <aside
        className="site-surface site-contract"
        aria-labelledby="contract-title"
      >
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
