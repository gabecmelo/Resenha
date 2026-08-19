import { describe, expect, it } from 'vitest'
import { TEMPO_TURNO_MAX_SEG, TEMPO_TURNO_MIN_SEG } from '../../../shared/protocolo'
import {
  PRESETS_DE_TEMPO,
  ehTempoPersonalizado,
  paraCampoDeTempo,
  rotuloDoTempo,
  tempoDigitado,
} from './turno'

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

describe('tempoDigitado — o mesmo tempo escrito em minutos', () => {
  it('lê `m:ss` como minutos e segundos', () => {
    expect(tempoDigitado('1:30')).toBe(90)
    expect(tempoDigitado('01:30')).toBe(90)
    expect(tempoDigitado('2:00')).toBe(120)
    expect(tempoDigitado('0:45')).toBe(45)
  })

  it('as duas escritas do mesmo tempo dão o mesmo número', () => {
    expect(tempoDigitado('1:30')).toBe(tempoDigitado('90'))
    expect(tempoDigitado('10:00')).toBe(tempoDigitado('600'))
  })

  it('recusa segundos acima de 59: é erro de digitação, não noventa segundos', () => {
    expect(tempoDigitado('1:90')).toBeNull()
    expect(tempoDigitado('1:60')).toBeNull()
  })

  it('exige os dois dígitos dos segundos', () => {
    expect(tempoDigitado('1:5')).toBeNull()
  })

  it('recusa forma quebrada com dois pontos', () => {
    expect(tempoDigitado(':30')).toBeNull()
    expect(tempoDigitado('1:')).toBeNull()
    expect(tempoDigitado('1:2:3')).toBeNull()
    expect(tempoDigitado('a:30')).toBeNull()
  })

  it('a faixa vale igual pra quem digita em minutos', () => {
    // 61 minutos passa de `TEMPO_TURNO_MAX_SEG`.
    expect(tempoDigitado('61:00')).toBeNull()
    expect(tempoDigitado('0:05')).toBeNull()
    expect(tempoDigitado('60:00')).toBe(TEMPO_TURNO_MAX_SEG)
  })
})

describe('paraCampoDeTempo — reabrir a gaveta e achar o que se digitou', () => {
  it('escreve em `m:ss` de um minuto pra cima', () => {
    expect(paraCampoDeTempo(90)).toBe('1:30')
    expect(paraCampoDeTempo(120)).toBe('2:00')
    expect(paraCampoDeTempo(605)).toBe('10:05')
  })

  it('abaixo de um minuto fica o número cru', () => {
    expect(paraCampoDeTempo(45)).toBe('45')
  })

  it('o que ela escreve, `tempoDigitado` lê de volta igual', () => {
    for (const segundos of [10, 45, 90, 120, 605, 3600]) {
      expect(tempoDigitado(paraCampoDeTempo(segundos))).toBe(segundos)
    }
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
