import { SELF, env, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import type { Comando, EstadoSala, Mensagem } from '../../shared/protocolo'
import type { EstadoQuemSouEu } from '../games/quem-sou-eu/regras'
import { carregar, salvar } from './estado'
import { SALA_OCIOSA_MS, SALA_VAZIA_MS } from './sala-do'

type Sala = EstadoSala<EstadoQuemSouEu>

interface Cliente {
  ws: WebSocket
  recebidas: Mensagem[]
}

async function criarPelaApi(): Promise<string> {
  const resposta = await SELF.fetch('https://resenha.test/api/salas', { method: 'POST' })
  const corpo = await resposta.json<{ codigo: string }>()
  return corpo.codigo
}

async function abrir(codigo: string, token?: string): Promise<Cliente> {
  const consulta = token === undefined ? '' : `?token=${token}`
  const resposta = await SELF.fetch(`https://resenha.test/api/salas/${codigo}/ws${consulta}`, {
    headers: { Upgrade: 'websocket' },
  })
  const ws = resposta.webSocket
  if (ws === null) throw new Error(`sem websocket na resposta (${resposta.status})`)

  const recebidas: Mensagem[] = []
  ws.addEventListener('message', (evento) => {
    recebidas.push(JSON.parse(evento.data as string) as Mensagem)
  })
  ws.accept()
  return { ws, recebidas }
}

async function assentar(): Promise<void> {
  for (let i = 0; i < 30; i += 1) await new Promise((pronto) => setTimeout(pronto, 1))
}

function mandar(cliente: Cliente, comando: Comando): void {
  cliente.ws.send(JSON.stringify(comando))
}

async function entrar(codigo: string, apelido: string): Promise<Cliente & { token: string }> {
  const cliente = await abrir(codigo)
  mandar(cliente, { t: 'entrar', apelido })
  await assentar()
  const entrou = cliente.recebidas.find((m) => m.t === 'entrou')
  if (entrou === undefined) throw new Error('não entrou')
  return { ...cliente, token: entrou.token }
}

function salaDe(codigo: string) {
  return env.SALA.get(env.SALA.idFromName(codigo))
}

function lerSala(codigo: string): Promise<Sala | null> {
  return runInDurableObject(salaDe(codigo), (_i, state) => carregar<EstadoQuemSouEu>(state.storage))
}

/** Envelhece a sala mexendo nos prazos gravados, sem esperar o relógio real. */
async function envelhecer(codigo: string, mudanca: (sala: Sala) => void): Promise<void> {
  await runInDurableObject(salaDe(codigo), async (_i, state) => {
    const sala = await carregar<EstadoQuemSouEu>(state.storage)
    if (sala === null) throw new Error('sala inexistente')
    mudanca(sala)
    await salvar(state.storage, sala)
  })
}

/**
 * Dispara o handler de alarme direto. Agendar para o passado não deixa nada
 * pendente para `runDurableObjectAlarm` colher — o que se quer verificar aqui
 * é o que o handler faz quando o prazo venceu, não o agendamento em si (esse
 * tem teste próprio no fim do arquivo).
 */
function dispararAlarme(codigo: string): Promise<void> {
  return runInDurableObject(salaDe(codigo), (instancia) =>
    (instancia as unknown as { alarm(): Promise<void> }).alarm(),
  )
}

describe('expiração por sala vazia (CONN-07)', () => {
  it('agenda a expiração quando o último jogador se desconecta', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const antes = Date.now()

    ana.ws.close()
    await assentar()

    const prazo = (await lerSala(codigo))?.prazos.salaVazia
    expect(prazo).not.toBeNull()
    expect(prazo).toBeGreaterThanOrEqual(antes + SALA_VAZIA_MS)
  })

  it('destrói a sala quando o prazo de sala vazia vence', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    ana.ws.close()
    await assentar()

    await envelhecer(codigo, (sala) => {
      sala.prazos.salaVazia = Date.now() - 1
    })
    await dispararAlarme(codigo)

    expect(await lerSala(codigo)).toBeNull()
  })

  it('o código volta a ser sala não encontrada depois da destruição', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    ana.ws.close()
    await assentar()
    await envelhecer(codigo, (sala) => {
      sala.prazos.salaVazia = Date.now() - 1
    })
    await dispararAlarme(codigo)

    const cliente = await abrir(codigo)
    await assentar()

    expect(cliente.recebidas).toEqual([
      { t: 'erro', codigo: 'SALA_NAO_ENCONTRADA', mensagem: 'Sala não encontrada.' },
    ])
  })

  it('uma reconexão dentro da janela cancela a expiração por sala vazia', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    ana.ws.close()
    await assentar()
    expect((await lerSala(codigo))?.prazos.salaVazia).not.toBeNull()

    const volta = await abrir(codigo, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect((await lerSala(codigo))?.prazos.salaVazia).toBeNull()
  })

  it('não expira enquanto houver jogador conectado', async () => {
    const codigo = await criarPelaApi()
    await entrar(codigo, 'Ana')

    expect((await lerSala(codigo))?.prazos.salaVazia).toBeNull()
  })
})

describe('expiração por ociosidade (CONN-08)', () => {
  it('agenda a expiração a partir da última ação do jogador', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    mandar(ana, { t: 'chat', texto: 'bora' })
    await assentar()

    const sala = await lerSala(codigo)
    expect(sala?.prazos.salaOciosa).toBe((sala?.ultimaAcaoEm ?? 0) + SALA_OCIOSA_MS)
  })

  it('destrói a sala ociosa mesmo com socket aberto', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')

    await envelhecer(codigo, (sala) => {
      sala.prazos.salaOciosa = Date.now() - 1
    })
    await dispararAlarme(codigo)
    await assentar()

    expect(await lerSala(codigo)).toBeNull()
    expect(ana.recebidas.at(-1)).toEqual({
      t: 'erro',
      codigo: 'SALA_EXPIRADA',
      mensagem: 'Esta sala expirou.',
    })
  })

  it('uma ação de jogador empurra o prazo de ociosidade para frente', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const primeiro = (await lerSala(codigo))?.prazos.salaOciosa ?? 0

    await new Promise((pronto) => setTimeout(pronto, 5))
    mandar(ana, { t: 'chat', texto: 'ainda estou aqui' })
    await assentar()

    expect((await lerSala(codigo))?.prazos.salaOciosa).toBeGreaterThan(primeiro)
  })
})

describe('convivência dos prazos no alarme único (AD-010)', () => {
  it('agendar o prazo de turno não cancela os prazos de expiração', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const bruno = await entrar(codigo, 'Bruno')
    await entrar(codigo, 'Carla')

    mandar(ana, { t: 'configurar', config: { tempoTurnoSeg: 30 } })
    mandar(ana, { t: 'iniciar' })
    await assentar()
    bruno.ws.close()
    await assentar()
    mandar(ana, { t: 'chat', texto: 'valendo' })
    await assentar()

    const sala = await lerSala(codigo)
    expect(sala?.prazos.turno).toBeNull() // ainda na escrita
    expect(sala?.prazos.salaOciosa).not.toBeNull()
    expect(sala?.prazos.salaVazia).toBeNull() // Ana e Carla seguem conectadas
  })

  it('o alarme fica marcado para o prazo mais próximo entre todos', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    ana.ws.close()
    await assentar()

    const agendado = await runInDurableObject(salaDe(codigo), (_i, state) =>
      state.storage.getAlarm(),
    )
    const sala = await lerSala(codigo)
    const pendentes = Object.values(sala?.prazos ?? {}).filter((p): p is number => p !== null)

    // Com o host caído há três prazos vivos ao mesmo tempo: migração de host
    // (30s), sala vazia (30min) e ociosidade (6h). O alarme é do mais próximo.
    expect(pendentes).toHaveLength(3)
    expect(agendado).toBe(Math.min(...pendentes))
    expect(agendado).toBe(sala?.prazos.migracaoHost)
  })
})
