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
import { readFileSync } from 'node:fs'

const beta = process.argv.includes('--beta')
const seco = process.argv.includes('--dry-run')

// `CLOUDFLARE_ENV` vale **só** para o build. O `wrangler deploy` lê a mesma
// variável como se fosse `--env`, e o config em `dist/` já sai resolvido com o
// nome final — deixar a variável de pé no segundo comando faz o wrangler
// concatenar o sufixo de novo e publicar um `resenha-beta-beta`.
const doBuild = { ...process.env }
if (beta) doBuild.CLOUDFLARE_ENV = 'beta'

const doDeploy = { ...process.env }
delete doDeploy.CLOUDFLARE_ENV

function rodar(comando, args, env) {
  const r = spawnSync(comando, args, { stdio: 'inherit', env, shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

rodar('npx', ['vite', 'build'], doBuild)

// O nome sai do config resolvido, não de uma suposição deste script: se algum
// dia os dois divergirem, o erro aparece aqui e não num Worker órfão.
const config = JSON.parse(readFileSync('dist/resenha/wrangler.json', 'utf8'))
const esperado = beta ? 'resenha-beta' : 'resenha'
if (config.name !== esperado) {
  console.error(`abortado: o build resolveu "${config.name}", e o esperado era "${esperado}"`)
  process.exit(1)
}
console.log(`→ ${config.name}`)

rodar(
  'npx',
  ['wrangler', 'deploy', '-c', 'dist/resenha/wrangler.json', ...(seco ? ['--dry-run'] : [])],
  doDeploy,
)
