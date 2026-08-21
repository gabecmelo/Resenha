import { describe, expect, it } from 'vitest'
import { CATALOGO_DE_JOGOS } from './jogos-catalogo'
import { CONTEUDO_DOS_JOGOS, CONTEUDO_DO_PASSA_E_JOGA } from './jogos-conteudo'

/**
 * Todos os endereços indexáveis do site, num lugar só: os dos jogos e o do
 * modo. É sobre eles que valem os invariantes de baixo.
 */
const SLUGS = [...CONTEUDO_DOS_JOGOS.map((conteudo) => conteudo.slug), CONTEUDO_DO_PASSA_E_JOGA.slug]

describe('as páginas indexáveis', () => {
  /*
    `/ABCDE` é código de sala, e a Cloudflare serve arquivo antes de chamar o
    Worker: um slug de 5 letras sombrearia uma sala de verdade, e o link que o
    host mandou no grupo abriria a página errada. É um erro que só apareceria em
    produção, na primeira sala azarada — por isso ele é cobrado aqui.
  */
  it('nunca têm 5 letras, pra não sombrear um código de sala', () => {
    for (const slug of SLUGS) {
      expect(slug.length).not.toBe(5)
    }
  })

  it('não repetem endereço entre si', () => {
    expect(new Set(SLUGS).size).toBe(SLUGS.length)
  })

  /** `PJ-05` — o modo tem endereço próprio, e ele não é o de jogo nenhum. */
  it('dão ao Passa e Joga um endereço que não é de nenhum jogo', () => {
    expect(CONTEUDO_DO_PASSA_E_JOGA.slug).toBe('passa-e-joga')
    expect(CATALOGO_DE_JOGOS.map((jogo) => jogo.id)).not.toContain(CONTEUDO_DO_PASSA_E_JOGA.slug)
  })
})
