import { SiteIcon } from './site-icon'
import { footer, productLinks } from '../content/landing'
import { SiteContainer } from './site-container'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <SiteContainer>
        <div className="site-footer-row">
          <p>
            <strong>{footer.brand}</strong>
            <br />
            {footer.description}
          </p>
          <a className="site-icon-label" href={productLinks.github}>
            {footer.source}
            <SiteIcon name="external" />
          </a>
        </div>
      </SiteContainer>
    </footer>
  )
}
