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

/**
 * A prévia de link exige URL absoluta: `og:image` relativo é ignorado por
 * WhatsApp, Discord e afins. Só que "absoluta" e "um endereço fixo no HTML" não
 * são a mesma coisa — carimbar produção no bundle do beta faz o beta anunciar
 * uma imagem que mora noutro host, e enquanto os dois não estiverem no ar com o
 * mesmo arquivo a prévia do beta vem sem miniatura.
 *
 * Então a origem entra no HTML no build, junto do resto que já depende de
 * `CLOUDFLARE_ENV`: cada deploy anuncia o próprio endereço, e o cartão que
 * aparece é sempre o que aquele deploy realmente serve.
 */
function origemDoBuild(): string {
  return ambienteDoBuild() === 'beta' ? 'https://beta.resenha.dev.br' : 'https://resenha.dev.br'
}

const carimbarOrigem = {
  name: 'carimbar-origem',
  transformIndexHtml(html: string): string {
    return html.replaceAll('%ORIGEM%', origemDoBuild())
  },
}

export default defineConfig({
  root: 'client',
  server: { host: true },
  build: { outDir: '../dist', emptyOutDir: true },
  define: { __BETA__: JSON.stringify(ambienteDoBuild() === 'beta') },
  plugins: [
    carimbarOrigem,
    react(),
    tailwindcss(),
    // `root` é `client/`, então o config do Worker precisa ser apontado
    // explicitamente — a autodetecção do plugin procura só na raiz do Vite.
    cloudflare({ configPath: '../wrangler.jsonc' }),
  ],
})
