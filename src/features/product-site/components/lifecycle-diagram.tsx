import { useId } from 'react'
import type { ArchitectureDiagramMetadata } from '../contracts/presentation'

/** A vertical five-stage lifecycle keeps text readable without horizontal scrolling. */
export function LifecycleDiagram({
  metadata,
  note,
}: {
  readonly metadata: ArchitectureDiagramMetadata
  readonly note: string
}) {
  const id = useId()
  return (
    <figure className="site-surface site-diagram">
      <figcaption>{metadata.title}</figcaption>
      <svg
        viewBox="0 0 300 480"
        role="img"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <title id={`${id}-title`}>{metadata.title}</title>
        <desc id={`${id}-description`}>{metadata.description}</desc>
        <defs>
          <marker
            id={`${id}-arrow`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="site-diagram-arrow" />
          </marker>
        </defs>
        <g aria-hidden="true">
          {metadata.nodes.map((node, index) => {
            const y = 12 + index * 94
            const lines = node.label.split('\n')
            return (
              <g key={node.id}>
                <rect x="12" y={y} width="276" height="68" rx="10" />
                <text
                  x="150"
                  y={y + (lines.length === 1 ? 40 : 30)}
                  textAnchor="middle"
                >
                  {lines.map((line, lineIndex) => (
                    <tspan key={line} x="150" dy={lineIndex === 0 ? 0 : 20}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {index < metadata.nodes.length - 1 && (
                  <path
                    d={`M 150 ${y + 70} V ${y + 89}`}
                    className="site-diagram-connector"
                    markerEnd={`url(#${id}-arrow)`}
                  />
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <p className="site-muted">{note}</p>
    </figure>
  )
}
