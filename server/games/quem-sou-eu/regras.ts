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
    case 'passarVez':
      return passarVez(estado, ctx, ambiente)
    case 'pularVez':
      return pularVez(estado, ctx, ambiente)
    case 'venceuPrazoTurno':
      return venceuPrazoTurno(estado, ctx, ambiente)
    case 'declararDescobri':
      return declararDescobri(estado, ctx, ambiente)
    case 'responderDeclaracao':
      return responderDeclaracao(estado, ctx, comando.aceita, ambiente)
    case 'encerrar':
      return encerrar(estado, ctx)
    case 'novaPartida':
      return novaPartida(ctx)
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
// Rodízio de turnos
// ---------------------------------------------------------------------------

/** `JOGO-04`, `JOGO-06` — o jogador da vez passa; o host também pode avançar. */
function passarVez(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== estado.vezDe && ctx.autorId !== ctx.hostId) {
    return { ok: false, erro: 'SEM_AUTORIDADE' }
  }
  return comVezAvancada(estado, ctx, ambiente)
}

/** `JOGO-05` — o host avança a vez independentemente de quem é o jogador atual. */
function pularVez(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  return comVezAvancada(estado, ctx, ambiente)
}

/**
 * `JOGO-07`, `JOGO-08`. Com "sem limite" o prazo nunca chega a ser agendado;
 * o aviso é ignorado sem alterar a vez, caso chegue mesmo assim.
 */
function venceuPrazoTurno(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.config.tempoTurnoSeg === null) {
    return { ok: true, estado, eventos: [], prazos: { turno: null } }
  }
  return comVezAvancada(estado, ctx, ambiente)
}

/**
 * `JOGO-09` — ao chegar ao fim da ordem, volta ao primeiro que ainda está no
 * rodízio. `JOGO-11` — estar desconectado não faz o jogador ser pulado.
 */
function comVezAvancada(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  const novo = clonar(estado)
  novo.vezDe = proximoDaOrdem(novo.ordem, novo.vezDe)

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `É a vez de ${apelidoDe(ctx, novo.vezDe)}.` }],
    prazos: { turno: prazoDoTurno(ctx.config, ambiente.agora) },
  }
}

function proximoDaOrdem(ordem: JogadorId[], atual: JogadorId | null): JogadorId | null {
  if (ordem.length === 0) return null
  const posicao = atual === null ? -1 : ordem.indexOf(atual)
  return ordem[(posicao + 1) % ordem.length]
}

// ---------------------------------------------------------------------------
// "Descobri!"
// ---------------------------------------------------------------------------

/**
 * `DESC-02`, `DESC-03` — quem confirma é o host; quando o próprio host declara,
 * é o jogador que está na sala há mais tempo entre os demais **conectados**
 * (mesmo critério de antiguidade de `HOST-04`).
 *
 * Calculado na hora em vez de guardado na declaração: "conectados" muda, e uma
 * declaração pendente não pode ficar refém de quem caiu.
 */
export function confirmadorDe(
  hostId: JogadorId,
  jogadores: Jogador[],
  declaranteId: JogadorId,
): JogadorId | null {
  if (declaranteId !== hostId) return hostId

  let escolhido: Jogador | null = null
  for (const j of jogadores) {
    if (j.id === declaranteId || !j.conectado) continue
    // Confirmar é ação de partida: quem está apenas aguardando a próxima
    // rodada não confirma (`DESC-03` + edge case do jogador aguardando).
    if (j.situacao !== 'ativo') continue
    if (escolhido === null || j.entrouEm < escolhido.entrouEm) escolhido = j
  }
  return escolhido === null ? null : escolhido.id
}

/** `DESC-01`, `DESC-09` — declara e espera; a carta não é revelada aqui. */
function declararDescobri(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.atribuicoes[ctx.autorId] === undefined) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const jaPendente = estado.declaracaoPendente?.jogadorId === ctx.autorId
  // `DESC-09` — ignora sem alterar o estado.
  if (jaPendente || estado.descobriram.includes(ctx.autorId)) {
    return { ok: true, estado, eventos: [], prazos: {} }
  }
  if (estado.declaracaoPendente !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  novo.declaracaoPendente = { jogadorId: ctx.autorId, declaradaEm: ambiente.agora }
  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `${apelidoDe(ctx, ctx.autorId)} declarou que descobriu!` }],
    prazos: {},
  }
}

/** `DESC-04`…`DESC-08` */
function responderDeclaracao(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  aceita: boolean,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }

  const pendente = estado.declaracaoPendente
  if (pendente === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
  if (ctx.autorId !== confirmadorDe(ctx.hostId, ctx.jogadores, pendente.jogadorId)) {
    return { ok: false, erro: 'SEM_AUTORIDADE' }
  }

  const novo = clonar(estado)
  novo.declaracaoPendente = null
  const apelido = apelidoDe(ctx, pendente.jogadorId)

  // `DESC-05` — descartada sem revelar; o jogador pode declarar de novo.
  if (!aceita) {
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: `Ainda não: ${apelido} não descobriu.` }],
      prazos: {},
    }
  }

  // `DESC-04` — a partir daqui a carta dele passa a existir na projeção dele.
  novo.descobriram.push(pendente.jogadorId)

  // `DESC-06` — "sai do rodízio"; `DESC-07` — "continua jogando" não mexe na ordem.
  if (ctx.config.aoDescobrir === 'sai') {
    const posicao = novo.ordem.indexOf(pendente.jogadorId)
    if (posicao !== -1) {
      novo.ordem.splice(posicao, 1)
      if (novo.vezDe === pendente.jogadorId) {
        novo.vezDe = novo.ordem.length === 0 ? null : novo.ordem[posicao % novo.ordem.length]
      }
    }

    // `DESC-08` — sem dois jogadores no rodízio não há partida; aplica `FIM-02`.
    if (novo.ordem.length < 2) {
      novo.reveladoParaTodos = true
      novo.vezDe = null
      return {
        ok: true,
        estado: novo,
        eventos: [{ texto: `${apelido} descobriu! A partida terminou.` }],
        prazos: { turno: null },
        faseSeguinte: 'encerrada',
      }
    }
  }

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `${apelido} descobriu!` }],
    prazos:
      novo.vezDe === estado.vezDe ? {} : { turno: prazoDoTurno(ctx.config, ambiente.agora) },
  }
}

// ---------------------------------------------------------------------------
// Encerramento e nova partida
// ---------------------------------------------------------------------------

/** `FIM-01`, `FIM-02` — encerra e revela a carta de todos a todos. */
function encerrar(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }

  const novo = clonar(estado)
  novo.reveladoParaTodos = true
  novo.declaracaoPendente = null
  novo.vezDe = null

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'A partida foi encerrada. Todas as cartas foram reveladas.' }],
    prazos: { turno: null },
    faseSeguinte: 'encerrada',
  }
}

/**
 * `FIM-03`, `NOTA-04` — devolve a sala ao lobby com a partida zerada: cartas,
 * alvos, "descobriu" e notas somem juntos. `FIM-04` é consequência: o jogo não
 * toca em jogador, apelido, cor, chat nem configuração.
 */
function novaPartida(ctx: ContextoDeSala): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase !== 'encerrada') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }

  return {
    ok: true,
    estado: estadoVazio(),
    eventos: [{ texto: 'Nova partida! A sala voltou ao lobby.' }],
    prazos: { turno: null },
    faseSeguinte: 'lobby',
    promoverAguardando: true,
  }
}

// ---------------------------------------------------------------------------
// Saída de jogador
// ---------------------------------------------------------------------------

/**
 * `ESCR-07`, `ESCR-08`, `JOGO-10`, `FIM-05`. O `core` já retirou o jogador do
 * roster antes de avisar, então `ctx.jogadores` traz apenas quem ficou.
 */
function saiuJogador(
  estado: EstadoQuemSouEu,
  ctx: ContextoDeSala,
  jogadorId: JogadorId,
  ambiente: Ambiente,
): ResultadoReducer<EstadoQuemSouEu> {
  if (ctx.fase === 'escrita') {
    // Quem estava `aguardando` nunca teve alvo — a saída dele não redistribui nada.
    if (estado.atribuicoes[jogadorId] === undefined) {
      return { ok: true, estado, eventos: [], prazos: {} }
    }

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

  // `FIM-05` — não existe partida sem jogador ativo.
  if (jogadoresAtivos(ctx).length === 0) {
    return {
      ok: true,
      estado: estadoVazio(),
      eventos: [{ texto: 'Todos os jogadores saíram. A partida foi encerrada.' }],
      prazos: { turno: null },
      faseSeguinte: 'lobby',
      promoverAguardando: true,
    }
  }

  // `JOGO-10` — no jogo não há redistribuição: a carta some e o rodízio segue.
  const novo = clonar(estado)
  const posicao = novo.ordem.indexOf(jogadorId)

  delete novo.atribuicoes[jogadorId]
  for (const escritor of Object.keys(novo.atribuicoes)) {
    if (novo.atribuicoes[escritor] === jogadorId) delete novo.atribuicoes[escritor]
  }
  delete novo.cartas[jogadorId]
  delete novo.notas[jogadorId]
  novo.prontos = novo.prontos.filter((id) => id !== jogadorId)
  novo.descobriram = novo.descobriram.filter((id) => id !== jogadorId)
  if (novo.declaracaoPendente?.jogadorId === jogadorId) novo.declaracaoPendente = null
  if (posicao !== -1) novo.ordem.splice(posicao, 1)

  if (estado.vezDe !== jogadorId) {
    return { ok: true, estado: novo, eventos: [], prazos: {} }
  }

  novo.vezDe = novo.ordem.length === 0 ? null : novo.ordem[posicao % novo.ordem.length]
  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `É a vez de ${apelidoDe(ctx, novo.vezDe)}.` }],
    prazos: { turno: prazoDoTurno(ctx.config, ambiente.agora) },
  }
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function jogadoresAtivos(ctx: ContextoDeSala): Jogador[] {
  return ctx.jogadores.filter((j) => j.situacao === 'ativo')
}

function apelidoDe(ctx: ContextoDeSala, id: JogadorId | null): string {
  if (id === null) return 'ninguém'
  return ctx.jogadores.find((j) => j.id === id)?.apelido ?? 'um jogador'
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
