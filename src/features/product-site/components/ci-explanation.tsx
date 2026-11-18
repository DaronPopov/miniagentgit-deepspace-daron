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
      <div className="site-surface site-boundary">
        <p>{validation.boundary}</p>
      </div>
    </>
  )
}
