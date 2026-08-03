import { env, evictDurableObject, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { CONFIG_PADRAO, type EstadoSala } from '../../shared/protocolo'
import { carregar, destruir, salvar } from './estado'

/**
 * `E` genérico: o `core` não conhece o estado de nenhum jogo (AD-002). O
 * formato abaixo só existe para provar que `Record` aninhados sobrevivem ao
 * round-trip.
 */
interface JogoDeTeste {
  atribuicoes: Record<string, string>
  cartas: Record<string, string>
  notas: Record<string, string>
}

function documento(codigo: string): EstadoSala<JogoDeTeste> {
  return {
    codigo,
    fase: 'jogo',
    hostId: 'j1',
    jogadores: [
      {
        id: 'j1',
        tokenHash: 'hash-1',
        apelido: 'Ana',
        cor: 'vermelho',
        entrouEm: 1_000,
        conectado: true,
        desconectadoEm: null,
        situacao: 'ativo',
      },
      {
        id: 'j2',
        tokenHash: 'hash-2',
        apelido: 'Bruno',
        cor: 'laranja',
        entrouEm: 2_000,
        conectado: false,
        desconectadoEm: 5_000,
        situacao: 'aguardando',
      },
    ],
    banidos: ['hash-expulso'],
    config: { ...CONFIG_PADRAO, tempoTurnoSeg: 60 },
    chat: [
      { em: 3_000, texto: 'oi', tipo: 'jogador', autorId: 'j1' },
      { em: 4_000, texto: 'A partida começou.', tipo: 'sistema' },
    ],
    jogo: {
      atribuicoes: { j1: 'j2', j2: 'j1' },
      cartas: { j1: 'Chapolin', j2: 'Dona Florinda' },
      notas: { j1: 'não é humano' },
    },
    prazos: { turno: 7_000, migracaoHost: null, salaVazia: null, salaOciosa: 9_000 },
    ultimaAcaoEm: 4_000,
  }
}

function storageDe(codigo: string) {
  const stub = env.SALA.get(env.SALA.idFromName(codigo))
  return {
    stub,
    rodar: <R>(fn: (storage: DurableObjectStorage) => R | Promise<R>): Promise<R> =>
      runInDurableObject(stub, (_instancia, state) => fn(state.storage)),
  }
}

describe('carregar', () => {
  it('devolve null num Durable Object nunca inicializado (`SALA-06`)', async () => {
    const { rodar } = storageDe('EST-VAZIO')

    expect(await rodar((s) => carregar(s))).toBeNull()
  })
})

describe('round-trip', () => {
  it('preserva o documento inteiro', async () => {
    const { rodar } = storageDe('EST-INTEIRO')
    const sala = documento('ABCDE')

    await rodar((s) => salvar(s, sala))

    expect(await rodar((s) => carregar<JogoDeTeste>(s))).toEqual(sala)
  })

  it('preserva os `Record` aninhados do estado do jogo', async () => {
    const { rodar } = storageDe('EST-RECORD')
    const sala = documento('ABCDE')

    await rodar((s) => salvar(s, sala))
    const lido = await rodar((s) => carregar<JogoDeTeste>(s))

    expect(lido?.jogo).toEqual({
      atribuicoes: { j1: 'j2', j2: 'j1' },
      cartas: { j1: 'Chapolin', j2: 'Dona Florinda' },
      notas: { j1: 'não é humano' },
    })
  })

  it('preserva o chat com as duas variantes de mensagem (`CHAT-04`)', async () => {
    const { rodar } = storageDe('EST-CHAT')
    const sala = documento('ABCDE')

    await rodar((s) => salvar(s, sala))
    const lido = await rodar((s) => carregar<JogoDeTeste>(s))

    expect(lido?.chat).toEqual([
      { em: 3_000, texto: 'oi', tipo: 'jogador', autorId: 'j1' },
      { em: 4_000, texto: 'A partida começou.', tipo: 'sistema' },
    ])
  })

  it('a gravação seguinte substitui o documento anterior (AD-005)', async () => {
    const { rodar } = storageDe('EST-SOBRESCREVE')
    const sala = documento('ABCDE')

    await rodar((s) => salvar(s, sala))
    await rodar((s) => salvar(s, { ...sala, fase: 'encerrada', ultimaAcaoEm: 8_000 }))
    const lido = await rodar((s) => carregar<JogoDeTeste>(s))

    expect({ fase: lido?.fase, ultimaAcaoEm: lido?.ultimaAcaoEm }).toEqual({
      fase: 'encerrada',
      ultimaAcaoEm: 8_000,
    })
  })

  it('o documento sobrevive à hibernação do Durable Object (`CONN-05`)', async () => {
    const { stub, rodar } = storageDe('EST-HIBERNA')
    const sala = documento('ABCDE')

    await rodar((s) => salvar(s, sala))
    await evictDurableObject(stub)

    expect(await rodar((s) => carregar<JogoDeTeste>(s))).toEqual(sala)
  })
})

describe('destruir', () => {
  it('faz `carregar` voltar a null (`CONN-07`, `CONN-08`)', async () => {
    const { rodar } = storageDe('EST-DESTROI')

    await rodar((s) => salvar(s, documento('ABCDE')))
    await rodar((s) => destruir(s))

    expect(await rodar((s) => carregar(s))).toBeNull()
  })

  it('esvazia o storage inteiro, não só a chave do documento', async () => {
    const { rodar } = storageDe('EST-DESTROI-TUDO')

    await rodar(async (s) => {
      await salvar(s, documento('ABCDE'))
      await s.put('resto', 1)
    })
    await rodar((s) => destruir(s))

    expect(await rodar((s) => s.list())).toEqual(new Map())
  })
})
