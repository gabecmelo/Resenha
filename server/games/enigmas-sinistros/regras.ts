import type {
  Ambiente,
  Comando,
  ContextoDeSala,
  Jogador,
  JogadorId,
  RespostaDoNarrador,
  ResultadoInicio,
  ResultadoReducer,
} from '../../../shared/protocolo'
import { LIMITE_DECLARACAO, LIMITE_PERGUNTA } from '../../../shared/protocolo'
import type { EnigmaDoPacote } from '../../../shared/enigmas-dados'
import { ENIGMAS } from '../../../shared/enigmas-dados'
import { montarBaralho } from '../../../shared/enigmas'
import { embaralhar } from './sorteio'

/**
 * `ENIG-02` — mínimo de jogadores ativos: um narrador e ao menos um pra
 * perguntar. Vive aqui (não em `shared/protocolo.ts`) porque é regra de jogo,
 * não do `core`; `shared/jogos-catalogo.ts` guarda o mesmo número só para a UI
 * desenhar o aviso antes de clicar "Começar" (`AD-014`).
 *
 * Era 3. Baixou para 2 porque em dois o jogo **funciona** — um narra, o outro
 * desata —, e travar a mesa que quer jogar assim é o sistema decidindo o que é
 * diversão. O catálogo segue recomendando 3, que é onde a dinâmica rende: sem
 * um terceiro não há palpite alheio pra puxar o raciocínio.
 */
const MIN_JOGADORES_ENIGMAS = 2

/** Uma pergunta da mesa, na fila ou já respondida (`ENIG-10`). */
export interface PerguntaDoEnigma {
  id: number
  autorId: JogadorId
  /** Vazio no modo em voz alta: lá existe a batida, não o texto. */
  texto: string
  resposta: RespostaDoNarrador | null
}

/** `ENIG-17` — uma declaração já julgada. */
export interface TentativaDoEnigma {
  autorId: JogadorId
  texto: string
  acertou: boolean
}

export interface EstadoEnigmas {
  /** Enigmas ainda não usados nesta partida. */
  monte: EnigmaDoPacote[]
  /** `ENIG-21` — usados; voltam ao monte só quando ele esvazia. */
  descarte: EnigmaDoPacote[]
  /** Ordem fixa de rotação do narrador, sorteada no início (`ENIG-19`). */
  ordemNarradores: JogadorId[]
  indiceNarrador: number
  /** 1-based. */
  rodada: number
  /** O enigma na mesa. `null` só antes de a partida montar. */
  enigma: EnigmaDoPacote | null
  fase: 'enigma' | 'revelacao'
  perguntas: PerguntaDoEnigma[]
  proximoIdPergunta: number
  /** `ENIG-14` — declaração esperando o veredito do narrador. */
  declaracao: { autorId: JogadorId; texto: string } | null
  tentativas: TentativaDoEnigma[]
  /** `ENIG-16` — quem desatou. `null` quando o narrador entregou a solução. */
  desatouId: JogadorId | null
  /** `ENIG-24` — placar da partida (`AD-015`). */
  placar: Record<JogadorId, number>
  /** `ENIG-25` — alguém bateu a meta; a partida acaba quando a revelação sai. */
  metaBatida: boolean
  pacotesSelecionados?: { id: string; nome: string; emoji: string }[]
}

/** Avisos que o `core` entrega ao jogo; não são comandos de cliente. */
export type EventoDeSala =
  | { t: 'saiuJogador'; jogadorId: JogadorId }
  | { t: 'entrouJogador'; jogadorId: JogadorId }
  | { t: 'venceuPrazoTurno' }

type TipoDeComandoDeJogo =
  | 'perguntarEnigma'
  | 'responderPergunta'
  | 'declararSolucao'
  | 'julgarDeclaracao'
  | 'entregarSolucao'
  | 'proximoEnigma'
  | 'encerrar'
  | 'novaPartida'
  | 'notas'

export type ComandoEnigmas = Extract<Comando, { t: TipoDeComandoDeJogo }> | EventoDeSala

/** Partida ainda não montada — também é o estado após cancelar ou nova partida. */
export function estadoVazio(): EstadoEnigmas {
  return {
    monte: [],
    descarte: [],
    ordemNarradores: [],
    indiceNarrador: 0,
    rodada: 0,
    enigma: null,
    fase: 'enigma',
    perguntas: [],
    proximoIdPergunta: 1,
    declaracao: null,
    tentativas: [],
    desatouId: null,
    placar: {},
    metaBatida: false,
  }
}

/**
 * `ENIG-02`, `ENIG-03`, `ENIG-32` — monta o baralho, sorteia a ordem de
 * narradores e vira o primeiro enigma.
 *
 * Os pacotes vêm de `shared/enigmas-dados.ts` direto, e não do parâmetro
 * `pacotes` do `core`: aquele canal carrega `PacoteCompleto` (cartas com
 * dificuldade), formato que este jogo não usa — aqui uma carta tem duas faces.
 * O `core` não precisa saber disso (`AD-002`).
 */
export function iniciarRodada(
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoInicio<EstadoEnigmas> {
  const ativos = jogadoresAtivos(ctx)
  if (ativos.length < MIN_JOGADORES_ENIGMAS) return { ok: false, erro: 'JOGADORES_INSUFICIENTES' }

  const escolhidos = ENIGMAS.filter((p) => ctx.config.pacoteIds.includes(p.id))
  if (escolhidos.length === 0) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }

  const baralho = montarBaralho(escolhidos)
  if (baralho.length === 0) return { ok: false, erro: 'PACOTE_INSUFICIENTE' }

  const estado = estadoVazio()
  estado.monte = embaralhar(baralho, ambiente.aleatorio)
  estado.ordemNarradores = embaralhar(
    ativos.map((j) => j.id),
    ambiente.aleatorio,
  )
  estado.rodada = 1
  estado.enigma = tirarEnigma(estado)
  for (const jogador of ativos) estado.placar[jogador.id] = 0
  estado.pacotesSelecionados = escolhidos.map((p) => ({ id: p.id, nome: p.nome, emoji: p.emoji }))

  return {
    ok: true,
    valor: estado,
    faseSeguinte: 'jogo',
    // `ENIG-06` — o enigma não tem relógio: quem conduz é o narrador.
    prazos: { turno: null },
    eventos: [
      { texto: `A partida começou. ${apelidoDe(ctx, narradorDe(estado))} narra o primeiro enigma.` },
    ],
  }
}

/** Reducer puro do jogo: recebe estado + contexto e devolve estado + efeitos descritos. */
export function reduzir(
  estado: EstadoEnigmas,
  ctx: ContextoDeSala,
  comando: ComandoEnigmas,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEnigmas> {
  switch (comando.t) {
    case 'perguntarEnigma':
      return perguntar(estado, ctx, comando.texto)
    case 'responderPergunta':
      return responder(estado, ctx, comando.perguntaId, comando.resposta)
    case 'declararSolucao':
      return declarar(estado, ctx, comando.texto)
    case 'julgarDeclaracao':
      return julgar(estado, ctx, comando.acertou)
    case 'entregarSolucao':
      return entregar(estado, ctx)
    case 'proximoEnigma':
      return proximoEnigma(estado, ctx)
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
// Perguntas
// ---------------------------------------------------------------------------

/** `ENIG-08` — a mesa manda uma pergunta escrita pra fila do narrador. */
function perguntar(
  estado: EstadoEnigmas,
  ctx: ContextoDeSala,
  texto: string,
): ResultadoReducer<EstadoEnigmas> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'enigma') return { ok: false, erro: 'FASE_INVALIDA' }
  // `ENIG-33` — no modo em voz alta não existe pergunta escrita pra mandar.
  if (ctx.config.enigmas.modoPergunta !== 'fila') return { ok: false, erro: 'FASE_INVALIDA' }

  const autor = ctx.jogadores.find((j) => j.id === ctx.autorId)
  if (!autor || autor.situacao !== 'ativo') return { ok: false, erro: 'JOGADOR_AGUARDANDO' }
  // `ENIG-07` — o narrador responde, não pergunta.
  if (ctx.autorId === narradorDe(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }

  const limpo = texto.trim()
  if (limpo.length === 0 || limpo.length > LIMITE_PERGUNTA) return { ok: false, erro: 'CARTA_INVALIDA' }

  // Uma pergunta por vez: sem isso um só jogador afoga a fila do narrador.
  if (estado.perguntas.some((p) => p.autorId === ctx.autorId && p.resposta === null)) {
    return { ok: false, erro: 'FASE_INVALIDA' }
  }

  const novo = clonar(estado)
  novo.perguntas.push({
    id: novo.proximoIdPergunta,
    autorId: ctx.autorId,
    texto: limpo,
    resposta: null,
  })
  novo.proximoIdPergunta += 1

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/**
 * `ENIG-09` — o narrador responde, e as três respostas são as únicas que
 * existem. No modo em voz alta a pergunta não passou pelo servidor, então a
 * resposta entra sozinha no histórico: a mesa continua vendo o ritmo do
 * enigma, mesmo sem o texto.
 */
function responder(
  estado: EstadoEnigmas,
  ctx: ContextoDeSala,
  perguntaId: number | null,
  resposta: RespostaDoNarrador,
): ResultadoReducer<EstadoEnigmas> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'enigma') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== narradorDe(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (!RESPOSTAS_VALIDAS.includes(resposta)) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)

  if (perguntaId === null) {
    if (ctx.config.enigmas.modoPergunta !== 'voz') return { ok: false, erro: 'FASE_INVALIDA' }
    novo.perguntas.push({
      id: novo.proximoIdPergunta,
      autorId: ctx.autorId,
      texto: '',
      resposta,
    })
    novo.proximoIdPergunta += 1
    return { ok: true, estado: novo, eventos: [], prazos: {} }
  }

  if (ctx.config.enigmas.modoPergunta !== 'fila') return { ok: false, erro: 'FASE_INVALIDA' }
  const alvo = novo.perguntas.find((p) => p.id === perguntaId)
  if (alvo === undefined) return { ok: false, erro: 'CARTA_INVALIDA' }
  // Responder duas vezes reescreveria o histórico que a mesa já leu.
  if (alvo.resposta !== null) return { ok: false, erro: 'FASE_INVALIDA' }
  alvo.resposta = resposta

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

const RESPOSTAS_VALIDAS: readonly RespostaDoNarrador[] = ['sim', 'nao', 'naoImporta']

// ---------------------------------------------------------------------------
// Declaração e veredito
// ---------------------------------------------------------------------------

/**
 * `ENIG-14` — alguém acha que desatou. O texto vai só pro narrador: se a mesa
 * inteira lesse a tentativa antes do veredito, a dedução dos outros acabava
 * junto.
 */
function declarar(
  estado: EstadoEnigmas,
  ctx: ContextoDeSala,
  texto: string,
): ResultadoReducer<EstadoEnigmas> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'enigma') return { ok: false, erro: 'FASE_INVALIDA' }

  const autor = ctx.jogadores.find((j) => j.id === ctx.autorId)
  if (!autor || autor.situacao !== 'ativo') return { ok: false, erro: 'JOGADOR_AGUARDANDO' }
  if (ctx.autorId === narradorDe(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  // Uma declaração por vez: o narrador julga uma antes de receber a próxima.
  if (estado.declaracao !== null) return { ok: false, erro: 'FASE_INVALIDA' }

  const limpo = texto.trim()
  if (limpo.length === 0 || limpo.length > LIMITE_DECLARACAO) {
    return { ok: false, erro: 'CARTA_INVALIDA' }
  }

  const novo = clonar(estado)
  novo.declaracao = { autorId: ctx.autorId, texto: limpo }

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

/**
 * `ENIG-15`, `ENIG-16`, `ENIG-17` — o narrador julga. Errar não elimina
 * ninguém: a tentativa vira histórico à vista da mesa e o enigma continua.
 */
function julgar(
  estado: EstadoEnigmas,
  ctx: ContextoDeSala,
  acertou: boolean,
): ResultadoReducer<EstadoEnigmas> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'enigma') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== narradorDe(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (estado.declaracao === null) return { ok: false, erro: 'FASE_INVALIDA' }

  const novo = clonar(estado)
  const { autorId, texto } = novo.declaracao!
  novo.declaracao = null
  novo.tentativas.push({ autorId, texto, acertou })

  if (!acertou) {
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: `${apelidoDe(ctx, autorId)} tentou e não era essa.` }],
      prazos: {},
    }
  }

  novo.desatouId = autorId
  novo.fase = 'revelacao'
  novo.placar[autorId] = (novo.placar[autorId] ?? 0) + 1

  const meta = ctx.config.enigmas.metaDePontos
  novo.metaBatida = meta !== null && (novo.placar[autorId] ?? 0) >= meta

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `${apelidoDe(ctx, autorId)} desatou o enigma!` }],
    prazos: {},
  }
}

/** `ENIG-18` — o narrador entrega. Ninguém pontua, e a mesa lê a solução. */
function entregar(estado: EstadoEnigmas, ctx: ContextoDeSala): ResultadoReducer<EstadoEnigmas> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'enigma') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== narradorDe(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }

  const novo = clonar(estado)
  novo.declaracao = null
  novo.desatouId = null
  novo.fase = 'revelacao'

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: 'Ninguém desatou. O narrador entregou a solução.' }],
    prazos: {},
  }
}

// ---------------------------------------------------------------------------
// Troca de enigma
// ---------------------------------------------------------------------------

/**
 * `ENIG-19`, `ENIG-20`, `ENIG-25` — a revelação sai da tela: ou a partida
 * acabou (alguém bateu a meta), ou o próximo enigma começa com o próximo
 * narrador. Quem toca é o narrador que acabou de conduzir — não há relógio
 * aqui, e a mesa costuma querer comentar a solução antes de seguir.
 */
function proximoEnigma(
  estado: EstadoEnigmas,
  ctx: ContextoDeSala,
): ResultadoReducer<EstadoEnigmas> {
  if (ctx.fase !== 'jogo' || estado.fase !== 'revelacao') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== narradorDe(estado)) return { ok: false, erro: 'SEM_AUTORIDADE' }

  if (estado.metaBatida) {
    return {
      ok: true,
      estado,
      eventos: [{ texto: `${nomesDosCampeoes(estado, ctx)} bateu a meta e levou a partida!` }],
      prazos: { turno: null },
      faseSeguinte: 'encerrada',
    }
  }

  return virarEnigma(clonar(estado), ctx, [])
}

/** `ENIG-19`, `ENIG-21` — limpa a mesa, passa o narrador e vira o próximo. */
function virarEnigma(
  novo: EstadoEnigmas,
  ctx: ContextoDeSala,
  eventos: { texto: string }[],
): ResultadoReducer<EstadoEnigmas> {
  if (novo.enigma !== null) novo.descarte.push(novo.enigma)

  novo.perguntas = []
  novo.declaracao = null
  novo.tentativas = []
  novo.desatouId = null
  novo.fase = 'enigma'
  novo.rodada += 1
  novo.indiceNarrador =
    novo.ordemNarradores.length === 0 ? 0 : (novo.indiceNarrador + 1) % novo.ordemNarradores.length
  novo.enigma = tirarEnigma(novo)

  for (const jogador of jogadoresAtivos(ctx)) novo.placar[jogador.id] ??= 0

  return { ok: true, estado: novo, eventos, prazos: { turno: null } }
}

// ---------------------------------------------------------------------------
// Encerramento e roster
// ---------------------------------------------------------------------------

/** `ENIG-22` — o host encerra na mão; o placar final é o que está de pé. */
function encerrar(estado: EstadoEnigmas, ctx: ContextoDeSala): ResultadoReducer<EstadoEnigmas> {
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

function novaPartida(ctx: ContextoDeSala): ResultadoReducer<EstadoEnigmas> {
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

/** `ENIG-23` — quem sai não trava a mesa; se o narrador sai, o enigma cai. */
function saiuJogador(
  estado: EstadoEnigmas,
  ctx: ContextoDeSala,
  jogadorId: JogadorId,
  _ambiente: Ambiente,
): ResultadoReducer<EstadoEnigmas> {
  if (ctx.fase === 'lobby' || ctx.fase === 'encerrada') {
    return { ok: true, estado, eventos: [], prazos: {} }
  }

  const restantes = jogadoresAtivos(ctx)
  if (restantes.length < MIN_JOGADORES_ENIGMAS) {
    return {
      ok: true,
      estado: estadoVazio(),
      eventos: [
        { texto: `A partida foi cancelada: são necessários ao menos ${MIN_JOGADORES_ENIGMAS} jogadores.` },
      ],
      prazos: { turno: null },
      faseSeguinte: 'lobby',
      promoverAguardando: true,
    }
  }

  const eraONarrador = narradorDe(estado) === jogadorId
  const novo = clonar(estado)
  delete novo.placar[jogadorId]

  const posicao = novo.ordemNarradores.indexOf(jogadorId)
  if (posicao !== -1) {
    novo.ordemNarradores.splice(posicao, 1)
    // O índice aponta pra uma lista que encolheu antes dele.
    if (posicao < novo.indiceNarrador) novo.indiceNarrador -= 1
    if (novo.indiceNarrador >= novo.ordemNarradores.length) novo.indiceNarrador = 0
  }

  if (eraONarrador && novo.fase === 'enigma') {
    // Sem narrador ninguém sabe a solução: o enigma não vale, e `indiceNarrador`
    // já aponta pro próximo, então `virarEnigma` não pode avançá-lo de novo.
    novo.indiceNarrador =
      novo.ordemNarradores.length === 0
        ? 0
        : (novo.indiceNarrador - 1 + novo.ordemNarradores.length) % novo.ordemNarradores.length
    return virarEnigma(novo, ctx, [{ texto: 'Quem narrava saiu. Enigma descartado.' }])
  }

  // Uma declaração pendente de quem saiu não tem mais quem defenda.
  if (novo.declaracao?.autorId === jogadorId) novo.declaracao = null
  novo.perguntas = novo.perguntas.filter((p) => p.autorId !== jogadorId || p.resposta !== null)

  return { ok: true, estado: novo, eventos: [], prazos: {} }
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

export function narradorDe(estado: EstadoEnigmas): JogadorId {
  return estado.ordemNarradores[estado.indiceNarrador] ?? ''
}

/** `ENIG-21` — o monte vazio reembaralha o descarte em vez de acabar a partida. */
function tirarEnigma(estado: EstadoEnigmas): EnigmaDoPacote | null {
  if (estado.monte.length === 0) {
    estado.monte = estado.descarte
    estado.descarte = []
  }
  return estado.monte.shift() ?? null
}

function jogadoresAtivos(ctx: ContextoDeSala): Jogador[] {
  return ctx.jogadores.filter((j) => j.situacao === 'ativo')
}

function apelidoDe(ctx: ContextoDeSala, id: JogadorId): string {
  return ctx.jogadores.find((j) => j.id === id)?.apelido ?? 'Alguém'
}

/** `ENIG-26` — empate no topo não é desempatado; todos são campeões. */
export function campeoes(estado: EstadoEnigmas): JogadorId[] {
  const pontos = Object.values(estado.placar)
  if (pontos.length === 0) return []
  const maior = Math.max(...pontos)
  if (maior === 0) return []
  return Object.keys(estado.placar).filter((id) => estado.placar[id] === maior)
}

function nomesDosCampeoes(estado: EstadoEnigmas, ctx: ContextoDeSala): string {
  const nomes = campeoes(estado).map((id) => apelidoDe(ctx, id))
  if (nomes.length <= 1) return nomes[0] ?? 'Alguém'
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

function clonar(estado: EstadoEnigmas): EstadoEnigmas {
  return {
    ...estado,
    monte: [...estado.monte],
    descarte: [...estado.descarte],
    ordemNarradores: [...estado.ordemNarradores],
    enigma: estado.enigma === null ? null : { ...estado.enigma },
    perguntas: estado.perguntas.map((p) => ({ ...p })),
    declaracao: estado.declaracao === null ? null : { ...estado.declaracao },
    tentativas: estado.tentativas.map((t) => ({ ...t })),
    placar: { ...estado.placar },
    ...(estado.pacotesSelecionados
      ? { pacotesSelecionados: estado.pacotesSelecionados.map((p) => ({ ...p })) }
      : {}),
  }
}
