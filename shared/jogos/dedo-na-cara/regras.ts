import type {
  Ambiente,
  Comando,
  ContextoDeSala,
  Jogador,
  JogadorId,
  ResultadoInicio,
  ResultadoReducer,
} from '../../protocolo'
import { CARTAS_DEDO } from '../../dedo-dados'
import { montarBaralho } from '../../dedo'
import { embaralhar } from './sorteio'

/**
 * `DEDO-02` — mínimo de jogadores ativos.
 *
 * Três, e não dois: com auto-voto desligado (o padrão), numa dupla só existe um
 * alvo possível pra cada um, os dois se apontam e toda carta empata. Com
 * auto-voto ligado é pior — cada um aponta pra si. O jogo não existe em dupla,
 * e deixar começar seria entregar uma partida quebrada.
 *
 * Vive aqui, e não em `shared/protocolo.ts`, porque é regra de jogo e não do
 * `core`; o catálogo guarda o mesmo número só pra desenhar o aviso (`AD-014`).
 */
const MIN_JOGADORES_DEDO = 3

export interface EstadoDedo {
  /** Cartas ainda não usadas nesta partida. */
  monte: string[]
  /** `DEDO-04` — usadas; voltam ao monte só quando ele esvazia. */
  descarte: string[]
  /** 1-based. */
  rodada: number
  /** A pergunta na mesa. `null` só antes de a partida montar. */
  carta: string | null
  fase: 'votacao' | 'apuracao'
  /** `DEDO-05` — quem apontou pra quem. Apontar de novo sobrescreve. */
  votos: Record<JogadorId, JogadorId>
  /** `DEDO-12` — quem levou a carta desta rodada. `null` na votação e no empate. */
  vencedorId: JogadorId | null
  votosNoVencedor: number
  /** `DEDO-13` — ninguém teve mais dedos que todo mundo. */
  empatou: boolean
  placar: Record<JogadorId, number>
  metaBatida: boolean
  pacotesSelecionados?: { id: string; nome: string; emoji: string }[]
}

type TipoDeComandoDeJogo = 'apontar' | 'proximaCarta' | 'encerrar' | 'novaPartida'

type EventoDeSala =
  | { t: 'entrouJogador'; jogadorId: JogadorId }
  | { t: 'saiuJogador'; jogadorId: JogadorId }
  | { t: 'venceuPrazoTurno' }

export type ComandoDedo = Extract<Comando, { t: TipoDeComandoDeJogo }> | EventoDeSala

/** Partida ainda não montada — também é o estado após encerrar ou nova partida. */
export function estadoVazio(): EstadoDedo {
  return {
    monte: [],
    descarte: [],
    rodada: 0,
    carta: null,
    fase: 'votacao',
    votos: {},
    vencedorId: null,
    votosNoVencedor: 0,
    empatou: false,
    placar: {},
    metaBatida: false,
  }
}

/**
 * `DEDO-01`, `DEDO-02` — monta o baralho e vira a primeira carta.
 *
 * Os pacotes vêm de `shared/dedo-dados.ts` direto, e não do parâmetro
 * `pacotes` do `core`: aquele canal carrega `PacoteCompleto` (cartas com
 * dificuldade), formato que este jogo não usa — aqui uma carta é uma frase. O
 * `core` não precisa saber disso (`AD-002`).
 */
export function iniciarRodada(ctx: ContextoDeSala, ambiente: Ambiente): ResultadoInicio<EstadoDedo> {
  const ativos = jogadoresAtivos(ctx)
  if (ativos.length < MIN_JOGADORES_DEDO) return { ok: false, erro: 'JOGADORES_INSUFICIENTES' }

  const escolhidos = CARTAS_DEDO.filter((p) => ctx.config.pacoteIds.includes(p.id))
  if (escolhidos.length === 0) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }

  const baralho = montarBaralho(escolhidos)
  if (baralho.length === 0) return { ok: false, erro: 'PACOTE_INSUFICIENTE' }

  const estado = estadoVazio()
  estado.monte = embaralhar(baralho, ambiente.aleatorio)
  estado.rodada = 1
  estado.carta = tirarCarta(estado)
  for (const jogador of ativos) estado.placar[jogador.id] = 0
  estado.pacotesSelecionados = escolhidos.map((p) => ({ id: p.id, nome: p.nome, emoji: p.emoji }))

  return {
    ok: true,
    valor: estado,
    faseSeguinte: 'jogo',
    // A carta não tem relógio: a votação fecha quando a mesa termina de apontar.
    prazos: { turno: null },
    eventos: [{ texto: 'A partida começou. Primeira carta na mesa.' }],
  }
}

/** Reducer puro do jogo: recebe estado + contexto e devolve estado + efeitos descritos. */
export function reduzir(
  estado: EstadoDedo,
  ctx: ContextoDeSala,
  comando: ComandoDedo,
  ambiente: Ambiente,
): ResultadoReducer<EstadoDedo> {
  switch (comando.t) {
    case 'apontar':
      return apontar(estado, ctx, comando.alvoId)
    case 'proximaCarta':
      return proximaCarta(estado, ctx)
    case 'encerrar':
      return encerrar(estado, ctx)
    case 'novaPartida':
      return novaPartida(ctx)
    case 'entrouJogador':
      // A partida corrente não é remontada por quem chega (mesmo padrão `ESCR-10`).
      return { ok: true, estado, eventos: [], prazos: {} }
    case 'saiuJogador':
      return saiuJogador(estado, ctx, comando.jogadorId, ambiente)
    case 'venceuPrazoTurno':
      // Este jogo não agenda prazo nenhum; se um sobrou de outra partida, ignora.
      return { ok: true, estado, eventos: [], prazos: {} }
    default:
      return { ok: false, erro: 'COMANDO_INVALIDO' }
  }
}

// ---------------------------------------------------------------------------
// O dedo
// ---------------------------------------------------------------------------

/**
 * `DEDO-05`…`DEDO-07`, `DEDO-10` — aponta, e fecha a votação quando foi o
 * último.
 *
 * Trocar o dedo de lugar é permitido de propósito: na votação secreta ninguém
 * viu nada ainda, e obrigar a pessoa a acertar de primeira só pune quem tocou
 * errado no celular.
 */
function apontar(
  estado: EstadoDedo,
  ctx: ContextoDeSala,
  alvoId: JogadorId,
): ResultadoReducer<EstadoDedo> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'votacao') return { ok: false, erro: 'FASE_INVALIDA' }

  const autor = ctx.jogadores.find((j) => j.id === ctx.autorId)
  if (!autor || autor.situacao !== 'ativo') return { ok: false, erro: 'JOGADOR_AGUARDANDO' }

  const alvo = ctx.jogadores.find((j) => j.id === alvoId)
  if (!alvo || alvo.situacao !== 'ativo') return { ok: false, erro: 'CARTA_INVALIDA' }
  // `DEDO-06` — assumir a carta na cara dura só vale se a mesa combinou isso.
  if (alvoId === ctx.autorId && !ctx.config.dedo.autoVoto) {
    return { ok: false, erro: 'CARTA_INVALIDA' }
  }

  const novo = clonar(estado)
  novo.votos[ctx.autorId] = alvoId

  // `DEDO-10` — quem caiu não trava a mesa: só os conectados são esperados.
  if (todosApontaram(novo, ctx)) return apurar(novo, ctx)

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/**
 * `DEDO-11`…`DEDO-13` — conta os dedos e entrega a carta.
 *
 * Maioria simples e estrita: quem recebeu mais dedos que **qualquer outro**
 * leva. Dois no topo é empate, e no empate ninguém leva — mesmo critério do
 * Espião. Dar o ponto a todos os empatados faria a meta virar corrida de sorte
 * numa mesa par, onde empatar é o resultado mais comum.
 */
function apurar(novo: EstadoDedo, ctx: ContextoDeSala): ResultadoReducer<EstadoDedo> {
  const contagem = new Map<JogadorId, number>()
  for (const alvo of Object.values(novo.votos)) {
    contagem.set(alvo, (contagem.get(alvo) ?? 0) + 1)
  }

  const maior = Math.max(0, ...contagem.values())
  const noTopo = [...contagem.entries()]
    .filter(([, quantos]) => quantos === maior)
    .map(([id]) => id)

  novo.fase = 'apuracao'

  if (maior === 0 || noTopo.length !== 1) {
    novo.empatou = true
    novo.vencedorId = null
    novo.votosNoVencedor = 0
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: 'Empate na contagem dos dedos. A carta não foi de ninguém.' }],
      prazos: { turno: null },
    }
  }

  const vencedor = noTopo[0]!
  novo.empatou = false
  novo.vencedorId = vencedor
  novo.votosNoVencedor = maior
  novo.placar[vencedor] = (novo.placar[vencedor] ?? 0) + 1

  const meta = ctx.config.dedo.metaDePontos
  const bateu = meta !== null && (novo.placar[vencedor] ?? 0) >= meta
  novo.metaBatida = bateu

  const dedos = `${maior} ${maior === 1 ? 'dedo' : 'dedos'}`
  const eventos = [{ texto: `${apelidoDe(ctx, vencedor)} levou a carta com ${dedos}.` }]
  if (bateu) {
    eventos.push({ texto: `${nomesDosCampeoes(novo, ctx)} bateu a meta e levou a partida!` })
  }

  return { ok: true, estado: novo, eventos, prazos: { turno: null } }
}

/**
 * `DEDO-15` — vira a próxima carta.
 *
 * Qualquer jogador ativo pode virar, e não só o host: não há narrador aqui, e
 * fazer a mesa inteira esperar uma pessoa clicar mata o ritmo de um jogo cuja
 * rodada dura quinze segundos.
 */
function proximaCarta(estado: EstadoDedo, ctx: ContextoDeSala): ResultadoReducer<EstadoDedo> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'apuracao') return { ok: false, erro: 'FASE_INVALIDA' }

  const autor = ctx.jogadores.find((j) => j.id === ctx.autorId)
  if (!autor || autor.situacao !== 'ativo') return { ok: false, erro: 'JOGADOR_AGUARDANDO' }

  // `DEDO-17` — a meta batida encerra aqui, e não no instante da apuração: a
  // mesa precisa ver os dedos da última carta antes de a tela virar placar.
  if (estado.metaBatida) {
    return {
      ok: true,
      estado,
      eventos: [{ texto: 'A partida foi encerrada. Placar final na mesa.' }],
      prazos: { turno: null },
      faseSeguinte: 'encerrada',
    }
  }

  return virarCarta(clonar(estado), ctx)
}

/** Limpa a mesa e vira a próxima. */
function virarCarta(novo: EstadoDedo, ctx: ContextoDeSala): ResultadoReducer<EstadoDedo> {
  if (novo.carta !== null) novo.descarte.push(novo.carta)

  novo.votos = {}
  novo.vencedorId = null
  novo.votosNoVencedor = 0
  novo.empatou = false
  novo.fase = 'votacao'
  novo.rodada += 1
  novo.carta = tirarCarta(novo)

  for (const jogador of jogadoresAtivos(ctx)) novo.placar[jogador.id] ??= 0

  return { ok: true, estado: novo, eventos: [], prazos: { turno: null } }
}

// ---------------------------------------------------------------------------
// Fim de partida
// ---------------------------------------------------------------------------

function encerrar(estado: EstadoDedo, ctx: ContextoDeSala): ResultadoReducer<EstadoDedo> {
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

function novaPartida(ctx: ContextoDeSala): ResultadoReducer<EstadoDedo> {
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

/** Quem sai leva junto o dedo que deu e os que recebeu. */
function saiuJogador(
  estado: EstadoDedo,
  ctx: ContextoDeSala,
  jogadorId: JogadorId,
  _ambiente: Ambiente,
): ResultadoReducer<EstadoDedo> {
  if (ctx.fase === 'lobby' || ctx.fase === 'encerrada') {
    return { ok: true, estado, eventos: [], prazos: {} }
  }

  const restantes = jogadoresAtivos(ctx)
  if (restantes.length < MIN_JOGADORES_DEDO) {
    return {
      ok: true,
      estado: estadoVazio(),
      eventos: [
        {
          texto: `A partida foi cancelada: são necessários ao menos ${MIN_JOGADORES_DEDO} jogadores.`,
        },
      ],
      prazos: { turno: null },
      faseSeguinte: 'lobby',
      promoverAguardando: true,
    }
  }

  const novo = clonar(estado)
  delete novo.placar[jogadorId]
  delete novo.votos[jogadorId]
  // Um dedo apontado pra quem saiu não tem mais alvo; some junto.
  for (const [eleitor, alvo] of Object.entries(novo.votos)) {
    if (alvo === jogadorId) delete novo.votos[eleitor]
  }

  // A saída pode ter sido a última coisa que faltava pra fechar a contagem.
  if (novo.fase === 'votacao' && todosApontaram(novo, ctx)) return apurar(novo, ctx)

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

/** `DEDO-04` — o monte vazio reembaralha o descarte em vez de acabar a partida. */
function tirarCarta(estado: EstadoDedo): string | null {
  if (estado.monte.length === 0) {
    estado.monte = estado.descarte
    estado.descarte = []
  }
  return estado.monte.shift() ?? null
}

/** `DEDO-10` — a mesa espera os ativos conectados, e mais ninguém. */
export function todosApontaram(estado: EstadoDedo, ctx: ContextoDeSala): boolean {
  const esperados = jogadoresAtivos(ctx).filter((j) => j.conectado)
  return esperados.length > 0 && esperados.every((j) => estado.votos[j.id] !== undefined)
}

/** Quantos dedos a mesa ainda espera nesta carta. */
export function quantosDevemApontar(ctx: ContextoDeSala): number {
  return jogadoresAtivos(ctx).filter((j) => j.conectado).length
}

function jogadoresAtivos(ctx: ContextoDeSala): Jogador[] {
  return ctx.jogadores.filter((j) => j.situacao === 'ativo')
}

function apelidoDe(ctx: ContextoDeSala, id: JogadorId): string {
  return ctx.jogadores.find((j) => j.id === id)?.apelido ?? 'Alguém'
}

/** `DEDO-19` — empate no topo do placar não é desempatado; todos são campeões. */
export function campeoes(estado: EstadoDedo): JogadorId[] {
  const pontos = Object.values(estado.placar)
  if (pontos.length === 0) return []
  const maior = Math.max(...pontos)
  if (maior === 0) return []
  return Object.keys(estado.placar).filter((id) => estado.placar[id] === maior)
}

function nomesDosCampeoes(estado: EstadoDedo, ctx: ContextoDeSala): string {
  const nomes = campeoes(estado).map((id) => apelidoDe(ctx, id))
  if (nomes.length <= 1) return nomes[0] ?? 'Alguém'
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

function clonar(estado: EstadoDedo): EstadoDedo {
  return structuredClone(estado)
}
