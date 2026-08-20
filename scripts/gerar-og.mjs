/**
 * Rasteriza `scripts/og-card.html` em `client/public/og.png`, 1200×630.
 *
 * A miniatura de link tem que ser bitmap: WhatsApp e Discord não leem SVG em
 * `og:image`. Mas manter o desenho em HTML é o que faz o cartão envelhecer
 * junto com o produto — mesmas fontes, mesma paleta, mesmo idioma visual. O
 * navegador que já está na máquina faz a conversão.
 *
 * Rode `npm run og` depois de mexer no cartão.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cartao = resolve(raiz, 'scripts/og-card.html')
const destino = resolve(raiz, 'client/public/og.png')

/** Onde o Chrome e o Edge costumam morar no Windows, em ordem de preferência. */
const CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

const navegador = CANDIDATOS.find((caminho) => caminho !== undefined && existsSync(caminho))
if (navegador === undefined) {
  console.error('Não achei Chrome nem Edge. Aponte um com CHROME_PATH=/caminho/do/chrome.exe')
  process.exit(1)
}

mkdirSync(dirname(destino), { recursive: true })

/*
 * O `--screenshot` do Chrome grava no diretório de trabalho com o nome que for
 * passado; gerar num temporário e mover evita deixar lixo na raiz se algo falhar
 * no meio. `--virtual-time-budget` dá tempo das fontes do Google chegarem — sem
 * ele o cartão sai renderizado na fonte de sistema.
 */
const temporario = resolve(raiz, '.og-temp.png')
rmSync(temporario, { force: true })

try {
  execFileSync(
    navegador,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      '--virtual-time-budget=8000',
      `--screenshot=${temporario}`,
      pathToFileURL(cartao).href,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
} catch (erro) {
  console.error('O navegador falhou ao rasterizar:', erro.message)
  process.exit(1)
}

if (!existsSync(temporario)) {
  console.error('O navegador rodou mas não gravou imagem nenhuma.')
  process.exit(1)
}

renameSync(temporario, destino)

const kb = Math.round(statSync(destino).size / 1024)
console.log(`og.png gerado com ${navegador.split(/[/\\]/).at(-1)}: ${kb} KB`)
console.log(`→ ${destino}`)

// Acima de ~300 KB o WhatsApp começa a recusar a prévia em conexão ruim.
if (kb > 300) console.warn('⚠  Passou de 300 KB — o WhatsApp pode não mostrar a prévia.')
