import { AuthBoundary } from '../features/auth-ui/auth-boundary'
import { McpConnect } from '../features/auth-ui/mcp-connect'
import Home from '../features/product-home'

export default function HomeEntry() {
  return (
    <AuthBoundary
      home={(session) => (
        <Home
          agentSetup={(client) => (
            <McpConnect session={session} client={client} />
          )}
        />
      )}
    />
  )
}
