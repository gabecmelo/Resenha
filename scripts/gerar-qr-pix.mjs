/**
 * Desenha o QR do Pix uma vez, em tempo de build, e grava o resultado como
 * componente.
 *
 * O payload é uma constante — nunca muda entre uma visita e outra —, então
 * carregar um gerador de QR no navegador seria pagar quilobytes toda vez para
 * recalcular sempre a mesma figura. Aqui o custo é do repositório: sai um
 * `<path>` de poucos KB e nenhuma dependência de runtime.
 *
 * Rode `npm run qr:pix` depois de mexer em `PIX_PAYLOAD`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcode from 'qrcode-generator'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const origem = resolve(raiz, 'client/src/apoio.ts')
const destino = resolve(raiz, 'client/src/componentes/QrDoPix.tsx')

const payload = extrairPayload(readFileSync(origem, 'utf8'))

/*
 * Correção 'M' (~15%): o suficiente para ler a tela de um monitor com reflexo,
 * sem inflar a matriz a ponto de o QR ficar denso demais no celular.
 */
const qr = qrcode(0, 'M')
qr.addData(payload, 'Byte')
qr.make()

const modulos = qr.getModuleCount()

/*
 * Um retângulo por sequência horizontal, não um quadradinho por módulo: são
 * ~1200 módulos escuros contra ~300 sequências, e o `<path>` encolhe na mesma
 * proporção. `crispEdges` no SVG garante que as emendas não vazem luz.
 */
const partes = []
for (let linha = 0; linha < modulos; linha += 1) {
  let coluna = 0
  while (coluna < modulos) {
    if (!qr.isDark(linha, coluna)) {
      coluna += 1
      continue
    }
    let fim = coluna
    while (fim + 1 < modulos && qr.isDark(linha, fim + 1)) fim += 1
    const largura = fim - coluna + 1
    partes.push(`M${coluna} ${linha}h${largura}v1h-${largura}z`)
    coluna = fim + 1
  }
}
const caminho = partes.join('')

conferir(caminho)

writeFileSync(
  destino,
  `// GERADO POR scripts/gerar-qr-pix.mjs — NÃO EDITE À MÃO.
// Rode \`npm run qr:pix\` depois de mexer em PIX_PAYLOAD.

/**
 * O BR Code do Pix já desenhado. Vem de um payload estático, então a figura é
 * estática também: é um \`<path>\` só, sem biblioteca de QR no bundle.
 *
 * Pinta em \`currentColor\` e não dimensiona nada: quem usa decide a tinta e o
 * tamanho. Câmera espera escuro sobre claro, então quem chama é responsável por
 * dar contraste nessa ordem — ver \`ModalDeApoio\`.
 */
export function QrDoPix({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 ${modulos} ${modulos}"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR Code do Pix para doação"
      className={className}
    >
      <path fill="currentColor" d="${caminho}" />
    </svg>
  )
}

/** Lado da matriz, em módulos. Serve para dimensionar a moldura sem chutar. */
export const QR_MODULOS = ${modulos}
`,
  'utf8',
)

console.log(`QR do Pix gerado: ${modulos}×${modulos} módulos em ${partes.length} retângulos`)
console.log(`→ ${destino}`)

/**
 * Remonta a matriz a partir do `<path>` emitido e compara com o gerador.
 *
 * A compactação por sequência é código meu, não da biblioteca: um erro de um
 * módulo aqui produz um QR que parece certo e não lê. Barato conferir.
 */
function conferir(d) {
  const lido = Array.from({ length: modulos }, () => new Array(modulos).fill(false))
  for (const [, x, y, largura] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(largura); i += 1) lido[Number(y)][Number(x) + i] = true
  }
  for (let linha = 0; linha < modulos; linha += 1) {
    for (let coluna = 0; coluna < modulos; coluna += 1) {
      if (lido[linha][coluna] !== qr.isDark(linha, coluna)) {
        throw new Error(`o caminho não bate com o QR em (${linha}, ${coluna})`)
      }
    }
  }
}

/** Lê a constante direto da fonte, para o QR nunca discordar do que a tela copia. */
function extrairPayload(fonte) {
  const achado = /export const PIX_PAYLOAD =\s*'([^']+)'/.exec(fonte)
  if (achado === null) throw new Error('não achei PIX_PAYLOAD em client/src/apoio.ts')
  return achado[1]
}
