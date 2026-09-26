import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const sharedSource = fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))

export default defineConfig({
    plugins: [react()],
    resolve: {
        // Use the shared package from source: no build step needed for the UI.
        alias: { '@wae/shared': sharedSource },
    },
    server: { port: 5174, strictPort: true },
    preview: { port: 5174, strictPort: true },
})
