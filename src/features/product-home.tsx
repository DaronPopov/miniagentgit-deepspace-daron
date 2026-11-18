import { AgentOnboarding } from './agent-onboarding/agent-onboarding'
import { ProductFoundation } from './product-site/components/product-foundation'

export default function Home() {
  return (
    <ProductFoundation>
      <AgentOnboarding />
    </ProductFoundation>
  )
}
