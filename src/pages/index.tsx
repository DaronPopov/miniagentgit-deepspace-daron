import { AgentOnboarding } from '../features/agent-onboarding/agent-onboarding'
import { ProductFoundation } from '../features/product-site/components/product-foundation'

export default function Home() {
  return (
    <ProductFoundation>
      <AgentOnboarding />
    </ProductFoundation>
  )
}
