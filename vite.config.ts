import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'client',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [
    react(),
    tailwindcss(),
    // `root` é `client/`, então o config do Worker precisa ser apontado
    // explicitamente — a autodetecção do plugin procura só na raiz do Vite.
    cloudflare({ configPath: '../wrangler.jsonc' }),
  ],
})
