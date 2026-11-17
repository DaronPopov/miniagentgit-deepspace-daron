import type { ReactNode } from 'react'

export function SiteContainer({ children }: { readonly children: ReactNode }) {
  return <div className="site-container">{children}</div>
}
