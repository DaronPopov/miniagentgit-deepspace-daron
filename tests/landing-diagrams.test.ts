import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import {
  CiLifecycleDiagram,
  CommitLifecycleDiagram,
} from '../src/features/product-site/components/architecture-diagrams'
import {
  ciDiagram,
  commitDiagram,
  diagramNotes,
} from '../src/features/product-site/content/diagrams'

it('renders accessible inline SVG lifecycles with correct ordered ownership boundaries', () => {
  for (const [Component, metadata, note] of [
    [CommitLifecycleDiagram, commitDiagram, diagramNotes.commit],
    [CiLifecycleDiagram, ciDiagram, diagramNotes.ci],
  ] as const) {
    const html = renderToStaticMarkup(createElement(Component))
    expect(html.match(/<svg\b/g)).toHaveLength(1)
    expect(html).toContain('role="img"')
    expect(html).toContain('viewBox="0 0 300 480"')
    expect(html).toContain(`<title`)
    expect(html).toContain(metadata.title)
    expect(html).toContain(metadata.description)
    expect(html).toContain(note)
    for (const node of metadata.nodes)
      for (const line of node.label.split('\n')) expect(html).toContain(line)
    expect(metadata.connections).toHaveLength(4)
    metadata.connections.forEach((edge, index) => {
      expect(edge.from).toBe(metadata.nodes[index]?.id)
      expect(edge.to).toBe(metadata.nodes[index + 1]?.id)
    })
    expect(html.match(/<rect /g)).toHaveLength(5)
  }
  expect(commitDiagram.nodes.map((n) => n.id)).toEqual([
    'agent',
    'http',
    'authority',
    'scheduler',
    'sqlite',
  ])
  expect(ciDiagram.nodes.map((n) => n.id)).toEqual([
    'commit',
    'job',
    'validators',
    'receipt',
    'consumer',
  ])
  expect(diagramNotes.commit).toContain('not durable job state')
  expect(diagramNotes.ci).toContain('CI never owns HEAD')
  expect(ciDiagram.nodes.at(-1)?.label).toBe('Agent')
})
it('uses unique SVG title/description/marker IDs even when diagrams are reused', () => {
  const html = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      createElement(CommitLifecycleDiagram),
      createElement(CiLifecycleDiagram),
      createElement(CommitLifecycleDiagram),
    ),
  )
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  expect(new Set(ids).size).toBe(ids.length)
  for (const match of html.matchAll(
    /aria-(?:labelledby|describedby)="([^"]+)"/g,
  ))
    expect(ids).toContain(match[1])
  for (const match of html.matchAll(/marker-end="url\(#([^\)]+)\)"/g))
    expect(ids).toContain(match[1])
})
it('stacks diagrams and cards on narrow screens with bounded fluid SVG width and no motion', () => {
  const diagram = readFileSync(
    'src/features/product-site/styles/diagrams.css',
    'utf8',
  )
  const landing = readFileSync(
    'src/features/product-site/styles/landing.css',
    'utf8',
  )
  expect(diagram).toContain('inline-size: 100%')
  expect(diagram).toContain('block-size: auto')
  expect(diagram).toContain('@media (min-width: 64rem)')
  expect(diagram).toContain('font: 17px var(--site-font-body)')
  expect(diagram).toContain('forced-colors: active')
  expect(landing).toContain('@media (min-width: 64rem)')
  expect(landing).toContain('repeat(3, minmax(0, 1fr))')
  expect(landing).toContain('flex-wrap: wrap')
  expect(diagram + landing).not.toMatch(
    /animation:|transition:|https?:|url\(|@font-face/,
  )
})
