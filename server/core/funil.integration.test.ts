import { SELF, env, runInDurableObject } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Comando, EstadoSala, Mensagem } from '../../shared/protocolo'
import { carregar, salvar } from './estado'

/**
 * O funil visto de fora, com Durable Object e sockets de verdade.
 *
 * O módulo puro já prova qual transição vira qual evento; o que só esta suíte
 * pode provar é que os ganchos estão nos lugares certos do ciclo de vida da
 * sala — e que a telemetria não atrapalha ninguém quando quebra (`FUN-06`).
 */

interface PontoEscrito {
  blobs?: string[]
  doubles?: number[]
  indexes?: string[]
}

let escritos: PontoEscrito[] = []
let original: AnalyticsEngineDataset['writeDataPoint']

beforeEach(() => {
  escritos = []
  original = env.FUNIL.writeDataPoint
  env.FUNIL.writeDataPoint = (ponto?: AnalyticsEngineDataPoint) => {
    escritos.push(ponto as PontoEscrito)
  }
})

afterEach(() => {
  env.FUNIL.writeDataPoint = original
})

/** Só o que interessa a uma asserção: tipo, jogo e a quantidade. */
function resumo(): string[] {
  return escritos.map((p) => `${p.blobs?.[0]}:${p.blobs?.[1]}:${p.doubles?.[1]}`)
}

function tipos(): (string | undefined)[] {
  return escritos.map((p) => p.blobs?.[0])
}

interface Cliente {
  ws: WebSocket
  recebidas: Mensagem[]
}

async function criarSalaPelaApi(): Promise<string> {
  const resposta = await SELF.fetch('https://resenha.test/api/salas', { method: 'POST' })
  expect(resposta.status).toBe(201)
  return (await resposta.json<{ codigo: string }>()).codigo
}

async function abrir(codigo: string): Promise<Cliente> {
  const resposta = await SELF.fetch(`https://resenha.test/api/salas/${codigo}/ws`, {
    headers: { Upgrade: 'websocket' },
  })
  const ws = resposta.webSocket
  if (ws === null) throw new Error(`sem websocket na resposta (${resposta.status})`)
  const recebidas: Mensagem[] = []
  ws.addEventListener('message', (e) => recebidas.push(JSON.parse(e.data as string) as Mensagem))
  ws.accept()
  return { ws, recebidas }
}

async function assentar(): Promise<void> {
  for (let i = 0; i < 30; i += 1) await new Promise((pronto) => setTimeout(pronto, 1))
}

function mandar(cliente: Cliente, comando: Comando): void {
  cliente.ws.send(JSON.stringify(comando))
}

async function entrar(codigo: string, apelido: string): Promise<Cliente> {
  const cliente = await abrir(codigo)
  mandar(cliente, { t: 'entrar', apelido })
  await assentar()
  if (!cliente.recebidas.some((m) => m.t === 'entrou')) {
    throw new Error(`não entrou: ${JSON.stringify(cliente.recebidas)}`)
  }
  return cliente
}

/**
 * `ESCR-01` — o lobby vira escrita com `iniciar`; `comecar` é o passo seguinte,
 * de escrita para jogo. São dois comandos, e a partida nasce no primeiro.
 */
async function jogarAte(ana: Cliente, bruno: Cliente): Promise<void> {
  mandar(ana, { t: 'iniciar' })
  await assentar()
  mandar(ana, { t: 'escreverCarta', texto: 'girafa' })
  mandar(bruno, { t: 'escreverCarta', texto: 'pinguim' })
  await assentar()
  mandar(ana, { t: 'marcarPronto', pronto: true })
  mandar(bruno, { t: 'marcarPronto', pronto: true })
  await assentar()
  mandar(ana, { t: 'comecar' })
  await assentar()
}

/** Mesma técnica do `expiracao.integration.test.ts`: envelhece o prazo e
 *  dispara o handler de alarme direto. */
function salaDe(codigo: string) {
  return env.SALA.get(env.SALA.idFromName(codigo))
}

async function envelhecerOciosidade(codigo: string): Promise<void> {
  await runInDurableObject(salaDe(codigo), async (_instancia, state) => {
    const sala = await carregar<unknown>(state.storage)
    if (sala === null) throw new Error('sala não encontrada')
    sala.prazos.salaOciosa = Date.now() - 1
    await salvar(state.storage, sala as EstadoSala<unknown>)
  })
}

function dispararAlarme(codigo: string): Promise<void> {
  return runInDurableObject(salaDe(codigo), (instancia) =>
    (instancia as unknown as { alarm(): Promise<void> }).alarm(),
  )
}

describe('funil na sala de verdade', () => {
  it('conta a sala que nasce, uma vez, com o jogo dela (`FUN-01`)', async () => {
    await criarSalaPelaApi()

    expect(resumo()).toEqual(['sala_criada:quem-sou-eu:0'])
  })

  it('conta cada entrada com a posição na chegada (`FUN-02`)', async () => {
    const codigo = await criarSalaPelaApi()

    await entrar(codigo, 'Ana')
    await entrar(codigo, 'Bruno')

    expect(resumo()).toEqual([
      'sala_criada:quem-sou-eu:0',
      'jogador_entrou:quem-sou-eu:1',
      'jogador_entrou:quem-sou-eu:2',
    ])
  })

  it('não conta entrada recusada: sala que não recebeu ninguém não conta (`FUN-02`)', async () => {
    const codigo = await criarSalaPelaApi()
    await entrar(codigo, 'Ana')

    // Apelido repetido é recusado pelo roster antes de qualquer efeito.
    const intruso = await abrir(codigo)
    mandar(intruso, { t: 'entrar', apelido: 'Ana' })
    await assentar()

    expect(intruso.recebidas.some((m) => m.t === 'erro')).toBe(true)
    expect(tipos().filter((t) => t === 'jogador_entrou')).toEqual(['jogador_entrou'])
  })

  it('conta a partida que começa, com quantos estavam na mesa (`FUN-03`)', async () => {
    const codigo = await criarSalaPelaApi()
    const ana = await entrar(codigo, 'Ana')
    await entrar(codigo, 'Bruno')

    mandar(ana, { t: 'iniciar' })
    await assentar()

    expect(resumo().at(-1)).toBe('partida_iniciada:quem-sou-eu:2')
  })

  it('conta a partida uma vez só, mesmo com a fase andando depois (`FUN-03`)', async () => {
    const codigo = await criarSalaPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const bruno = await entrar(codigo, 'Bruno')

    // `comecar` leva a sala de `escrita` para `jogo`: é a mesma partida, e
    // contar de novo aqui dobraria o denominador do funil.
    await jogarAte(ana, bruno)

    expect(tipos().filter((t) => t === 'partida_iniciada')).toEqual(['partida_iniciada'])
  })

  it('conta o encerramento com quantos jogadores havia (`FUN-04`)', async () => {
    const codigo = await criarSalaPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const bruno = await entrar(codigo, 'Bruno')

    await jogarAte(ana, bruno)
    mandar(ana, { t: 'encerrar' })
    await assentar()

    expect(resumo().at(-1)).toBe('partida_encerrada:quem-sou-eu:2')
  })

  it('conta como abandono a mesa que deixou a sala morrer de inatividade (`FUN-11`)', async () => {
    const codigo = await criarSalaPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const bruno = await entrar(codigo, 'Bruno')
    await jogarAte(ana, bruno)

    await envelhecerOciosidade(codigo)
    await dispararAlarme(codigo)
    await assentar()

    // Este caminho apaga a sala sem passar pela fase `encerrada`: sem o gancho
    // próprio, a mesa que abandonou no meio não apareceria em lugar nenhum.
    expect(resumo().at(-1)).toBe('partida_abandonada:quem-sou-eu:2')
  })

  it('não conta abandono quando o lobby expira sem partida (`FUN-11`)', async () => {
    const codigo = await criarSalaPelaApi()
    await entrar(codigo, 'Ana')

    await envelhecerOciosidade(codigo)
    await dispararAlarme(codigo)
    await assentar()

    expect(tipos()).not.toContain('partida_abandonada')
  })

  it('não deixa vazar apelido, id nem código de sala (`FUN-05`)', async () => {
    const codigo = await criarSalaPelaApi()
    const ana = await entrar(codigo, 'Ana')
    await entrar(codigo, 'Bruno')
    mandar(ana, { t: 'iniciar' })
    await assentar()

    const strings = escritos.flatMap((p) => [...(p.blobs ?? []), ...(p.indexes ?? [])])

    expect(strings.filter((s) => s.includes('Ana') || s.includes('Bruno'))).toEqual([])
    expect(strings.filter((s) => s.includes(codigo))).toEqual([])
    // Só sobram tipos de evento, o jogo, e o id opaco da sala — um só, o mesmo
    // em todos os eventos desta sala.
    expect(new Set(escritos.map((p) => p.indexes?.[0])).size).toBe(1)
  })

  it('a mesa joga igual com a telemetria quebrada (`FUN-06`)', async () => {
    env.FUNIL.writeDataPoint = () => {
      throw new Error('dataset fora do ar')
    }

    const codigo = await criarSalaPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const bruno = await entrar(codigo, 'Bruno')
    mandar(ana, { t: 'iniciar' })
    await assentar()

    // A partida andou: a projeção chegou nos dois, na fase nova, e ninguém
    // recebeu erro.
    const ultima = bruno.recebidas.filter((m) => m.t === 'projecao').at(-1)
    expect(ultima?.t === 'projecao' && ultima.dados.sala.fase).toBe('escrita')
    expect(ana.recebidas.filter((m) => m.t === 'erro')).toEqual([])
  })
})
