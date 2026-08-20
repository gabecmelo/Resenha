import { SELF, env, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import type { Comando, EstadoSala, Jogador, Mensagem, Projecao } from '../shared/protocolo'
import { ALFABETO_CODIGO } from './core/codigo'
import { carregar, salvar } from './core/estado'
import type { EstadoQuemSouEu } from './games/quem-sou-eu/regras'
import { criarSala } from './index'

type Sala = EstadoSala<EstadoQuemSouEu>

interface Cliente {
  ws: WebSocket
  recebidas: Mensagem[]
}

async function criarPelaApi(limiteJogadores?: number): Promise<string> {
  const resposta = await postSalas(limiteJogadores === undefined ? undefined : { limiteJogadores })
  expect(resposta.status).toBe(201)
  const corpo = await resposta.json<{ codigo: string }>()
  return corpo.codigo
}

/** Corpo ausente é o cliente que não escolhe limite nenhum (`AJU-36`). */
function postSalas(corpo?: unknown): Promise<Response> {
  return SELF.fetch('https://resenha.test/api/salas', {
    method: 'POST',
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  })
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

/** Igual à de `sala-do.integration.test.ts`: janela fixa sem argumento, espera
 * por condição com ele. Ver o comentário de lá. */
async function assentar(pronto?: () => boolean): Promise<void> {
  const tentativas = pronto === undefined ? 30 : 400
  for (let i = 0; i < tentativas; i += 1) {
    if (pronto?.() === true) return
    await new Promise((resolver) => setTimeout(resolver, 1))
  }
}

function mandar(cliente: Cliente, comando: Comando): void {
  cliente.ws.send(JSON.stringify(comando))
}

async function entrar(
  codigo: string,
  apelido: string,
): Promise<Cliente & { token: string; jogadorId: string }> {
  const cliente = await abrir(codigo)
  mandar(cliente, { t: 'entrar', apelido })
  await assentar(
    () =>
      cliente.recebidas.some((m) => m.t === 'entrou') &&
      cliente.recebidas.some((m) => m.t === 'projecao'),
  )

  const entrou = cliente.recebidas.find((m) => m.t === 'entrou')
  if (entrou === undefined) throw new Error(`não entrou: ${JSON.stringify(cliente.recebidas)}`)
  return { ...cliente, token: entrou.token, jogadorId: entrou.jogadorId }
}

function erros(cliente: Cliente): Extract<Mensagem, { t: 'erro' }>[] {
  return cliente.recebidas.filter((m): m is Extract<Mensagem, { t: 'erro' }> => m.t === 'erro')
}

function ultimaProjecao(cliente: Cliente): Projecao {
  const ultima = cliente.recebidas
    .filter((m): m is Extract<Mensagem, { t: 'projecao' }> => m.t === 'projecao')
    .at(-1)
  if (ultima === undefined) throw new Error('nenhuma projeção recebida')
  return ultima.dados
}

function salaDe(codigo: string) {
  return env.SALA.get(env.SALA.idFromName(codigo))
}

function lerSala(codigo: string): Promise<Sala | null> {
  return runInDurableObject(salaDe(codigo), (_i, state) =>
    carregar<EstadoQuemSouEu>(state.storage),
  )
}

async function encherSala(codigo: string, quantidade: number): Promise<void> {
  await runInDurableObject(salaDe(codigo), async (_i, state) => {
    const sala = await carregar<EstadoQuemSouEu>(state.storage)
    if (sala === null) throw new Error('sala inexistente')
    sala.jogadores = Array.from({ length: quantidade }, (_, i) => ({
      id: `j${i}`,
      tokenHash: `hash-${i}`,
      apelido: `Jogador ${i}`,
      cor: 'vermelho',
      entrouEm: i,
      conectado: true,
      desconectadoEm: null,
      situacao: 'ativo',
    })) as Jogador[]
    await salvar(state.storage, sala)
  })
}

describe('POST /api/salas', () => {
  it('devolve um código de 5 letras do alfabeto sem ambíguos (`SALA-01`)', async () => {
    const codigo = await criarPelaApi()

    expect(codigo).toHaveLength(5)
    expect([...codigo].every((letra) => ALFABETO_CODIGO.includes(letra))).toBe(true)
  })

  it('inicializa o Durable Object no lobby, com os padrões (`CFG-05`)', async () => {
    const codigo = await criarPelaApi()

    expect(await lerSala(codigo)).toMatchObject({
      codigo,
      fase: 'lobby',
      jogadores: [],
      config: { ordemTurnos: 'sorteada', tempoTurnoSeg: null },
    })
  })

  it('sorteia outro código quando o sorteado colide com sala viva', async () => {
    // 0 → 'AAAAA' (sala criada logo abaixo); 0.5 → índice 12 do alfabeto.
    const colidido = 'AAAAA'
    const seguinte = ALFABETO_CODIGO[Math.floor(0.5 * ALFABETO_CODIGO.length)].repeat(5)
    await salaDe(colidido).fetch(`http://sala/criar?codigo=${colidido}`, { method: 'POST' })
    await entrar(colidido, 'Ana')

    const sorteios = [0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const resposta = await criarSala(env, () => sorteios[i++])

    expect(await resposta.json()).toEqual({ codigo: seguinte })
    // A sala que já existia com o código colidido continua intacta.
    expect((await lerSala(colidido))?.jogadores.map((j) => j.apelido)).toEqual(['Ana'])
  })

  it('guarda na sala o limite escolhido na criação (`AJU-35`)', async () => {
    const codigo = await criarPelaApi(3)

    expect((await lerSala(codigo))?.limiteJogadores).toBe(3)
  })

  it('aplica o padrão de 20 quando a criação não traz limite (`AJU-36`)', async () => {
    const codigo = await criarPelaApi()

    expect((await lerSala(codigo))?.limiteJogadores).toBe(20)
  })

  it('recusa a criação com limite fora da faixa (`AJU-38`)', async () => {
    const resposta = await postSalas({ limiteJogadores: 21 })

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: 'LIMITE_INVALIDO' })
  })

  it('recusa a criação com limite abaixo do mínimo da partida (`AJU-38`)', async () => {
    const resposta = await postSalas({ limiteJogadores: 1 })

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: 'LIMITE_INVALIDO' })
  })

  it('recusa a criação com limite não inteiro (`AJU-38`)', async () => {
    const resposta = await postSalas({ limiteJogadores: 4.5 })

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: 'LIMITE_INVALIDO' })
  })

  it('não responde a GET na rota de criação', async () => {
    const resposta = await SELF.fetch('https://resenha.test/api/salas')

    expect(resposta.status).toBe(404)
  })
})

describe('POST /api/salas — jogoId (`HUB-01`, `HUB-02`, `HUB-03`, `HUB-04`, `HUB-05`)', () => {
  it('sem jogoId no corpo, a sala nasce com o jogo padrão (`HUB-04`)', async () => {
    const codigo = await criarPelaApi()

    expect((await lerSala(codigo))?.jogoId).toBe('quem-sou-eu')
  })

  it('com jogoId válido no corpo, a sala nasce com aquele jogo e a projeção reflete (`HUB-01`, `HUB-05`)', async () => {
    const resposta = await postSalas({ jogoId: 'quem-sou-eu' })
    expect(resposta.status).toBe(201)
    const { codigo } = await resposta.json<{ codigo: string }>()

    expect((await lerSala(codigo))?.jogoId).toBe('quem-sou-eu')
    const ana = await entrar(codigo, 'Ana')
    expect(ultimaProjecao(ana).sala.jogoId).toBe('quem-sou-eu')
  })

  it('recusa a criação com jogoId fora do registro, sem acordar o Durable Object (`HUB-02`, `HUB-03`)', async () => {
    const resposta = await postSalas({ jogoId: 'jogo-que-nao-existe' })

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: 'JOGO_INVALIDO' })
  })
})

describe('GET /api/salas/:codigo/ws', () => {
  it('aceita a conexão numa sala viva', async () => {
    const codigo = await criarPelaApi()

    const ana = await entrar(codigo, 'Ana')

    expect(ultimaProjecao(ana).sala.codigo).toBe(codigo)
  })

  it('devolve `SALA_NAO_ENCONTRADA` e fecha quando o código não é de sala viva (`SALA-06`)', async () => {
    const cliente = await abrir('ZZZZZ')
    await assentar()

    expect(erros(cliente).map((e) => e.codigo)).toEqual(['SALA_NAO_ENCONTRADA'])
    expect(cliente.ws.readyState).not.toBe(WebSocket.READY_STATE_OPEN)
  })

  it('recusa a conexão quando a sala já tem 20 jogadores (`SALA-05`)', async () => {
    const codigo = await criarPelaApi()
    await encherSala(codigo, 20)

    const cliente = await abrir(codigo)
    await assentar()

    expect(erros(cliente).map((e) => e.codigo)).toEqual(['SALA_CHEIA'])
    expect(cliente.ws.readyState).not.toBe(WebSocket.READY_STATE_OPEN)
  })

  it('aceita quem já tem vaga mesmo com a sala cheia (`CONN-02`)', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    await encherSala(codigo, 19)
    await runInDurableObject(salaDe(codigo), async (_i, state) => {
      const sala = await carregar<EstadoQuemSouEu>(state.storage)
      if (sala === null) throw new Error('sala inexistente')
      sala.jogadores.push({
        id: ana.jogadorId,
        tokenHash: await hashDeToken(ana.token),
        apelido: 'Ana',
        cor: 'laranja',
        entrouEm: 0,
        conectado: false,
        desconectadoEm: 1,
        situacao: 'ativo',
      })
      await salvar(state.storage, sala)
    })

    const volta = await abrir(codigo, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect(ultimaProjecao(volta).eu.id).toBe(ana.jogadorId)
  })

  it('recusa a quarta pessoa numa sala criada para três (`AJU-37`)', async () => {
    const codigo = await criarPelaApi(3)
    await entrar(codigo, 'Ana')
    await entrar(codigo, 'Bia')
    await entrar(codigo, 'Caio')

    const quarta = await abrir(codigo)
    await assentar()

    expect(erros(quarta).map((e) => e.codigo)).toEqual(['SALA_CHEIA'])
    expect(quarta.ws.readyState).not.toBe(WebSocket.READY_STATE_OPEN)
  })

  it('aceita quem já tem vaga numa sala pequena já no limite (`CONN-02`)', async () => {
    const codigo = await criarPelaApi(2)
    const ana = await entrar(codigo, 'Ana')
    await entrar(codigo, 'Bia')

    ana.ws.close()
    await assentar()
    const volta = await abrir(codigo, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect(ultimaProjecao(volta).eu.id).toBe(ana.jogadorId)
  })

  it('projeta o limite daquela sala, não o teto do produto (`AJU-39`)', async () => {
    const codigo = await criarPelaApi(4)

    const ana = await entrar(codigo, 'Ana')

    expect(ultimaProjecao(ana).sala.limiteJogadores).toBe(4)
  })

  it('não deixa o host alterar o limite de uma sala já criada (`AJU-40`)', async () => {
    const codigo = await criarPelaApi(3)
    const ana = await entrar(codigo, 'Ana')

    mandar(ana, { t: 'configurar', config: { limiteJogadores: 20 } } as unknown as Comando)
    await assentar()

    expect((await lerSala(codigo))?.limiteJogadores).toBe(3)
    expect(ultimaProjecao(ana).sala.limiteJogadores).toBe(3)
  })

  it('recusa no handshake o token de quem foi expulso (`CONN-04`, `HOST-02`)', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')
    const bruno = await entrar(codigo, 'Bruno')

    mandar(ana, { t: 'expulsar', jogadorId: bruno.jogadorId })
    await assentar()
    const volta = await abrir(codigo, bruno.token)
    await assentar()

    expect(erros(volta).map((e) => e.codigo)).toEqual(['TOKEN_BANIDO'])
    expect(volta.ws.readyState).not.toBe(WebSocket.READY_STATE_OPEN)
  })

  it('devolve a mesma vaga quando o token chega pelo handshake (`CONN-02`)', async () => {
    const codigo = await criarPelaApi()
    const ana = await entrar(codigo, 'Ana')

    ana.ws.close()
    await assentar()
    const volta = await abrir(codigo, ana.token)
    mandar(volta, { t: 'ola', token: ana.token })
    await assentar()

    expect(ultimaProjecao(volta).eu.id).toBe(ana.jogadorId)
    expect(ultimaProjecao(volta).jogadores.map((j) => j.apelido)).toEqual(['Ana'])
  })

  it('aceita o código digitado em minúsculas (`SALA-02`)', async () => {
    const codigo = await criarPelaApi()

    const ana = await entrar(codigo.toLowerCase(), 'Ana')

    expect(ultimaProjecao(ana).sala.codigo).toBe(codigo)
  })

  it('devolve 426 quando falta o header de upgrade', async () => {
    const codigo = await criarPelaApi()

    const resposta = await SELF.fetch(`https://resenha.test/api/salas/${codigo}/ws`)

    expect(resposta.status).toBe(426)
  })

  it('devolve 404 para código fora do formato', async () => {
    const resposta = await SELF.fetch('https://resenha.test/api/salas/ABC/ws', {
      headers: { Upgrade: 'websocket' },
    })

    expect(resposta.status).toBe(404)
  })
})

describe('rotas desconhecidas', () => {
  it('devolve 404', async () => {
    const resposta = await SELF.fetch('https://resenha.test/api/qualquer-coisa')

    expect(resposta.status).toBe(404)
  })
})

/** Mesmo hash do documento da sala (AD-006), para montar a vaga no storage. */
async function hashDeToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
