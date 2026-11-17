/** Liveness only; does not assert storage or platform readiness. */
export interface HealthResponse {
  readonly status: 'ok'
  readonly service: 'miniagentgit'
}
