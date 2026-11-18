import { AuthBoundary } from '../features/auth-ui/auth-boundary'
import Home from '../features/product-home'

export default function HomeEntry() {
  return (
    <AuthBoundary>
      <Home />
    </AuthBoundary>
  )
}
