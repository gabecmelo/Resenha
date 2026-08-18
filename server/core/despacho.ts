import type {
  Ambiente,
  Comando,
  Config,
  ConfigCartas,
  ConfigEspiao,
  ContextoDeSala,
  Dificuldade,
  EstadoSala,
  Jogador,
  JogadorId,
  ModuloDeJogo,
  Resultado,
  ResultadoReducer,
} from '../../shared/protocolo'
import {
  CONFIG_PADRAO,
  TEMPO_TURNO_MAX_SEG,
  TEMPO_TURNO_MIN_SEG,
  MAX_VOTACOES_TETO,
  META_MAX_PONTOS,
  META_MIN_PONTOS,
  RECARGA_BRANCA_MAX,
  RECARGA_BRANCA_MIN,
  REROLLS_MAX,
  REROLLS_MIN,
  TEMPO_ESCOLHA_MAX_SEG,
  TEMPO_ESCOLHA_MIN_SEG,
  TEMPO_VOTACAO_MAX_SEG,
  TEMPO_VOTACAO_MIN_SEG,
} from '../../shared/protocolo'
import type { PacoteCompleto } from '../../shared/pacotes-dados'
import * as chat from './chat'
import { TIPOS_DE_PRAZO, definir } from './prazos'
import { expulsar as expulsarDoRoster, migrarHost, transferirHost } from './roster'

/** `NOTA-01` */
export const NOTAS_MAX_CARACTERES = 2_000

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
  | 'trocarJogo'

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
 *
 * `registro` substitui a antiga injeção de um único módulo fixo (`AD-013`): o
 * jogo é resolvido por `sala.jogoId` a cada comando que precisa dele.
 */
export async function despachar(
  sala: EstadoSala,
  registro: Record<string, JogoDaSala<unknown>>,
  autorId: JogadorId,
  comando: Comando,
  ambiente: Ambiente,
  env?: Env,
): Promise<Resultado<Efeitos>> {
  const autor = sala.jogadores.find((j) => j.id === autorId)
  if (autor === undefined) return { ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' }

  const resultado = await executar(sala, registro, autor, comando, ambiente, env)
  // `CONN-08` — só ação de jogador adia a expiração por ociosidade.
  if (resultado.ok) sala.ultimaAcaoEm = ambiente.agora
  return resultado
}

async function executar(
  sala: EstadoSala,
  registro: Record<string, JogoDaSala<unknown>>,
  autor: Jogador,
  comando: Comando,
  ambiente: Ambiente,
  env?: Env,
): Promise<Resultado<Efeitos>> {
  switch (comando.t) {
    // O handshake é da casca do Durable Object: ele emite o token e vincula o
    // socket antes de existir autor para despachar.
    case 'ola':
    case 'entrar':
      return { ok: false, erro: 'COMANDO_INVALIDO' }

    case 'configurar':
      return configurar(sala, autor, comando.config)
    case 'trocarJogo':
      return trocarJogo(sala, autor, comando.jogoId, registro)
    case 'iniciar': {
      const jogo = jogoAtual(sala, registro)
      if (jogo === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
      return await iniciar(sala, jogo, autor, ambiente, env)
    }
    case 'expulsar': {
      const jogo = jogoAtual(sala, registro)
      if (jogo === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
      return expulsar(sala, jogo, autor, comando.jogadorId, ambiente)
    }
    case 'transferirHost':
      return transferir(sala, autor, comando.jogadorId, ambiente)
    case 'chat':
      return mensagemDeChat(sala, autor, comando.texto, ambiente)
    case 'sair': {
      const jogo = jogoAtual(sala, registro)
      if (jogo === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
      return sair(sala, jogo, autor, ambiente)
    }

    // `NOTA-01` — o limite e a fase são política da sala; a escrita é do jogo.
    case 'notas': {
      if (sala.fase === 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }
      if (comando.texto.length > NOTAS_MAX_CARACTERES) {
        return { ok: false, erro: 'NOTAS_MUITO_LONGAS' }
      }
      const jogo = jogoAtual(sala, registro)
      if (jogo === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
      return paraOJogo(sala, jogo, autor.id, comando, ambiente)
    }

    default: {
      // Edge case do spec: quem está aguardando a próxima partida não age nela.
      if (autor.situacao !== 'ativo') return { ok: false, erro: 'JOGADOR_AGUARDANDO' }
      const jogo = jogoAtual(sala, registro)
      if (jogo === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
      return paraOJogo(sala, jogo, autor.id, comando, ambiente)
    }
  }
}

/**
 * Resolve o módulo do jogo atual da sala. `null` é o cenário de ops do Edge
 * Case 4 do spec (jogo removido do registro depois de um deploy) — nunca
 * caminho de usuário; quem chama trata como `COMANDO_INVALIDO`.
 */
function jogoAtual(
  sala: EstadoSala,
  registro: Record<string, JogoDaSala<unknown>>,
): JogoDaSala<unknown> | null {
  return registro[sala.jogoId] ?? null
}

/**
 * Entrega um aviso da sala ao jogo (saída de jogador, prazo de turno vencido).
 * Não é ação de jogador: não adia a expiração por ociosidade (`CONN-08`).
 */
export function avisar(
  sala: EstadoSala,
  jogo: JogoDaSala<unknown>,
  aviso: AvisoDeSala,
  ambiente: Ambiente,
): Resultado<Efeitos> {
  // Aviso não tem autor; nenhum deles consulta `ctx.autorId`.
  return paraOJogo(sala, jogo, sala.hostId, aviso, ambiente)
}

// ---------------------------------------------------------------------------
// Comandos do `core`
// ---------------------------------------------------------------------------

/**
 * `CFG-01`, `CFG-03`, `CFG-04`. `AJU-18` — a configuração é remontada campo a
 * campo, e não por espalhamento: o que o cliente mandar fora do contrato (a
 * opção removida, por exemplo) não entra na sala.
 */
function configurar(
  sala: EstadoSala,
  autor: Jogador,
  parcial: Partial<Config>,
): Resultado<Efeitos> {
  if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (sala.fase !== 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }
  if (!configValida(parcial)) return { ok: false, erro: 'COMANDO_INVALIDO' }

  sala.config = {
    ...sala.config,
    ordemTurnos: parcial.ordemTurnos ?? sala.config.ordemTurnos,
    tempoTurnoSeg:
      parcial.tempoTurnoSeg === undefined ? sala.config.tempoTurnoSeg : parcial.tempoTurnoSeg,
    modoPacote: parcial.modoPacote ?? sala.config.modoPacote,
    pacoteIds: parcial.pacoteIds ?? sala.config.pacoteIds,
    dificuldades: parcial.dificuldades ?? sala.config.dificuldades,
    modoDistribuicao: parcial.modoDistribuicao ?? sala.config.modoDistribuicao,
    espiao: {
      numEspioes: parcial.espiao?.numEspioes ?? sala.config.espiao.numEspioes,
      espioesSeVeem: parcial.espiao?.espioesSeVeem ?? sala.config.espiao.espioesSeVeem,
      visibilidadeVoto: parcial.espiao?.visibilidadeVoto ?? sala.config.espiao.visibilidadeVoto,
      tempoRodadaSeg:
        parcial.espiao?.tempoRodadaSeg === undefined
          ? sala.config.espiao.tempoRodadaSeg
          : parcial.espiao.tempoRodadaSeg,
      tempoVotacaoSeg: parcial.espiao?.tempoVotacaoSeg ?? sala.config.espiao.tempoVotacaoSeg,
      maxVotacoes:
        parcial.espiao?.maxVotacoes === undefined
          ? sala.config.espiao.maxVotacoes
          : parcial.espiao.maxVotacoes,
    },
    cartas: {
      tempoEscolhaSeg:
        parcial.cartas?.tempoEscolhaSeg === undefined
          ? sala.config.cartas.tempoEscolhaSeg
          : parcial.cartas.tempoEscolhaSeg,
      metaDePontos:
        parcial.cartas?.metaDePontos === undefined
          ? sala.config.cartas.metaDePontos
          : parcial.cartas.metaDePontos,
      rerollsIniciais: parcial.cartas?.rerollsIniciais ?? sala.config.cartas.rerollsIniciais,
      recargaDaBrancaRodadas:
        parcial.cartas?.recargaDaBrancaRodadas ?? sala.config.cartas.recargaDaBrancaRodadas,
    },
  }
  return { ok: true, valor: SEM_EFEITOS }
}

/**
 * O comando chega como JSON de cliente: só as opções do spec são aceitas.
 *
 * `AJU-19`, `AJU-20` — o tempo por turno deixou de ser uma lista fechada: vale
 * qualquer inteiro de segundos dentro da faixa, ou `null` para "sem limite".
 * Os presets da tela são conveniência, não a regra.
 */
function configValida(parcial: Partial<Config>): boolean {
  if (parcial.ordemTurnos !== undefined && !['sorteada', 'entrada'].includes(parcial.ordemTurnos)) {
    return false
  }
  const segundos = parcial.tempoTurnoSeg
  if (segundos !== undefined && segundos !== null) {
    if (!Number.isInteger(segundos)) return false
    if (segundos < TEMPO_TURNO_MIN_SEG || segundos > TEMPO_TURNO_MAX_SEG) return false
  }
  if (parcial.modoPacote !== undefined && !['livre', 'pacote', 'personalizado'].includes(parcial.modoPacote)) {
    return false
  }
  if (parcial.modoDistribuicao !== undefined && !['aleatoria', 'escolha'].includes(parcial.modoDistribuicao)) {
    return false
  }
  if (parcial.pacoteIds !== undefined) {
    if (!Array.isArray(parcial.pacoteIds)) return false
    if (parcial.pacoteIds.some((id) => typeof id !== 'string')) return false
  }
  if (parcial.dificuldades !== undefined) {
    if (!Array.isArray(parcial.dificuldades) || parcial.dificuldades.length === 0) return false
    if (parcial.dificuldades.some((d) => !DIFICULDADES_VALIDAS.includes(d))) return false
  }
  if (parcial.espiao !== undefined && !configEspiaoValida(parcial.espiao)) return false
  if (parcial.cartas !== undefined && !configCartasValida(parcial.cartas)) return false
  return true
}

/** `CCT-01` — faixas do Cartas Contra a Turma; `null` é opção válida nos dois campos. */
function configCartasValida(parcial: Partial<ConfigCartas>): boolean {
  const escolha = parcial.tempoEscolhaSeg
  if (escolha !== undefined && escolha !== null) {
    if (!Number.isInteger(escolha)) return false
    if (escolha < TEMPO_ESCOLHA_MIN_SEG || escolha > TEMPO_ESCOLHA_MAX_SEG) return false
  }
  const meta = parcial.metaDePontos
  if (meta !== undefined && meta !== null) {
    if (!Number.isInteger(meta)) return false
    if (meta < META_MIN_PONTOS || meta > META_MAX_PONTOS) return false
  }
  // `CCT-44`, `CCT-45` — zero é opção nos dois: sem troca, e branca sempre à mão.
  const rerolls = parcial.rerollsIniciais
  if (rerolls !== undefined) {
    if (!Number.isInteger(rerolls)) return false
    if (rerolls < REROLLS_MIN || rerolls > REROLLS_MAX) return false
  }
  const recarga = parcial.recargaDaBrancaRodadas
  if (recarga !== undefined) {
    if (!Number.isInteger(recarga)) return false
    if (recarga < RECARGA_BRANCA_MIN || recarga > RECARGA_BRANCA_MAX) return false
  }
  return true
}

const DIFICULDADES_VALIDAS: readonly Dificuldade[] = ['facil', 'medio', 'dificil']

/** `ESP-01` — `numEspioes` só é checado contra os ativos no início da rodada (`ESP-02`), não aqui. */
function configEspiaoValida(parcial: Partial<ConfigEspiao>): boolean {
  if (parcial.numEspioes !== undefined && parcial.numEspioes !== 'auto') {
    if (!Number.isInteger(parcial.numEspioes) || parcial.numEspioes <= 0) return false
  }
  if (
    parcial.visibilidadeVoto !== undefined &&
    !['oculta', 'tempoReal'].includes(parcial.visibilidadeVoto)
  ) {
    return false
  }
  const segundos = parcial.tempoRodadaSeg
  if (segundos !== undefined && segundos !== null) {
    if (!Number.isInteger(segundos)) return false
    if (segundos < TEMPO_TURNO_MIN_SEG || segundos > TEMPO_TURNO_MAX_SEG) return false
  }
  // `ESP-47` — 1..MAX_VOTACOES_TETO, ou `null` para ilimitado.
  const max = parcial.maxVotacoes
  if (max !== undefined && max !== null) {
    if (!Number.isInteger(max)) return false
    if (max < 1 || max > MAX_VOTACOES_TETO) return false
  }
  // `ESP-28` — a votação sempre tem prazo; aqui `null` não é opção.
  const votacao = parcial.tempoVotacaoSeg
  if (votacao !== undefined) {
    if (!Number.isInteger(votacao)) return false
    if (votacao < TEMPO_VOTACAO_MIN_SEG || votacao > TEMPO_VOTACAO_MAX_SEG) return false
  }
  if (parcial.espioesSeVeem !== undefined && typeof parcial.espioesSeVeem !== 'boolean') return false
  return true
}

/**
 * `HUB-06`–`HUB-09`, `HUB-11` — troca o jogo da sala. `HUB-12` (broadcast
 * imediato) é grátis: é o mesmo `confirmar()` que já roda depois de qualquer
 * comando aceito.
 */
function trocarJogo(
  sala: EstadoSala,
  autor: Jogador,
  jogoId: string,
  registro: Record<string, JogoDaSala<unknown>>,
): Resultado<Efeitos> {
  if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (sala.fase !== 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }
  if (!(jogoId in registro)) return { ok: false, erro: 'JOGO_INVALIDO' }
  // `HUB-09` — idempotente: reabrir o seletor e confirmar o mesmo jogo não
  // apaga configuração por acidente de navegação.
  if (jogoId === sala.jogoId) return { ok: true, valor: SEM_EFEITOS }

  sala.jogoId = jogoId
  sala.jogo = null
  sala.config = { ...CONFIG_PADRAO }
  return { ok: true, valor: SEM_EFEITOS }
}

/**
 * `PKT2-09`, edge case `PKT2-21` — busca todos os pacotes selecionados em
 * paralelo (KV + fallback estático, mesmo padrão de antes, generalizado para
 * N ids). Falha o lote inteiro se qualquer id não existir em nenhum dos dois,
 * ou se o KV falhar (sem tentar iniciar parcialmente).
 */
export async function buscarPacotes(
  pacoteIds: string[],
  env?: Env,
): Promise<Resultado<PacoteCompleto[]>> {
  if (!env) return { ok: false, erro: 'PACOTE_INDISPONIVEL' }

  try {
    const encontrados = await Promise.all(pacoteIds.map((id) => buscarUmPacote(id, env)))
    const pacotes: PacoteCompleto[] = []
    for (const pacote of encontrados) {
      if (pacote === null) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }
      pacotes.push(pacote)
    }
    return { ok: true, valor: pacotes }
  } catch {
    return { ok: false, erro: 'PACOTE_INDISPONIVEL' }
  }
}

async function buscarUmPacote(id: string, env: Env): Promise<PacoteCompleto | null> {
  const doKv = await env.PACOTES_KV.get<PacoteCompleto>(`pacote:${id}`, 'json')
  if (doKv) return doKv
  // Fallback para dev local
  const { PACOTES } = await import('../../shared/pacotes-dados')
  const { LOCAIS } = await import('../../shared/locais-dados')
  return [...PACOTES, ...LOCAIS].find((p) => p.id === id) ?? null
}

/** `ESCR-01`, `HOST-01` — lobby → escrita. */
async function iniciar(
  sala: EstadoSala,
  jogo: JogoDaSala<unknown>,
  autor: Jogador,
  ambiente: Ambiente,
  env?: Env,
): Promise<Resultado<Efeitos>> {
  if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (sala.fase !== 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }

  let pacotes: PacoteCompleto[] | undefined = undefined
  if (sala.config.modoPacote === 'pacote') {
    if (sala.config.pacoteIds.length === 0) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }

    const resultado = await buscarPacotes(sala.config.pacoteIds, env)
    if (!resultado.ok) return { ok: false, erro: resultado.erro }
    pacotes = resultado.valor
  }

  const ctx: ContextoDeSala = {
    fase: sala.fase,
    hostId: sala.hostId,
    config: sala.config,
    jogadores: sala.jogadores,
    prazoTurno: sala.prazos.turno,
    autorId: autor.id,
  }
  const rodada = jogo.iniciarRodada(ctx, ambiente, pacotes)
  if (!rodada.ok) return { ok: false, erro: rodada.erro }

  sala.jogo = rodada.valor
  sala.fase = rodada.faseSeguinte ?? 'escrita'
  
  if (rodada.eventos && rodada.eventos.length > 0) {
    for (const ev of rodada.eventos) {
      chat.registrarSistema(sala, ev.texto, ambiente.agora)
    }
  } else {
    chat.registrarSistema(sala, 'O host iniciou a partida.', ambiente.agora)
  }

  if (rodada.prazos) {
    for (const tipo of TIPOS_DE_PRAZO) {
      const quando = rodada.prazos[tipo]
      if (quando !== undefined) definir(sala, tipo, quando)
    }
  }

  return { ok: true, valor: SEM_EFEITOS }
}

/** `HOST-02` */
function expulsar(
  sala: EstadoSala,
  jogo: JogoDaSala<unknown>,
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
function transferir(
  sala: EstadoSala,
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
function mensagemDeChat(
  sala: EstadoSala,
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
function sair(
  sala: EstadoSala,
  jogo: JogoDaSala<unknown>,
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

function paraOJogo(
  sala: EstadoSala,
  jogo: JogoDaSala<unknown>,
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
    prazoTurno: sala.prazos.turno,
    autorId,
  }
  const resultado = jogo.reduzir(sala.jogo, ctx, entrada, ambiente)
  if (!resultado.ok) return { ok: false, erro: resultado.erro }

  aplicar(sala, resultado, ambiente)
  return { ok: true, valor: SEM_EFEITOS }
}

/** O jogo descreve o que mudou; executar é sempre do `core` (AD-009). */
function aplicar(
  sala: EstadoSala,
  resultado: Extract<ResultadoReducer<unknown>, { ok: true }>,
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
