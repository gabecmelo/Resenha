import { describe, expect, it } from 'vitest'
import { codigoDoCaminho, paginaDeConvite } from './convite'

describe('codigoDoCaminho', () => {
  it('reconhece o caminho de uma sala', () => {
    expect(codigoDoCaminho('/HFXAJ')).toBe('HFXAJ')
    expect(codigoDoCaminho('/HFXAJ/')).toBe('HFXAJ')
    expect(codigoDoCaminho('/hfxaj')).toBe('HFXAJ')
  })

  it('não confunde as páginas dos jogos com sala', () => {
    // Se alguma virasse código, o convite sequestraria a página do jogo.
    for (const slug of ['/espiao', '/quem-sou-eu', '/cartas-contra-a-turma', '/enigmas-sinistros']) {
      expect(codigoDoCaminho(slug)).toBeNull()
    }
  })

  it('recusa o que não tem cara de código', () => {
    for (const caminho of ['/', '', '/ABCDEF', '/ABCD', '/AB1CD', '/HFXAJ/extra', '/api/salas']) {
      expect(codigoDoCaminho(caminho)).toBeNull()
    }
  })

  it('recusa I e O, que a sala nunca sorteia', () => {
    expect(codigoDoCaminho('/HFXAI')).toBeNull()
    expect(codigoDoCaminho('/HFXAO')).toBeNull()
  })
})

describe('paginaDeConvite', () => {
  const html = paginaDeConvite('HFXAJ', 'https://beta.resenha.dev.br')

  it('leva as meta tags que o raspador de link lê', () => {
    expect(html).toContain('<meta property="og:title" content="Te chamaram pra jogar — sala HFXAJ"')
    expect(html).toContain('<meta property="og:image" content="https://beta.resenha.dev.br/og.png?v=1"')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"')
  })

  it('usa a origem de quem pediu, e não a de produção', () => {
    // Sem isto o beta apontaria pra uma imagem do domínio errado, que foi o
    // que já derrubou a thumb uma vez.
    expect(html).not.toContain('https://resenha.dev.br/og.png')
    expect(html).toContain('<meta property="og:url" content="https://beta.resenha.dev.br/HFXAJ"')
  })

  it('não vai pro índice do Google: sala é efêmera', () => {
    expect(html).toContain('<meta name="robots" content="noindex"')
  })

  it('deixa um caminho de verdade pra quem cair aqui de navegador', () => {
    expect(html).toContain('href="https://beta.resenha.dev.br/?sala=HFXAJ"')
  })
})
