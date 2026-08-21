import type {
  Ambiente,
  Comando,
  ContextoDeSala,
  Jogador,
  JogadorId,
  ResultadoInicio,
  ResultadoReducer,
} from '../../protocolo'
import {
  JANELA_DE_REVELACAO_MS,
  LIMITE_CARTA_BRANCA,
  MIN_RESPOSTAS_NA_PILHA,
  OPCOES_DE_PERGUNTA,
  RODADAS_POR_REROLL,
  TAMANHO_DA_MAO,
} from '../../protocolo'
import { CARTAS_TURMA } from '../../cartas-turma-dados'
import { montarBaralho } from '../../cartas-turma'
import { embaralhar } from './sorteio'

/**
 * `CCT-02` — mínimo de jogadores ativos: um juiz e ao menos duas respostas pra
 * ele escolher. Vive aqui (não em `shared/protocolo.ts`) porque é regra de
 * jogo, não do `core`; `shared/jogos-catalogo.ts` guarda o mesmo número só
 * para a UI desenhar o aviso antes de clicar "Começar" (`AD-014`).
 */
const MIN_JOGADORES_CARTAS = 3

/** Uma carta jogada na rodada. A autoria só sai daqui na revelação (`CCT-08`). */
export interface JogadaDaRodada {
  autorId: JogadorId
  texto: string
  /** `CCT-20` — escrita na hora, e não tirada da mão. */
  daBranca: boolean
}

export interface EstadoCartas {
  /** Cartas ainda não sorteadas nesta partida. */
  montePerguntas: string[]
  monteRespostas: string[]
  /** `CCT-15` — usadas; voltam ao monte só quando ele esvazia. */
  descartePerguntas: string[]
  descarteRespostas: string[]
  /** Ordem fixa de rotação do juiz, sorteada no início (`CCT-14`). */
  ordemJuizes: JogadorId[]
  indiceJuiz: number
  /** 1-based. */
  rodada: number
  /** `CCT-35` — as perguntas na mão do juiz; some quando ele escolhe. */
  opcoesPergunta: string[]
  /** Vazia até o juiz escolher (`CCT-35`). */
  pergunta: string
  /** `CCT-36` — virada pra mesa. Antes disso só o juiz sabe o que está escrito. */
  perguntaRevelada: boolean
  /** Privada por jogador — nunca projetada pra outro (`CCT-04`). */
  maos: Record<JogadorId, string[]>
  /**
   * `CCT-24` — rodada a partir da qual a carta em branco volta a valer. `0` (ou
   * qualquer valor `<= rodada`) significa disponível agora.
   */
  brancaVoltaNa: Record<JogadorId, number>
  /** `CCT-40` — trocas de mão que cada um ainda tem. */
  rerolls: Record<JogadorId, number>
  jogadas: JogadaDaRodada[]
  /**
   * `CCT-08` — a ordem embaralhada em que a mesa vê as jogadas. Só existe
   * depois que a fase de escolha fecha; guarda índices de `jogadas`.
   */
  pilha: number[] | null
  /** `CCT-38` — índices **na pilha** que o juiz já virou pra mesa. */
  reveladas: number[]
  /** Índice **na pilha** da carta que o juiz escolheu (`CCT-11`). */
  vencedoraNaPilha: number | null
  /** `CCT-26` — placar da partida (`AD-015`). */
  placar: Record<JogadorId, number>
  fase: 'pergunta' | 'escolha' | 'julgamento' | 'revelacao'
  /** `CCT-28` — alguém bateu a meta; a partida acaba quando a revelação sai. */
  metaBatida: boolean
  pacotesSelecionados?: { id: string; nome: string; emoji: string }[]
}

/** Avisos que o `core` entrega ao jogo; não são comandos de cliente. */
export type EventoDeSala =
  | { t: 'saiuJogador'; jogadorId: JogadorId }
  | { t: 'entrouJogador'; jogadorId: JogadorId }
  | { t: 'venceuPrazoTurno' }

type TipoDeComandoDeJogo =
  | 'jogarCarta'
  | 'escolherPergunta'
  | 'revelarPergunta'
  | 'revelarCarta'
  | 'trocarMao'
  | 'escolherVencedora'
  | 'encerrar'
  | 'novaPartida'
  | 'notas'

export type ComandoCartas = Extract<Comando, { t: TipoDeComandoDeJogo }> | EventoDeSala

/** Partida ainda não montada — também é o estado após cancelar ou nova partida. */
export function estadoVazio(): EstadoCartas {
  return {
    montePerguntas: [],
    monteRespostas: [],
    descartePerguntas: [],
    descarteRespostas: [],
    ordemJuizes: [],
    indiceJuiz: 0,
    rodada: 0,
    opcoesPergunta: [],
    pergunta: '',
    perguntaRevelada: false,
    maos: {},
    brancaVoltaNa: {},
    rerolls: {},
    jogadas: [],
    pilha: null,
    reveladas: [],
    vencedoraNaPilha: null,
    placar: {},
    fase: 'pergunta',
    metaBatida: false,
  }
}

/**
 * `CCT-02`, `CCT-03`, `CCT-34` — monta o baralho, sorteia a ordem de juízes,
 * distribui as mãos e vira a primeira pergunta.
 *
 * Os pacotes vêm de `shared/cartas-turma-dados.ts` direto, e não do parâmetro
 * `pacotes` do `core`: aquele canal carrega `PacoteCompleto` (cartas com
 * dificuldade), formato que este jogo não usa — aqui um pacote traz dois
 * baralhos. O `core` não precisa saber disso (`AD-002`).
 */
export function iniciarRodada(ctx: ContextoDeSala, ambiente: Ambiente): ResultadoInicio<EstadoCartas> {
  const ativos = jogadoresAtivos(ctx)
  if (ativos.length < MIN_JOGADORES_CARTAS) return { ok: false, erro: 'JOGADORES_INSUFICIENTES' }

  const escolhidos = CARTAS_TURMA.filter((p) => ctx.config.pacoteIds.includes(p.id))
  if (escolhidos.length === 0) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }

  const baralho = montarBaralho(escolhidos)
  if (baralho.perguntas.length === 0) return { ok: false, erro: 'PACOTE_INSUFICIENTE' }
  // Sem mão cheia pra todo mundo o jogo já nasce torto.
  if (baralho.respostas.length < ativos.length * TAMANHO_DA_MAO) {
    return { ok: false, erro: 'PACOTE_INSUFICIENTE' }
  }

  const estado = estadoVazio()
  estado.montePerguntas = embaralhar(baralho.perguntas, ambiente.aleatorio)
  estado.monteRespostas = embaralhar(baralho.respostas, ambiente.aleatorio)
  estado.ordemJuizes = embaralhar(
    ativos.map((j) => j.id),
    ambiente.aleatorio,
  )
  estado.rodada = 1
  // `CCT-35` — a primeira coisa da rodada é o juiz escolher a pergunta.
  estado.opcoesPergunta = tirarPerguntas(estado, OPCOES_DE_PERGUNTA)
  for (const jogador of ativos) {
    estado.maos[jogador.id] = tirarRespostas(estado, TAMANHO_DA_MAO)
    estado.brancaVoltaNa[jogador.id] = 0
    estado.rerolls[jogador.id] = ctx.config.cartas.rerollsIniciais
    estado.placar[jogador.id] = 0
  }
  estado.pacotesSelecionados = escolhidos.map((p) => ({ id: p.id, nome: p.nome, emoji: p.emoji }))

  return {
    ok: true,
    valor: estado,
    faseSeguinte: 'jogo',
    // O relógio da rodada só começa quando a pergunta é virada (`CCT-36`).
    prazos: { turno: null },
    eventos: [
      { texto: `A partida começou. ${apelidoDe(ctx, juizDa(estado))} escolhe a carta da rodada.` },
    ],
  }
}

/** Reducer puro do jogo: recebe estado + contexto e devolve estado + efeitos descritos. */
export function reduzir(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  comando: ComandoCartas,
  ambiente: Ambiente,
): ResultadoReducer<EstadoCartas> {
  switch (comando.t) {
    case 'jogarCarta':
      return jogarCarta(estado, ctx, comando.texto, comando.daBranca, ambiente)
    case 'escolherPergunta':
      return escolherPergunta(estado, ctx, comando.indice)
    case 'revelarPergunta':
      return revelarPergunta(estado, ctx, ambiente)
    case 'revelarCarta':
      return revelarCarta(estado, ctx, comando.indice)
    case 'trocarMao':
      return trocarMao(estado, ctx)
    case 'escolherVencedora':
      return escolherVencedora(estado, ctx, comando.indice, ambiente)
    case 'encerrar':
      return encerrar(estado, ctx)
    case 'novaPartida':
      return novaPartida(ctx)
    case 'venceuPrazoTurno':
      return venceuPrazoTurno(estado, ctx, ambiente)
    case 'entrouJogador':
      // A partida corrente não é redistribuída por quem chega (mesmo padrão `ESCR-10`).
      return { ok: true, estado, eventos: [], prazos: {} }
    case 'saiuJogador':
      return saiuJogador(estado, ctx, comando.jogadorId, ambiente)
    default:
      return { ok: false, erro: 'COMANDO_INVALIDO' }
  }
}

// ---------------------------------------------------------------------------
// Fase da pergunta
// ---------------------------------------------------------------------------

/** `CCT-35` — o juiz escolhe qual das perguntas da mão dele vai valer. */
function escolherPergunta(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  indice: number,
): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.fase !== 'pergunta') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== juizDa(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  // Escolher duas vezes trocaria a carta com a mesa já esperando.
  if (estado.pergunta !== '') return { ok: false, erro: 'FASE_INVALIDA' }
  if (!Number.isInteger(indice) || indice < 0 || indice >= estado.opcoesPergunta.length) {
    return { ok: false, erro: 'CARTA_INVALIDA' }
  }

  const novo = clonar(estado)
  novo.pergunta = novo.opcoesPergunta[indice]!
  // As recusadas voltam pro fim do baralho: podem sair de novo mais pra frente.
  novo.descartePerguntas.push(...novo.opcoesPergunta.filter((_, i) => i !== indice))
  novo.opcoesPergunta = []

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/**
 * `CCT-36` — o juiz vira a pergunta pra mesa. É este clique, e não a escolha,
 * que larga o relógio: até aqui só ele sabe o que está escrito.
 */
function revelarPergunta(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.fase !== 'pergunta') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== juizDa(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (estado.pergunta === '') return { ok: false, erro: 'FASE_INVALIDA' }

  const novo = clonar(estado)
  novo.perguntaRevelada = true
  novo.fase = 'escolha'

  return {
    ok: true,
    estado: novo,
    eventos: [],
    prazos: { turno: prazoDeEscolha(ctx, ambiente) },
  }
}

// ---------------------------------------------------------------------------
// Fase de escolha
// ---------------------------------------------------------------------------

/** `CCT-06`, `CCT-20`…`CCT-23` — joga uma carta da mão, ou a carta em branco. */
function jogarCarta(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  texto: string,
  daBranca: boolean,
  ambiente: Ambiente,
): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.fase !== 'escolha') return { ok: false, erro: 'FASE_INVALIDA' }

  const autor = ctx.jogadores.find((j) => j.id === ctx.autorId)
  if (!autor || autor.situacao !== 'ativo') return { ok: false, erro: 'JOGADOR_AGUARDANDO' }
  // `CCT-05` — o juiz não joga na própria rodada.
  if (ctx.autorId === juizDa(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (estado.jogadas.some((j) => j.autorId === ctx.autorId)) return { ok: false, erro: 'FASE_INVALIDA' }

  const novo = clonar(estado)

  if (daBranca) {
    if (!brancaDisponivel(estado, ctx.autorId)) return { ok: false, erro: 'CARTA_INVALIDA' }
    const limpo = texto.trim()
    // `CCT-21`, `CCT-22`
    if (limpo.length === 0 || limpo.length > LIMITE_CARTA_BRANCA) {
      return { ok: false, erro: 'CARTA_INVALIDA' }
    }
    novo.brancaVoltaNa[ctx.autorId] = estado.rodada + ctx.config.cartas.recargaDaBrancaRodadas
    novo.jogadas.push({ autorId: ctx.autorId, texto: limpo, daBranca: true })
  } else {
    const mao = novo.maos[ctx.autorId] ?? []
    const posicao = mao.indexOf(texto)
    if (posicao === -1) return { ok: false, erro: 'CARTA_INVALIDA' }
    mao.splice(posicao, 1)
    novo.jogadas.push({ autorId: ctx.autorId, texto, daBranca: false })
  }

  // `CCT-08` — o último a jogar fecha a pilha.
  if (novo.jogadas.length >= quantosDevemJogar(novo, ctx)) {
    return fecharEscolha(novo, ctx, ambiente, [])
  }

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/**
 * `CCT-40` — troca a mão inteira por uma nova, gastando uma das trocas.
 *
 * A mão velha vai pro descarte, e não pro fim do monte: o que saiu não volta
 * na próxima compra, senão a troca devolveria as mesmas cartas.
 */
function trocarMao(estado: EstadoCartas, ctx: ContextoDeSala): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.fase !== 'escolha') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId === juizDa(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  // Trocar depois de jogar seria trocar a carta que já está na mesa.
  if (estado.jogadas.some((j) => j.autorId === ctx.autorId)) return { ok: false, erro: 'FASE_INVALIDA' }
  if ((estado.rerolls[ctx.autorId] ?? 0) <= 0) return { ok: false, erro: 'CARTA_INVALIDA' }

  const novo = clonar(estado)
  const velha = novo.maos[ctx.autorId] ?? []
  novo.descarteRespostas.push(...velha)
  novo.maos[ctx.autorId] = tirarRespostas(novo, TAMANHO_DA_MAO)
  novo.rerolls[ctx.autorId] = (novo.rerolls[ctx.autorId] ?? 0) - 1

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/**
 * `CCT-08`, `CCT-09`, `CCT-10` — a escolha fecha (por todo mundo ter jogado ou
 * pelo relógio) e a pilha vira o objeto da mesa: embaralhada, sem autor.
 */
function fecharEscolha(
  novo: EstadoCartas,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
  eventos: { texto: string }[],
): ResultadoReducer<EstadoCartas> {
  if (novo.jogadas.length < MIN_RESPOSTAS_NA_PILHA) {
    return descartarRodada(novo, ctx, [
      ...eventos,
      { texto: 'Ninguém jogou o suficiente. Rodada descartada.' },
    ])
  }

  novo.pilha = embaralhar(
    novo.jogadas.map((_, indice) => indice),
    ambiente.aleatorio,
  )
  novo.fase = 'julgamento'
  // O julgamento não tem relógio: o juiz é uma pessoa e a mesa cobra sozinha.
  return { ok: true, estado: novo, eventos, prazos: { turno: null } }
}

// ---------------------------------------------------------------------------
// Julgamento e revelação
// ---------------------------------------------------------------------------

/**
 * `CCT-38` — o juiz vira uma carta da pilha e ela passa a ser lida por todo
 * mundo ao mesmo tempo. Antes disso o texto não sai do servidor nem pra ele:
 * a pilha chega virada pra baixo pra mesa inteira.
 */
function revelarCarta(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  indice: number,
): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.fase !== 'julgamento' || estado.pilha === null) return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== juizDa(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (!Number.isInteger(indice) || indice < 0 || indice >= estado.pilha.length) {
    return { ok: false, erro: 'CARTA_INVALIDA' }
  }
  if (estado.reveladas.includes(indice)) return { ok: false, erro: 'FASE_INVALIDA' }

  const novo = clonar(estado)
  novo.reveladas.push(indice)

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/** `CCT-11`, `CCT-12`, `CCT-13` — o juiz aponta a vencedora e o ponto é dado. */
function escolherVencedora(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  indice: number,
  ambiente: Ambiente,
): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.fase !== 'julgamento' || estado.pilha === null) return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== juizDa(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (!Number.isInteger(indice) || indice < 0 || indice >= estado.pilha.length) {
    return { ok: false, erro: 'CARTA_INVALIDA' }
  }
  // `CCT-39` — não dá pra escolher o que a mesa ainda não leu.
  if (estado.reveladas.length < estado.pilha.length) return { ok: false, erro: 'FASE_INVALIDA' }

  const novo = clonar(estado)
  novo.vencedoraNaPilha = indice
  novo.fase = 'revelacao'

  const jogada = novo.jogadas[novo.pilha![indice]!]!
  novo.placar[jogada.autorId] = (novo.placar[jogada.autorId] ?? 0) + 1

  const meta = ctx.config.cartas.metaDePontos
  novo.metaBatida = meta !== null && (novo.placar[jogada.autorId] ?? 0) >= meta

  return {
    ok: true,
    estado: novo,
    eventos: [],
    prazos: { turno: ambiente.agora + JANELA_DE_REVELACAO_MS },
  }
}

/**
 * `CCT-14`, `CCT-28` — a revelação sai da tela: ou a partida acabou (alguém
 * bateu a meta), ou a próxima rodada começa com o próximo juiz.
 */
function venceuPrazoTurno(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: true, estado, eventos: [], prazos: {} }

  if (estado.fase === 'escolha') {
    // `CCT-09` — quem não jogou fica de fora desta rodada; a mesa não espera.
    return fecharEscolha(clonar(estado), ctx, ambiente, [])
  }

  if (estado.fase === 'revelacao') {
    if (estado.metaBatida) {
      return {
        ok: true,
        estado,
        eventos: [{ texto: `${nomesDosCampeoes(estado, ctx)} bateu a meta e levou a partida!` }],
        prazos: { turno: null },
        faseSeguinte: 'encerrada',
      }
    }
    return proximaRodada(clonar(estado), ctx, [])
  }

  return { ok: true, estado, eventos: [], prazos: {} }
}

// ---------------------------------------------------------------------------
// Troca de rodada
// ---------------------------------------------------------------------------

/** `CCT-14`, `CCT-15` — repõe as mãos, passa o juiz e vira a próxima pergunta. */
function proximaRodada(
  novo: EstadoCartas,
  ctx: ContextoDeSala,
  eventos: { texto: string }[],
): ResultadoReducer<EstadoCartas> {
  for (const jogada of novo.jogadas) {
    novo.descarteRespostas.push(jogada.texto)
  }
  // Rodada descartada antes da escolha não tem pergunta pra devolver.
  if (novo.pergunta !== '') novo.descartePerguntas.push(novo.pergunta)

  novo.jogadas = []
  novo.pilha = null
  novo.reveladas = []
  novo.vencedoraNaPilha = null
  novo.fase = 'pergunta'
  novo.rodada += 1
  novo.indiceJuiz = novo.ordemJuizes.length === 0 ? 0 : (novo.indiceJuiz + 1) % novo.ordemJuizes.length
  novo.pergunta = ''
  novo.perguntaRevelada = false
  novo.opcoesPergunta = tirarPerguntas(novo, OPCOES_DE_PERGUNTA)

  for (const jogador of jogadoresAtivos(ctx)) {
    const mao = novo.maos[jogador.id] ?? []
    if (mao.length < TAMANHO_DA_MAO) {
      mao.push(...tirarRespostas(novo, TAMANHO_DA_MAO - mao.length))
    }
    novo.maos[jogador.id] = mao
    novo.brancaVoltaNa[jogador.id] ??= 0
    novo.rerolls[jogador.id] ??= ctx.config.cartas.rerollsIniciais
    novo.placar[jogador.id] ??= 0
    // `CCT-40` — a cada três rodadas fechadas, mais uma troca pra cada um.
    if (ganhaReroll(novo.rodada)) novo.rerolls[jogador.id] += 1
  }

  return {
    ok: true,
    estado: novo,
    eventos,
    // De novo o juiz é quem larga o relógio, virando a pergunta (`CCT-36`).
    prazos: { turno: null },
  }
}

/** `CCT-10`, `CCT-18` — a rodada não vale: nova pergunta, próximo juiz, sem ponto. */
function descartarRodada(
  novo: EstadoCartas,
  ctx: ContextoDeSala,
  eventos: { texto: string }[],
): ResultadoReducer<EstadoCartas> {
  // As cartas jogadas voltam pra mão de quem as jogou: a rodada não aconteceu.
  for (const jogada of novo.jogadas) {
    if (jogada.daBranca) {
      novo.brancaVoltaNa[jogada.autorId] = 0
      continue
    }
    const mao = novo.maos[jogada.autorId]
    if (mao) mao.push(jogada.texto)
  }
  novo.jogadas = []
  return proximaRodada(novo, ctx, eventos)
}

// ---------------------------------------------------------------------------
// Encerramento e roster
// ---------------------------------------------------------------------------

/** `CCT-16` — o host encerra na mão; o placar final é o que está de pé. */
function encerrar(estado: EstadoCartas, ctx: ContextoDeSala): ResultadoReducer<EstadoCartas> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }

  return {
    ok: true,
    estado,
    eventos: [{ texto: 'A partida foi encerrada. Placar final na mesa.' }],
    prazos: { turno: null },
    faseSeguinte: 'encerrada',
  }
}

function novaPartida(ctx: ContextoDeSala): ResultadoReducer<EstadoCartas> {
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

/** `CCT-17`, `CCT-18` — quem sai não trava a mesa. */
function saiuJogador(
  estado: EstadoCartas,
  ctx: ContextoDeSala,
  jogadorId: JogadorId,
  ambiente: Ambiente,
): ResultadoReducer<EstadoCartas> {
  if (ctx.fase === 'lobby' || ctx.fase === 'encerrada') {
    return { ok: true, estado, eventos: [], prazos: {} }
  }

  const restantes = jogadoresAtivos(ctx)
  if (restantes.length < MIN_JOGADORES_CARTAS) {
    return {
      ok: true,
      estado: estadoVazio(),
      eventos: [
        { texto: `A partida foi cancelada: são necessários ao menos ${MIN_JOGADORES_CARTAS} jogadores.` },
      ],
      prazos: { turno: null },
      faseSeguinte: 'lobby',
      promoverAguardando: true,
    }
  }

  const eraOJuiz = juizDa(estado) === jogadorId
  const novo = clonar(estado)
  delete novo.maos[jogadorId]
  delete novo.brancaVoltaNa[jogadorId]
  delete novo.rerolls[jogadorId]
  delete novo.placar[jogadorId]

  const posicao = novo.ordemJuizes.indexOf(jogadorId)
  if (posicao !== -1) {
    novo.ordemJuizes.splice(posicao, 1)
    // O índice aponta pra uma lista que encolheu antes dele.
    if (posicao < novo.indiceJuiz) novo.indiceJuiz -= 1
    if (novo.indiceJuiz >= novo.ordemJuizes.length) novo.indiceJuiz = 0
  }

  if (eraOJuiz && novo.fase !== 'revelacao') {
    // `CCT-18` — sem juiz não há julgamento; a rodada não vale.
    // `indiceJuiz` já aponta pro próximo, então `proximaRodada` não pode
    // avançá-lo de novo: recua um antes de descartar.
    novo.indiceJuiz =
      novo.ordemJuizes.length === 0
        ? 0
        : (novo.indiceJuiz - 1 + novo.ordemJuizes.length) % novo.ordemJuizes.length
    return descartarRodada(novo, ctx, [
      { texto: 'Quem julgava a rodada saiu. Rodada descartada.' },
    ])
  }

  // Só antes da pilha fechar: depois disso `pilha` e `reveladas` são índices
  // de `jogadas`, e tirar um item do meio apontaria tudo pra carta errada. Na
  // mesa de verdade também é assim — a carta jogada fica, quem sai é a pessoa.
  if (novo.fase === 'pergunta' || novo.fase === 'escolha') {
    novo.jogadas = novo.jogadas.filter((j) => j.autorId !== jogadorId)
  }
  if (novo.fase === 'escolha' && novo.jogadas.length >= quantosDevemJogar(novo, ctx)) {
    return fecharEscolha(novo, ctx, ambiente, [])
  }

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

export function juizDa(estado: EstadoCartas): JogadorId {
  return estado.ordemJuizes[estado.indiceJuiz] ?? ''
}

export function brancaDisponivel(estado: EstadoCartas, jogadorId: JogadorId): boolean {
  return (estado.brancaVoltaNa[jogadorId] ?? 0) <= estado.rodada
}

/** `CCT-40` — a rodada que abre trazendo mais uma troca de mão pra mesa. */
function ganhaReroll(rodada: number): boolean {
  return rodada > 1 && (rodada - 1) % RODADAS_POR_REROLL === 0
}

/** `CCT-40` — em quantas rodadas cai a próxima troca. */
export function rerollVoltaEm(estado: EstadoCartas): number {
  const desde = (estado.rodada - 1) % RODADAS_POR_REROLL
  return RODADAS_POR_REROLL - desde
}

/** `CCT-25` — em quantas rodadas a branca volta; `0` = agora. */
export function brancaVoltaEm(estado: EstadoCartas, jogadorId: JogadorId): number {
  const volta = estado.brancaVoltaNa[jogadorId] ?? 0
  return Math.max(0, volta - estado.rodada)
}

/** Todo ativo que não é o juiz da rodada. */
export function quantosDevemJogar(estado: EstadoCartas, ctx: ContextoDeSala): number {
  const juiz = juizDa(estado)
  return jogadoresAtivos(ctx).filter((j) => j.id !== juiz).length
}

function prazoDeEscolha(ctx: ContextoDeSala, ambiente: Ambiente): number | null {
  const segundos = ctx.config.cartas.tempoEscolhaSeg
  return segundos === null ? null : ambiente.agora + segundos * 1000
}

/** `CCT-15`, `CCT-35` — o monte vazio reembaralha o descarte em vez de acabar a partida. */
function tirarPerguntas(estado: EstadoCartas, quantas: number): string[] {
  const tiradas: string[] = []
  for (let i = 0; i < quantas; i += 1) {
    if (estado.montePerguntas.length === 0) {
      estado.montePerguntas = estado.descartePerguntas
      estado.descartePerguntas = []
    }
    const carta = estado.montePerguntas.shift()
    if (carta === undefined) break
    tiradas.push(carta)
  }
  return tiradas
}

function tirarRespostas(estado: EstadoCartas, quantas: number): string[] {
  const tiradas: string[] = []
  for (let i = 0; i < quantas; i += 1) {
    if (estado.monteRespostas.length === 0) {
      estado.monteRespostas = estado.descarteRespostas
      estado.descarteRespostas = []
    }
    const carta = estado.monteRespostas.shift()
    if (carta === undefined) break
    tiradas.push(carta)
  }
  return tiradas
}

function jogadoresAtivos(ctx: ContextoDeSala): Jogador[] {
  return ctx.jogadores.filter((j) => j.situacao === 'ativo')
}

function apelidoDe(ctx: ContextoDeSala, id: JogadorId): string {
  return ctx.jogadores.find((j) => j.id === id)?.apelido ?? 'Alguém'
}

/** `CCT-30` — empate no topo não é desempatado; todos são campeões. */
export function campeoes(estado: EstadoCartas): JogadorId[] {
  const pontos = Object.values(estado.placar)
  if (pontos.length === 0) return []
  const maior = Math.max(...pontos)
  if (maior === 0) return []
  return Object.keys(estado.placar).filter((id) => estado.placar[id] === maior)
}

function nomesDosCampeoes(estado: EstadoCartas, ctx: ContextoDeSala): string {
  const nomes = campeoes(estado).map((id) => apelidoDe(ctx, id))
  if (nomes.length <= 1) return nomes[0] ?? 'Alguém'
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

function clonar(estado: EstadoCartas): EstadoCartas {
  return {
    ...estado,
    montePerguntas: [...estado.montePerguntas],
    monteRespostas: [...estado.monteRespostas],
    descartePerguntas: [...estado.descartePerguntas],
    descarteRespostas: [...estado.descarteRespostas],
    ordemJuizes: [...estado.ordemJuizes],
    opcoesPergunta: [...estado.opcoesPergunta],
    maos: Object.fromEntries(Object.entries(estado.maos).map(([id, mao]) => [id, [...mao]])),
    brancaVoltaNa: { ...estado.brancaVoltaNa },
    rerolls: { ...estado.rerolls },
    jogadas: estado.jogadas.map((j) => ({ ...j })),
    pilha: estado.pilha === null ? null : [...estado.pilha],
    reveladas: [...estado.reveladas],
    placar: { ...estado.placar },
    ...(estado.pacotesSelecionados
      ? { pacotesSelecionados: estado.pacotesSelecionados.map((p) => ({ ...p })) }
      : {}),
  }
}
