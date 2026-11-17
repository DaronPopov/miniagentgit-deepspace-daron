import type { CodeExampleDescriptor } from '../contracts/presentation'

/** Layout placeholder, not a runnable example or backend integration. */
export function CodeSurface({
  example,
}: {
  readonly example: CodeExampleDescriptor
}) {
  return (
    <figure className="site-code" aria-labelledby={`${example.id}-caption`}>
      <figcaption id={`${example.id}-caption`}>
        <span>{example.title}</span>
        <span className="site-muted">{example.language}</span>
      </figcaption>
      <p>{example.description}</p>
    </figure>
  )
}
