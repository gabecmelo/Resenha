import type {
  Ambiente,
  Comando,
  Config,
  ContextoDeSala,
  Jogador,
  JogadorId,
  Resultado,
  ResultadoReducer,
} from '../../../shared/protocolo'
import { embaralhar, sortearAlvos } from './sorteio'

/** `ESCR-03` */
export const CARTA_MAX_CARACTERES = 60
/** `HOST-01`, `ESCR-08` — abaixo disso não há partida de "Quem Sou Eu?". */
export const MIN_JOGADORES = 3

/** `DESC-01` — o confirmador não é guardado: `DESC-03` fala em "conectados", que muda. */
export interface Declaracao {
  jogadorId: JogadorId
  declaradaEm: number
}

export interface EstadoQuemSouEu {
  /** escritor → alvo (`ESCR-01`) */
  atribuicoes: Record<JogadorId, JogadorId>
  /**
   * DONO da carta → texto. Chavear pelo dono torna a checagem do `JOGO-02`
   * uma comparação de chave, em vez de uma busca reversa a cada envio.
   */
  cartas: Record<JogadorId, string>
  /** `ESCR-04` */
  prontos: JogadorId[]
  /** `JOGO-03` — quem ainda está no rodízio, na ordem da vez. */
  ordem: JogadorId[]
  vezDe: JogadorId | null
  /** `DESC-04` */
  descobriram: JogadorId[]
  declaracaoPendente: Declaracao | null
  /** `FIM-02` */
  reveladoParaTodos: boolean
  /** `NOTA-02` — privado por jogador. */
  notas: Record<JogadorId, string>
}

/** Avisos que o `core` entrega ao jogo; não são comandos de cliente. */
export type EventoDeSala =
  | { t: 'saiuJogador'; jogadorId: JogadorId }
  | { t: 'entrouJogador'; jogadorId: JogadorId }
  | { t: 'venceuPrazoTurno' }

type TipoDeComandoDeJogo =
  | 'escreverCarta'
  | 'marcarPronto'
  | 'comecar'
  | 'cancelar'
  | 'passarVez'
  | 'pularVez'
  | 'declararDescobri'
  | 'responderDeclaracao'
  | 'encerrar'
  | 'novaPartida'

export type ComandoQuemSouEu = Extract<Comando, { t: TipoDeComandoDeJogo }> | EventoDeSala

/** Partida ainda não montada — também é o estado após cancelar (`ESCR-09`). */
export function estadoVazio(): EstadoQuemSouEu {
  return {
    atribuicoes: {},
    cartas: {},
    prontos: [],
    ordem: [],
    vezDe: null,
    descobriram: [],
    declaracaoPendente: null,
    reveladoParaTodos: false,
    notas: {},
  }
}

/**
 * `ESCR-01`, `HOST-01` — sorteia os alvos entre os jogadores ativos.
 * Recusa abaixo de 3 ativos; jogadores `aguardando` ficam de fora (`SALA-10`).
 */
export function iniciarRodada(
  jogadores: Jogador[],
  ambiente: Ambiente,
): Resultado<EstadoQuemSouEu> {
  const ativos = jogadores.filter((j) => j.situacao === 'ativo')
  if (ativos.length < MIN_JOGADORES) return { ok: false, erro: 'JOGADORES_INSUFICIENTES' }

  const estado = estadoVazio()
  estado.atribuicoes = sortearAlvos(
    ativos.map((j) => j.id),
    ambiente.aleatorio,
  )
  return { ok: true, valor: estado }
}

/** Reducer puro do jogo: recebe estado + contexto e devolve estado + efeitos descritos. */
export function reduzir(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  comando: ComandoQuemSouEu,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  switch (comando.t) {
    case 'escreverCarta':
      return escreverCarta(estado, ctx, comando.texto)
    case 'marcarPronto':
      return marcarPronto(estado, ctx, comando.pronto)
    case 'comecar':
      return comecar(estado, ctx, ambiente)
    case 'cancelar':
      return cancelar(ctx)
    case 'entrouJogador':
      // `ESCR-10` — a rodada corrente não é redistribuída por quem chega.
      return { ok: true, estado, eventos: [], prazos: {} }
    case 'saiuJogador':
      return saiuJogador(estado, ctx, comando.jogadorId, ambiente)
    default:
      return { ok: false, erro: 'COMANDO_INVALIDO' }
  }
}

// ---------------------------------------------------------------------------
// Fase de escrita
// ---------------------------------------------------------------------------

/** `ESCR-03` + edge case das quebras de linha. */
function escreverCarta(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  texto: string,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'escrita') return { ok: false, erro: 'FASE_INVALIDA' }

  const alvo = estado.atribuicoes[ctx.autorId]
  if (alvo === undefined) return { ok: false, erro: 'COMANDO_INVALIDO' }
  // `ESCR-05` — quem está PRONTO desmarca antes de editar.
  if (estado.prontos.includes(ctx.autorId)) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const carta = normalizarCarta(texto)
  if (carta.length === 0 || carta.length > CARTA_MAX_CARACTERES) {
    return { ok: false, erro: 'CARTA_INVALIDA' }
  }

  const novo = clonar(estado)
  novo.cartas[alvo] = carta
  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/** Uma carta é sempre uma única linha, sem espaços nas pontas. */
function normalizarCarta(texto: string): string {
  return texto.replace(/[\r\n]+/g, ' ').trim()
}

/** `ESCR-04`, `ESCR-05` */
function marcarPronto(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  pronto: boolean,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'escrita') return { ok: false, erro: 'FASE_INVALIDA' }

  const alvo = estado.atribuicoes[ctx.autorId]
  if (alvo === undefined) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  if (pronto) {
    if (novo.cartas[alvo] === undefined) return { ok: false, erro: 'CARTA_INVALIDA' }
    if (!novo.prontos.includes(ctx.autorId)) novo.prontos.push(ctx.autorId)
  } else {
    novo.prontos = novo.prontos.filter((id) => id !== ctx.autorId)
  }

  const eventos = pronto && todosProntos(novo, ctx) ? [{ texto: 'Todo mundo está PRONTO.' }] : []
  return { ok: true, estado: novo, eventos, prazos: {} }
}

/** `ESCR-06`, `JOGO-03` — escrita → jogo. */
function comecar(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'escrita') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }

  const ativos = jogadoresAtivos(ctx)
  if (ativos.length < MIN_JOGADORES) return { ok: false, erro: 'JOGADORES_INSUFICIENTES' }
  if (!todosProntos(estado, ctx)) return { ok: false, erro: 'PRONTOS_PENDENTES' }

  const ids = ativos.map((j) => j.id)
  const novo = clonar(estado)
  novo.ordem = ctx.config.ordemTurnos === 'sorteada' ? embaralhar(ids, ambiente.aleatorio) : ids
  novo.vezDe = novo.ordem[0] ?? null

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'A partida começou.' }],
    prazos: { turno: prazoDoTurno(ctx.config, ambiente.agora) },
    faseSeguinte: 'jogo',
  }
}

/** `ESCR-09`, `ESCR-10` — descarta as cartas e devolve a sala ao lobby. */
function cancelar(ctx: ContextoDeSala): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'escrita') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }

  return {
    ok: true,
    estado: estadoVazio(),
    eventos: [{ texto: 'O host cancelou a partida. A sala voltou ao lobby.' }],
    prazos: { turno: null },
    faseSeguinte: 'lobby',
    promoverAguardando: true,
  }
}

// ---------------------------------------------------------------------------
// Saída de jogador
// ---------------------------------------------------------------------------

/**
 * `ESCR-07`, `ESCR-08`. O `core` já retirou o jogador do roster antes de avisar,
 * então `ctx.jogadores` traz apenas quem ficou. Quem estava `aguardando` nunca
 * teve alvo — a saída dele não redistribui nada.
 */
function saiuJogador(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  jogadorId: JogadorId,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (estado.atribuicoes[jogadorId] === undefined) {
    return { ok: true, estado, eventos: [], prazos: {} }
  }

  if (ctx.fase === 'escrita') {
    const restantes = jogadoresAtivos(ctx)
    if (restantes.length < MIN_JOGADORES) {
      return {
        ok: true,
        estado: estadoVazio(),
        eventos: [
          {
            texto: `A partida foi cancelada: são necessários ao menos ${MIN_JOGADORES} jogadores.`,
          },
        ],
        prazos: { turno: null },
        faseSeguinte: 'lobby',
        promoverAguardando: true,
      }
    }

    const novo = estadoVazio()
    novo.atribuicoes = sortearAlvos(
      restantes.map((j) => j.id),
      ambiente.aleatorio,
    )
    novo.notas = { ...estado.notas }
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: 'Um jogador saiu. Novos alvos foram sorteados e as cartas, descartadas.' }],
      prazos: {},
    }
  }

  return { ok: false, erro: 'COMANDO_INVALIDO' }
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function jogadoresAtivos(ctx: ContextoDeSala): Jogador[] {
  return ctx.jogadores.filter((j) => j.situacao === 'ativo')
}

/** `ESCR-06` — só os ativos contam; quem está aguardando não trava o Começar. */
function todosProntos(estado: EstadoQuemSouEu, ctx: ContextoDeSala): boolean {
  const ativos = jogadoresAtivos(ctx)
  return ativos.length > 0 && ativos.every((j) => estado.prontos.includes(j.id))
}

/** `JOGO-07`, `JOGO-08` — `null` quando a configuração é "sem limite". */
function prazoDoTurno(config: Config, agora: number): number | null {
  return config.tempoTurnoSeg === null ? null : agora + config.tempoTurnoSeg * 1_000
}

function clonar(estado: EstadoQuemSouEu): EstadoQuemSouEu {
  return structuredClone(estado)
}
