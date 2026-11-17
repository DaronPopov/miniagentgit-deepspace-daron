import type { CommandExample, ShellMode } from '../contracts/documentation'
import { setupCommand } from '../examples/commands'
import { CodePanel } from './code-panel'

export function CommandMode({
  shell,
  title,
  examples,
}: {
  readonly shell: ShellMode
  readonly title: string
  readonly examples: readonly CommandExample[]
}) {
  return (
    <section
      className="docs-mode"
      id={`mode-${shell}`}
      aria-labelledby={`mode-${shell}-title`}
    >
      <h3 id={`mode-${shell}-title`}>{title}</h3>
      <CodePanel
        id={`${shell}-setup`}
        title="Set up this terminal"
        command={setupCommand(shell)}
      />
      {examples.map((example) => (
        <article
          key={example.id}
          className="docs-example"
          aria-labelledby={`${shell}-${example.id}-title`}
        >
          <h4 id={`${shell}-${example.id}-title`}>{example.label}</h4>
          <p className="docs-route">
            <span>{example.method}</span> <code>{example.route}</code>
          </p>
          <p>{example.explanation}</p>
          <p className="site-muted site-small">
            Required values: {example.placeholders.join(', ')}
          </p>
          <CodePanel
            id={`${shell}-${example.id}`}
            title={example.label}
            command={example.command}
          />
        </article>
      ))}
    </section>
  )
}
