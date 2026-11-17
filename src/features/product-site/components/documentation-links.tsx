import { SiteIcon } from './site-icon'
import { documentation } from '../content/landing'

export function DocumentationLinks() {
  return (
    <ul className="site-documentation">
      {documentation.map((link) => (
        <li key={link.href}>
          <a href={link.href}>
            <span className="site-icon-label">
              <SiteIcon name={link.icon} />
              {link.label}
            </span>
            <SiteIcon name="external" />
          </a>
        </li>
      ))}
    </ul>
  )
}
