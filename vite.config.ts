import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'client',
  server: { host: true },
  build: { outDir: '../dist', emptyOutDir: true },
  // `CLOUDFLARE_ENV` é o mesmo sinal que faz o plugin escolher `env.beta` do
  // `wrangler.jsonc` — reaproveitado aqui pra que o bundle saiba de si mesmo e
  // carimbe a tela. Ver `client/src/componentes/SeloDeBeta.tsx`.
  define: { __BETA__: JSON.stringify(process.env.CLOUDFLARE_ENV === 'beta') },
  plugins: [
    react(),
    tailwindcss(),
    // `root` é `client/`, então o config do Worker precisa ser apontado
    // explicitamente — a autodetecção do plugin procura só na raiz do Vite.
    cloudflare({ configPath: '../wrangler.jsonc' }),
  ],
})
