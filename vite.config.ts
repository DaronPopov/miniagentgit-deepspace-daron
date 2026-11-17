import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import generouted from '@generouted/react-router/plugin'
import { cloudflare } from '@cloudflare/vite-plugin'
import { deepspaceBuild } from 'deepspace/build'

export default defineConfig({
  plugins: [
    react(),
    generouted(),
    cloudflare({ inspectorPort: false }),
    deepspaceBuild({ appDir: fileURLToPath(new URL('.', import.meta.url)) }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  optimizeDeps: { entries: ['./index.html', './src/pages/**/*.tsx'] },
})
