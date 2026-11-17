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
