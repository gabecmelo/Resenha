import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  MAX_JOGADORES,
  type EstadoSala,
  type Prazos,
} from '../../shared/protocolo'
import { TIPOS_DE_PRAZO, definir, menorPrazo, vencidos } from './prazos'

function sala(prazos: Partial<Prazos> = {}): EstadoSala {
  return {
    codigo: 'ABCDE',
    fase: 'jogo',
    hostId: 'j1',
    limiteJogadores: MAX_JOGADORES,
    jogadores: [],
    banidos: [],
    config: { ...CONFIG_PADRAO },
    chat: [],
    jogo: null,
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null, ...prazos },
    ultimaAcaoEm: 0,
  }
}

describe('definir (AD-010)', () => {
  it('não apaga os outros prazos ao definir um novo', () => {
    const estado = sala({ salaOciosa: 9_000, salaVazia: 5_000 })

    definir(estado, 'turno', 1_000)

    expect(estado.prazos).toEqual({
      turno: 1_000,
      migracaoHost: null,
      salaVazia: 5_000,
      salaOciosa: 9_000,
    })
  })

  it('agendar o prazo de turno não cancela os prazos de expiração da sala', () => {
    const estado = sala({ salaVazia: 5_000, salaOciosa: 9_000 })

    definir(estado, 'turno', 1_000)
    definir(estado, 'turno', 2_000)

    expect({ salaVazia: estado.prazos.salaVazia, salaOciosa: estado.prazos.salaOciosa }).toEqual({
      salaVazia: 5_000,
      salaOciosa: 9_000,
    })
  })

  it('substitui o valor anterior do mesmo prazo', () => {
    const estado = sala({ turno: 1_000 })

    definir(estado, 'turno', 4_000)

    expect(estado.prazos.turno).toBe(4_000)
  })

  it('limpa apenas o prazo indicado quando recebe null', () => {
    const estado = sala({ turno: 1_000, migracaoHost: 2_000 })

    definir(estado, 'turno', null)

    expect(estado.prazos).toEqual({
      turno: null,
      migracaoHost: 2_000,
      salaVazia: null,
      salaOciosa: null,
    })
  })
})

describe('vencidos', () => {
  it('devolve os prazos com vencimento anterior a agora', () => {
    const estado = sala({ turno: 1_000, migracaoHost: 8_000 })

    expect(vencidos(estado, 5_000)).toEqual(['turno'])
  })

  it('inclui o prazo que vence exatamente agora', () => {
    const estado = sala({ turno: 5_000 })

    expect(vencidos(estado, 5_000)).toEqual(['turno'])
  })

  it('não inclui prazo com vencimento futuro', () => {
    const estado = sala({ turno: 5_001 })

    expect(vencidos(estado, 5_000)).toEqual([])
  })

  it('ignora prazos inativos', () => {
    const estado = sala()

    expect(vencidos(estado, 10_000)).toEqual([])
  })

  it('devolve todos os prazos vencidos e só eles', () => {
    const estado = sala({
      turno: 1_000,
      migracaoHost: 2_000,
      salaVazia: 9_000,
      salaOciosa: 5_000,
    })

    expect(vencidos(estado, 5_000).sort()).toEqual(['migracaoHost', 'salaOciosa', 'turno'])
  })

  it('considera os quatro prazos da sala', () => {
    const estado = sala({ turno: 1, migracaoHost: 1, salaVazia: 1, salaOciosa: 1 })

    expect(vencidos(estado, 1).sort()).toEqual([...TIPOS_DE_PRAZO].sort())
  })
})

describe('menorPrazo', () => {
  it('devolve o próximo vencimento entre os prazos ativos', () => {
    const estado = sala({ turno: 7_000, salaVazia: 3_000, salaOciosa: 9_000 })

    expect(menorPrazo(estado)).toBe(3_000)
  })

  it('devolve null quando não há nenhum prazo ativo', () => {
    expect(menorPrazo(sala())).toBeNull()
  })

  it('recalcula o próximo vencimento quando o menor prazo é limpo', () => {
    const estado = sala({ turno: 7_000, salaVazia: 3_000, salaOciosa: 9_000 })

    definir(estado, 'salaVazia', null)

    expect(menorPrazo(estado)).toBe(7_000)
  })

  it('volta a null quando o último prazo ativo é limpo', () => {
    const estado = sala({ turno: 7_000 })

    definir(estado, 'turno', null)

    expect(menorPrazo(estado)).toBeNull()
  })
})
