import { describe, expect, it } from 'vitest'
import { CATALOGO_DE_JOGOS, JOGO_PADRAO } from './jogos-catalogo'

describe('CATALOGO_DE_JOGOS', () => {
  it('contém exatamente as entradas quem-sou-eu e espiao com id/nome/descricao/minJogadores (`HUB-01`)', () => {
    expect(CATALOGO_DE_JOGOS).toEqual([
      {
        id: 'quem-sou-eu',
        nome: 'Quem Sou Eu?',
        descricao: 'Cada um recebe uma carta que todos veem menos ele.',
        minJogadores: 2,
      },
      {
        id: 'espiao',
        nome: 'Espião',
        descricao: 'Um local secreto é sorteado; só o espião não sabe qual é.',
        minJogadores: 3,
      },
    ])
  })

  it('não repete nenhum id (`HUB-14` — registro é aditivo, uma linha por jogo)', () => {
    const ids = CATALOGO_DE_JOGOS.map((jogo) => jogo.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo jogo declara minJogadores presente e positivo', () => {
    expect(CATALOGO_DE_JOGOS.every((jogo) => jogo.minJogadores > 0)).toBe(true)
  })

  it('quem-sou-eu exige 2 jogadores', () => {
    const jogo = CATALOGO_DE_JOGOS.find((j) => j.id === 'quem-sou-eu')
    expect(jogo?.minJogadores).toBe(2)
  })

  it('espiao exige 3 jogadores', () => {
    const jogo = CATALOGO_DE_JOGOS.find((j) => j.id === 'espiao')
    expect(jogo?.minJogadores).toBe(3)
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
