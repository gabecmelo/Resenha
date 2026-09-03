import { describe, expect, it } from 'vitest'
import type { JogadorId } from '../../protocolo'
import { embaralhar, sortearEspioes } from './sorteio'

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

describe('embaralhar — Fisher-Yates genérico', () => {
  it('não muta a lista recebida', () => {
    const original = ids(5)
    const copiaOriginal = [...original]

    embaralhar(original, Math.random)

    expect(original).toEqual(copiaOriginal)
  })

  it('devolve uma permutação da lista recebida', () => {
    const original = ids(6)

    const resultado = embaralhar(original, Math.random)

    expect(resultado.sort()).toEqual([...original].sort())
  })

  it('é determinístico com uma fonte de aleatoriedade fixa', () => {
    const original = ids(6)

    const primeiro = embaralhar(original, fonteFixa(42))
    const segundo = embaralhar(original, fonteFixa(42))

    expect(segundo).toEqual(primeiro)
  })

  it('sorteia de fato — fontes diferentes produzem ordens diferentes', () => {
    const original = ids(6)

    const distintas = new Set<string>()
    for (let i = 0; i < REPETICOES; i += 1) {
      distintas.add(JSON.stringify(embaralhar(original, Math.random)))
    }

    expect(distintas.size).toBeGreaterThan(1)
  })

  it('funciona com um tipo qualquer, não só JogadorId', () => {
    const numeros = [1, 2, 3, 4, 5]

    const resultado = embaralhar(numeros, Math.random)

    expect(resultado.sort((a, b) => a - b)).toEqual(numeros)
  })
})

describe('sortearEspioes (ESP-04)', () => {
  it('retorna exatamente `quantidade` ids quando `quantidade === 1`', () => {
    const ativos = ids(5)

    const espioes = sortearEspioes(ativos, 1, Math.random)

    expect(espioes).toHaveLength(1)
  })

  it('retorna exatamente `quantidade` ids quando `quantidade > 1`', () => {
    const ativos = ids(6)

    const espioes = sortearEspioes(ativos, 3, Math.random)

    expect(espioes).toHaveLength(3)
  })

  it('todos os ids sorteados vêm de `ativos`, sem repetição', () => {
    const ativos = ids(8)

    for (let i = 0; i < REPETICOES; i += 1) {
      const espioes = sortearEspioes(ativos, 3, Math.random)
      expect(new Set(espioes).size).toBe(3)
      for (const id of espioes) expect(ativos).toContain(id)
    }
  })

  it('não muta a lista de ativos recebida', () => {
    const ativos = ids(5)
    const copiaOriginal = [...ativos]

    sortearEspioes(ativos, 2, Math.random)

    expect(ativos).toEqual(copiaOriginal)
  })

  it('é determinístico com uma fonte de aleatoriedade fixa', () => {
    const ativos = ids(6)

    const primeiro = sortearEspioes(ativos, 2, fonteFixa(7))
    const segundo = sortearEspioes(ativos, 2, fonteFixa(7))

    expect(segundo).toEqual(primeiro)
  })
})
