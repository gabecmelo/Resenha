import type {
  Ambiente,
  Comando,
  ContextoDeSala,
  Jogador,
  JogadorId,
  ResultadoInicio,
  ResultadoReducer,
} from '../../protocolo'
import type { Config } from '../../protocolo'
import type { PacoteCompleto } from '../../pacotes-dados'
import { montarPoolDeCartas } from '../../pacotes'
import { JANELA_DE_RESULTADO_MS, TEMPO_DE_CHUTE_MS, espioesParaMesa } from '../../protocolo'
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
  /**
   * `ESP-49`, `ESP-50` — é a votação final: o relógio da rodada venceu e esta é
   * a última chance da mesa. Ela não consome o limite de `ESP-47` e, feche como
   * fechar, a partida termina aqui.
   */
  final: boolean
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
  totalAtivos: number
  /** `ESP-41`…`ESP-50` — o que esta votação provocou. */
  desfecho: 'rodadaVolta' | 'mesaPerdeu' | 'chuteDoEspiao' | 'tempoEsgotado'
  final: boolean
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
  /**
   * `ESP-35`, `ESP-36` — rodada pausada pelo host. `restanteMs` é `null` quando
   * a rodada não tinha relógio: a pausa continua valendo como "a mesa parou".
   */
  pausa: { por: JogadorId; restanteMs: number | null } | null
  /** `ESP-32` — de pé durante a janela de resultado e depois na revelação. */
  resultadoVotacao: ResultadoVotacao | null
  /**
   * `ESP-44` — o pool de locais da partida. Guardado porque o espião pego
   * precisa de opções pra chutar; sai da projeção **só** pra ele, e só depois
   * de já ter sido descoberto.
   */
  pool: string[]
  /** `ESP-47` — quantas votações a mesa já abriu (a final não conta). */
  votacoesDaMesa: number
  /**
   * `ESP-40` — o que sobrava do relógio da rodada quando a votação abriu. O
   * tempo de rodada é o teto da partida: ele volta de onde parou, nunca do
   * começo. `null` quando a rodada não tem relógio.
   */
  restanteDaRodadaMs: number | null
  /** `ESP-44` — o espião acusado que ainda deve o chute. */
  chutePendente: JogadorId | null
  /** `ESP-45` — o chute que aconteceu. `local` nulo = deixou o prazo vencer. */
  chuteFeito: { por: JogadorId; local: string | null; acertou: boolean } | null
  /** `ESP-49` — quem levou a partida; `null` enquanto ela corre. */
  vencedor: 'mesa' | 'espioes' | null
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
  | 'pausar'
  | 'retomar'
  | 'encerrarVotacao'
  | 'chutarLocal'
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
    pausa: null,
    resultadoVotacao: null,
    pool: [],
    votacoesDaMesa: 0,
    restanteDaRodadaMs: null,
    chutePendente: null,
    chuteFeito: null,
    vencedor: null,
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
  estado.pool = pool
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
    case 'pausar':
      return pausar(estado, ctx, ambiente)
    case 'retomar':
      return retomar(estado, ctx, ambiente)
    case 'votar':
      return votar(estado, ctx, comando.alvoId, ambiente)
    case 'encerrarVotacao':
      return encerrarVotacao(estado, ctx, ambiente)
    case 'chutarLocal':
      return chutarLocal(estado, ctx, comando.local, ambiente)
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
  // `ESP-37` — pausado é pausado pra todo mundo, inclusive pro host.
  if (estado.pausa !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }
  if (estado.votacaoAberta !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }
  // Edge case — durante a janela de resultado a mesa está lendo o que acabou de
  // acontecer; a próxima acusação espera a rodada voltar.
  if (estado.resultadoVotacao !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }
  // `ESP-46`, `ESP-47` — o botão da mesa tem munição contada.
  if (votacoesRestantes(estado, ctx.config) === 0) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  novo.votacaoAberta = { abertaEm: ambiente.agora, abertaPor: ctx.autorId, votos: {}, final: false }
  novo.votacoesDaMesa += 1
  // `ESP-40` — a rodada não reinicia depois; ela retoma exatamente daqui.
  novo.restanteDaRodadaMs = restanteDaRodada(ctx, ambiente)

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
  // Pausado não há prazo agendado; se um alarme atrasado chegar mesmo assim,
  // ele não pode destravar o que a mesa parou de propósito.
  if (estado.pausa !== null) return { ok: true, estado, eventos: [], prazos: {} }

  // `ESP-45` — o espião pego deixou o prazo do chute vencer: vale como erro.
  if (estado.chutePendente !== null) {
    return resolverChute(estado, ctx, null)
  }

  // `ESP-32`, `ESP-40` — acabou a leitura do resultado; a rodada volta com o
  // relógio de onde parou, não do começo.
  if (estado.resultadoVotacao !== null) {
    const novo = clonar(estado)
    novo.resultadoVotacao = null
    return {
      ok: true,
      estado: novo,
      eventos: [{ texto: 'A rodada voltou a correr de onde parou.' }],
      prazos: { turno: retomarRodada(novo, ambiente) },
    }
  }

  // `ESP-28` — o tempo de votação acabou; vale o que já estava na mesa.
  if (estado.votacaoAberta !== null) return fecharVotacao(estado, ctx, ambiente)

  if (ctx.config.espiao.tempoRodadaSeg === null || !estado.rodadaIniciada) {
    return { ok: true, estado, eventos: [], prazos: { turno: null } }
  }

  // `ESP-49` — o relógio da rodada zerou: esta é a votação final.
  const novo = clonar(estado)
  novo.votacaoAberta = { abertaEm: ambiente.agora, abertaPor: null, votos: {}, final: true }
  novo.restanteDaRodadaMs = 0

  return {
    ok: true,
    estado: novo,
    eventos: [
      { texto: 'O tempo da rodada acabou. Esta é a votação final — a última da partida.' },
    ],
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
  if (estado.pausa !== null) return { ok: false, erro: 'COMANDO_INVALIDO' } // `ESP-37`
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
  if (estado.pausa !== null) return { ok: false, erro: 'COMANDO_INVALIDO' } // `ESP-37`
  if (estado.votacaoAberta === null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  return fecharVotacao(estado, ctx, ambiente)
}

/**
 * `ESP-41`…`ESP-50` — a votação fecha e **decide a partida**.
 *
 * A regra é maioria simples: quem recebeu estritamente mais votos que qualquer
 * outra opção é expulso, sem piso nenhum — um voto basta se ninguém mais
 * recebeu nada. Só devolvem a rodada o empate no topo e o "pular" vencendo
 * sozinho; e mesmo aí ela volta com o relógio congelado, não reaberto.
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
  const apuracao = apurar(votacao.votos)
  const acusado = apuracao.acusado
  const eraEspiao = acusado !== null && estado.espioes.includes(acusado)

  const novo = clonar(estado)
  novo.votacaoAberta = null

  // `ESP-42`, `ESP-43`, `ESP-44`, `ESP-50` — quatro saídas, decididas aqui e
  // não na tela (`AD-008`).
  const desfecho: ResultadoVotacao['desfecho'] =
    acusado === null
      ? votacao.final
        ? 'tempoEsgotado'
        : 'rodadaVolta'
      : eraEspiao
        ? 'chuteDoEspiao'
        : 'mesaPerdeu'

  novo.resultadoVotacao = {
    votos: votacao.votos,
    abertaPor: votacao.abertaPor,
    acusado,
    aMesaAcertou: eraEspiao,
    votosNoAcusado: apuracao.votosNoAcusado,
    totalAtivos,
    desfecho,
    final: votacao.final,
  }

  // `ESP-43` — acusou um inocente: acabou, e os espiões levaram.
  if (desfecho === 'mesaPerdeu') {
    novo.vencedor = 'espioes'
    return {
      ok: true,
      estado: novo,
      eventos: [
        {
          texto: `A mesa expulsou ${apelidoNaMesa(ctx, acusado!)} — que não era espião. Os espiões venceram.`,
        },
      ],
      prazos: { turno: null },
      faseSeguinte: 'encerrada',
    }
  }

  // `ESP-50` — o tempo acabou e ninguém foi expulso: a mesa perdeu por omissão.
  if (desfecho === 'tempoEsgotado') {
    novo.vencedor = 'espioes'
    return {
      ok: true,
      estado: novo,
      eventos: [
        { texto: 'A votação final não expulsou ninguém. O tempo acabou e os espiões venceram.' },
      ],
      prazos: { turno: null },
      faseSeguinte: 'encerrada',
    }
  }

  // `ESP-44` — pegou o espião: ele ainda tem uma cartada.
  if (desfecho === 'chuteDoEspiao') {
    novo.chutePendente = acusado
    return {
      ok: true,
      estado: novo,
      eventos: [
        {
          texto: `A mesa expulsou ${apelidoNaMesa(ctx, acusado!)} — e era espião. Ele tem uma chance de dizer o local.`,
        },
      ],
      prazos: { turno: ambiente.agora + TEMPO_DE_CHUTE_MS },
    }
  }

  // `ESP-42` — empate ou "pular": a rodada volta, com o relógio congelado.
  return {
    ok: true,
    estado: novo,
    eventos: [
      {
        texto:
          apuracao.empatou
            ? 'A votação empatou. Ninguém foi expulso e a rodada continua.'
            : 'A mesa preferiu não expulsar ninguém. A rodada continua.',
      },
    ],
    prazos: { turno: ambiente.agora + JANELA_DE_RESULTADO_MS },
  }
}

/** `ESP-44`, `ESP-45` — o espião pego diz o local; é a última jogada da partida. */
function chutarLocal(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  local: string,
  _ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (estado.chutePendente === null) return { ok: false, erro: 'COMANDO_INVALIDO' }
  if (ctx.autorId !== estado.chutePendente) return { ok: false, erro: 'SEM_AUTORIDADE' }
  // O chute sai do pool da partida — não é campo livre.
  if (!estado.pool.includes(local)) return { ok: false, erro: 'CARTA_INVALIDA' }

  return resolverChute(estado, ctx, local)
}

/**
 * `ESP-45` — fecha a partida pelo chute. `local` nulo é o prazo vencido, que
 * conta como erro: quem foi pego e não disse nada não ganha por silêncio.
 */
function resolverChute(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  local: string | null,
): ResultadoReducer<EstadoEspiao> {
  const quem = estado.chutePendente
  if (quem === null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const acertou = local !== null && local === estado.local
  const novo = clonar(estado)
  novo.chutePendente = null
  novo.chuteFeito = { por: quem, local, acertou }
  novo.vencedor = acertou ? 'espioes' : 'mesa'

  return {
    ok: true,
    estado: novo,
    eventos: [
      {
        texto: acertou
          ? `${apelidoNaMesa(ctx, quem)} foi pego, disse "${local}" — e acertou. Os espiões venceram.`
          : local === null
            ? `${apelidoNaMesa(ctx, quem)} não disse nada a tempo. A mesa venceu.`
            : `${apelidoNaMesa(ctx, quem)} chutou "${local}" — e errou. A mesa venceu.`,
      },
    ],
    prazos: { turno: null },
    faseSeguinte: 'encerrada',
  }
}

interface Apuracao {
  /** `null` quando ninguém teve mais votos que todo mundo. */
  acusado: JogadorId | null
  votosNoAcusado: number
  /** Diferencia "empatou no topo" de "a mesa preferiu pular". */
  empatou: boolean
}

/**
 * `ESP-41`, `ESP-42` — maioria **simples**, com "pular" disputando de igual
 * pra igual: se ele vence sozinho, ninguém é expulso. Empate no topo, entre
 * jogadores ou com o "pular", também não expulsa.
 */
function apurar(votos: Record<JogadorId, JogadorId | 'pular'>): Apuracao {
  const contagens = new Map<JogadorId | 'pular', number>()
  for (const voto of Object.values(votos)) {
    contagens.set(voto, (contagens.get(voto) ?? 0) + 1)
  }
  if (contagens.size === 0) return { acusado: null, votosNoAcusado: 0, empatou: false }

  let maior = 0
  for (const contagem of contagens.values()) {
    if (contagem > maior) maior = contagem
  }

  const noTopo = [...contagens.entries()].filter(([, contagem]) => contagem === maior)
  if (noTopo.length !== 1) return { acusado: null, votosNoAcusado: 0, empatou: true }

  const [vencedor] = noTopo[0]!
  if (vencedor === 'pular') return { acusado: null, votosNoAcusado: 0, empatou: false }

  return { acusado: vencedor, votosNoAcusado: maior, empatou: false }
}

/** `ESP-46` — quantas votações a mesa ainda pode abrir; `null` = ilimitado. */
export function votacoesRestantes(estado: EstadoEspiao, config: Config): number | null {
  const teto = config.espiao.maxVotacoes
  if (teto === null) return null
  return Math.max(0, teto - estado.votacoesDaMesa)
}

/** `ESP-40` — o que sobrava do relógio da rodada neste instante. */
function restanteDaRodada(ctx: ContextoDeSala, ambiente: Ambiente): number | null {
  if (ctx.prazoTurno === null) return null
  return Math.max(0, ctx.prazoTurno - ambiente.agora)
}

/** `ESP-40` — devolve a rodada com o tempo congelado, e não com um relógio novo. */
function retomarRodada(estado: EstadoEspiao, ambiente: Ambiente): number | null {
  if (estado.restanteDaRodadaMs === null) return null
  return ambiente.agora + estado.restanteDaRodadaMs
}

function todosAtivosConectadosVotaram(votacao: VotacaoAberta, ctx: ContextoDeSala): boolean {
  const conectados = jogadoresAtivos(ctx).filter((j) => j.conectado)
  return conectados.length > 0 && conectados.every((j) => votacao.votos[j.id] !== undefined)
}

// ---------------------------------------------------------------------------
// Pausa (P6)
// ---------------------------------------------------------------------------

/**
 * `ESP-35`, `ESP-38`, `ESP-39` — o host para o relógio quando a resenha para.
 * O tempo que faltava é guardado no estado; sem relógio na rodada, a pausa
 * continua valendo (é ela que barra as ações da mesa).
 */
function pausar(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  if (!estado.rodadaIniciada) return { ok: false, erro: 'COMANDO_INVALIDO' }
  if (estado.pausa !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const restanteMs =
    ctx.prazoTurno === null ? null : Math.max(0, ctx.prazoTurno - ambiente.agora)

  const novo = clonar(estado)
  novo.pausa = { por: ctx.autorId, restanteMs }

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `${apelidoNaMesa(ctx, ctx.autorId)} pausou a rodada.` }],
    prazos: { turno: null },
  }
}

/** `ESP-36` — volta a contar exatamente de onde parou, não do tempo cheio. */
function retomar(
  estado: EstadoEspiao,
  ctx: ContextoDeSala,
  ambiente: Ambiente,
): ResultadoReducer<EstadoEspiao> {
  if (ctx.fase !== 'jogo') return { ok: false, erro: 'FASE_INVALIDA' }
  if (ctx.autorId !== ctx.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
  const pausa = estado.pausa
  if (pausa === null) return { ok: false, erro: 'COMANDO_INVALIDO' }

  const novo = clonar(estado)
  novo.pausa = null

  return {
    ok: true,
    estado: novo,
    eventos: [{ texto: `${apelidoNaMesa(ctx, ctx.autorId)} retomou a rodada.` }],
    prazos: { turno: pausa.restanteMs === null ? null : ambiente.agora + pausa.restanteMs },
  }
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

  // Votação aberta: quem saiu pode ter sido o último faltando votar. Com a
  // rodada pausada, nem isso fecha — a mesa retoma primeiro (`ESP-37`).
  if (
    novo.pausa === null &&
    novo.votacaoAberta !== null &&
    todosAtivosConectadosVotaram(novo.votacaoAberta, ctx)
  ) {
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
