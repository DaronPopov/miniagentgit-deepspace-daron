// Exercise built routes with local workerd and without platform bindings/secrets.
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { localBrowserIdentity } from './preview-frontend-identity.mjs'

const folders = readdirSync('dist', { withFileTypes: true }).filter(
  (entry) => entry.isDirectory() && entry.name !== 'client',
)
if (folders.length !== 1) throw new Error('Run npm run build first')
const root = resolve('dist', folders[0].name)
const config = JSON.parse(readFileSync(resolve(root, 'wrangler.json'), 'utf8'))
const identity = process.argv.includes('--local-identity')
  ? await localBrowserIdentity()
  : { env: {} }
const worker = new Miniflare(
  convertV4MiniflareOptions({
    name: config.name,
    host: '127.0.0.1',
    port: 0,
    modules: true,
    cf: false,
    rootPath: root,
    scriptPath: resolve(root, config.main),
    compatibilityDate: config.compatibility_date,
    compatibilityFlags: config.compatibility_flags,
    bindings: {
      APP_NAME: config.vars.APP_NAME,
      DEEPSPACE_APP_ID: config.vars.DEEPSPACE_APP_ID,
      ...identity.env,
    },
    outboundService:
      identity.fetch ?? (() => new Response(null, { status: 502 })),
    assets: {
      directory: resolve(root, config.assets.directory),
      binding: config.assets.binding,
      run_worker_first: config.assets.run_worker_first,
      routerConfig: { has_user_worker: true },
      assetConfig: { not_found_handling: config.assets.not_found_handling },
    },
    durableObjects: Object.fromEntries(
      config.durable_objects.bindings.map(({ name, class_name }) => [
        name,
        { className: class_name, useSQLite: true },
      ]),
    ),
  }),
)
process.once('SIGINT', () => void worker.dispose())
process.once('SIGTERM', () => void worker.dispose())
try {
  console.log(String(await worker.ready))
} catch (error) {
  await worker.dispose()
  throw error
}
