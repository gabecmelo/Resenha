import { MAX_JOGADORES } from '../shared/protocolo'
import { JOGO_PADRAO } from '../shared/jogos-catalogo'
import { gerarCodigo, normalizarCodigo } from './core/codigo'
import { limiteDeEntrada } from './core/roster'
import { SalaDeJogo } from './core/sala-do'
import { REGISTRO_DE_JOGOS } from './games/registro'

/**
 * Ponto único onde o jogo entra na sala (AD-002, AD-013): a casca genérica
 * vive em `core/` e recebe o registro de jogos por injeção; nenhum arquivo de
 * `core/` importa `games/`. Adicionar um jogo é adicionar uma linha ao
 * registro, não trocar esta classe.
 */
export class SalaDurableObject extends SalaDeJogo {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, REGISTRO_DE_JOGOS)
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
      const corpo = await corpoDeCriacao(request)
      // `AJU-38` — limite que não serve não abre sala; nada é sorteado.
      const limite = limiteDeEntrada(corpo.limiteJogadores)
      if (!limite.ok) return Response.json({ erro: limite.erro }, { status: 400 })
      // `HUB-04` — sem jogoId no corpo, a sala nasce com o jogo padrão.
      if (corpo.jogoId === undefined) {
        return criarSala(env, Math.random, limite.valor, JOGO_PADRAO)
      }
      // `HUB-03` — jogoId presente mas fora do registro recusa antes de o
      // Durable Object acordar; a sala nunca chega a nascer.
      if (typeof corpo.jogoId !== 'string' || !(corpo.jogoId in REGISTRO_DE_JOGOS)) {
        return Response.json({ erro: 'JOGO_INVALIDO' }, { status: 400 })
      }
      return criarSala(env, Math.random, limite.valor, corpo.jogoId)
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
  jogoId: string = JOGO_PADRAO,
): Promise<Response> {
  for (let tentativa = 0; tentativa < TENTATIVAS_DE_CODIGO; tentativa += 1) {
    const codigo = gerarCodigo(aleatorio)
    const stub = env.SALA.get(env.SALA.idFromName(codigo))
    const criada = await stub.fetch(
      `http://sala/criar?codigo=${codigo}&limite=${limiteJogadores}&jogoId=${jogoId}`,
      { method: 'POST' },
    )

    if (criada.status === 201) return Response.json({ codigo }, { status: 201 })
    // 409: o código já é de uma sala viva. Sorteia outro.
  }

  return Response.json({ erro: 'CODIGO_INVALIDO' }, { status: 503 })
}

/**
 * `AJU-35`, `AJU-36`, `HUB-04` — corpo ausente, ilegível ou sem o campo
 * significa "não escolhi": a sala nasce com o padrão de cada campo. Só um
 * valor presente e ruim recusa a criação.
 */
async function corpoDeCriacao(
  request: Request,
): Promise<{ limiteJogadores: unknown; jogoId: unknown }> {
  try {
    const corpo: unknown = await request.json()
    if (typeof corpo !== 'object' || corpo === null) return { limiteJogadores: undefined, jogoId: undefined }
    const objeto = corpo as { limiteJogadores?: unknown; jogoId?: unknown }
    return { limiteJogadores: objeto.limiteJogadores, jogoId: objeto.jogoId }
  } catch {
    return { limiteJogadores: undefined, jogoId: undefined }
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
