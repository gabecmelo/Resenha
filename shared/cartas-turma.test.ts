import { describe, expect, it } from 'vitest'
import { CARTAS_TURMA } from './cartas-turma-dados'
import { montarBaralho } from './cartas-turma'

describe('CARTAS_TURMA — conteúdo dos pacotes', () => {
  it('CCT-31: oferece ao menos um pacote leve e um pesado', () => {
    const tons = CARTAS_TURMA.map((p) => p.tom)
    expect(tons).toContain('leve')
    expect(tons).toContain('pesado')
  })

  it('todo pacote pertence ao jogo e tem id único', () => {
    const ids = CARTAS_TURMA.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const pacote of CARTAS_TURMA) {
      expect(pacote.jogoId).toBe('cartas-contra-a-turma')
    }
  })

  it('quantidade anunciada bate com o total de cartas', () => {
    for (const pacote of CARTAS_TURMA) {
      expect(pacote.quantidade).toBe(pacote.perguntas.length + pacote.respostas.length)
    }
  })

  it('toda pergunta tem exatamente uma lacuna', () => {
    for (const pacote of CARTAS_TURMA) {
      for (const pergunta of pacote.perguntas) {
        expect(pergunta.split('_____').length - 1, pergunta).toBe(1)
      }
    }
  })

  it('nenhum texto repetido, nem dentro nem entre pacotes', () => {
    const perguntas = CARTAS_TURMA.flatMap((p) => p.perguntas)
    const respostas = CARTAS_TURMA.flatMap((p) => p.respostas)
    expect(new Set(perguntas).size).toBe(perguntas.length)
    expect(new Set(respostas).size).toBe(respostas.length)
  })

  it('cada pacote tem cartas suficientes pra uma partida sozinho', () => {
    for (const pacote of CARTAS_TURMA) {
      expect(pacote.perguntas.length, pacote.id).toBeGreaterThanOrEqual(30)
      expect(pacote.respostas.length, pacote.id).toBeGreaterThanOrEqual(100)
    }
  })

  it('nenhuma carta em branco ou com espaço sobrando', () => {
    for (const pacote of CARTAS_TURMA) {
      for (const texto of [...pacote.perguntas, ...pacote.respostas]) {
        expect(texto).toBe(texto.trim())
        expect(texto.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('montarBaralho', () => {
  const leve = CARTAS_TURMA[0]!
  const pesado = CARTAS_TURMA[1]!

  it('CCT-32: soma as cartas dos pacotes selecionados', () => {
    const baralho = montarBaralho([leve, pesado])
    expect(baralho.perguntas.length).toBe(leve.perguntas.length + pesado.perguntas.length)
    expect(baralho.respostas.length).toBe(leve.respostas.length + pesado.respostas.length)
  })

  it('CCT-34: com nenhum pacote, o baralho fica vazio', () => {
    expect(montarBaralho([])).toEqual({ perguntas: [], respostas: [] })
  })

  it('não repete texto que aparece em dois pacotes', () => {
    const clone = { ...leve, id: 'clone' }
    const baralho = montarBaralho([leve, clone])
    expect(baralho.perguntas).toEqual(leve.perguntas)
    expect(baralho.respostas).toEqual(leve.respostas)
  })

  it('mantém a ordem dos pacotes de entrada', () => {
    const baralho = montarBaralho([pesado, leve])
    expect(baralho.perguntas[0]).toBe(pesado.perguntas[0])
  })

  it('só traz o que o pacote escolhido tem', () => {
    const baralho = montarBaralho([pesado])
    for (const pergunta of leve.perguntas) {
      expect(baralho.perguntas).not.toContain(pergunta)
    }
  })
})
