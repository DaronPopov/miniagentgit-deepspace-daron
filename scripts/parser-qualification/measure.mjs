import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { corpus } from './corpus.mjs'

const child = fileURLToPath(new URL('./sample.mjs', import.meta.url))
const rounds = 3
let failures = 0
for (const fixture of corpus) {
  const samples = []
  for (let run = 0; run < rounds; run++) {
    const result = spawnSync(
      process.execPath,
      ['--max-old-space-size=96', child, fixture.name],
      {
        timeout: 3000,
        killSignal: 'SIGKILL',
        maxBuffer: 16384,
        encoding: 'utf8',
        windowsHide: true,
      },
    )
    if (result.status === 0) {
      try {
        const sample = JSON.parse(result.stdout)
        samples.push(
          sample && typeof sample.outcome === 'string'
            ? sample
            : { outcome: 'invalid_output' },
        )
      } catch {
        samples.push({ outcome: 'invalid_output' })
      }
    } else {
      samples.push({
        outcome: result.error?.code === 'ETIMEDOUT' ? 'timeout' : 'terminated',
      })
    }
  }
  if (samples.some((sample) => !fixture.outcomes.includes(sample.outcome)))
    failures++
  process.stdout.write(
    JSON.stringify({
      fixture: fixture.name,
      extension: fixture.extension,
      bytes: Buffer.byteLength(fixture.text),
      expected: fixture.outcomes,
      openingParens: fixture.text.split('(').length - 1,
      samples,
    }) + '\n',
  )
}
process.stderr.write(
  `${corpus.length} fixtures × ${rounds} isolated samples, ${failures} unexpected fixture outcomes\n`,
)
if (failures) process.exitCode = 1
