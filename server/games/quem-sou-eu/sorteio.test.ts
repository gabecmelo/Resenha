import { describe, expect, it } from 'vitest'
import type { JogadorId } from '../../../shared/protocolo'
import { sortearAlvos } from './sorteio'

const REPETICOES = 500

function ids(quantidade: number): JogadorId[] {
  return Array.from({ length: quantidade }, (_, i) => `j${i + 1}`)
}

/** Fonte determinística — permite verificar que só ela é consultada. */
function fonteFixa(semente: number): () => number {
  let estado = semente
  return () => {
    estado = (estado * 1_103_515_245 + 12_345) % 2_147_483_648
    return estado / 2_147_483_648
  }
}

/** Jogadores que foram sorteados como alvo de si mesmos. */
function pontosFixos(atribuicoes: Record<JogadorId, JogadorId>): JogadorId[] {
  return Object.keys(atribuicoes).filter((escritor) => atribuicoes[escritor] === escritor)
}

describe('sortearAlvos — permutação sem ponto fixo (ESCR-01)', () => {
  it('não atribui nenhum jogador a si mesmo em 500 sorteios com 3 jogadores', () => {
    const jogadores = ids(3)

    const encontrados: JogadorId[] = []
    for (let i = 0; i < REPETICOES; i += 1) {
      encontrados.push(...pontosFixos(sortearAlvos(jogadores, Math.random)))
    }

    expect(encontrados).toEqual([])
  })

  it('não atribui nenhum jogador a si mesmo em 500 sorteios com 20 jogadores', () => {
    const jogadores = ids(20)

    const encontrados: JogadorId[] = []
    for (let i = 0; i < REPETICOES; i += 1) {
      encontrados.push(...pontosFixos(sortearAlvos(jogadores, Math.random)))
    }

    expect(encontrados).toEqual([])
  })

  it('atribui a cada jogador exatamente um alvo', () => {
    const jogadores = ids(7)

    const atribuicoes = sortearAlvos(jogadores, Math.random)

    expect(Object.keys(atribuicoes).sort()).toEqual([...jogadores].sort())
  })

  it('torna cada jogador alvo de exatamente um escritor', () => {
    const jogadores = ids(7)

    for (let i = 0; i < REPETICOES; i += 1) {
      const alvos = Object.values(sortearAlvos(jogadores, Math.random))
      expect([...alvos].sort()).toEqual([...jogadores].sort())
    }
  })

  it('produz um sorteio válido em toda sala de 3 a 20 jogadores, sem retry nem falha', () => {
    for (let quantidade = 3; quantidade <= 20; quantidade += 1) {
      const jogadores = ids(quantidade)
      const atribuicoes = sortearAlvos(jogadores, Math.random)

      expect({
        tamanho: quantidade,
        escritores: Object.keys(atribuicoes).sort(),
        alvos: Object.values(atribuicoes).sort(),
        pontosFixos: pontosFixos(atribuicoes),
      }).toEqual({
        tamanho: quantidade,
        escritores: [...jogadores].sort(),
        alvos: [...jogadores].sort(),
        pontosFixos: [],
      })
    }
  })
})

describe('sortearAlvos — aleatoriedade injetada (AD-002, ESCR-01)', () => {
  it('consulta apenas a fonte de aleatoriedade recebida', () => {
    const jogadores = ids(6)

    const primeiro = sortearAlvos(jogadores, fonteFixa(42))
    const segundo = sortearAlvos(jogadores, fonteFixa(42))

    expect(segundo).toEqual(primeiro)
  })

  it('sorteia de fato — fontes diferentes produzem atribuições diferentes', () => {
    const jogadores = ids(5)

    const distintas = new Set<string>()
    for (let i = 0; i < REPETICOES; i += 1) {
      distintas.add(JSON.stringify(sortearAlvos(jogadores, Math.random)))
    }

    expect(distintas.size).toBeGreaterThan(1)
  })
})
