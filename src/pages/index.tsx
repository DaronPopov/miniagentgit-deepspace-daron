import { APP_NAME } from '../constants'

export default function Home() {
  return (
    <main data-testid="app-root">
      <p>Agent infrastructure · Foundation</p>
      <h1>{APP_NAME}</h1>
      <p>A headless version control service for AI coding agents.</p>
      <p>Repository operations are planned for future passes.</p>
      <a href="/api/health">Service health</a>
    </main>
  )
}
