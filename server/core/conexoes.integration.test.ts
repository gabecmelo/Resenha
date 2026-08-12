import { env, evictDurableObject, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  MAX_JOGADORES,
  type JogadorId,
  type Mensagem,
  type Projecao,
} from '../../shared/protocolo'
import { difundir, jogadorDe, socketsDe, vincular } from './conexoes'

/** Projeção mínima e distinguível por jogador — AD-008. */
function projecaoDe(paraJogador: JogadorId): Projecao {
  return {
    agoraServidor: 0,
    sala: {
      codigo: 'ABCDE',
      fase: 'lobby',
      hostId: 'j1',
      jogoId: 'quem-sou-eu',
      config: { ...CONFIG_PADRAO },
      limiteJogadores: MAX_JOGADORES,
    },
    eu: {
      id: paraJogador,
      ehHost: paraJogador === 'j1',
      situacao: 'ativo',
      souConfirmador: false,
      pronto: false,
      notas: `notas de ${paraJogador}`,
    },
    jogadores: [],
    chat: [],
  }
}

interface Cliente {
  ws: WebSocket
  recebidas: Mensagem[]
}

/** O upgrade só é aceito em sala viva, então a sala é criada antes. */
async function sala(nome: string): Promise<DurableObjectStub> {
  const stub = env.SALA.get(env.SALA.idFromName(nome))
  const criada = await stub.fetch('http://sala/criar?codigo=ABCDE', { method: 'POST' })
  if (criada.status !== 201) throw new Error(`criar devolveu ${criada.status}`)
  return stub
}

/** Upgrade de verdade: só um socket aceito por `acceptWebSocket` é hibernável. */
async function conectar(stub: DurableObjectStub): Promise<Cliente> {
  const resposta = await stub.fetch('http://sala/ws', { headers: { Upgrade: 'websocket' } })
  const ws = resposta.webSocket
  if (ws === null) throw new Error('o Durable Object não devolveu um websocket')

  const recebidas: Mensagem[] = []
  ws.addEventListener('message', (evento) => {
    recebidas.push(JSON.parse(evento.data as string) as Mensagem)
  })
  ws.accept()
  return { ws, recebidas }
}

/** Vincula o socket recém-aceito, que é o único ainda sem jogador. */
async function conectarComo(stub: DurableObjectStub, jogadorId: JogadorId): Promise<Cliente> {
  const cliente = await conectar(stub)
  await runInDurableObject(stub, (_instancia, state) => {
    const novo = state.getWebSockets().find((ws) => jogadorDe(ws) === null)
    if (novo === undefined) throw new Error('nenhum socket sem vínculo')
    vincular(novo, jogadorId)
  })
  return cliente
}

async function assentar(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await new Promise((pronto) => setTimeout(pronto, 1))
}

function projecoesDe(cliente: Cliente): Projecao[] {
  return cliente.recebidas
    .filter((m): m is Extract<Mensagem, { t: 'projecao' }> => m.t === 'projecao')
    .map((m) => m.dados)
}

describe('vínculo socket → jogador', () => {
  it('devolve o jogador gravado no socket', async () => {
    const stub = await sala('CONN-VINCULO')
    await conectarComo(stub, 'j1')

    const ids = await runInDurableObject(stub, (_i, state) =>
      state.getWebSockets().map((ws) => jogadorDe(ws)),
    )

    expect(ids).toEqual(['j1'])
  })

  it('devolve null enquanto o socket não se identificou', async () => {
    const stub = await sala('CONN-SEM-VINCULO')
    await conectar(stub)

    const ids = await runInDurableObject(stub, (_i, state) =>
      state.getWebSockets().map((ws) => jogadorDe(ws)),
    )

    expect(ids).toEqual([null])
  })

  it('sobrevive à hibernação do Durable Object (`CONN-05`)', async () => {
    const stub = await sala('CONN-HIBERNA')
    await conectarComo(stub, 'j1')

    await evictDurableObject(stub)

    const ids = await runInDurableObject(stub, (_i, state) =>
      state.getWebSockets().map((ws) => jogadorDe(ws)),
    )
    expect(ids).toEqual(['j1'])
  })
})

describe('socketsDe', () => {
  it('devolve apenas os sockets do jogador pedido', async () => {
    const stub = await sala('CONN-SOCKETS-DE')
    await conectarComo(stub, 'j1')
    await conectarComo(stub, 'j2')

    const contagem = await runInDurableObject(stub, (_i, state) => ({
      j1: socketsDe(state, 'j1').length,
      j2: socketsDe(state, 'j2').length,
      j3: socketsDe(state, 'j3').length,
    }))

    expect(contagem).toEqual({ j1: 1, j2: 1, j3: 0 })
  })

  it('devolve os dois sockets do mesmo jogador', async () => {
    const stub = await sala('CONN-DOIS-SOCKETS')
    await conectarComo(stub, 'j1')
    await conectarComo(stub, 'j1')

    const total = await runInDurableObject(stub, (_i, state) => socketsDe(state, 'j1').length)

    expect(total).toBe(2)
  })
})

describe('difundir', () => {
  it('envia a cada socket a projeção montada para o jogador dele', async () => {
    const stub = await sala('CONN-DIFUNDE')
    const ana = await conectarComo(stub, 'j1')
    const bruno = await conectarComo(stub, 'j2')

    await runInDurableObject(stub, (_i, state) => difundir(state, projecaoDe))
    await assentar()

    expect(projecoesDe(ana).map((p) => p.eu)).toEqual([projecaoDe('j1').eu])
    expect(projecoesDe(bruno).map((p) => p.eu)).toEqual([projecaoDe('j2').eu])
  })

  it('a projeção chega embrulhada na mensagem `projecao`', async () => {
    const stub = await sala('CONN-ENVELOPE')
    const ana = await conectarComo(stub, 'j1')

    await runInDurableObject(stub, (_i, state) => difundir(state, projecaoDe))
    await assentar()

    expect(ana.recebidas).toEqual([{ t: 'projecao', dados: projecaoDe('j1') }])
  })

  it('ignora socket sem vínculo sem interromper a difusão aos demais', async () => {
    const stub = await sala('CONN-IGNORA')
    const anonimo = await conectar(stub)
    const ana = await conectarComo(stub, 'j1')

    await runInDurableObject(stub, (_i, state) => difundir(state, projecaoDe))
    await assentar()

    expect(anonimo.recebidas).toEqual([])
    expect(projecoesDe(ana).map((p) => p.eu.id)).toEqual(['j1'])
  })

  it('entrega a mesma projeção aos dois sockets do mesmo jogador', async () => {
    const stub = await sala('CONN-MESMO-JOGADOR')
    const aba1 = await conectarComo(stub, 'j1')
    const aba2 = await conectarComo(stub, 'j1')

    await runInDurableObject(stub, (_i, state) => difundir(state, projecaoDe))
    await assentar()

    expect(projecoesDe(aba1)).toEqual([projecaoDe('j1')])
    expect(projecoesDe(aba2)).toEqual([projecaoDe('j1')])
  })
})
