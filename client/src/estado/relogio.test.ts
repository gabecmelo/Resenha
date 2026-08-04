import { describe, expect, it } from 'vitest'
import {
  ACABANDO_MS,
  estaAcabando,
  formatarTempo,
  fracaoRestante,
  restanteAte,
} from './relogio'

describe('restanteAte', () => {
  it('conta a partir do instante absoluto que veio na projeção', () => {
    expect(restanteAte(1_000_042_000, 1_000_000_000)).toBe(42_000)
  })

  it('devolve null sem prazo — a configuração "sem limite" não agenda nenhum (JOGO-08)', () => {
    expect(restanteAte(null, 1_000_000_000)).toBeNull()
  })

  it('não conta para trás depois do vencimento', () => {
    expect(restanteAte(1_000_000_000, 1_000_030_000)).toBe(0)
  })

  it('zera exatamente no vencimento', () => {
    expect(restanteAte(1_000_000_000, 1_000_000_000)).toBe(0)
  })

  it('independe do relógio: o mesmo prazo lido depois devolve menos tempo', () => {
    const prazo = 1_000_060_000
    expect(restanteAte(prazo, 1_000_000_000)).toBe(60_000)
    expect(restanteAte(prazo, 1_000_010_000)).toBe(50_000)
  })
})

describe('formatarTempo', () => {
  it('escreve minuto e segundo com dois dígitos', () => {
    expect(formatarTempo(42_000)).toBe('0:42')
    expect(formatarTempo(68_000)).toBe('1:08')
  })

  it('arredonda para cima — sobra de segundo ainda é segundo de jogo', () => {
    expect(formatarTempo(500)).toBe('0:01')
  })

  it('zero é 0:00', () => {
    expect(formatarTempo(0)).toBe('0:00')
  })

  it('completa o segundo com zero à esquerda', () => {
    expect(formatarTempo(61_000)).toBe('1:01')
  })
})

describe('estaAcabando', () => {
  it('é falso sem prazo', () => {
    expect(estaAcabando(null)).toBe(false)
  })

  it('é falso enquanto sobra mais que o limiar', () => {
    expect(estaAcabando(ACABANDO_MS + 1)).toBe(false)
  })

  it('é verdadeiro no limiar e abaixo dele', () => {
    expect(estaAcabando(ACABANDO_MS)).toBe(true)
    expect(estaAcabando(0)).toBe(true)
  })
})

describe('fracaoRestante', () => {
  it('é a proporção do turno que ainda sobra', () => {
    expect(fracaoRestante(15_000, 30)).toBe(0.5)
  })

  it('é 0 sem duração configurada — não há proporção a desenhar', () => {
    expect(fracaoRestante(15_000, null)).toBe(0)
  })

  it('é 0 sem prazo', () => {
    expect(fracaoRestante(null, 30)).toBe(0)
  })

  it('não passa de 1 quando o prazo é maior que a duração', () => {
    expect(fracaoRestante(90_000, 30)).toBe(1)
  })

  it('é 0 no vencimento', () => {
    expect(fracaoRestante(0, 30)).toBe(0)
  })
})
