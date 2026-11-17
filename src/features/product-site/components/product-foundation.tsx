import { HeaderShell } from './header-shell'
import { SiteContainer } from './site-container'
import { SiteSection } from './site-section'
import { CodeSurface } from './code-surface'
import {
  examplePlaceholder,
  foundationNavigation,
  foundationSection,
} from '../content/foundation'

export function ProductFoundation() {
  return (
    <div className="product-site">
      <a className="site-skip-link" href="#main-content">
        Skip to content
      </a>
      <HeaderShell brand="MiniAgentGit" links={foundationNavigation} />
      <main id="main-content" tabIndex={-1}>
        <SiteContainer>
          <div className="site-intro">
            <p className="site-eyebrow">MiniAgentGit · Public interface</p>
            <h1>A foundation for agent workflows.</h1>
            <p className="site-muted">
              Presentation primitives, ready for composition.
            </p>
          </div>
          <SiteSection metadata={foundationSection}>
            <CodeSurface example={examplePlaceholder} />
          </SiteSection>
        </SiteContainer>
      </main>
    </div>
  )
}
