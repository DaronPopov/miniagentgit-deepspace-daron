import {
  ArrowRight,
  BookOpen,
  Database,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  GitCompareArrows,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SiteIconName } from '../contracts/icons'

// Only these ten statically imported SVG components enter the public vocabulary.
const icons = {
  repository: GitBranch,
  commit: GitCommitHorizontal,
  validation: ShieldCheck,
  source: FileCode2,
  api: Terminal,
  persistence: Database,
  concurrency: GitCompareArrows,
  documentation: BookOpen,
  next: ArrowRight,
  external: ExternalLink,
} as const satisfies Readonly<Record<SiteIconName, LucideIcon>>

/** Icons supplement visible text; this component never creates controls or labels. */
export function SiteIcon({ name }: { readonly name: SiteIconName }) {
  const Icon = icons[name]
  return (
    <Icon
      className="site-icon"
      size={20}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
    />
  )
}
