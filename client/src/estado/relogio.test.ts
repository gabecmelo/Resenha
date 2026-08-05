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

describe('restanteAte — teto da duração do turno (AJU-31)', () => {
  it('não devolve mais que o turno configurado quando o relógio do cliente atrasa', () => {
    // Vencimento daqui a 31s num turno de 30s: o cliente está 1s atrás do servidor.
    expect(restanteAte(1_000_031_000, 1_000_000_000, 30)).toBe(30_000)
  })

  it('num turno de 30s nunca exibe 0:31', () => {
    const restante = restanteAte(1_000_030_400, 1_000_000_000, 30)

    expect(formatarTempo(restante ?? 0)).toBe('0:30')
  })

  it('não mexe no restante que já cabe no turno', () => {
    expect(restanteAte(1_000_012_000, 1_000_000_000, 30)).toBe(12_000)
  })

  it('preserva o comportamento sem duração configurada', () => {
    expect(restanteAte(1_000_031_000, 1_000_000_000, null)).toBe(31_000)
  })

  it('continua devolvendo null sem prazo, mesmo com duração configurada', () => {
    expect(restanteAte(null, 1_000_000_000, 30)).toBeNull()
  })

  it('não antecipa o vencimento: o último segundo do turno segue valendo (AJU-32)', () => {
    const restante = restanteAte(1_000_000_001, 1_000_000_000, 30)

    expect(formatarTempo(restante ?? 0)).toBe('0:01')
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

  it('exibe 0:01 até o vencimento, mesmo com 1 ms de sobra (AJU-32)', () => {
    expect(formatarTempo(1)).toBe('0:01')
    expect(formatarTempo(999)).toBe('0:01')
  })

  it('zero é 0:00 — e só com restante zero (AJU-32)', () => {
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
