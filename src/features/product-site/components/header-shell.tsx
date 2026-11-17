import { SiteIcon } from './site-icon'
import type { NavigationLink } from '../contracts/presentation'
import { SiteContainer } from './site-container'

export function HeaderShell({
  brand,
  links,
}: {
  readonly brand: string
  readonly links: readonly NavigationLink[]
}) {
  return (
    <header className="site-header">
      <SiteContainer>
        <div className="site-header-row">
          <a className="site-brand" href="/" aria-label={`${brand} home`}>
            <SiteIcon name="repository" />
            {brand}
          </a>
          <nav aria-label="Primary navigation">
            <ul className="site-navigation">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={link.current ? 'page' : undefined}
                  >
                    {link.label}
                    {link.icon && <SiteIcon name={link.icon} />}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </SiteContainer>
    </header>
  )
}
