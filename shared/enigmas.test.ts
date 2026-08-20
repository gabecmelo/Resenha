import { describe, expect, it } from 'vitest'
import { ENIGMAS } from './enigmas-dados'
import { montarBaralho } from './enigmas'

describe('ENIGMAS — conteúdo dos pacotes', () => {
  it('ENIG-30: oferece ao menos um pacote leve e um pesado', () => {
    const tons = ENIGMAS.map((p) => p.tom)
    expect(tons).toContain('leve')
    expect(tons).toContain('pesado')
  })

  it('todo pacote pertence ao jogo e tem id único', () => {
    const ids = ENIGMAS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const pacote of ENIGMAS) {
      expect(pacote.jogoId).toBe('enigmas-sinistros')
    }
  })

  it('quantidade anunciada bate com o total de enigmas', () => {
    for (const pacote of ENIGMAS) {
      expect(pacote.quantidade).toBe(pacote.enigmas.length)
    }
  })

  it('ENIG-32: cada pacote sozinho dá pra uma partida inteira', () => {
    for (const pacote of ENIGMAS) {
      expect(pacote.enigmas.length).toBeGreaterThanOrEqual(10)
    }
  })

  it('nenhuma cena se repete, dentro ou entre pacotes', () => {
    const cenas = ENIGMAS.flatMap((p) => p.enigmas.map((e) => e.cena))
    expect(new Set(cenas).size).toBe(cenas.length)
  })

  it('todo enigma tem cena e solução escritas', () => {
    for (const pacote of ENIGMAS) {
      for (const enigma of pacote.enigmas) {
        expect(enigma.cena.trim()).toBe(enigma.cena)
        expect(enigma.solucao.trim()).toBe(enigma.solucao)
        expect(enigma.cena.length).toBeGreaterThan(20)
        expect(enigma.solucao.length).toBeGreaterThan(20)
        // A solução não pode ser a própria cena repetida.
        expect(enigma.solucao).not.toBe(enigma.cena)
      }
    }
  })
})

describe('montarBaralho', () => {
  it('soma os enigmas dos pacotes escolhidos, na ordem', () => {
    const baralho = montarBaralho([ENIGMAS[0]!, ENIGMAS[1]!])
    expect(baralho).toHaveLength(ENIGMAS[0]!.enigmas.length + ENIGMAS[1]!.enigmas.length)
    expect(baralho[0]).toEqual(ENIGMAS[0]!.enigmas[0])
  })

  it('sem pacote nenhum, baralho vazio', () => {
    expect(montarBaralho([])).toEqual([])
  })

  it('a mesma cena em dois pacotes entra uma vez só', () => {
    const repetido = { ...ENIGMAS[0]!, id: 'copia' }
    expect(montarBaralho([ENIGMAS[0]!, repetido])).toHaveLength(ENIGMAS[0]!.enigmas.length)
  })
})
