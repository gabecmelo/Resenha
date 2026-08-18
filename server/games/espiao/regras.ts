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
import { JANELA_DE_RESULTADO_MS, espioesParaMesa } from '../../../shared/protocolo'
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
  /** `ESP-27` — quem puxou a votação; `null` quando foi o relógio da rodada. */
  abertaPor: JogadorId | null
  /** votante → alvo (`'pular'` é a opção de não acusar ninguém). */
  votos: Record<JogadorId, JogadorId | 'pular'>
}

/**
 * `ESP-29`…`ESP-31` — o retrato de uma votação que fechou. É apurado uma vez e
 * nunca recalculado: se alguém sai da sala durante a janela de resultado, o que
 * a mesa decidiu continua sendo o que a mesa decidiu.
 */
export interface ResultadoVotacao {
  votos: Record<JogadorId, JogadorId | 'pular'>
  abertaPor: JogadorId | null
  /** `null` quando ninguém alcançou maioria absoluta. */
  acusado: JogadorId | null
  aMesaAcertou: boolean
  votosNoAcusado: number
  maioriaMinima: number
  totalAtivos: number
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
  /** `ESP-32` — de pé durante a janela de resultado e depois na revelação. */
  resultadoVotacao: ResultadoVotacao | null
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
    resultadoVotacao: null,
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

  const numEspioes = espioesParaMesa(ctx.config.espiao.numEspioes, ativos.length)
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

/** `ESP-09`, `ESP-27`, `ESP-28` — qualquer jogador ativo abre a votação durante a rodada. */
function abrirVotacao(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (!estado.rodadaIniciada) return { ok: false, erro: 'COMANDO_INVALIDO' }
  if (estado.votacaoAberta !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }
  // Edge case — durante a janela de resultado a mesa está lendo o que acabou de
  // acontecer; a próxima acusação espera a rodada voltar.
  if (estado.resultadoVotacao !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  novo.votacaoAberta = { abertaEm: ambiente.agora, abertaPor: ctx.autorId, votos: {} }

  // `AD-010` — o mesmo prazo `turno` serve às três janelas da partida (rodada,
  // votação, resultado); qual delas está valendo se lê pelo estado.
  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `${apelidoNaMesa(ctx, ctx.autorId)} abriu a votação.` }],
    prazos: { turno: prazoDaVotacao(ctx.config, ambiente.agora) },
  }
}

/**
 * O relógio venceu — qual relógio, o estado decide (`AD-010`): a janela de
 * resultado devolve a rodada (`ESP-32`), a votação aberta fecha (`ESP-28`) e a
 * rodada corrente abre a votação (`ESP-10`).
 */
function venceuPrazoTurno(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }

  // `ESP-32` — acabou a leitura do resultado; a rodada recomeça do zero.
  if (estado.resultadoVotacao !== null) {
    const novo = clonar(estado)
    novo.resultadoVotacao = null
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: 'A rodada voltou a correr.' }],
      prazos: { turno: prazoDaRodada(ctx.config, ambiente.agora) },
    }
  }

  // `ESP-28` — o tempo de votação acabou; vale o que já estava na mesa.
  if (estado.votacaoAberta !== null) return fecharVotacao(estado, ctx, ambiente)

  if (ctx.config.espiao.tempoRodadaSeg === null || !estado.rodadaIniciada) {
    return { ok: true, estado, eventos: [], prazos: { turno: null } }
  }

  const novo = clonar(estado)
  novo.votacaoAberta = { abertaEm: ambiente.agora, abertaPor: null, votos: {} }

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'O tempo da rodada acabou. A votação foi aberta automaticamente.' }],
    prazos: { turno: prazoDaVotacao(ctx.config, ambiente.agora) },
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
 * `ESP-13`, `ESP-14`, `ESP-29`…`ESP-33` — maioria absoluta sobre o total de
 * jogadores ativos (não só de quem votou, tech decision de `design.md`).
 * Empate, maioria em "pular" ou 0 votos válidos contam como "não acertou".
 *
 * O voto do próprio espião conta como qualquer outro: quem está infiltrado
 * também vota, às vezes até em si mesmo pra despistar.
 */
function fecharVotacao(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  const votacao = estado.votacaoAberta
  if (votacao === null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const totalAtivos = jogadoresAtivos(ctx).length
  const apuracao = apurar(votacao.votos, totalAtivos)
  const acusado = apuracao.acusado
  const acertou = acusado !== null && estado.espioes.includes(acusado)

  const novo = clonar(estado)
  novo.votacaoAberta = null
  novo.resultadoVotacao = {
    votos: votacao.votos,
    abertaPor: votacao.abertaPor,
    acusado,
    aMesaAcertou: acertou,
    votosNoAcusado: apuracao.votosNoAcusado,
    maioriaMinima: apuracao.maioriaMinima,
    totalAtivos,
  }

  // `ESP-33` — acertou: a partida acaba e o resultado segue vivo na revelação.
  if (acertou) {
    return {
      ok: true,
      estado: novo,
      eventos: [
        { texto: `A mesa acusou ${apelidoNaMesa(ctx, acusado)} — e acertou. A partida terminou.` },
      ],
      prazos: { turno: null },
      faseSeguinte: 'encerrada',
    }
  }

  // `ESP-32` — errou: o resultado fica um tempo na tela antes de a rodada voltar.
  return {
    ok: true,
    estado: novo,
    eventos: [
      {
        texto:
          acusado === null
            ? 'A votação não decidiu nada. A rodada continua.'
            : `A mesa acusou ${apelidoNaMesa(ctx, acusado)} — e errou. A rodada continua.`,
      },
    ],
    prazos: { turno: ambiente.agora + JANELA_DE_RESULTADO_MS },
  }
}

interface Apuracao {
  /** `null` quando não há vencedor único com maioria absoluta. */
  acusado: JogadorId | null
  votosNoAcusado: number
  maioriaMinima: number
}

function apurar(votos: Record<JogadorId, JogadorId | 'pular'>, totalAtivos: number): Apuracao {
  const maioriaMinima = Math.floor(totalAtivos / 2) + 1
  const semAcusado: Apuracao = { acusado: null, votosNoAcusado: 0, maioriaMinima }

  const contagens = new Map<JogadorId, number>()
  for (const voto of Object.values(votos)) {
    if (voto === 'pular') continue
    contagens.set(voto, (contagens.get(voto) ?? 0) + 1)
  }
  if (contagens.size === 0) return semAcusado

  let maior = 0
  for (const contagem of contagens.values()) {
    if (contagem > maior) maior = contagem
  }

  const comMaior = [...contagens.entries()].filter(([, contagem]) => contagem === maior)
  if (comMaior.length !== 1) return semAcusado // empate
  if (maior < maioriaMinima) return semAcusado

  return { acusado: comMaior[0][0], votosNoAcusado: maior, maioriaMinima }
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
  // `ESP-34` — encerrar na mão não é veredito: não houve aposta coletiva a julgar.
  novo.resultadoVotacao = null

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

/** `ESP-28` — a votação sempre tem prazo, mesmo numa rodada sem relógio. */
function prazoDaVotacao(config: Config, agora: number): number {
  return agora + config.espiao.tempoVotacaoSeg * 1_000
}

function apelidoNaMesa(ctx: ContextoDeSala, id: JogadorId): string {
  return ctx.jogadores.find((j) => j.id === id)?.apelido ?? 'Alguém'
}

function clonar(estado: EstadoEspiao): EstadoEspiao {
  return structuredClone(estado)
}
