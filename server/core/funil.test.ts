import { describe, expect, it, vi } from 'vitest'
import type { Fase } from '../../shared/protocolo'
import {
  type EventoDeFunil,
  eventoDaExpiracao,
  eventoDaTransicao,
  pontoDoFunil,
  registrar,
} from './funil'

const SALA_ID = '9f1c3ab0c0ffee00'

function sala(jogoId: string, quantos: number) {
  return { jogoId, jogadores: Array.from({ length: quantos }, (_, i) => ({ id: `j${i}` })) }
}

/** Todas as fases do protocolo, pra varrer transição sem esquecer nenhuma. */
const FASES: Fase[] = ['lobby', 'escrita', 'jogo', 'encerrada']

describe('eventoDaTransicao (`FUN-03`, `FUN-04`)', () => {
  it('conta a partida que começa direto no jogo, com quantos estavam na mesa', () => {
    expect(eventoDaTransicao('lobby', 'jogo', sala('espiao', 5))).toEqual({
      t: 'partida_iniciada',
      jogoId: 'espiao',
      jogadores: 5,
    })
  })

  it('conta a partida que começa pela escrita — é a mesma partida (`FUN-03`)', () => {
    expect(eventoDaTransicao('lobby', 'escrita', sala('quem-sou-eu', 4))).toEqual({
      t: 'partida_iniciada',
      jogoId: 'quem-sou-eu',
      jogadores: 4,
    })
  })

  it('não conta a partida duas vezes quando a escrita vira jogo', () => {
    expect(eventoDaTransicao('escrita', 'jogo', sala('quem-sou-eu', 4))).toBeNull()
  })

  it('conta o encerramento vindo do jogo', () => {
    expect(eventoDaTransicao('jogo', 'encerrada', sala('dedo-na-cara', 6))).toEqual({
      t: 'partida_encerrada',
      jogoId: 'dedo-na-cara',
      jogadores: 6,
    })
  })

  it('conta o encerramento vindo da escrita — a mesa que desistiu antes de jogar', () => {
    expect(eventoDaTransicao('escrita', 'encerrada', sala('quem-sou-eu', 3))).toEqual({
      t: 'partida_encerrada',
      jogoId: 'quem-sou-eu',
      jogadores: 3,
    })
  })

  it('não conta "jogar de novo": voltar ao lobby não é partida nova (`FUN-03`)', () => {
    expect(eventoDaTransicao('encerrada', 'lobby', sala('espiao', 4))).toBeNull()
    expect(eventoDaTransicao('jogo', 'lobby', sala('espiao', 4))).toBeNull()
  })

  it('cala quando a fase não mudou, em todas as fases do protocolo', () => {
    const barulhentas = FASES.filter((fase) => eventoDaTransicao(fase, fase, sala('x', 4)) !== null)

    expect(barulhentas).toEqual([])
  })

  it('só emite nas transições previstas — o resto do produto cartesiano cala', () => {
    const emitidas = FASES.flatMap((antes) =>
      FASES.map((depois) => ({ antes, depois, evento: eventoDaTransicao(antes, depois, sala('x', 2)) })),
    )
      .filter((linha) => linha.evento !== null)
      .map((linha) => `${linha.antes}->${linha.depois}:${linha.evento!.t}`)

    expect(emitidas.sort()).toEqual([
      'escrita->encerrada:partida_encerrada',
      'jogo->encerrada:partida_encerrada',
      'lobby->encerrada:partida_encerrada',
      'lobby->escrita:partida_iniciada',
      'lobby->jogo:partida_iniciada',
    ])
  })
})

describe('eventoDaExpiracao (`FUN-11`)', () => {
  it('conta como abandono a sala que morre com partida em andamento', () => {
    expect(eventoDaExpiracao('jogo', sala('espiao', 5))).toEqual({
      t: 'partida_abandonada',
      jogoId: 'espiao',
      jogadores: 5,
    })
  })

  it('conta também a mesa que morre escrevendo, antes de jogar', () => {
    expect(eventoDaExpiracao('escrita', sala('quem-sou-eu', 3))).toEqual({
      t: 'partida_abandonada',
      jogoId: 'quem-sou-eu',
      jogadores: 3,
    })
  })

  it('não conta o lobby que expira: nunca virou mesa', () => {
    expect(eventoDaExpiracao('lobby', sala('espiao', 2))).toBeNull()
  })

  it('não conta abandono depois de encerrar: a partida já foi contada', () => {
    expect(eventoDaExpiracao('encerrada', sala('espiao', 4))).toBeNull()
  })

  it('leva quantos jogadores em double2, como os outros eventos de partida', () => {
    const ponto = pontoDoFunil(
      { t: 'partida_abandonada', jogoId: 'espiao', jogadores: 6 },
      SALA_ID,
    )

    expect(ponto).toEqual({
      blobs: ['partida_abandonada', 'espiao'],
      doubles: [1, 6],
      indexes: [SALA_ID],
    })
  })
})

describe('pontoDoFunil — o esquema das colunas', () => {
  it('põe tipo e jogo nos blobs, o contador em double1 e a sala no index', () => {
    const ponto = pontoDoFunil({ t: 'sala_criada', jogoId: 'espiao' }, SALA_ID)

    expect(ponto).toEqual({
      blobs: ['sala_criada', 'espiao'],
      doubles: [1, 0],
      indexes: [SALA_ID],
    })
  })

  it('leva a ordem de chegada em double2 (`FUN-02`)', () => {
    const ponto = pontoDoFunil({ t: 'jogador_entrou', jogoId: 'espiao', ordem: 2 }, SALA_ID)

    expect(ponto.doubles).toEqual([1, 2])
  })

  it('leva quantos jogadores em double2, no começo e no fim', () => {
    const inicio = pontoDoFunil({ t: 'partida_iniciada', jogoId: 'espiao', jogadores: 5 }, SALA_ID)
    const fim = pontoDoFunil({ t: 'partida_encerrada', jogoId: 'espiao', jogadores: 4 }, SALA_ID)

    expect([inicio.doubles, fim.doubles]).toEqual([
      [1, 5],
      [1, 4],
    ])
  })

  it('mantém `double1` em 1 para todo evento: é o que o SUM conta', () => {
    const eventos: EventoDeFunil[] = [
      { t: 'sala_criada', jogoId: 'a' },
      { t: 'jogador_entrou', jogoId: 'a', ordem: 3 },
      { t: 'partida_iniciada', jogoId: 'a', jogadores: 3 },
      { t: 'partida_encerrada', jogoId: 'a', jogadores: 3 },
    ]

    expect(eventos.map((e) => pontoDoFunil(e, SALA_ID).doubles?.[0])).toEqual([1, 1, 1, 1])
  })

  it('não deixa vazar nada que identifique pessoa (`FUN-05`)', () => {
    const eventos: EventoDeFunil[] = [
      { t: 'sala_criada', jogoId: 'espiao' },
      { t: 'jogador_entrou', jogoId: 'espiao', ordem: 1 },
      { t: 'partida_iniciada', jogoId: 'espiao', jogadores: 4 },
      { t: 'partida_encerrada', jogoId: 'espiao', jogadores: 4 },
    ]

    // O universo de strings que sai daqui é fechado: tipo do evento, jogo e o
    // id opaco da sala. Nada mais tem por onde entrar.
    const strings = eventos.flatMap((e) => {
      const ponto = pontoDoFunil(e, SALA_ID)
      return [...(ponto.blobs ?? []), ...(ponto.indexes ?? [])]
    })

    expect([...new Set(strings)].sort()).toEqual([
      SALA_ID,
      'espiao',
      'jogador_entrou',
      'partida_encerrada',
      'partida_iniciada',
      'sala_criada',
    ])
  })
})

describe('registrar (`FUN-06`, `FUN-07`)', () => {
  it('escreve o ponto quando o binding existe', () => {
    const writeDataPoint = vi.fn()

    registrar({ FUNIL: { writeDataPoint } as unknown as AnalyticsEngineDataset }, { t: 'sala_criada', jogoId: 'espiao' }, SALA_ID)

    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: ['sala_criada', 'espiao'],
      doubles: [1, 0],
      indexes: [SALA_ID],
    })
  })

  it('não faz nada, e não explode, sem o binding (`FUN-07`)', () => {
    expect(() => registrar({}, { t: 'sala_criada', jogoId: 'espiao' }, SALA_ID)).not.toThrow()
  })

  it('engole o erro do binding: medir é acessório, jogar não é (`FUN-06`)', () => {
    const quebrado = {
      writeDataPoint() {
        throw new Error('dataset fora do ar')
      },
    } as unknown as AnalyticsEngineDataset

    expect(() =>
      registrar({ FUNIL: quebrado }, { t: 'partida_iniciada', jogoId: 'espiao', jogadores: 4 }, SALA_ID),
    ).not.toThrow()
  })
})
