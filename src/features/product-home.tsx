import type { ComponentProps } from 'react'
import { AgentOnboarding } from './agent-onboarding/agent-onboarding'
import { ProductFoundation } from './product-site/components/product-foundation'

export default function Home(props: ComponentProps<typeof AgentOnboarding>) {
  return (
    <ProductFoundation>
      <AgentOnboarding {...props} />
    </ProductFoundation>
  )
}
