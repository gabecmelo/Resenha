import type {
  Ambiente,
  Comando,
  Config,
  ContextoDeSala,
  EstadoSala,
  Jogador,
  JogadorId,
  ModuloDeJogo,
  Resultado,
  ResultadoReducer,
} from '../../shared/protocolo'
import * as chat from './chat'
import { TIPOS_DE_PRAZO, definir } from './prazos'
import { expulsar as expulsarDoRoster, migrarHost, transferirHost } from './roster'

/** `NOTA-01` */
export const NOTAS_MAX_CARACTERES = 2_000
/** `CFG-03` — as únicas durações de turno oferecidas, além de "sem limite". */
export const TEMPOS_DE_TURNO: readonly number[] = [30, 60, 90, 120]

/** Avisos que o `core` entrega ao jogo. Não vêm de cliente: nascem da sala. */
export type AvisoDeSala =
  | { t: 'saiuJogador'; jogadorId: JogadorId }
  | { t: 'entrouJogador'; jogadorId: JogadorId }
  | { t: 'venceuPrazoTurno' }

/** Comandos que o `core` não resolve sozinho — são do jogo, seja ele qual for. */
type TipoDeComandoDoCore =
  | 'ola'
  | 'entrar'
  | 'configurar'
  | 'iniciar'
  | 'expulsar'
  | 'transferirHost'
  | 'chat'
  | 'sair'

export type ComandoDeJogo = Exclude<Comando, { t: TipoDeComandoDoCore }>
export type EntradaDoJogo = ComandoDeJogo | AvisoDeSala

/**
 * O que o `core` exige de um módulo de jogo. É a única forma pela qual um jogo
 * entra no `core`: por injeção, nunca por import (AD-002).
 */
export type JogoDaSala<E> = ModuloDeJogo<E, EntradaDoJogo>

/** O que a casca do Durable Object precisa executar depois do despacho. */
export interface Efeitos {
  /** Jogadores que deixaram a sala: os sockets deles devem ser fechados. */
  removidos: JogadorId[]
}

const SEM_EFEITOS: Efeitos = { removidos: [] }

/**
 * Único ponto que decide "esse jogador pode fazer isso?" (`HOST-06`, `JOGO-06`
 * e a recusa de ações de quem está apenas aguardando). Em caso de recusa a
 * sala fica exatamente como estava.
 */
export function despachar<E>(
  sala: EstadoSala<E>,
  jogo: JogoDaSala<E>,
  autorId: JogadorId,
  comando: Comando,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  const autor = sala.jogadores.find((j) => j.id === autorId)
  if (autor === undefined) return { ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' }

  const resultado = executar(sala, jogo, autor, comando, ambiente)
  // `CONN-08` — só ação de jogador adia a expiração por ociosidade.
  if (resultado.ok) sala.ultimaAcaoEm = ambiente.agora
  return resultado
}

function executar<E>(
  sala: EstadoSala<E>,
  jogo: JogoDaSala<E>,
  autor: Jogador,
  comando: Comando,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  switch (comando.t) {
    // O handshake é da casca do Durable Object: ele emite o token e vincula o
    // socket antes de existir autor para despachar.
    case 'ola':
    case 'entrar':
      return { ok: false, erro: 'COMANDO_INVALIDO' }

    case 'configurar':
      return configurar(sala, autor, comando.config)
    case 'iniciar':
      return iniciar(sala, jogo, autor, ambiente)
    case 'expulsar':
      return expulsar(sala, jogo, autor, comando.jogadorId, ambiente)
    case 'transferirHost':
      return transferir(sala, autor, comando.jogadorId, ambiente)
    case 'chat':
      return mensagemDeChat(sala, autor, comando.texto, ambiente)
    case 'sair':
      return sair(sala, jogo, autor, ambiente)

    // `NOTA-01` — o limite e a fase são política da sala; a escrita é do jogo.
    case 'notas': {
      if (sala.fase === 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }
      if (comando.texto.length > NOTAS_MAX_CARACTERES) {
        return { ok: false, erro: 'NOTAS_MUITO_LONGAS' }
      }
      return paraOJogo(sala, jogo, autor.id, comando, ambiente)
    }

    default:
      // Edge case do spec: quem está aguardando a próxima partida não age nela.
      if (autor.situacao !== 'ativo') return { ok: false, erro: 'JOGADOR_AGUARDANDO' }
      return paraOJogo(sala, jogo, autor.id, comando, ambiente)
  }
}

/**
 * Entrega um aviso da sala ao jogo (saída de jogador, prazo de turno vencido).
 * Não é ação de jogador: não adia a expiração por ociosidade (`CONN-08`).
 */
export function avisar<E>(
  sala: EstadoSala<E>,
  jogo: JogoDaSala<E>,
  aviso: AvisoDeSala,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  // Aviso não tem autor; nenhum deles consulta `ctx.autorId`.
  return paraOJogo(sala, jogo, sala.hostId, aviso, ambiente)
}

// ---------------------------------------------------------------------------
// Comandos do `core`
// ---------------------------------------------------------------------------

/** `CFG-01`, `CFG-02`, `CFG-03`, `CFG-04` */
function configurar<E>(
  sala: EstadoSala<E>,
  autor: Jogador,
  parcial: Partial<Config>,
): Resultado<Efeitos> {
  if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (sala.fase !== 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }
  if (!configValida(parcial)) return { ok: false, erro: 'COMANDO_INVALIDO' }

  sala.config = { ...sala.config, ...parcial }
  return { ok: true, valor: SEM_EFEITOS }
}

/** O comando chega como JSON de cliente: só as opções do spec são aceitas. */
function configValida(parcial: Partial<Config>): boolean {
  if (parcial.ordemTurnos !== undefined && !['sorteada', 'entrada'].includes(parcial.ordemTurnos)) {
    return false
  }
  if (parcial.aoDescobrir !== undefined && !['continua', 'sai'].includes(parcial.aoDescobrir)) {
    return false
  }
  if (
    parcial.tempoTurnoSeg !== undefined &&
    parcial.tempoTurnoSeg !== null &&
    !TEMPOS_DE_TURNO.includes(parcial.tempoTurnoSeg)
  ) {
    return false
  }
  return true
}

/** `ESCR-01`, `HOST-01` — lobby → escrita. */
function iniciar<E>(
  sala: EstadoSala<E>,
  jogo: JogoDaSala<E>,
  autor: Jogador,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (sala.fase !== 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }

  const rodada = jogo.iniciarRodada(sala.jogadores, ambiente)
  if (!rodada.ok) return { ok: false, erro: rodada.erro }

  sala.jogo = rodada.valor
  sala.fase = 'escrita'
  chat.registrarSistema(sala, 'O host iniciou a partida.', ambiente.agora)
  return { ok: true, valor: SEM_EFEITOS }
}

/** `HOST-02` */
function expulsar<E>(
  sala: EstadoSala<E>,
  jogo: JogoDaSala<E>,
  autor: Jogador,
  alvoId: JogadorId,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (alvoId === sala.hostId) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const removido = expulsarDoRoster(sala, alvoId)
  if (!removido.ok) return { ok: false, erro: removido.erro }

  chat.registrarSistema(sala, `${removido.valor.apelido} foi removido da sala.`, ambiente.agora)
  avisar(sala, jogo, { t: 'saiuJogador', jogadorId: alvoId }, ambiente)
  return { ok: true, valor: { removidos: [alvoId] } }
}

/** `HOST-03` */
function transferir<E>(
  sala: EstadoSala<E>,
  autor: Jogador,
  novoHostId: JogadorId,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }

  const transferencia = transferirHost(sala, novoHostId)
  if (!transferencia.ok) return { ok: false, erro: transferencia.erro }

  const novo = sala.jogadores.find((j) => j.id === novoHostId)
  chat.registrarSistema(sala, `${novo?.apelido} agora comanda a sala.`, ambiente.agora)
  return { ok: true, valor: SEM_EFEITOS }
}

/** `CHAT-01`, `CHAT-02` — quem está aguardando também conversa. */
function mensagemDeChat<E>(
  sala: EstadoSala<E>,
  autor: Jogador,
  texto: string,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  const enviada = chat.enviar(sala, autor, texto, ambiente.agora)
  if (!enviada.ok) return { ok: false, erro: enviada.erro }
  return { ok: true, valor: SEM_EFEITOS }
}

/**
 * `CONN-06` — libera a vaga. O token daquela sala deixa de valer porque a vaga
 * deixou de existir; sair não é expulsão, então o token não é banido e a pessoa
 * pode entrar de novo como jogador novo.
 */
function sair<E>(
  sala: EstadoSala<E>,
  jogo: JogoDaSala<E>,
  autor: Jogador,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  const posicao = sala.jogadores.findIndex((j) => j.id === autor.id)
  sala.jogadores.splice(posicao, 1)

  chat.registrarSistema(sala, `${autor.apelido} saiu da sala.`, ambiente.agora)
  // A sala não pode ficar sem comando; o critério é o mesmo de `HOST-04`.
  if (sala.hostId === autor.id) {
    const novoHost = migrarHost(sala)
    if (novoHost !== null) {
      const novo = sala.jogadores.find((j) => j.id === novoHost)
      chat.registrarSistema(sala, `${novo?.apelido} agora comanda a sala.`, ambiente.agora)
    }
  }
  avisar(sala, jogo, { t: 'saiuJogador', jogadorId: autor.id }, ambiente)

  return { ok: true, valor: { removidos: [autor.id] } }
}

// ---------------------------------------------------------------------------
// Fronteira com o jogo
// ---------------------------------------------------------------------------

function paraOJogo<E>(
  sala: EstadoSala<E>,
  jogo: JogoDaSala<E>,
  autorId: JogadorId,
  entrada: EntradaDoJogo,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  // Sem partida montada não há comando de jogo que faça sentido.
  if (sala.jogo === null) return { ok: false, erro: 'FASE_INVALIDA' }

  const ctx: ContextoDeSala = {
    fase: sala.fase,
    hostId: sala.hostId,
    config: sala.config,
    jogadores: sala.jogadores,
    autorId,
  }
  const resultado = jogo.reduzir(sala.jogo, ctx, entrada, ambiente)
  if (!resultado.ok) return { ok: false, erro: resultado.erro }

  aplicar(sala, resultado, ambiente)
  return { ok: true, valor: SEM_EFEITOS }
}

/** O jogo descreve o que mudou; executar é sempre do `core` (AD-009). */
function aplicar<E>(
  sala: EstadoSala<E>,
  resultado: Extract<ResultadoReducer<E>, { ok: true }>,
  ambiente: Ambiente,
): void {
  sala.jogo = resultado.estado

  // `CHAT-03` — anúncio do jogo vira mensagem de sistema.
  for (const evento of resultado.eventos) {
    chat.registrarSistema(sala, evento.texto, ambiente.agora)
  }

  // AD-010 — o jogo só redefine os prazos que citou; os demais ficam intactos.
  for (const tipo of TIPOS_DE_PRAZO) {
    const quando = resultado.prazos[tipo]
    if (quando !== undefined) definir(sala, tipo, quando)
  }

  if (resultado.faseSeguinte !== undefined) sala.fase = resultado.faseSeguinte

  // `ESCR-09`, `FIM-03` — o jogo não toca no roster; quem promove é o `core`.
  if (resultado.promoverAguardando === true) {
    for (const jogador of sala.jogadores) jogador.situacao = 'ativo'
  }
}
