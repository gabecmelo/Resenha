import { describe, expect, it } from 'vitest'
import { CATALOGO_DE_JOGOS, JOGO_PADRAO, jogosJogaveis } from './jogos-catalogo'

describe('CATALOGO_DE_JOGOS', () => {
  it('lista os jogos do hub, cada um com nome, descrição e mínimo próprios (`HUB-01`)', () => {
    expect(CATALOGO_DE_JOGOS.map((jogo) => jogo.id)).toEqual([
      'quem-sou-eu',
      'espiao',
      'cartas-contra-a-turma',
      'enigmas-sinistros',
      'dedo-na-cara',
    ])
    for (const jogo of CATALOGO_DE_JOGOS) {
      expect(jogo.nome.length).toBeGreaterThan(0)
      expect(jogo.descricao.length).toBeGreaterThan(0)
    }
  })

  // O catálogo pode anunciar mais do que o servidor aceita: um jogo marcado
  // `emBreve` existe como promessa na tela e não está em `REGISTRO_DE_JOGOS`.
  // Deixar um deles escapar pro seletor criaria uma sala que o servidor recusa
  // depois — hoje todos são jogáveis, e é este teste que segura o próximo.
  it('mantém os jogos "em breve" fora dos jogáveis', () => {
    const jogaveis = jogosJogaveis().map((jogo) => jogo.id)
    expect(jogaveis).toEqual([
      'quem-sou-eu',
      'espiao',
      'cartas-contra-a-turma',
      'enigmas-sinistros',
      'dedo-na-cara',
    ])
    const emBreve = CATALOGO_DE_JOGOS.filter((jogo) => jogo.emBreve === true).map((jogo) => jogo.id)
    expect(emBreve).toEqual([])
    for (const id of emBreve) expect(jogaveis).not.toContain(id)
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
