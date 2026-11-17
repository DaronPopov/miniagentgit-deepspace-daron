import { parse } from '@babel/parser'
import { performance } from 'node:perf_hooks'
import { corpus } from './corpus.mjs'

const fixture = corpus.find((item) => item.name === process.argv[2])
if (!fixture) process.exit(2)
const { text, extension } = fixture
const plugins = []
if (extension === '.ts' || extension === '.tsx')
  plugins.push(['typescript', { disallowAmbiguousJSXLike: false }])
if (extension === '.jsx' || extension === '.tsx') plugins.push('jsx')

function measure(callback) {
  const heapStart = process.memoryUsage().heapUsed
  const cpu = process.cpuUsage()
  const start = performance.now()
  let outcome = 'parsed'
  let parsed
  try {
    parsed = callback()
  } catch (error) {
    outcome =
      error instanceof RangeError
        ? 'recursion'
        : error instanceof SyntaxError
          ? 'syntax'
          : 'exception'
  }
  const wallMs = performance.now() - start
  const elapsedCpu = process.cpuUsage(cpu)
  const memory = process.memoryUsage()
  const peakRssKiB = process.resourceUsage().maxRSS
  // Keep the parsed result live through the heap sample.
  if (parsed === undefined && outcome === 'parsed')
    throw new Error('Missing parse result')
  return {
    outcome,
    wallMs,
    cpuMs: (elapsedCpu.user + elapsedCpu.system) / 1000,
    heapDeltaBytes: memory.heapUsed - heapStart,
    peakRssKiB,
  }
}

const options = {
  sourceType: 'module',
  plugins,
  attachComment: false,
  createImportExpressions: true,
}
const result = measure(() =>
  extension === '.json' ? JSON.parse(text) : parse(text, options),
)
// This second parse runs after all time and memory samples.
let tokens
if (result.outcome === 'parsed' && extension !== '.json') {
  try {
    tokens = parse(text, { ...options, tokens: true }).tokens.length - 1
  } catch {
    // Token reporting is optional and never changes the production-mode sample.
  }
}
process.stdout.write(JSON.stringify({ ...result, tokens }))
