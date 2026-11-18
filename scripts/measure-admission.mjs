// Sequential loopback dispatch measurement for two official Vite builds.
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { identityFixture } from '../tests/identity-fixture.ts'

const builds = process.argv.slice(2)
if (builds.length !== 2)
  throw new Error('Supply two built checkout directories')
const signer = await identityFixture()
const headers = { authorization: 'Bearer ' + (await signer.token()) }

for (const checkout of builds) {
  const dist = resolve(checkout, 'dist')
  const names = readdirSync(dist, { withFileTypes: true }).filter(
    (dir) => dir.isDirectory() && dir.name !== 'client',
  )
  if (names.length !== 1) throw new Error('Expected one built Worker directory')
  const root = resolve(dist, names[0].name)
  const config = JSON.parse(
    readFileSync(resolve(root, 'wrangler.json'), 'utf8'),
  )
  const directory = mkdtempSync(join(tmpdir(), 'miniagentgit-benchmark-'))
  const worker = new Miniflare(
    convertV4MiniflareOptions({
      name: config.name,
      modules: true,
      rootPath: root,
      scriptPath: resolve(root, config.main),
      compatibilityDate: config.compatibility_date,
      compatibilityFlags: config.compatibility_flags,
      cf: false,
      bindings: {
        ...signer.env,
        MINIGIT_TRUSTED_SUBJECTS: 'owner',
        APP_NAME: config.vars.APP_NAME,
        DEEPSPACE_APP_ID: config.vars.DEEPSPACE_APP_ID,
      },
      durableObjects: {
        REPOSITORY_ROOMS: { className: 'RepositoryRoom', useSQLite: true },
      },
      resourcePersistencePath: directory,
    }),
  )
  const samples = []
  let total
  try {
    let start = 0
    for (let i = 0; i < 23; i++) {
      if (i === 3) start = performance.now()
      const before = performance.now()
      const response = await worker.dispatchFetch('http://localhost/api/me', {
        headers,
      })
      if (response.status !== 200)
        throw new Error('Benchmark identity request rejected')
      await response.arrayBuffer()
      if (i >= 3) samples.push(performance.now() - before)
    }
    total = performance.now() - start
  } finally {
    await worker.dispose()
    const files = readdirSync(directory, {
      recursive: true,
      withFileTypes: true,
    }).filter((file) => file.isFile())
    const durableFileBytes = files.reduce(
      (sum, file) => sum + statSync(join(file.parentPath, file.name)).size,
      0,
    )
    rmSync(directory, { recursive: true, force: true })
    if (total !== undefined) {
      samples.sort((a, b) => a - b)
      console.log(
        JSON.stringify({
          samples: samples.length,
          p50Ms: samples[9],
          p95Ms: samples[18],
          elapsedMs: total,
          sequentialPerSecond: 20_000 / total,
          durableFileBytes,
        }),
      )
    }
  }
}
