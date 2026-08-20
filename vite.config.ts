import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * `CLOUDFLARE_ENV` é o mesmo sinal que faz o plugin escolher `env.beta` do
 * `wrangler.jsonc` — reaproveitado aqui pra que o bundle saiba de si mesmo e
 * carimbe a tela. Ver `client/src/componentes/SeloDeBeta.tsx`.
 *
 * Lido por `globalThis` porque este projeto não carrega `@types/node`: escrever
 * `process.env` direto compila só onde o tipo aparece por acidente de
 * resolução, e quebra no CI, que instala do zero.
 */
function ambienteDoBuild(): string | undefined {
  const nodeish = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return nodeish.process?.env?.CLOUDFLARE_ENV
}

export default defineConfig({
  root: 'client',
  server: { host: true },
  build: { outDir: '../dist', emptyOutDir: true },
  define: { __BETA__: JSON.stringify(ambienteDoBuild() === 'beta') },
  plugins: [
    react(),
    tailwindcss(),
    // `root` é `client/`, então o config do Worker precisa ser apontado
    // explicitamente — a autodetecção do plugin procura só na raiz do Vite.
    cloudflare({ configPath: '../wrangler.jsonc' }),
  ],
})
