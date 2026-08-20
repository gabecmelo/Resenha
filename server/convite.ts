import { normalizarCodigo } from './core/codigo'

/**
 * O cartão de convite que o raspador de link lê.
 *
 * Existe por causa de um detalhe do roteamento de assets da Cloudflare: o
 * `not_found_handling: "single-page-application"` só devolve o `index.html`
 * quando a requisição é de **navegação** (`Sec-Fetch-Mode: navigate`). Quem
 * cola `resenha.dev.br/HFXAJ` no grupo manda o WhatsApp, o Discord ou o
 * Telegram buscarem aquela URL — e nenhum deles manda esse cabeçalho. Eles
 * recebiam o 404 em texto puro do Worker, e por isso o link ia seco.
 *
 * Quem chega de navegador não passa por aqui: a navegação é atendida pelos
 * assets antes do Worker, e o app abre normalmente. Ainda assim a página traz
 * um link de verdade — se algum cliente antigo não mandar o cabeçalho, a
 * pessoa entra na sala pelo botão em vez de encarar uma tela morta.
 *
 * O convite não diz qual jogo é, de propósito: descobrir isso exigiria acordar
 * o Durable Object da sala a cada raspagem, inclusive nas de código que não
 * existe.
 */
export function paginaDeConvite(codigo: string, origem: string): string {
  const titulo = `Te chamaram pra jogar — sala ${codigo}`
  const descricao =
    'Party games no navegador. Sem baixar nada e sem cadastro: entre com o código e comece.'
  const imagem = `${origem}/og.png?v=1`

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titulo}</title>
<meta name="description" content="${descricao}" />
<link rel="canonical" href="${origem}/${codigo}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Resenha" />
<meta property="og:title" content="${titulo}" />
<meta property="og:description" content="${descricao}" />
<meta property="og:image" content="${imagem}" />
<meta property="og:url" content="${origem}/${codigo}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${titulo}" />
<meta name="twitter:description" content="${descricao}" />
<meta name="twitter:image" content="${imagem}" />
<meta name="robots" content="noindex" />
</head>
<body>
<h1>${titulo}</h1>
<p>${descricao}</p>
<p><a href="${origem}/?sala=${codigo}">Entrar na sala ${codigo}</a></p>
</body>
</html>
`
}

/**
 * `SALA-08` — o caminho de uma sala é o código e nada mais, então qualquer
 * segmento único com a cara de um código é candidato a convite.
 */
export function codigoDoCaminho(pathname: string): string | null {
  const bruto = pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  if (bruto === '' || bruto.includes('/')) return null
  const codigo = normalizarCodigo(decodeURIComponent(bruto))
  return codigo.ok ? codigo.valor : null
}
