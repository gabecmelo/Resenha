import { describe, expect, it } from 'vitest'
import { TEMPO_TURNO_MAX_SEG, TEMPO_TURNO_MIN_SEG } from '../../../shared/protocolo'
import { PRESETS_DE_TEMPO, ehTempoPersonalizado, rotuloDoTempo, tempoDigitado } from './turno'

describe('tempoDigitado — faixa do tempo personalizado (AJU-19, AJU-20)', () => {
  it('aceita um valor dentro da faixa', () => {
    expect(tempoDigitado('240')).toBe(240)
  })

  it('aceita os extremos da faixa', () => {
    expect(tempoDigitado(String(TEMPO_TURNO_MIN_SEG))).toBe(TEMPO_TURNO_MIN_SEG)
    expect(tempoDigitado(String(TEMPO_TURNO_MAX_SEG))).toBe(TEMPO_TURNO_MAX_SEG)
  })

  it('recusa abaixo do mínimo', () => {
    expect(tempoDigitado(String(TEMPO_TURNO_MIN_SEG - 1))).toBeNull()
  })

  it('recusa acima do máximo', () => {
    expect(tempoDigitado(String(TEMPO_TURNO_MAX_SEG + 1))).toBeNull()
  })

  it('recusa o campo vazio', () => {
    expect(tempoDigitado('')).toBeNull()
    expect(tempoDigitado('   ')).toBeNull()
  })

  it('recusa o que não é número inteiro', () => {
    expect(tempoDigitado('30,5')).toBeNull()
    expect(tempoDigitado('30.5')).toBeNull()
    expect(tempoDigitado('meia hora')).toBeNull()
    expect(tempoDigitado('-30')).toBeNull()
  })

  it('ignora espaços em volta do número', () => {
    expect(tempoDigitado(' 240 ')).toBe(240)
  })
})

describe('ehTempoPersonalizado — o que não é preset (AJU-19)', () => {
  it('é verdadeiro para um valor fora dos presets', () => {
    expect(ehTempoPersonalizado(240)).toBe(true)
  })

  it('é falso para cada preset', () => {
    expect(PRESETS_DE_TEMPO.map((o) => ehTempoPersonalizado(o.valor))).toEqual(
      PRESETS_DE_TEMPO.map(() => false),
    )
  })

  it('é falso para "sem limite"', () => {
    expect(ehTempoPersonalizado(null)).toBe(false)
  })
})

describe('rotuloDoTempo — o valor em vigor à vista (AJU-19)', () => {
  it('lê "sem limite" quando não há prazo', () => {
    expect(rotuloDoTempo(null)).toBe('Sem limite')
  })

  it('usa o rótulo do preset quando é um deles', () => {
    expect(rotuloDoTempo(120)).toBe('2min')
  })

  it('lê um valor personalizado em minutos', () => {
    expect(rotuloDoTempo(240)).toBe('4min')
  })

  it('lê um valor personalizado com minutos e segundos', () => {
    expect(rotuloDoTempo(245)).toBe('4min 5s')
  })

  it('lê um valor personalizado abaixo de um minuto', () => {
    expect(rotuloDoTempo(15)).toBe('15s')
  })
})
