import { SiteIcon } from './site-icon'
import { workflow } from '../content/workflows'

export function CommitWorkflow() {
  return (
    <ol className="site-workflow">
      {workflow.map((step, index) => (
        <li key={step.id}>
          <span className="site-step-number" aria-hidden="true">
            0{index + 1}
          </span>
          <div>
            <h3 className="site-icon-title">
              <SiteIcon name={step.icon} />
              <span>{step.title}</span>
            </h3>
            <p className="site-muted">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
