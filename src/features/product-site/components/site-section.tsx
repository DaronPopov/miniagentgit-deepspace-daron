import type { ReactNode } from 'react'
import type { SectionMetadata } from '../contracts/presentation'

export function SiteSection({
  metadata,
  children,
}: {
  readonly metadata: SectionMetadata
  readonly children: ReactNode
}) {
  return (
    <section
      className="site-section"
      id={metadata.id}
      aria-labelledby={`${metadata.id}-title`}
    >
      <h2 id={`${metadata.id}-title`}>{metadata.title}</h2>
      {metadata.description && (
        <p className="site-muted">{metadata.description}</p>
      )}
      {children}
    </section>
  )
}
