import { HeaderShell } from '../../product-site/components/header-shell'
import { SiteContainer } from '../../product-site/components/site-container'
import { SiteFooter } from '../../product-site/components/site-footer'
import { docsNavigation, guideSections, quickStart } from '../content/guide'
import { curlExamples, powershellExamples } from '../examples/commands'
import { McpGuide } from './mcp-guide'
import { CommandMode } from './command-mode'

export function DocumentationPage() {
  return (
    <div className="product-site">
      <a className="site-skip-link" href="#main-content">
        Skip to content
      </a>
      <HeaderShell brand="MiniAgentGit" links={docsNavigation} />
      <main id="main-content" tabIndex={-1}>
        <SiteContainer>
          <div className="site-intro">
            <p className="site-eyebrow">MiniAgentGit · Documentation</p>
            <h1>Connect your agent over HTTP.</h1>
            <p className="site-lead">
              Discover the native MCP tools, follow a commit through CI and use
              the HTTP quick start.
            </p>
          </div>
          <McpGuide />
          <section
            id="api-guide"
            className="site-section"
            aria-labelledby="api-guide-title"
          >
            <h2 id="api-guide-title">How the API works</h2>
            <nav aria-label="Documentation contents">
              <ul className="docs-contents">
                {guideSections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
            {guideSections.map((section) => (
              <section
                className="docs-guide"
                id={section.id}
                key={section.id}
                aria-labelledby={`${section.id}-title`}
              >
                <h3 id={`${section.id}-title`}>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </section>
          <section
            id="quick-start"
            className="site-section"
            aria-labelledby="quick-start-title"
          >
            <h2 id="quick-start-title">{quickStart.title}</h2>
            <p>{quickStart.introduction}</p>
            <p className="site-muted">{quickStart.placeholders}</p>
            <nav aria-label="Command modes">
              <ul className="docs-contents">
                <li>
                  <a href="#mode-powershell">Windows PowerShell</a>
                </li>
                <li>
                  <a href="#mode-curl">curl.exe in PowerShell</a>
                </li>
              </ul>
            </nav>
            <p className="site-muted">{quickStart.curlNote}</p>
            <CommandMode
              shell="powershell"
              title={quickStart.powershell}
              examples={powershellExamples}
            />
            <CommandMode
              shell="curl"
              title={quickStart.curl}
              examples={curlExamples}
            />
          </section>
        </SiteContainer>
      </main>
      <SiteFooter />
    </div>
  )
}
