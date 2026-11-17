import { documentation } from '../content/landing'

export function DocumentationLinks() {
  return (
    <ul className="site-documentation">
      {documentation.map((link) => (
        <li key={link.href}>
          <a href={link.href}>
            {link.label}
            <span aria-hidden="true"> ↗</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
