import { expect, expectTypeOf, it } from 'vitest'
import type {
  NavigationLink,
  FeatureDescription,
  SectionMetadata,
  CodeExampleDescriptor,
  ArchitectureDiagramMetadata,
} from '../src/features/product-site/contracts/presentation'
import {
  productNavigation,
  sections,
} from '../src/features/product-site/content/landing'

it('keeps display contracts serializable, readonly and independent of business models', () => {
  const feature = {
    id: 'layout',
    title: 'Layout',
    description: 'Semantic regions',
  } as const satisfies FeatureDescription
  const diagram = {
    id: 'presentation',
    title: 'Presentation boundary',
    description: 'Route composes feature',
    nodes: [
      { id: 'route', label: 'Route' },
      { id: 'feature', label: 'Feature' },
    ],
    connections: [{ from: 'route', to: 'feature', label: 'composes' }],
  } as const satisfies ArchitectureDiagramMetadata
  expectTypeOf<NavigationLink['href']>().toEqualTypeOf<
    `/${string}` | `#${string}` | `https://${string}`
  >()
  expectTypeOf<SectionMetadata['title']>().toEqualTypeOf<string>()
  expectTypeOf<CodeExampleDescriptor['language']>().toEqualTypeOf<
    'text' | 'shell' | 'typescript'
  >()
  expectTypeOf<FeatureDescription>().toEqualTypeOf<
    Readonly<FeatureDescription>
  >()
  expectTypeOf<ArchitectureDiagramMetadata['nodes']>().toEqualTypeOf<
    readonly { readonly id: string; readonly label: string }[]
  >()
  expect(JSON.parse(JSON.stringify({ feature, diagram }))).toEqual({
    feature,
    diagram,
  })
  const ids = new Set(diagram.nodes.map((node) => node.id))
  for (const edge of diagram.connections)
    expect(ids.has(edge.from) && ids.has(edge.to)).toBe(true)
  expect(
    productNavigation
      .filter((link) => link.href.startsWith('#'))
      .every((link) =>
        Object.values(sections).some(
          (section) => link.href === `#${section.id}`,
        ),
      ),
  ).toBe(true)
  const example = {
    id: 'example',
    title: 'Example',
    language: 'text',
    description: 'Placeholder',
  } as const satisfies CodeExampleDescriptor
  expect(example.language).toBe('text')
})
