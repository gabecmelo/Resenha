import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  MAX_JOGADORES,
  type EstadoSala,
  type Jogador,
  type Prazos,
  type ResultadoReducer,
  type Situacao,
} from '../protocolo'
import { aplicar } from './aplicar'

type Marcador = { marca: string }

function jogador(id: string, situacao: Situacao): Jogador {
  return {
    id,
    tokenHash: '',
    apelido: id,
    cor: 'ambar',
    entrouEm: 0,
    conectado: true,
    desconectadoEm: null,
    situacao,
  }
}

function sala(
  prazos: Partial<Prazos> = {},
  jogadores: Jogador[] = [],
): EstadoSala<Marcador> {
  return {
    codigo: 'ABCDE',
    fase: 'jogo',
    hostId: 'j1',
    jogoId: 'quem-sou-eu',
    limiteJogadores: MAX_JOGADORES,
    jogadores,
    banidos: [],
    config: { ...CONFIG_PADRAO },
    chat: [],
    jogo: { marca: 'antes' },
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null, ...prazos },
    ultimaAcaoEm: 0,
  }
}

function resultado(
  parcial: Partial<Extract<ResultadoReducer<Marcador>, { ok: true }>> = {},
): Extract<ResultadoReducer<Marcador>, { ok: true }> {
  return { ok: true, estado: { marca: 'depois' }, eventos: [], prazos: {}, ...parcial }
}

describe('aplicar', () => {
  it('guarda o estado devolvido pelo jogo', () => {
    const estado = sala()

    aplicar(estado, resultado({ estado: { marca: 'depois' } }))

    expect(estado.jogo).toEqual({ marca: 'depois' })
  })

  it('avança a fase quando o jogo pede uma seguinte', () => {
    const estado = sala()

    aplicar(estado, resultado({ faseSeguinte: 'lobby' }))

    expect(estado.fase).toBe('lobby')
  })

  it('mantém a fase quando o jogo não cita nenhuma', () => {
    const estado = sala()

    aplicar(estado, resultado())

    expect(estado.fase).toBe('jogo')
  })

  it('define cada prazo citado pelo jogo', () => {
    const estado = sala()

    aplicar(estado, resultado({ prazos: { turno: 7_000, migracaoHost: 9_000 } }))

    expect(estado.prazos).toEqual({
      turno: 7_000,
      migracaoHost: 9_000,
      salaVazia: null,
      salaOciosa: null,
    })
  })

  it('limpa o prazo que o jogo cita com null', () => {
    const estado = sala({ turno: 7_000 })

    aplicar(estado, resultado({ prazos: { turno: null } }))

    expect(estado.prazos.turno).toBeNull()
  })

  it('não toca no prazo que o jogo não citou (AD-010)', () => {
    const estado = sala({ turno: 7_000, salaVazia: 3_000, salaOciosa: 90_000 })

    aplicar(estado, resultado({ prazos: { turno: 1_000 } }))

    expect({ salaVazia: estado.prazos.salaVazia, salaOciosa: estado.prazos.salaOciosa }).toEqual({
      salaVazia: 3_000,
      salaOciosa: 90_000,
    })
  })

  it('devolve os eventos do jogo na ordem em que ele os descreveu', () => {
    const estado = sala()

    const eventos = aplicar(
      estado,
      resultado({ eventos: [{ texto: 'primeiro' }, { texto: 'segundo' }] }),
    )

    expect(eventos).toEqual([{ texto: 'primeiro' }, { texto: 'segundo' }])
  })

  it('devolve lista vazia quando o jogo não anuncia nada', () => {
    expect(aplicar(sala(), resultado())).toEqual([])
  })

  it('não escreve no chat da sala — quem registra é quem chamou', () => {
    const estado = sala()

    aplicar(estado, resultado({ eventos: [{ texto: 'primeiro' }] }))

    expect(estado.chat).toEqual([])
  })

  it('promove todo mundo que aguarda quando o jogo pede', () => {
    const estado = sala({}, [jogador('j1', 'ativo'), jogador('j2', 'aguardando')])

    aplicar(estado, resultado({ promoverAguardando: true }))

    expect(estado.jogadores.map((j) => j.situacao)).toEqual(['ativo', 'ativo'])
  })

  it('deixa quem aguarda como está quando o jogo não pede promoção', () => {
    const estado = sala({}, [jogador('j1', 'ativo'), jogador('j2', 'aguardando')])

    aplicar(estado, resultado())

    expect(estado.jogadores.map((j) => j.situacao)).toEqual(['ativo', 'aguardando'])
  })
})
