import { Hono } from 'hono'
import { getHealth } from '../../application/health'

export function createHealthRoutes() {
  const routes = new Hono()
  routes.get('/health', (c) => c.json(getHealth()))
  return routes
}
