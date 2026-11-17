import { securitySection, securityNotes } from '../content/security'
import type { ReactNode } from 'react'
import { HeaderShell } from './header-shell'
import { SiteContainer } from './site-container'
import { SiteSection } from './site-section'
import { Hero } from './hero'
import { FeatureGrid } from './feature-grid'
import { CommitWorkflow } from './commit-workflow'
import { CiExplanation } from './ci-explanation'
import {
  CommitLifecycleDiagram,
  CiLifecycleDiagram,
} from './architecture-diagrams'
import { DocumentationLinks } from './documentation-links'
import { SiteFooter } from './site-footer'
import { capabilities, productNavigation, sections } from '../content/landing'

export function ProductFoundation({
  children,
}: {
  readonly children?: ReactNode
}) {
  return (
    <div className="product-site">
      <a className="site-skip-link" href="#main-content">
        Skip to content
      </a>
      <HeaderShell brand="MiniAgentGit" links={productNavigation} />
      <main id="main-content" tabIndex={-1}>
        <SiteContainer>
          <Hero />
          {children}
          <SiteSection metadata={sections.capabilities}>
            <FeatureGrid items={capabilities} />
          </SiteSection>
          <SiteSection metadata={sections.workflow}>
            <CommitWorkflow />
          </SiteSection>
          <SiteSection metadata={sections.ci}>
            <CiExplanation />
          </SiteSection>
          <SiteSection metadata={sections.architecture}>
            <div className="site-diagram-grid">
              <CommitLifecycleDiagram />
              <CiLifecycleDiagram />
            </div>
          </SiteSection>
          <SiteSection metadata={securitySection}>
            <FeatureGrid items={securityNotes} />
          </SiteSection>
          <SiteSection metadata={sections.documentation}>
            <DocumentationLinks />
          </SiteSection>
        </SiteContainer>
      </main>
      <SiteFooter />
    </div>
  )
}
