import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import type { V4MiniflareOptions } from 'miniflare'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { AuthEnvironment } from '../src/server/deepspace/auth'

/** Actual bundled server worker + workerd SQLite DOs; no Vite/frontend or deploy. */
export async function workerFixture(env: AuthEnvironment, jobs = false) {
  const appId = readFileSync(resolve('wrangler.toml'), 'utf8').match(
    /^DEEPSPACE_APP_ID = "([^"]+)"/m,
  )?.[1]
  if (!appId) throw new Error('Missing assigned public app ID in local fixture')
  const directory = mkdtempSync(join(tmpdir(), 'miniagentgit-workerd-'))
  const scriptPath = join(directory, 'worker.mjs')
  await build({
    entryPoints: [resolve('worker.ts')],
    outfile: scriptPath,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    conditions: ['workerd', 'worker', 'browser'],
    external: ['cloudflare:*', 'node:*'],
    mainFields: ['module', 'main'],
  })
  const options: V4MiniflareOptions = {
    name: 'miniagentgit-local',
    modules: true,
    rootPath: directory,
    scriptPath,
    compatibilityDate: '2025-01-01',
    compatibilityFlags: ['nodejs_compat'],
    cf: false,
    unsafeInspectDurableObjects: true,
    bindings: {
      APP_NAME: 'MiniAgentGit',
      // Use the assigned public ID, never a fabricated deployment identity.
      DEEPSPACE_APP_ID: appId,
      ...env,
    },
    durableObjects: {
      REPOSITORY_ROOMS: { className: 'RepositoryRoom', useSQLite: true },
      ...(jobs
        ? { JOB_ROOMS: { className: 'AppJobRoom', useSQLite: true } }
        : {}),
    },
    resourcePersistencePath: join(directory, 'objects'),
  }
  let worker = new Miniflare(convertV4MiniflareOptions(options))
  return {
    fetch: (path: string, init?: Parameters<Miniflare['dispatchFetch']>[1]) =>
      worker.dispatchFetch(`http://localhost${path}`, init),
    fetchUrl: (url: string, init?: Parameters<Miniflare['dispatchFetch']>[1]) =>
      worker.dispatchFetch(url, init),
    storage: (name: string) =>
      worker.unsafeGetDurableObjectStorage(
        'miniagentgit-local',
        'RepositoryRoom',
        { name },
      ),
    namespace: () => worker.getDurableObjectNamespace('REPOSITORY_ROOMS'),
    restart: async () => {
      await worker.dispose()
      worker = new Miniflare(convertV4MiniflareOptions(options))
    },
    close: async () => {
      await worker.dispose()
      rmSync(directory, { recursive: true, force: true })
    },
  }
}
