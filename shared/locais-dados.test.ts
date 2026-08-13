import { describe, expect, it } from 'vitest'
import { LOCAIS } from './locais-dados'

describe('LOCAIS', () => {
  it('contém ao menos um pacote jogável (`ESP-22`)', () => {
    expect(LOCAIS.length).toBeGreaterThanOrEqual(1)
  })

  it('ao menos um pacote tem locais nas três dificuldades', () => {
    const temTresDificuldades = LOCAIS.some((pacote) => {
      const dificuldades = new Set(pacote.cartas.map((carta) => carta.dificuldade))
      return dificuldades.has('facil') && dificuldades.has('medio') && dificuldades.has('dificil')
    })

    expect(temTresDificuldades).toBe(true)
  })

  it('não repete nenhum id de pacote', () => {
    const ids = LOCAIS.map((pacote) => pacote.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('não repete nenhum texto de local dentro do mesmo pacote', () => {
    for (const pacote of LOCAIS) {
      const textos = pacote.cartas.map((carta) => carta.texto)
      expect(new Set(textos).size).toBe(textos.length)
    }
  })
})
