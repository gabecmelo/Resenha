import { MAX_JOGADORES } from '../shared/protocolo'
import { gerarCodigo, normalizarCodigo } from './core/codigo'
import { limiteDeEntrada } from './core/roster'
import { SalaDeJogo } from './core/sala-do'
import { quemSouEu } from './games/quem-sou-eu'
import type { EstadoQuemSouEu } from './games/quem-sou-eu/regras'

/**
 * Ponto único onde o jogo entra na sala (AD-002): a casca genérica vive em
 * `core/` e recebe o módulo por injeção; nenhum arquivo de `core/` importa
 * `games/`. Trocar de jogo é trocar esta classe.
 */
export class SalaDurableObject extends SalaDeJogo<EstadoQuemSouEu> {
  constructor(ctx: DurableObjectState) {
    super(ctx, quemSouEu)
  }
}

/** Edge case do spec: código sorteado que colide com sala viva vira outro. */
const TENTATIVAS_DE_CODIGO = 10

const ROTA_WS = /^\/api\/salas\/([^/]+)\/ws$/

/**
 * Os assets estáticos não passam por aqui: com `not_found_handling` em
 * `single-page-application` e a compatibility date do projeto, a plataforma
 * serve o asset (ou o `index.html`) antes de invocar o Worker, e só o que não
 * é navegação — as chamadas de API e o upgrade de WebSocket — chega até este
 * handler.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/salas' && request.method === 'POST') {
      // `AJU-38` — limite que não serve não abre sala; nada é sorteado.
      const limite = limiteDeEntrada(await limitePedido(request))
      if (!limite.ok) return Response.json({ erro: limite.erro }, { status: 400 })
      return criarSala(env, Math.random, limite.valor)
    }

    const rota = ROTA_WS.exec(url.pathname)
    if (rota !== null) return conectarSala(env, request, rota[1])

    return new Response('não encontrado', { status: 404 })
  },
}

/** `SALA-01` — sorteia um código livre e inicializa o Durable Object dele. */
export async function criarSala(
  env: Env,
  aleatorio: () => number = Math.random,
  limiteJogadores: number = MAX_JOGADORES,
): Promise<Response> {
  for (let tentativa = 0; tentativa < TENTATIVAS_DE_CODIGO; tentativa += 1) {
    const codigo = gerarCodigo(aleatorio)
    const stub = env.SALA.get(env.SALA.idFromName(codigo))
    const criada = await stub.fetch(
      `http://sala/criar?codigo=${codigo}&limite=${limiteJogadores}`,
      { method: 'POST' },
    )

    if (criada.status === 201) return Response.json({ codigo }, { status: 201 })
    // 409: o código já é de uma sala viva. Sorteia outro.
  }

  return Response.json({ erro: 'CODIGO_INVALIDO' }, { status: 503 })
}

/**
 * `AJU-35`, `AJU-36` — corpo ausente, ilegível ou sem o campo significa "não
 * escolhi limite nenhum": a sala nasce com o padrão. Só um valor presente e
 * ruim recusa a criação, e é `limiteDeEntrada` quem decide isso.
 */
async function limitePedido(request: Request): Promise<unknown> {
  try {
    const corpo: unknown = await request.json()
    if (typeof corpo !== 'object' || corpo === null) return undefined
    return (corpo as { limiteJogadores?: unknown }).limiteJogadores
  } catch {
    return undefined
  }
}

/**
 * `SALA-02`, `SALA-06` — o código da sala é a identidade do Durable Object.
 * Quem decide se a conexão entra é o próprio DO: só ele sabe se a sala existe,
 * se está cheia e se o token está banido.
 */
function conectarSala(env: Env, request: Request, bruto: string): Promise<Response> | Response {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('esperado upgrade para websocket', { status: 426 })
  }

  const codigo = normalizarCodigo(decodeURIComponent(bruto))
  if (!codigo.ok) return new Response('não encontrado', { status: 404 })

  return env.SALA.get(env.SALA.idFromName(codigo.valor)).fetch(request)
}
