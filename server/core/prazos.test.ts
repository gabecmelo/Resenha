import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  MAX_JOGADORES,
  type EstadoSala,
  type Prazos,
} from '../../shared/protocolo'
import { FOLGA_DO_ALARME_MS, reagendar } from './prazos'

function sala(prazos: Partial<Prazos> = {}): EstadoSala {
  return {
    codigo: 'ABCDE',
    fase: 'jogo',
    hostId: 'j1',
    jogoId: 'quem-sou-eu',
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

describe('reagendar', () => {
  /** Storage de mentira: só interessa o que foi pedido ao alarme. */
  function storageFalso() {
    const chamadas: { marcado: number | null } = { marcado: null }
    return {
      chamadas,
      storage: {
        setAlarm: (quando: number) => {
          chamadas.marcado = quando
          return Promise.resolve()
        },
        deleteAlarm: () => {
          chamadas.marcado = null
          return Promise.resolve()
        },
      } as unknown as DurableObjectStorage,
    }
  }

  it('marca o alarme depois do menor prazo, e não nele', async () => {
    // A folga é o que salva quem age no estouro do relógio: sem ela o comando
    // enviado no último segundo chega depois de a rodada já ter sido cobrada.
    const { chamadas, storage } = storageFalso()

    await reagendar(storage, sala({ turno: 7_000, salaOciosa: 90_000 }))

    expect(chamadas.marcado).toBe(7_000 + FOLGA_DO_ALARME_MS)
  })

  it('a folga não muda o prazo guardado, que é o que a tela conta', async () => {
    const { storage } = storageFalso()
    const estado = sala({ turno: 7_000 })

    await reagendar(storage, estado)

    expect(estado.prazos.turno).toBe(7_000)
  })

  it('sem prazo nenhum, apaga o alarme em vez de marcar a folga sozinha', async () => {
    const { chamadas, storage } = storageFalso()
    chamadas.marcado = 123

    await reagendar(storage, sala())

    expect(chamadas.marcado).toBeNull()
  })
})
