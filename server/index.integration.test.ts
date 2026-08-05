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

async function criarPelaApi(): Promise<string> {
  const resposta = await SELF.fetch('https://resenha.test/api/salas', { method: 'POST' })
  expect(resposta.status).toBe(201)
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

async function entrar(
  codigo: string,
  apelido: string,
): Promise<Cliente & { token: string; jogadorId: string }> {
  const cliente = await abrir(codigo)
  mandar(cliente, { t: 'entrar', apelido })
  await assentar()

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

  it('não responde a GET na rota de criação', async () => {
    const resposta = await SELF.fetch('https://resenha.test/api/salas')

    expect(resposta.status).toBe(404)
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
