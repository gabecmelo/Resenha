import type {
  Ambiente,
  Comando,
  ContextoDeSala,
  Jogador,
  JogadorId,
  ResultadoInicio,
  ResultadoReducer,
} from '../../../shared/protocolo'
import type { Config } from '../../../shared/protocolo'
import type { PacoteCompleto } from '../../../shared/pacotes-dados'
import { montarPoolDeCartas } from '../../../shared/pacotes'
import { embaralhar, sortearEspioes } from './sorteio'

/**
 * `ESP-02`, `ESP-03` — mínimo de jogadores ativos exigido por Espião. Vive
 * aqui (não em `shared/protocolo.ts`) porque é regra de jogo, não do `core`;
 * `shared/jogos-catalogo.ts` guarda o mesmo número (3) só para a UI desenhar
 * o aviso antes de clicar "Começar" (`AD-014`).
 */
const MIN_JOGADORES_ESPIAO = 3

export interface VotacaoAberta {
  abertaEm: number
  /** votante → alvo (`'pular'` é a opção de não acusar ninguém). */
  votos: Record<JogadorId, JogadorId | 'pular'>
}

export interface EstadoEspiao {
  /** Nunca enviado a um jogador espião antes da revelação. */
  local: string
  /** 1+ jogadores, conforme `config.espiao.numEspioes`. */
  espioes: JogadorId[]
  /** Sorteado ao iniciar; só informativo — nunca vira estado de turno. */
  comecaPerguntando: JogadorId
  /** Fase "aguardando prontos" — some quando `rodadaIniciada` vira true. */
  prontos: JogadorId[]
  /** false = tela de espera por PRONTO; true = tela padrão do jogo. */
  rodadaIniciada: boolean
  votacaoAberta: VotacaoAberta | null
  /** `NOTA-02`-like — privado por jogador. */
  notas: Record<JogadorId, string>
  /** Mesmo padrão de `pacotesSelecionados` de "Quem Sou Eu" — visível durante o jogo. */
  pacotesSelecionados?: { id: string; nome: string; emoji: string }[]
}

/** Avisos que o `core` entrega ao jogo; não são comandos de cliente. */
export type EventoDeSala =
  | { t: 'saiuJogador'; jogadorId: JogadorId }
  | { t: 'entrouJogador'; jogadorId: JogadorId }
  | { t: 'venceuPrazoTurno' }

type TipoDeComandoDeJogo =
  | 'marcarPronto'
  | 'abrirVotacao'
  | 'votar'
  | 'encerrarVotacao'
  | 'encerrar'
  | 'novaPartida'
  | 'notas'

export type ComandoEspiao = Extract<Comando, { t: TipoDeComandoDeJogo }> | EventoDeSala

/** Partida ainda não montada — também é o estado após cancelar ou nova partida. */
export function estadoVazio(): EstadoEspiao {
  return {
    local: '',
    espioes: [],
    comecaPerguntando: '',
    prontos: [],
    rodadaIniciada: false,
    votacaoAberta: null,
    notas: {},
  }
}

/**
 * `ESP-01`…`ESP-04` — sorteia local, espiões e quem começa perguntando.
 * Recusa abaixo de `MIN_JOGADORES_ESPIAO` ativos, ou quando o nº de espiões
 * configurado não deixa ao menos 2 não-espiões (`ESP-02` — validado aqui, não
 * em `configValida`, porque o nº de ativos muda enquanto a sala está no
 * lobby).
 */
export function iniciarRodada(
  ctx: ContextoDeSala,
  ambiente: Ambiente,
  pacotes?: PacoteCompleto[],
): ResultadoInicio<EstadoEspiao> {
  const ativos = jogadoresAtivos(ctx)
  if (ativos.length < MIN_JOGADORES_ESPIAO) return { ok: false, erro: 'JOGADORES_INSUFICIENTES' }

  const numEspioes = ctx.config.espiao.numEspioes
  if (ativos.length - numEspioes < 2) return { ok: false, erro: 'JOGADORES_INSUFICIENTES' }

  if (pacotes === undefined) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }
  const pool = montarPoolDeCartas(pacotes, ctx.config.dificuldades)
  if (pool.length === 0) return { ok: false, erro: 'PACOTE_INSUFICIENTE' }

  const idsAtivos = ativos.map((j) => j.id)
  const estado = estadoVazio()
  estado.espioes = sortearEspioes(idsAtivos, numEspioes, ambiente.aleatorio)
  estado.comecaPerguntando = embaralhar(idsAtivos, ambiente.aleatorio)[0]
  estado.local = embaralhar(pool, ambiente.aleatorio)[0]
  estado.pacotesSelecionados = pacotes.map((p) => ({ id: p.id, nome: p.nome, emoji: p.emoji }))

  return { ok: true, valor: estado, faseSeguinte: 'jogo' }
}

/** Reducer puro do jogo: recebe estado + contexto e devolve estado + efeitos descritos. */
export function reduzir(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  comando: ComandoEspiao,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  switch (comando.t) {
    case 'marcarPronto':
      return marcarPronto(estado, ctx, comando.pronto, ambiente)
    case 'abrirVotacao':
      return abrirVotacao(estado, ctx, ambiente)
    case 'votar':
      return votar(estado, ctx, comando.alvoId, ambiente)
    case 'encerrarVotacao':
      return encerrarVotacao(estado, ctx, ambiente)
    case 'encerrar':
      return encerrar(estado, ctx)
    case 'novaPartida':
      return novaPartida(ctx)
    case 'notas':
      return escreverNotas(estado, ctx, comando.texto)
    case 'venceuPrazoTurno':
      return venceuPrazoTurno(estado, ctx, ambiente)
    case 'entrouJogador':
      // A rodada corrente não é redistribuída por quem chega (mesmo padrão `ESCR-10`).
      return { ok: true, estado, eventos: [], prazos: {} }
    case 'saiuJogador':
      return saiuJogador(estado, ctx, comando.jogadorId, ambiente)
    default:
      return { ok: false, erro: 'COMANDO_INVALIDO' }
  }
}

// ---------------------------------------------------------------------------
// Aguardando prontos → rodada
// ---------------------------------------------------------------------------

/** `ESP-05`, `ESP-06` */
function marcarPronto(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  pronto: boolean,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.rodadaIniciada) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  if (pronto) {
    if (!novo.prontos.includes(ctx.autorId)) novo.prontos.push(ctx.autorId)
  } else {
    novo.prontos = novo.prontos.filter((id) => id !== ctx.autorId)
  }

  if (pronto && todosProntos(novo, ctx)) {
    novo.rodadaIniciada = true
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: 'Todo mundo está PRONTO. A rodada começou.' }],
      prazos: { turno: prazoDaRodada(ctx.config, ambiente.agora) },
    }
  }

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

// ---------------------------------------------------------------------------
// Votação
// ---------------------------------------------------------------------------

/** `ESP-09` — qualquer jogador ativo pode abrir a votação durante a rodada. */
function abrirVotacao(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (!estado.rodadaIniciada) return { ok: false, erro: 'COMANDO_INVALIDO' }
  if (estado.votacaoAberta !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  novo.votacaoAberta = { abertaEm: ambiente.agora, votos: {} }

  // `AD-014`, tech decision — o prazo da rodada pausa enquanto a votação está aberta.
  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'A votação foi aberta.' }],
    prazos: { turno: null },
  }
}

/** `ESP-10` — o timer esgotado abre a votação automaticamente. */
function venceuPrazoTurno(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.config.espiao.tempoRodadaSeg === null) {
    return { ok: true, estado, eventos: [], prazos: { turno: null } }
  }
  if (!estado.rodadaIniciada || estado.votacaoAberta !== null) {
    return { ok: true, estado, eventos: [], prazos: { turno: null } }
  }

  const novo = clonar(estado)
  novo.votacaoAberta = { abertaEm: ambiente.agora, votos: {} }

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'O tempo da rodada acabou. A votação foi aberta automaticamente.' }],
    prazos: { turno: null },
  }
}

/**
 * `ESP-11` — um voto por jogador ativo, substitui o voto anterior. `alvoId`
 * nulo é "pular". `ESP-12` — quando todos os ativos conectados já votaram, a
 * votação fecha na hora, sem esperar um `encerrarVotacao` explícito.
 */
function votar(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  alvoId: JogadorId | null,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.votacaoAberta === null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const ativosIds = jogadoresAtivos(ctx).map((j) => j.id)
  if (alvoId !== null && !ativosIds.includes(alvoId)) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  const votacao = novo.votacaoAberta
  if (votacao === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
  votacao.votos[ctx.autorId] = alvoId === null ? 'pular' : alvoId

  if (todosAtivosConectadosVotaram(votacao, ctx)) return fecharVotacao(novo, ctx, ambiente)

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/** `ESP-12` — o host também pode fechar a votação a qualquer momento. */
function encerrarVotacao(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (estado.votacaoAberta === null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  return fecharVotacao(estado, ctx, ambiente)
}

/**
 * `ESP-13`, `ESP-14` — maioria absoluta sobre o total de jogadores ativos
 * (não só de quem votou, tech decision de `design.md`). Empate, maioria em
 * "pular" ou 0 votos válidos contam como "não acertou" (mesmo tratamento).
 */
function fecharVotacao(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  const votacao = estado.votacaoAberta
  if (votacao === null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const totalAtivos = jogadoresAtivos(ctx).length
  const vencedorId = vencedorDaVotacao(votacao.votos, totalAtivos)
  const acertou = vencedorId !== null && estado.espioes.includes(vencedorId)

  const novo = clonar(estado)
  novo.votacaoAberta = null

  if (acertou) {
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: 'A votação encontrou um espião! A partida terminou.' }],
      prazos: { turno: null },
      faseSeguinte: 'encerrada',
    }
  }

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'A votação não encontrou um espião. A partida continua.' }],
    prazos: { turno: prazoDaRodada(ctx.config, ambiente.agora) },
  }
}

/** `null` quando não há vencedor único com maioria absoluta. */
function vencedorDaVotacao(
  votos: Record<JogadorId, JogadorId | 'pular'>,
  totalAtivos: number,
): JogadorId | null {
  const contagens = new Map<JogadorId, number>()
  for (const voto of Object.values(votos)) {
    if (voto === 'pular') continue
    contagens.set(voto, (contagens.get(voto) ?? 0) + 1)
  }
  if (contagens.size === 0) return null

  let maior = 0
  for (const contagem of contagens.values()) {
    if (contagem > maior) maior = contagem
  }

  const comMaior = [...contagens.entries()].filter(([, contagem]) => contagem === maior)
  if (comMaior.length !== 1) return null // empate

  const maioriaMinima = Math.floor(totalAtivos / 2) + 1
  if (maior < maioriaMinima) return null

  return comMaior[0][0]
}

function todosAtivosConectadosVotaram(votacao: VotacaoAberta, ctx: ContextoDeSala): boolean {
  const conectados = jogadoresAtivos(ctx).filter((j) => j.conectado)
  return conectados.length > 0 && conectados.every((j) => votacao.votos[j.id] !== undefined)
}

// ---------------------------------------------------------------------------
// Encerramento e nova partida
// ---------------------------------------------------------------------------

/** `ESP-15` — o host encerra a qualquer momento da fase de jogo, revela tudo. */
function encerrar(estado: EstadoEspiao, ctx: ContextoDeSala): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }

  const novo = clonar(estado)
  novo.votacaoAberta = null

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'A partida foi encerrada. O local e os espiões foram revelados.' }],
    prazos: { turno: null },
    faseSeguinte: 'encerrada',
  }
}

/** Devolve a sala ao lobby com a partida zerada. */
function novaPartida(ctx: ContextoDeSala): ResultadoReducer<EstadoEspiao> {
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
// Bloco de notas
// ---------------------------------------------------------------------------

/** Nota privada por jogador, mesmo padrão de "Quem Sou Eu" (`ESP-21`-like). */
function escreverNotas(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  texto: string,
): ResultadoReducer<EstadoEspiao> {
  const novo = clonar(estado)
  novo.notas[ctx.autorId] = texto
  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

// ---------------------------------------------------------------------------
// Saída de jogador
// ---------------------------------------------------------------------------

/**
 * Edge cases do spec: ativos abaixo do mínimo cancela a partida; o espião
 * único que sai deixa a partida seguir sem espião algum (não redistribui
 * papéis no meio da rodada — Espião nunca tem fase de escrita).
 */
function saiuJogador(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  jogadorId: JogadorId,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase === 'lobby' || ctx.fase === 'encerrada') {
    return { ok: true, estado, eventos: [], prazos: {} }
  }

  const restantes = jogadoresAtivos(ctx)
  if (restantes.length < MIN_JOGADORES_ESPIAO) {
    return {
      ok: true,
      estado: estadoVazio(),
      eventos: [
        {
          texto: `A partida foi cancelada: são necessários ao menos ${MIN_JOGADORES_ESPIAO} jogadores.`,
        },
      ],
      prazos: { turno: null },
      faseSeguinte: 'lobby',
      promoverAguardando: true,
    }
  }

  const novo = clonar(estado)
  novo.prontos = novo.prontos.filter((id) => id !== jogadorId)
  novo.espioes = novo.espioes.filter((id) => id !== jogadorId)
  delete novo.notas[jogadorId]
  if (novo.votacaoAberta !== null) delete novo.votacaoAberta.votos[jogadorId]
  if (novo.comecaPerguntando === jogadorId) novo.comecaPerguntando = restantes[0].id

  // Ainda aguardando prontos: quem saiu pode ter sido o último faltando.
  if (!novo.rodadaIniciada) {
    if (todosProntos(novo, ctx)) {
      novo.rodadaIniciada = true
      return {
        ok: true,
        estado: novo,
        eventos: [{ texto: 'Um jogador saiu. Todo mundo está PRONTO. A rodada começou.' }],
        prazos: { turno: prazoDaRodada(ctx.config, ambiente.agora) },
      }
    }
    return { ok: true, estado: novo, eventos: [], prazos: {} }
  }

  // Votação aberta: quem saiu pode ter sido o último faltando votar.
  if (novo.votacaoAberta !== null && todosAtivosConectadosVotaram(novo.votacaoAberta, ctx)) {
    return fecharVotacao(novo, ctx, ambiente)
  }

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function jogadoresAtivos(ctx: ContextoDeSala): Jogador[] {
  return ctx.jogadores.filter((j) => j.situacao === 'ativo')
}

function todosProntos(estado: EstadoEspiao, ctx: ContextoDeSala): boolean {
  const ativos = jogadoresAtivos(ctx)
  return ativos.length > 0 && ativos.every((j) => estado.prontos.includes(j.id))
}

/** `null` quando a configuração é "sem limite". */
function prazoDaRodada(config: Config, agora: number): number | null {
  return config.espiao.tempoRodadaSeg === null ? null : agora + config.espiao.tempoRodadaSeg * 1_000
}

function clonar(estado: EstadoEspiao): EstadoEspiao {
  return structuredClone(estado)
}
