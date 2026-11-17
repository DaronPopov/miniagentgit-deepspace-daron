import { validation } from '../content/workflows'
import { FeatureGrid } from './feature-grid'

export function CiExplanation() {
  return (
    <>
      <ol className="site-ci-steps" aria-label={validation.label}>
        {validation.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <FeatureGrid items={validation.checks} />
      <div className="site-boundary">
        <p>{validation.boundary}</p>
        <p className="site-muted">{validation.recovery}</p>
      </div>
    </>
  )
}
