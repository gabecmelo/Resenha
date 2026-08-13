import {
  env,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
} from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import type { Comando, EstadoSala, Mensagem, Projecao } from '../../shared/protocolo'
import type { EstadoQuemSouEu } from '../games/quem-sou-eu/regras'
import { CHAT_MAX_POR_JANELA } from './chat'
import { carregar, salvar } from './estado'
import { MIGRACAO_HOST_MS } from './sala-do'

type Sala = EstadoSala<EstadoQuemSouEu>

interface Cliente {
  ws: WebSocket
  recebidas: Mensagem[]
}

interface Jogador extends Cliente {
  token: string
  jogadorId: string
}

async function novaSala(nome: string): Promise<DurableObjectStub> {
  const stub = env.SALA.get(env.SALA.idFromName(nome))
  const criada = await stub.fetch('http://sala/criar?codigo=ABCDE', { method: 'POST' })
  if (criada.status !== 201) throw new Error(`criar devolveu ${criada.status}`)
  return stub
}

async function novaSalaComJogo(nome: string, jogoId: string): Promise<DurableObjectStub> {
  const stub = env.SALA.get(env.SALA.idFromName(nome))
  const criada = await stub.fetch(`http://sala/criar?codigo=ABCDE&jogoId=${jogoId}`, { method: 'POST' })
  if (criada.status !== 201) throw new Error(`criar devolveu ${criada.status}`)
  return stub
}

async function abrir(stub: DurableObjectStub, token?: string): Promise<Cliente> {
  const url = token === undefined ? 'http://sala/ws' : `http://sala/ws?token=${token}`
  const resposta = await stub.fetch(url, { headers: { Upgrade: 'websocket' } })
  const ws = resposta.webSocket
  if (ws === null) throw new Error('o Durable Object não devolveu um websocket')

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

async function entrar(stub: DurableObjectStub, apelido: string): Promise<Jogador> {
  const cliente = await abrir(stub)
  mandar(cliente, { t: 'entrar', apelido })
  await assentar()

  const entrou = cliente.recebidas.find((m) => m.t === 'entrou')
  if (entrou === undefined) {
    throw new Error(`não entrou: ${JSON.stringify(cliente.recebidas)}`)
  }
  return { ...cliente, token: entrou.token, jogadorId: entrou.jogadorId }
}

function projecoes(cliente: Cliente): Projecao[] {
  return cliente.recebidas
    .filter((m): m is Extract<Mensagem, { t: 'projecao' }> => m.t === 'projecao')
    .map((m) => m.dados)
}

function ultimaProjecao(cliente: Cliente): Projecao {
  const todas = projecoes(cliente)
  const ultima = todas.at(-1)
  if (ultima === undefined) throw new Error('nenhuma projeção recebida')
  return ultima
}

function erros(cliente: Cliente): Extract<Mensagem, { t: 'erro' }>[] {
  return cliente.recebidas.filter((m): m is Extract<Mensagem, { t: 'erro' }> => m.t === 'erro')
}

function lerSala(stub: DurableObjectStub): Promise<Sala | null> {
  return runInDurableObject(stub, (_i, state) => carregar<EstadoQuemSouEu>(state.storage))
}

/** Antecipa um prazo sem mexer no alarme já agendado. */
async function vencerPrazo(stub: DurableObjectStub, tipo: 'turno' | 'migracaoHost'): Promise<void> {
  await runInDurableObject(stub, async (_i, state) => {
    const sala = await carregar<EstadoQuemSouEu>(state.storage)
    if (sala === null) throw new Error('sala inexistente')
    sala.prazos[tipo] = Date.now() - 1
    await salvar(state.storage, sala)
  })
}

/** Três jogadores na fase de jogo, com a ordem de turnos definida. */
async function partida(
  nome: string,
  tempoTurnoSeg: number | null = null,
): Promise<{ stub: DurableObjectStub; ana: Jogador; bruno: Jogador; carla: Jogador }> {
  const stub = await novaSala(nome)
  const ana = await entrar(stub, 'Ana')
  const bruno = await entrar(stub, 'Bruno')
  const carla = await entrar(stub, 'Carla')

  if (tempoTurnoSeg !== null) {
    mandar(ana, { t: 'configurar', config: { tempoTurnoSeg } })
    await assentar()
  }

  mandar(ana, { t: 'iniciar' })
  await assentar()
  for (const jogador of [ana, bruno, carla]) {
    mandar(jogador, { t: 'escreverCarta', texto: 'Chapolin' })
    mandar(jogador, { t: 'marcarPronto', pronto: true })
    await assentar()
  }
  mandar(ana, { t: 'comecar' })
  await assentar()

  return { stub, ana, bruno, carla }
}

describe('entrada na sala', () => {
  it('emite token de sessão e devolve a projeção inicial (`CONN-01`)', async () => {
    const stub = await novaSala('DO-ENTRAR')

    const ana = await entrar(stub, 'Ana')

    expect(ana.token).toMatch(/^[0-9a-f-]{36}$/)
    expect(ultimaProjecao(ana).eu.id).toBe(ana.jogadorId)
    expect(ultimaProjecao(ana).jogadores.map((j) => j.apelido)).toEqual(['Ana'])
  })

  it('torna host quem cria a sala e entra primeiro (`SALA-01`)', async () => {
    const stub = await novaSala('DO-HOST')

    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')
    await assentar()

    expect(ultimaProjecao(ana).eu.ehHost).toBe(true)
    expect(ultimaProjecao(bruno).eu.ehHost).toBe(false)
  })

  it('recusa apelido repetido só ao autor, sem fechar o socket (`SALA-04`)', async () => {
    const stub = await novaSala('DO-APELIDO')
    const ana = await entrar(stub, 'Ana')

    const intruso = await abrir(stub)
    mandar(intruso, { t: 'entrar', apelido: 'ana' })
    await assentar()

    expect(erros(intruso).map((e) => e.codigo)).toEqual(['APELIDO_EM_USO'])
    expect(intruso.ws.readyState).toBe(WebSocket.READY_STATE_OPEN)
    expect(ultimaProjecao(ana).jogadores).toHaveLength(1)
  })

  it('entrega a cada jogador a projeção montada para ele (AD-008)', async () => {
    const stub = await novaSala('DO-PROJECAO')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')
    await assentar()

    expect(ultimaProjecao(ana).eu.id).toBe(ana.jogadorId)
    expect(ultimaProjecao(bruno).eu.id).toBe(bruno.jogadorId)
  })

  it('devolve 426 a requisição sem header de upgrade', async () => {
    const stub = await novaSala('DO-426')

    const resposta = await stub.fetch('http://sala/ws')

    expect(resposta.status).toBe(426)
  })
})

describe('desconexão e reconexão', () => {
  it('marca desconectado para os outros e preserva a vaga (`CONN-03`)', async () => {
    const stub = await novaSala('DO-QUEDA')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')

    bruno.ws.close()
    await assentar()

    const ficha = ultimaProjecao(ana).jogadores.find((j) => j.id === bruno.jogadorId)
    expect(ficha).toMatchObject({ apelido: 'Bruno', conectado: false })
  })

  it('devolve a mesma vaga a quem reconecta com token válido (`CONN-02`)', async () => {
    const stub = await novaSala('DO-RECONECTA')
    const ana = await entrar(stub, 'Ana')
    const antes = ultimaProjecao(ana)

    ana.ws.close()
    await assentar()
    const volta = await abrir(stub, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    const depois = ultimaProjecao(volta)
    expect(depois.eu.id).toBe(ana.jogadorId)
    expect(depois.jogadores).toEqual([{ ...antes.jogadores[0], conectado: true }])
  })

  it('restaura alvo, carta escrita e notas (`CONN-02`, `NOTA-03`)', async () => {
    const stub = await novaSala('DO-RESTAURA')
    const ana = await entrar(stub, 'Ana')
    await entrar(stub, 'Bruno')
    await entrar(stub, 'Carla')
    mandar(ana, { t: 'iniciar' })
    await assentar()
    mandar(ana, { t: 'escreverCarta', texto: 'Chapolin' })
    mandar(ana, { t: 'notas', texto: 'não é humano' })
    await assentar()
    const alvoAntes = ultimaProjecao(ana).eu.alvo

    ana.ws.close()
    await assentar()
    const volta = await abrir(stub, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect(ultimaProjecao(volta).eu).toMatchObject({
      alvo: alvoAntes,
      cartaQueEscrevi: 'Chapolin',
      notas: 'não é humano',
    })
  })

  it('preserva a posição no rodízio de quem caiu (`JOGO-11`, `CONN-02`)', async () => {
    const { stub, ana, bruno, carla } = await partida('DO-RODIZIO')
    const vezAntes = ultimaProjecao(ana).jogo?.vezDe
    const daVez = [ana, bruno, carla].find((j) => j.jogadorId === vezAntes)
    if (daVez === undefined) throw new Error('ninguém é da vez')

    daVez.ws.close()
    await assentar()
    const volta = await abrir(stub, daVez.token)
    mandar(volta, { t: 'ola', token: daVez.token })
    await assentar()

    expect(ultimaProjecao(volta).jogo?.vezDe).toBe(vezAntes)
    expect(ultimaProjecao(volta).jogo?.ordem).toEqual(ultimaProjecao(ana).jogo?.ordem)
  })

  it('recusa `ola` com token desconhecido e fecha o socket', async () => {
    const stub = await novaSala('DO-TOKEN-RUIM')
    await entrar(stub, 'Ana')

    const intruso = await abrir(stub)
    mandar(intruso, { t: 'ola', token: 'token-que-nunca-existiu' })
    await assentar()

    expect(erros(intruso).map((e) => e.codigo)).toEqual(['JOGADOR_NAO_ENCONTRADO'])
    expect(intruso.ws.readyState).not.toBe(WebSocket.READY_STATE_OPEN)
  })
})

describe('migração automática de host (`HOST-04`)', () => {
  it('passa o comando quando o host completa 30s desconectado', async () => {
    const stub = await novaSala('DO-MIGRA')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')
    await entrar(stub, 'Carla')

    // Referência presa ao instante da desconexão: comparar com `Date.now()` na
    // asserção mediria um relógio que já andou durante o alarme e as esperas.
    const desconectouEm = Date.now()
    ana.ws.close()
    await assentar()
    const prazo = (await lerSala(stub))?.prazos.migracaoHost
    await vencerPrazo(stub, 'migracaoHost')
    await runDurableObjectAlarm(stub)
    await assentar()

    expect(prazo).toBeGreaterThanOrEqual(desconectouEm + MIGRACAO_HOST_MS)
    expect(prazo).toBeLessThan(desconectouEm + MIGRACAO_HOST_MS + 5_000)
    expect((await lerSala(stub))?.hostId).toBe(bruno.jogadorId)
  })

  it('anuncia a troca a todos (`CHAT-03`)', async () => {
    const stub = await novaSala('DO-MIGRA-ANUNCIO')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')

    ana.ws.close()
    await vencerPrazo(stub, 'migracaoHost')
    await runDurableObjectAlarm(stub)
    await assentar()

    expect(ultimaProjecao(bruno).chat.map((m) => m.texto)).toContain(
      'Bruno agora comanda a sala.',
    )
    expect(ultimaProjecao(bruno).eu.ehHost).toBe(true)
  })

  it('cancela a migração quando o host volta dentro da janela', async () => {
    const stub = await novaSala('DO-MIGRA-CANCELA')
    const ana = await entrar(stub, 'Ana')
    await entrar(stub, 'Bruno')

    ana.ws.close()
    await assentar()
    const volta = await abrir(stub, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect((await lerSala(stub))?.prazos.migracaoHost).toBeNull()
    expect((await lerSala(stub))?.hostId).toBe(ana.jogadorId)
  })

  it('mantém o ex-host como jogador comum ao reconectar (`HOST-05`)', async () => {
    const stub = await novaSala('DO-EX-HOST')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')

    ana.ws.close()
    await vencerPrazo(stub, 'migracaoHost')
    await runDurableObjectAlarm(stub)
    await assentar()
    const volta = await abrir(stub, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect(ultimaProjecao(volta).eu.ehHost).toBe(false)
    expect(ultimaProjecao(volta).sala.hostId).toBe(bruno.jogadorId)
  })
})

describe('hibernação (AD-005, `CONN-05`)', () => {
  it('avança a vez pelo prazo de turno mesmo com o Durable Object hibernado (`JOGO-07`)', async () => {
    const { stub, ana } = await partida('DO-PRAZO-TURNO', 30)
    const vezAntes = ultimaProjecao(ana).jogo?.vezDe

    await vencerPrazo(stub, 'turno')
    await evictDurableObject(stub)
    await runDurableObjectAlarm(stub)
    await assentar()

    expect((await lerSala(stub))?.jogo?.vezDe).not.toBe(vezAntes)
    expect(ultimaProjecao(ana).jogo?.vezDe).not.toBe(vezAntes)
  })

  it('o comando seguinte à hibernação opera sobre o estado recarregado do storage', async () => {
    const { stub, ana } = await partida('DO-HIBERNA-COMANDO')
    const cartasAntes = ultimaProjecao(ana).jogadores.filter((j) => j.carta !== undefined).length

    await evictDurableObject(stub)
    mandar(ana, { t: 'chat', texto: 'voltei' })
    await assentar()

    const depois = ultimaProjecao(ana)
    expect(depois.sala.fase).toBe('jogo')
    expect(depois.jogadores.filter((j) => j.carta !== undefined)).toHaveLength(cartasAntes)
    expect(depois.chat.at(-1)?.texto).toBe('voltei')
  })

  it('não guarda nenhum campo mutável de sala em campo de instância', async () => {
    const { stub } = await partida('DO-SEM-CAMPO')

    const campos = await runInDurableObject(stub, (instancia) =>
      Object.keys(instancia as unknown as Record<string, unknown>),
    )

    expect(campos.sort()).toEqual(['ctx', 'env', 'registro', 'pacotesCacheTimestamp', 'pacotesDisponiveis'].sort())
  })
})

describe('robustez do socket', () => {
  it('descarta JSON malformado sem derrubar o socket', async () => {
    const stub = await novaSala('DO-JSON-RUIM')
    const ana = await entrar(stub, 'Ana')
    const recebidasAntes = ana.recebidas.length

    ana.ws.send('{isso não é json')
    await assentar()

    expect(ana.ws.readyState).toBe(WebSocket.READY_STATE_OPEN)
    expect(ana.recebidas).toHaveLength(recebidasAntes)
    mandar(ana, { t: 'chat', texto: 'sigo aqui' })
    await assentar()
    expect(ultimaProjecao(ana).chat.at(-1)?.texto).toBe('sigo aqui')
  })

  it('recusa comando de socket que ainda não se identificou', async () => {
    const stub = await novaSala('DO-ANONIMO')
    await entrar(stub, 'Ana')

    const anonimo = await abrir(stub)
    mandar(anonimo, { t: 'chat', texto: 'oi' })
    await assentar()

    expect(erros(anonimo).map((e) => e.codigo)).toEqual(['SEM_AUTORIDADE'])
    expect(anonimo.ws.readyState).toBe(WebSocket.READY_STATE_OPEN)
  })

  it('fecha o socket de quem sai e libera a vaga (`CONN-06`)', async () => {
    const stub = await novaSala('DO-SAIR')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')

    mandar(bruno, { t: 'sair' })
    await assentar()

    expect(bruno.ws.readyState).not.toBe(WebSocket.READY_STATE_OPEN)
    expect(ultimaProjecao(ana).jogadores.map((j) => j.apelido)).toEqual(['Ana'])
  })

  it('para de projetar para o jogador expulso (`HOST-02`)', async () => {
    const stub = await novaSala('DO-EXPULSA')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')
    await assentar()
    const recebidasAntes = bruno.recebidas.length

    mandar(ana, { t: 'expulsar', jogadorId: bruno.jogadorId })
    await assentar()

    expect(bruno.recebidas).toHaveLength(recebidasAntes)
    expect(ultimaProjecao(ana).jogadores.map((j) => j.apelido)).toEqual(['Ana'])
  })
})

/** Leva um grupo do lobby ao jogo, com as cartas escritas e o PRONTO marcado. */
async function jogoCom(
  nome: string,
  apelidos: string[],
  tempoTurnoSeg: number | null = null,
): Promise<{ stub: DurableObjectStub; jogadores: Jogador[] }> {
  const stub = await novaSala(nome)
  const jogadores: Jogador[] = []
  for (const apelido of apelidos) jogadores.push(await entrar(stub, apelido))
  const host = jogadores[0]

  if (tempoTurnoSeg !== null) {
    mandar(host, { t: 'configurar', config: { tempoTurnoSeg } })
    await assentar()
  }

  mandar(host, { t: 'iniciar' })
  await assentar()
  for (const jogador of jogadores) {
    mandar(jogador, { t: 'escreverCarta', texto: `carta de ${jogador.jogadorId}` })
    mandar(jogador, { t: 'marcarPronto', pronto: true })
    await assentar()
  }
  mandar(host, { t: 'comecar' })
  await assentar()

  return { stub, jogadores }
}

/** "Descobri!" de `quem`, confirmado por `confirmador`. */
async function descobre(quem: Jogador, confirmador: Jogador): Promise<void> {
  mandar(quem, { t: 'declararDescobri' })
  await assentar()
  mandar(confirmador, { t: 'responderDeclaracao', aceita: true })
  await assentar()
}

describe('partida em dois (`AJU-06`, `AJU-09`, `AJU-13`)', () => {
  it('vai do lobby ao encerramento com apenas 2 jogadores', async () => {
    const { stub, jogadores } = await jogoCom('DO-DOIS', ['Ana', 'Bruno'], 30)
    const [ana, bruno] = jogadores
    expect(ultimaProjecao(ana).sala.fase).toBe('jogo')
    expect(ultimaProjecao(ana).jogo?.ordem).toHaveLength(2)

    // `AJU-09` — com Bruno fora do rodízio, Ana continua jogando sozinha.
    await descobre(bruno, ana)
    const meio = ultimaProjecao(ana)
    expect({
      fase: meio.sala.fase,
      ordem: meio.jogo?.ordem,
      vezDe: meio.jogo?.vezDe,
      prazoTurno: meio.jogo?.prazoTurno,
    }).toEqual({
      fase: 'jogo',
      ordem: [ana.jogadorId],
      vezDe: ana.jogadorId,
      prazoTurno: null,
    })
    expect((await lerSala(stub))?.prazos.turno).toBeNull()

    // `AJU-13` — a declaração da última revela tudo e encerra.
    await descobre(ana, bruno)
    const fim = ultimaProjecao(ana)
    expect(fim.sala.fase).toBe('encerrada')
    expect(fim.jogadores.every((j) => j.carta !== undefined)).toBe(true)
    expect(ultimaProjecao(bruno).jogadores.every((j) => j.carta !== undefined)).toBe(true)
    // A própria carta só existe no payload depois da revelação (`JOGO-02`).
    expect(fim.eu.minhaCarta).toBe(fim.jogadores.find((j) => j.id === ana.jogadorId)?.carta)
    expect(fim.eu.minhaCarta).toMatch(/^carta de /)
  })
})

describe('o último do rodízio continua jogando (`AJU-09`, `AJU-11`, `AJU-13`)', () => {
  it('mantém a vez e desliga o cronômetro quando os outros dois descobrem', async () => {
    const { stub, jogadores } = await jogoCom('DO-ULTIMO', ['Ana', 'Bruno', 'Carla'], 30)
    const [ana, bruno, carla] = jogadores
    expect((await lerSala(stub))?.prazos.turno).not.toBeNull()

    await descobre(bruno, ana)
    await descobre(carla, ana)

    const depois = ultimaProjecao(ana)
    expect({
      fase: depois.sala.fase,
      ordem: depois.jogo?.ordem,
      vezDe: depois.jogo?.vezDe,
      prazoTurno: depois.jogo?.prazoTurno,
    }).toEqual({
      fase: 'jogo',
      ordem: [ana.jogadorId],
      vezDe: ana.jogadorId,
      prazoTurno: null,
    })
    expect((await lerSala(stub))?.prazos.turno).toBeNull()
  })

  it('revela todas as cartas a todos e move a sala para encerrada (`AJU-13`)', async () => {
    const { jogadores } = await jogoCom('DO-ULTIMO-FIM', ['Ana', 'Bruno', 'Carla'], 30)
    const [ana, bruno, carla] = jogadores
    await descobre(bruno, ana)
    await descobre(carla, ana)

    await descobre(ana, bruno)

    for (const jogador of [ana, bruno, carla]) {
      const projecao = ultimaProjecao(jogador)
      expect({
        de: jogador.jogadorId,
        fase: projecao.sala.fase,
        cartas: projecao.jogadores.filter((j) => j.carta !== undefined).length,
        // `FIM-02` — a própria carta passa a existir no payload de quem a recebe.
        minhaCarta: projecao.eu.minhaCarta,
      }).toEqual({
        de: jogador.jogadorId,
        fase: 'encerrada',
        cartas: 3,
        minhaCarta: projecao.jogadores.find((j) => j.id === jogador.jogadorId)?.carta,
      })
      expect(projecao.eu.minhaCarta).toMatch(/^carta de /)
    }
  })
})

describe('o chat preserva o autor que saiu (`AJU-16`)', () => {
  it('mantém apelido e cor da mensagem depois de o autor deixar a sala', async () => {
    const stub = await novaSala('DO-CHAT-AUTOR')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')
    await assentar()
    const corDeBruno = ultimaProjecao(ana).jogadores.find((j) => j.id === bruno.jogadorId)?.cor

    mandar(bruno, { t: 'chat', texto: 'até mais' })
    await assentar()
    mandar(bruno, { t: 'sair' })
    await assentar()

    const visao = ultimaProjecao(ana)
    // Controle: o autor não está mais na lista, então o apelido só pode vir da
    // própria mensagem.
    expect(visao.jogadores.map((j) => j.id)).toEqual([ana.jogadorId])
    expect(visao.chat.find((m) => m.texto === 'até mais')).toEqual({
      tipo: 'jogador',
      autorId: bruno.jogadorId,
      apelido: 'Bruno',
      cor: corDeBruno,
      texto: 'até mais',
      em: expect.any(Number),
    })
  })
})

describe('registro de jogos (`HUB-01`, `HUB-05`, `HUB-12`)', () => {
  it('a sala criada guarda o jogoId padrão quando nenhum é pedido', async () => {
    const stub = await novaSala('DO-JOGO-ID-PADRAO')
    const ana = await entrar(stub, 'Ana')

    expect(ultimaProjecao(ana).sala.jogoId).toBe('quem-sou-eu')
    expect((await lerSala(stub))?.jogoId).toBe('quem-sou-eu')
  })

  it('a reconexão reflete o jogoId da sala na projeção', async () => {
    const stub = await novaSala('DO-JOGO-ID-RECONECTA')
    const ana = await entrar(stub, 'Ana')

    ana.ws.close()
    await assentar()
    const volta = await abrir(stub, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect(ultimaProjecao(volta).sala.jogoId).toBe('quem-sou-eu')
  })

  it('roteia o comando ao módulo certo via registro (`iniciar` avança a fase)', async () => {
    const stub = await novaSala('DO-JOGO-ID-ROTEIA')
    const ana = await entrar(stub, 'Ana')
    await entrar(stub, 'Bruno')
    await entrar(stub, 'Carla')

    mandar(ana, { t: 'iniciar' })
    await assentar()

    expect(ultimaProjecao(ana).sala.fase).toBe('escrita')
  })

  it('trocarJogo aceito difunde o jogoId e a config resetada pra todo jogador conectado (`HUB-12`)', async () => {
    const stub = await novaSala('DO-TROCA-DIFUNDE')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')

    // Config não-padrão, pra provar que o reset de fato aconteceu.
    mandar(ana, { t: 'configurar', config: { tempoTurnoSeg: 30 } })
    await assentar()
    expect(ultimaProjecao(bruno).sala.config.tempoTurnoSeg).toBe(30)

    // Jogo atual diferente do alvo, pra que a troca a seguir não seja idempotente (`HUB-09`).
    await runInDurableObject(stub, async (_i, state) => {
      const sala = await carregar<EstadoQuemSouEu>(state.storage)
      if (sala === null) throw new Error('sala inexistente')
      sala.jogoId = 'jogo-anterior-fake'
      await salvar(state.storage, sala)
    })

    mandar(ana, { t: 'trocarJogo', jogoId: 'quem-sou-eu' })
    await assentar()

    // Bruno não mandou nada — a atualização só pode ter chegado por difusão.
    expect(ultimaProjecao(bruno).sala.jogoId).toBe('quem-sou-eu')
    expect(ultimaProjecao(bruno).sala.config.tempoTurnoSeg).toBe(null)
  })

  it('jogo ausente do registro falha fechado: comando ainda é aceito, só a difusão daquele ciclo é pulada (Edge Case)', async () => {
    const stub = await novaSala('DO-JOGO-AUSENTE')
    const ana = await entrar(stub, 'Ana')

    await runInDurableObject(stub, async (_i, state) => {
      const sala = await carregar<EstadoQuemSouEu>(state.storage)
      if (sala === null) throw new Error('sala inexistente')
      sala.jogoId = 'jogo-removido-do-registro'
      await salvar(state.storage, sala)
    })

    const projecoesAntes = projecoes(ana).length

    mandar(ana, { t: 'chat', texto: 'ainda funciono?' })
    await assentar()
    expect(ana.ws.readyState).toBe(WebSocket.OPEN)

    // A sala não trava nem lança: o comando é processado e persistido, só a
    // difusão daquele ciclo é pulada porque `jogoAtual()` não resolveu nada.
    expect(erros(ana)).toEqual([])
    expect(projecoes(ana).length).toBe(projecoesAntes)
    expect((await lerSala(stub))?.chat.at(-1)?.texto).toBe('ainda funciono?')

    // E a sala segue viva pra comandos seguintes, mesmo sem o jogo resolvido.
    mandar(ana, { t: 'chat', texto: 'segundo comando' })
    await assentar()
    expect((await lerSala(stub))?.chat.at(-1)?.texto).toBe('segundo comando')
  })
})

describe('filtro de pacotes por jogoId na projeção (T10, `ESP-22`)', () => {
  it('sala de Espião só vê pacotes com jogoId === "espiao"', async () => {
    const stub = await novaSalaComJogo('DO-PACOTES-ESPIAO', 'espiao')
    const ana = await entrar(stub, 'Ana')

    mandar(ana, { t: 'configurar', config: { modoPacote: 'pacote' } })
    await assentar()

    const pacotes = ultimaProjecao(ana).sala.pacotesDisponiveis ?? []
    expect(pacotes.length).toBeGreaterThan(0)
    expect(pacotes.every((p) => p.jogoId === 'espiao')).toBe(true)
  })

  it('sala de Quem Sou Eu só vê pacotes com jogoId === "quem-sou-eu" (sem regressão)', async () => {
    const stub = await novaSala('DO-PACOTES-QSE')
    const ana = await entrar(stub, 'Ana')

    mandar(ana, { t: 'configurar', config: { modoPacote: 'pacote' } })
    await assentar()

    const pacotes = ultimaProjecao(ana).sala.pacotesDisponiveis ?? []
    expect(pacotes.length).toBeGreaterThan(0)
    expect(pacotes.every((p) => p.jogoId === 'quem-sou-eu')).toBe(true)
  })
})

describe('limite de taxa do chat (`CHAT-02`)', () => {
  it('avisa apenas o autor quando descarta a mensagem excedente', async () => {
    const stub = await novaSala('DO-CHAT-TAXA')
    const ana = await entrar(stub, 'Ana')
    const bruno = await entrar(stub, 'Bruno')
    await assentar()

    for (let i = 0; i <= CHAT_MAX_POR_JANELA; i += 1) mandar(ana, { t: 'chat', texto: `m${i}` })
    await assentar()

    expect(erros(ana).map((e) => e.codigo)).toEqual(['CHAT_LIMITE_DE_TAXA'])
    expect(erros(bruno)).toEqual([])
  })
})
