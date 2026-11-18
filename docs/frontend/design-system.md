# Frontend design system

The interface presents a developer service with three connected tasks.
An authorized agent calls MCP tools, submits a snapshot with an expected HEAD,
then requests CI for the immutable commit and reads its durable receipt. Use
plain language, a clear type hierarchy and existing lifecycle diagrams.
Preserve the system color preference and render with local system fonts.

## Tokens

[`tokens.css`](../../src/features/product-site/styles/tokens.css) defines the
light and dark values for page, surface and code backgrounds, primary and muted
text, borders, accent and focus. The semantic palette includes danger, success
and warning. Bind status colors to text or labeled icons so state remains
understandable without color. Current auth errors use danger text.

- Use `text-small`, `text-body`, `text-lead`, `text-section` and `text-title`
  in the system UI family. Set identifiers and commands in the monospace family.
- Use the spacing scale (4–64 px at the default root size), shared border and
  radius, 44 px minimum action height, and the 3 px focus ring with 4 px offset.
  Forced-colors focus uses the system Highlight color.
- `SiteContainer` sets a 68 rem maximum width and 16 px default gutters.
  The 40 rem media query widens gutters and enables multi-column groups. The
  64 rem query expands section spacing and desktop compositions. Native media
  queries carry these values because CSS custom properties cannot substitute
  into standard media query conditions. Use the 62 ch prose measure for copy.

## Shared primitives

- Apply `.site-button` to native anchors for navigation and native buttons
  for actions. Secondary and compact modifiers cover provider and clipboard
  actions. Hover and active use text decoration, disabled buttons use muted
  text, and focus is shared at the root.
- Use `.site-surface` for bordered cards and panels. Feature CSS controls inner
  padding and layout. Inline links inherit the accent and underline offset.
- Use `HeaderShell`, `SiteContainer` and `SiteSection` for navigation and
  structure. Use `SiteIcon` with a visible text label and `LifecycleDiagram`
  with an accessible name and supporting prose.
- Use `CodePanel` for labeled, independently scrollable command examples with
  live copy feedback. Preserve exact copied command text.
- Preserve native fieldsets, legends, labels and inputs. Current auth loading
  and failure states use a polite status region. Route initialization shows
  a loading status in the same container. Keep future dashboard fields,
  feedback and empty states in the dashboard feature until a second consumer
  demonstrates that a shared component is needed. An empty state needs a
  fulfilled query, an explanation and a relevant action. A failure state needs
  the affected operation and a safe recovery action.

This foundation uses the existing imports and native controls. See the
[engineering standards](../engineering-standards.md#public-frontend-modules)
for dependency boundaries and [qualification evidence](evidence/pass11a/README.md)
for the viewports and inspected states.
