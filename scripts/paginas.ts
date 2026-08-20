/**
 * As páginas indexáveis de cada jogo (`/espiao`, `/quem-sou-eu`…) e o
 * `sitemap.xml`, montados no build.
 *
 * **Por que arquivo e não rota do app.** O Worker responde 404 para qualquer
 * caminho que não seja um arquivo real, e o fallback de SPA da Cloudflare só
 * entra quando a requisição traz `Sec-Fetch-Mode: navigate`. Navegador manda
 * esse cabeçalho; raspador de link e parte dos rastreadores, não:
 *
 *     curl -H 'Accept: text/html' .../ABCDE                      -> 404
 *     curl -H 'Accept: text/html' -H 'Sec-Fetch-Mode: navigate'   -> 200
 *
 * Arquivo real é servido para qualquer cliente, sempre. Então uma página que
 * precisa ser indexada e ter prévia de link é arquivo, não rota.
 *
 * **Por que plugin do Vite e não script solto.** O texto vive em
 * `shared/jogos-conteudo.ts`, que o app também importa para o "como jogar" do
 * seletor. Sendo plugin, este arquivo importa o mesmo módulo tipado — um script
 * `.mjs` avulso não conseguiria, e a saída seria conteúdo duplicado.
 *
 * Nada aqui entra no bundle do cliente: roda só no build.
 */
import type { Plugin } from 'vite'
import { nomeDoJogo } from '../shared/jogos-catalogo'
import { CONTEUDO_DOS_JOGOS, type ConteudoDoJogo } from '../shared/jogos-conteudo'

/** `&` primeiro, senão ele reescapa o que os outros acabaram de produzir. */
function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/*
 * A direção Bancada em CSS solto: papel sobre a mesa, tinta, esmalte no acento,
 * sombra dura e nunca difusa. É uma cópia dos tokens de `index.css`, não um
 * import — estas páginas ficam fora do bundle de propósito, porque uma página
 * que só precisa ser lida não deve esperar 380 kB de JavaScript para pintar.
 *
 * Sem crase aqui dentro: isto é um template literal.
 */
const ESTILO = `
:root {
  --papel: #efe4d2;
  --superficie: #fbf5e9;
  --tinta: #1b1712;
  --texto-2: #40372c;
  --fraco: #6e6354;
  --linha: #d5c9b4;
  --acento: #c93a22;
  --acento-contraste: #fff3e6;
  --sombra-cor: #1b1712;
}

@media (prefers-color-scheme: dark) {
  :root {
    --papel: #141210;
    --superficie: #211d19;
    --tinta: #f5eddf;
    --texto-2: #d8cdbb;
    --fraco: #9b8f7d;
    --linha: #3a332b;
    --acento: #f2603f;
    --acento-contraste: #1b1712;
    /* Preto, e nao a tinta: no escuro a tinta e creme, e sombra clara vira
       halo em vez de relevo. Mesmo valor de --sombra-cor no index.css. */
    --sombra-cor: #000000;
  }
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--papel);
  color: var(--tinta);
  font-family: 'Archivo', system-ui, -apple-system, sans-serif;
  font-size: 17px;
  line-height: 1.65;
  -webkit-text-size-adjust: 100%;
}

.folha { max-width: 720px; margin: 0 auto; padding: 28px 22px 72px; }

a { color: inherit; }

.marca {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: 'Archivo Black', system-ui, sans-serif;
  font-size: 20px;
  text-decoration: none;
}
.marca svg { width: 24px; height: 24px; display: block; }

nav.trilha {
  margin-top: 26px;
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fraco);
}
nav.trilha a { text-decoration: none; }
nav.trilha a:hover { color: var(--acento); }

h1 {
  font-family: 'Archivo Black', system-ui, sans-serif;
  font-size: clamp(34px, 8vw, 50px);
  line-height: 1.07;
  letter-spacing: -0.015em;
  margin: 12px 0 14px;
}

.resumo { font-size: 20px; line-height: 1.5; color: var(--texto-2); }

/* Pontilhada porque e informativa, nao acionavel. */
.ficha {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 26px;
  margin: 26px 0;
  padding: 15px 18px;
  border: 1.5px dashed var(--linha);
  border-radius: 10px;
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 13.5px;
  color: var(--texto-2);
}
.ficha b { color: var(--fraco); font-weight: 500; }

h2 {
  font-family: 'Archivo Black', system-ui, sans-serif;
  font-size: 26px;
  letter-spacing: -0.01em;
  margin: 42px 0 14px;
}

h3 { font-size: 17.5px; margin-bottom: 3px; }

p + p { margin-top: 13px; }

ol.passos { list-style: none; counter-reset: passo; }
ol.passos li {
  counter-increment: passo;
  position: relative;
  padding-left: 46px;
  margin-top: 22px;
}
ol.passos li::before {
  content: counter(passo);
  position: absolute;
  left: 0;
  top: 1px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--acento);
  color: var(--acento-contraste);
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 15px;
}
ol.passos p { color: var(--texto-2); }

/* Esmalte com sombra dura: o unico botao da pagina. */
.cta { margin: 40px 0 8px; }
.cta a {
  display: inline-block;
  padding: 15px 30px;
  border-radius: 10px;
  background: var(--acento);
  color: var(--acento-contraste);
  font-family: 'Archivo Black', system-ui, sans-serif;
  font-size: 18px;
  text-decoration: none;
  box-shadow: 3px 3px 0 var(--sombra-cor);
}
.cta a:active { transform: translate(3px, 3px); box-shadow: none; }
.cta .abaixo {
  margin-top: 11px;
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 12.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fraco);
}

dl.faq dt { font-weight: 700; margin-top: 24px; }
dl.faq dd { color: var(--texto-2); margin-top: 4px; }

ul.outros { list-style: none; display: grid; gap: 10px; margin-top: 16px; }
ul.outros a {
  display: block;
  padding: 14px 16px;
  border: 1.5px solid var(--linha);
  border-radius: 10px;
  background: var(--superficie);
  text-decoration: none;
}
ul.outros a:hover { border-color: var(--acento); }
ul.outros b { display: block; font-size: 16.5px; }
ul.outros span { color: var(--fraco); font-size: 14.5px; }

footer {
  margin-top: 56px;
  padding-top: 20px;
  border-top: 1.5px solid var(--linha);
  font-size: 14.5px;
  color: var(--fraco);
}
`

/** O `LogoResenha` do app, com o contorno resolvido para `currentColor`. */
const LOGO =
  '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
  '<rect x="21" y="13" width="29" height="37" rx="4" fill="var(--acento)" transform="rotate(9 35 31)"/>' +
  '<rect x="13.5" y="16.5" width="28" height="36" rx="4" fill="var(--superficie)" stroke="currentColor" stroke-width="3.5" transform="rotate(-8 27 34)"/>' +
  '</svg>'

function dadosEstruturados(conteudo: ConteudoDoJogo, origem: string): string {
  const nome = nomeDoJogo(conteudo.jogoId)
  const url = `${origem}/${conteudo.slug}`

  const blocos: unknown[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: `${nome} — Resenha`,
      url,
      description: conteudo.descricao,
      inLanguage: 'pt-BR',
      gamePlatform: 'Navegador de internet',
      playMode: 'MultiPlayer',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Qualquer sistema com navegador',
      image: `${origem}/og.png`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      publisher: {
        '@type': 'Organization',
        name: 'Resenha',
        url: `${origem}/`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: conteudo.faq.map((item) => ({
        '@type': 'Question',
        name: item.pergunta,
        acceptedAnswer: { '@type': 'Answer', text: item.resposta },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Resenha',
          item: `${origem}/`,
        },
        { '@type': 'ListItem', position: 2, name: nome, item: url },
      ],
    },
  ]

  // `</script>` dentro do JSON fecha a tag mais cedo e quebra a página.
  return blocos
    .map(
      (bloco) =>
        `<script type="application/ld+json">${JSON.stringify(bloco).replaceAll('</', '<\\/')}</script>`,
    )
    .join('\n    ')
}

export function paginaDoJogo(conteudo: ConteudoDoJogo, origem: string): string {
  const nome = nomeDoJogo(conteudo.jogoId)
  const url = `${origem}/${conteudo.slug}`
  const outros = CONTEUDO_DOS_JOGOS.filter((outro) => outro.slug !== conteudo.slug)

  const passos = conteudo.passos
    .map(
      (passo) =>
        `          <li>\n            <h3>${escapar(passo.titulo)}</h3>\n            <p>${escapar(passo.texto)}</p>\n          </li>`,
    )
    .join('\n')

  const faq = conteudo.faq
    .map(
      (item) =>
        `          <dt>${escapar(item.pergunta)}</dt>\n          <dd>${escapar(item.resposta)}</dd>`,
    )
    .join('\n')

  const lista = outros
    .map(
      (outro) =>
        `          <li><a href="/${outro.slug}"><b>${escapar(nomeDoJogo(outro.jogoId))}</b><span>${escapar(outro.resumo)}</span></a></li>`,
    )
    .join('\n')

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapar(conteudo.titulo)} | Resenha</title>
    <meta name="description" content="${escapar(conteudo.descricao)}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#EFE4D2" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141210" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Resenha" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapar(conteudo.titulo)}" />
    <meta property="og:description" content="${escapar(conteudo.descricao)}" />
    <meta property="og:image" content="${origem}/og.png?v=1" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${origem}/og.png?v=1" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;700&family=DM+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <style>${ESTILO}</style>

    ${dadosEstruturados(conteudo, origem)}
  </head>
  <body>
    <div class="folha">
      <header>
        <a class="marca" href="/">${LOGO}<span>resenha</span></a>
        <nav class="trilha" aria-label="Você está em">
          <a href="/">Resenha</a> › ${escapar(nome)}
        </nav>
      </header>

      <main>
        <h1>${escapar(conteudo.h1)}</h1>
        <p class="resumo">${escapar(conteudo.resumo)}</p>

        <div class="ficha">
          <span><b>Jogadores:</b> ${escapar(conteudo.jogadores)}</span>
          <span><b>Duração:</b> ${escapar(conteudo.duracao)}</span>
          <span><b>Preço:</b> Grátis</span>
        </div>

        <p>${escapar(conteudo.abertura)}</p>
        <p>${escapar(conteudo.contexto)}</p>

        <div class="cta">
          <a href="/?jogo=${conteudo.jogoId}">Abrir uma sala de ${escapar(nome)}</a>
          <p class="abaixo">sem cadastro · sem instalar nada</p>
        </div>

        <h2>Como jogar</h2>
        <ol class="passos">
${passos}
        </ol>

        <h2>Perguntas frequentes</h2>
        <dl class="faq">
${faq}
        </dl>

        <h2>Os outros jogos da mesa</h2>
        <ul class="outros">
${lista}
        </ul>

        <div class="cta">
          <a href="/?jogo=${conteudo.jogoId}">Jogar ${escapar(nome)}</a>
          <p class="abaixo">crie a sala e mande o código de 5 letras</p>
        </div>
      </main>

      <footer>
        <p>
          <a href="/">Resenha</a> — party games no navegador, de graça, sem cadastro e sem
          anúncio.
        </p>
      </footer>
    </div>
  </body>
</html>
`
}

export function sitemap(origem: string, hoje: string): string {
  const enderecos = [{ loc: `${origem}/`, prioridade: '1.0' }].concat(
    CONTEUDO_DOS_JOGOS.map((conteudo) => ({
      loc: `${origem}/${conteudo.slug}`,
      prioridade: '0.8',
    })),
  )

  const corpo = enderecos
    .map(
      (endereco) =>
        `  <url>\n    <loc>${endereco.loc}</loc>\n    <lastmod>${hoje}</lastmod>\n    <priority>${endereco.prioridade}</priority>\n  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>\n`
}

/**
 * Emite as páginas no build e as serve no `vite dev`, para que dê para
 * conferir o texto sem publicar.
 */
export function paginasDeJogo(origem: string): Plugin {
  const hoje = (): string => new Date().toISOString().slice(0, 10)

  return {
    name: 'paginas-de-jogo',

    generateBundle() {
      for (const conteudo of CONTEUDO_DOS_JOGOS) {
        this.emitFile({
          type: 'asset',
          fileName: `${conteudo.slug}.html`,
          source: paginaDoJogo(conteudo, origem),
        })
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemap(origem, hoje()),
      })
    },

    configureServer(servidor) {
      servidor.middlewares.use((requisicao, resposta, seguir) => {
        const caminho = (requisicao.url ?? '').split('?')[0]?.replace(/^\//, '') ?? ''

        if (caminho === 'sitemap.xml') {
          resposta.setHeader('Content-Type', 'application/xml; charset=utf-8')
          resposta.end(sitemap(origem, hoje()))
          return
        }

        const conteudo = CONTEUDO_DOS_JOGOS.find(
          (candidato) => caminho === candidato.slug || caminho === `${candidato.slug}.html`,
        )
        if (conteudo === undefined) {
          seguir()
          return
        }

        resposta.setHeader('Content-Type', 'text/html; charset=utf-8')
        resposta.end(paginaDoJogo(conteudo, origem))
      })
    },
  }
}
