// Sobe o Worker.
//
//   node scripts/deploy.mjs            → produção (`resenha`)
//   node scripts/deploy.mjs --beta     → staging  (`resenha-beta`)
//   node scripts/deploy.mjs --dry-run  → monta tudo e não publica
//
// Existe por dois motivos. O primeiro é que o plugin Vite da Cloudflare escolhe
// o ambiente do `wrangler.jsonc` pela variável `CLOUDFLARE_ENV` **na hora do
// build**, e `CLOUDFLARE_ENV=beta npm run build` não funciona no PowerShell.
// O segundo é que o config resolvido em `dist/resenha/wrangler.json` já sai com
// o nome certo do Worker — então o `wrangler deploy` é idêntico nos dois casos,
// e o único lugar onde "beta" existe é aqui.

import { spawnSync } from 'node:child_process'

const beta = process.argv.includes('--beta')
const seco = process.argv.includes('--dry-run')

const ambiente = { ...process.env }
if (beta) ambiente.CLOUDFLARE_ENV = 'beta'

function rodar(comando, args) {
  const r = spawnSync(comando, args, { stdio: 'inherit', env: ambiente, shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log(beta ? '→ beta (resenha-beta)' : '→ produção (resenha)')

rodar('npx', ['vite', 'build'])
rodar('npx', ['wrangler', 'deploy', '-c', 'dist/resenha/wrangler.json', ...(seco ? ['--dry-run'] : [])])
