import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { expect, it } from 'vitest'

const probe = `
  export default {
    async fetch() {
      const signal = AbortSignal.timeout(1)
      let checksum = 0
      for (let i = 0; i < 8_000_000; i++) checksum += Math.sqrt(i)
      const during = signal.aborted
      await scheduler.wait(10)
      return Response.json({ during, after: signal.aborted, checksum })
    },
  }
`

it.skipIf(process.env.CI_VERIFY_PARSER_CORPUS !== '1')(
  'observes cancellation only after synchronous work yields in local workerd',
  async () => {
    const worker = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: probe,
        compatibilityDate: '2025-01-01',
      }),
    )
    try {
      const response = await worker.dispatchFetch('http://localhost/')
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        during: false,
        after: true,
        checksum: expect.any(Number),
      })
    } finally {
      await worker.dispose()
    }
  },
  10000,
)
