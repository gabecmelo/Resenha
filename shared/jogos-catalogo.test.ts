import { describe, expect, it } from 'vitest'
import { CATALOGO_DE_JOGOS, JOGO_PADRAO } from './jogos-catalogo'

describe('CATALOGO_DE_JOGOS', () => {
  it('contém exatamente a entrada quem-sou-eu com id/nome/descricao (`HUB-01`)', () => {
    expect(CATALOGO_DE_JOGOS).toEqual([
      {
        id: 'quem-sou-eu',
        nome: 'Quem Sou Eu?',
        descricao: 'Cada um recebe uma carta que todos veem menos ele.',
      },
    ])
  })

  it('não repete nenhum id (`HUB-14` — registro é aditivo, uma linha por jogo)', () => {
    const ids = CATALOGO_DE_JOGOS.map((jogo) => jogo.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('JOGO_PADRAO', () => {
  it('é quem-sou-eu (`HUB-04` — jogo assumido quando a criação não escolhe nenhum)', () => {
    expect(JOGO_PADRAO).toBe('quem-sou-eu')
  })

  it('existe no catálogo', () => {
    expect(CATALOGO_DE_JOGOS.some((jogo) => jogo.id === JOGO_PADRAO)).toBe(true)
  })
})
