import { createRequire } from 'node:module'
import { resolve } from 'node:path'

// Local client fixture only: no SDK config, production gate changes or disk output.
// Resolve from cwd so the same script can measure a clean historical worktree.
const { build } = createRequire(resolve('package.json'))('esbuild')
const result = await build({
  stdin: {
    contents: `import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import Home from './src/pages/index.tsx';
import './src/styles.css';
createRoot(document.getElementById('root')).render(createElement(Home));`,
    resolveDir: process.cwd(),
    sourcefile: 'smoke.tsx',
    loader: 'tsx',
  },
  outdir: 'public-bundle-measurement',
  entryNames: 'app',
  write: false,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
})
console.log(
  JSON.stringify(
    {
      description:
        'Minified uncompressed client fixture; not production Vite output',
      outputs: Object.entries(result.metafile.outputs).map(
        ([path, output]) => ({
          file: path.split('/').at(-1),
          bytes: output.bytes,
        }),
      ),
      warnings: result.warnings.length,
    },
    null,
    2,
  ),
)
