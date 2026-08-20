import { describe, expect, it } from 'vitest'
import { CARTAS_DEDO } from './dedo-dados'
import { montarBaralho } from './dedo'

describe('CARTAS_DEDO — conteúdo dos pacotes', () => {
  it('DEDO-22: oferece ao menos um pacote leve e um pesado', () => {
    const tons = CARTAS_DEDO.map((p) => p.tom)
    expect(tons).toContain('leve')
    expect(tons).toContain('pesado')
  })

  it('todo pacote pertence ao jogo e tem id único', () => {
    const ids = CARTAS_DEDO.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const pacote of CARTAS_DEDO) {
      expect(pacote.jogoId).toBe('dedo-na-cara')
      expect(pacote.nome.length).toBeGreaterThan(0)
      expect(pacote.descricao.length).toBeGreaterThan(0)
    }
  })

  it('quantidade anunciada bate com o total de cartas', () => {
    for (const pacote of CARTAS_DEDO) {
      expect(pacote.quantidade).toBe(pacote.cartas.length)
    }
  })

  it('DEDO-21: cada pacote sozinho dá pra uma partida inteira', () => {
    for (const pacote of CARTAS_DEDO) {
      expect(pacote.cartas.length).toBeGreaterThanOrEqual(15)
    }
  })

  it('DEDO-20: toda carta começa em "Quem aqui"', () => {
    for (const pacote of CARTAS_DEDO) {
      for (const carta of pacote.cartas) {
        expect(carta.startsWith('Quem aqui ')).toBe(true)
      }
    }
  })

  it('a carta é só a pergunta: sem espaço sobrando e sem a interrogação, que a tela põe', () => {
    for (const pacote of CARTAS_DEDO) {
      for (const carta of pacote.cartas) {
        expect(carta.trim()).toBe(carta)
        expect(carta.endsWith('?')).toBe(false)
        expect(carta.length).toBeGreaterThan(20)
      }
    }
  })

  it('nenhuma carta se repete, dentro ou entre pacotes', () => {
    const cartas = CARTAS_DEDO.flatMap((p) => p.cartas)
    expect(new Set(cartas).size).toBe(cartas.length)
  })
})

describe('montarBaralho', () => {
  it('soma as cartas dos pacotes escolhidos, na ordem', () => {
    const baralho = montarBaralho([CARTAS_DEDO[0]!, CARTAS_DEDO[1]!])
    expect(baralho).toHaveLength(CARTAS_DEDO[0]!.cartas.length + CARTAS_DEDO[1]!.cartas.length)
    expect(baralho[0]).toBe(CARTAS_DEDO[0]!.cartas[0])
  })

  it('sem pacote nenhum, baralho vazio', () => {
    expect(montarBaralho([])).toEqual([])
  })

  it('a mesma carta em dois pacotes entra uma vez só', () => {
    const repetido = { ...CARTAS_DEDO[0]!, id: 'copia' }
    expect(montarBaralho([CARTAS_DEDO[0]!, repetido])).toHaveLength(CARTAS_DEDO[0]!.cartas.length)
  })
})
