/**
 * Contrato entre cliente e servidor — fonte única de verdade do protocolo.
 *
 * Importado por `client/` e por `server/`. Não contém regra de jogo nem código
 * de plataforma: só tipos.
 */
import type { PacoteCompleto } from './pacotes-dados'

// ---------------------------------------------------------------------------
// Sala
// ---------------------------------------------------------------------------

export type Fase = 'lobby' | 'escrita' | 'jogo' | 'encerrada'

export type ModoPacote = 'livre' | 'pacote' | 'personalizado'
export type ModoDistribuicao = 'aleatoria' | 'escolha'

export interface PacoteResumo {
  id: string
  emoji: string
  nome: string
  descricao: string
  quantidade: number
  /** `HUB-01` — a qual jogo este pacote pertence, para filtrar o catálogo por sala. */
  jogoId: string
}


/**
 * `SALA-01` — formato do código da sala. Alfabeto sem os caracteres ambíguos ao
 * ditar em voz alta (`I`, `O`, e por consequência os dígitos `0` e `1`, que não
 * entram). Vive aqui porque cliente e servidor precisam do mesmo formato: o
 * servidor para gerar e validar, o cliente para guiar quem digita.
 */
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const TAMANHO_CODIGO = 5

/**
 * `AJU-06`, `AJU-34` — mínimo de jogadores ativos para uma partida existir.
 *
 * Vive aqui porque servidor e cliente precisam do **mesmo** número: o servidor
 * para recusar, a tela para desabilitar o botão com o motivo certo. Manter o
 * número em dois lugares foi o que fez o servidor passar a aceitar 2 enquanto o
 * lobby continuava exigindo 3.
 */
export const MIN_JOGADORES = 2

/**
 * `AJU-35`, `AJU-38` — teto da faixa que quem cria a sala pode escolher, e
 * padrão de quem não escolhe nada (`AJU-36`). É o limite do produto, não o
 * limite de uma sala: cada sala guarda o seu em `EstadoSala.limiteJogadores`.
 *
 * Vive aqui pelo mesmo motivo de `MIN_JOGADORES` (AD-011): o servidor recusa
 * com ele e a tela de criação desenha a faixa com ele. Coincide com o tamanho
 * da paleta de `CORES` — não há vaga sem cor própria.
 */
export const MAX_JOGADORES = 20

/** Identificador público e curto do jogador. Nunca é a credencial. */
export type JogadorId = string

export type Situacao = 'ativo' | 'aguardando'

/**
 * Paleta de cores da sala (`SALA-07`). Tem 20 entradas — uma por vaga — para
 * que a cor atribuída nunca precise repetir. O nome é o contrato; o cliente
 * mapeia cada nome para o valor visual.
 */
export const CORES = [
  'vermelho',
  'laranja',
  'ambar',
  'mostarda',
  'oliva',
  'folha',
  'esmeralda',
  'turquesa',
  'azul',
  'indigo',
  'violeta',
  'purpura',
  'magenta',
  'framboesa',
  'terracota',
  'taupe',
  'salvia',
  'ardosia',
  'ameixa',
  'grafite',
] as const

export type Cor = (typeof CORES)[number]

export interface Jogador {
  id: JogadorId
  /** Guarda-se o hash do token de sessão, nunca o token (AD-006). */
  tokenHash: string
  apelido: string
  cor: Cor
  entrouEm: number
  conectado: boolean
  desconectadoEm: number | null
  situacao: Situacao
}

/** `PKT2-01`…`PKT2-04` — nível de dificuldade de uma carta de pacote. */
export type Dificuldade = 'facil' | 'medio' | 'dificil'

/** `AD-014` — configuração própria de Espião, aninhada em `Config.espiao`. */
export interface ConfigEspiao {
  /**
   * `'auto'` (padrão) escala com a mesa: 1 espião até 6 jogadores, 2 a partir
   * de 7 — resolvido no início da rodada, quando o nº de ativos é o definitivo.
   * Um número fixo é a escolha manual do host e vence o automático.
   *
   * Validado estruturalmente em `configValida`; validado contra os jogadores
   * ativos só no início da rodada (`ESP-02`).
   */
  numEspioes: number | 'auto'
  /** Padrão true. */
  espioesSeVeem: boolean
  /** Padrão 'oculta'. */
  visibilidadeVoto: 'oculta' | 'tempoReal'
  /** Padrão 300 (5min). `null` = sem limite, mesmo padrão de `tempoTurnoSeg`. */
  tempoRodadaSeg: number | null
  /**
   * `ESP-28` — segundos que a mesa tem pra votar depois que a votação abre.
   * Diferente do tempo de rodada, aqui `null` não existe: uma votação sem
   * prazo trava a partida esperando quem foi ao banheiro. Padrão 60.
   */
  tempoVotacaoSeg: number
}

/** `ESP-01` — a partir desta mesa o automático passa a sortear 2 espiões. */
export const MESA_GRANDE_ESPIAO = 7

/** Resolve `numEspioes: 'auto'` contra o nº de jogadores ativos da rodada. */
export function espioesParaMesa(numEspioes: number | 'auto', ativos: number): number {
  if (numEspioes !== 'auto') return numEspioes
  return ativos >= MESA_GRANDE_ESPIAO ? 2 : 1
}

export const CONFIG_ESPIAO_PADRAO: ConfigEspiao = {
  numEspioes: 'auto',
  espioesSeVeem: true,
  visibilidadeVoto: 'oculta',
  tempoRodadaSeg: 300,
  tempoVotacaoSeg: 60,
}

export interface Config {
  /** `CFG-01` */
  ordemTurnos: 'sorteada' | 'entrada'
  /** `CFG-03`, `JOGO-08` — `null` significa "sem limite". */
  tempoTurnoSeg: number | null
  /** `PKT-01` */
  modoPacote: ModoPacote
  /** `PKT2-05` — substitui o antigo `pacoteId` único. Vazio = nenhum selecionado. Só relevante se `modoPacote === 'pacote'`. */
  pacoteIds: string[]
  /** `PKT2-01` — níveis de dificuldade ativos. Nunca pode ficar vazio quando `modoPacote === 'pacote'` (`PKT2-03`). */
  dificuldades: Dificuldade[]
  /** `PKT-03` */
  modoDistribuicao: ModoDistribuicao
  /** `AD-014` — sempre presente, independente de qual jogo a sala roda no momento. */
  espiao: ConfigEspiao
}

/** Padrões de uma sala recém-criada (`CFG-05`). */
export const CONFIG_PADRAO: Config = {
  ordemTurnos: 'sorteada',
  tempoTurnoSeg: null,
  modoPacote: 'livre',
  pacoteIds: [],
  dificuldades: ['facil', 'medio', 'dificil'],
  modoDistribuicao: 'aleatoria',
  espiao: CONFIG_ESPIAO_PADRAO,
}

/**
 * `AJU-19`, `AJU-20` — faixa do tempo por turno personalizado. Abaixo do mínimo
 * o turno não cabe numa pergunta; acima do máximo "sem limite" já resolve.
 */
export const TEMPO_TURNO_MIN_SEG = 10
export const TEMPO_TURNO_MAX_SEG = 60 * 60

/**
 * `ESP-28` — faixa do tempo de votação. Abaixo de 15s não dá pra ler a mesa
 * inteira antes de decidir; acima de 5min a votação deixa de ser um momento e
 * vira uma segunda rodada.
 */
export const TEMPO_VOTACAO_MIN_SEG = 15
export const TEMPO_VOTACAO_MAX_SEG = 5 * 60

/**
 * `ESP-32` — quanto tempo o resultado da votação fica na tela antes de a
 * rodada voltar a correr. Não é configurável: é o tempo de ler o mapa de votos
 * em voz alta, e uma mesa não deveria ter que decidir isso.
 */
export const JANELA_DE_RESULTADO_MS = 12_000

/**
 * Prazos multiplexados sobre o alarme único do Durable Object (AD-010).
 * Cada campo é o instante absoluto de vencimento, ou `null` quando inativo.
 */
export interface Prazos {
  /** `JOGO-07` */
  turno: number | null
  /** `HOST-04` */
  migracaoHost: number | null
  /** `CONN-07` */
  salaVazia: number | null
  /** `CONN-08` */
  salaOciosa: number | null
}

export type TipoPrazo = keyof Prazos

/**
 * `CHAT-03` — mensagem de sistema é um tipo distinto, não uma flag opcional.
 *
 * `AJU-15` — a mensagem de jogador carrega o apelido e a cor do autor **no
 * momento do envio**. Resolvê-los na lista de jogadores apagaria o autor do
 * histórico assim que ele saísse da sala (`AJU-16`, `AJU-17`).
 */
export type MensagemChat =
  | { em: number; texto: string; tipo: 'jogador'; autorId: JogadorId; apelido: string; cor: Cor }
  | { em: number; texto: string; tipo: 'sistema' }

/**
 * Documento da sala, persistido no storage do Durable Object a cada mutação
 * (AD-005). Genérico no estado do jogo para que o `core` não conheça nenhuma
 * regra de "Quem Sou Eu?" (AD-002).
 */
export interface EstadoSala<E = unknown> {
  codigo: string
  fase: Fase
  hostId: JogadorId
  /**
   * `AJU-35`, `AJU-37`, `AJU-40` — quantas pessoas cabem **nesta** sala.
   * Escolhido na criação e imutável daí em diante: por isso não vive em
   * `Config`, que o host reconfigura no lobby.
   */
  limiteJogadores: number
  /** Em ordem de entrada. */
  jogadores: Jogador[]
  /** Hashes de token expulsos (`HOST-02`, `CONN-04`). */
  banidos: string[]
  config: Config
  /** Ring buffer, máximo de 200 (`CHAT-05`). */
  chat: MensagemChat[]
  jogo: E | null
  /** `HUB-01`, `HUB-05` — qual jogo esta sala roda. Persistido, nunca undefined após a criação. */
  jogoId: string
  prazos: Prazos
  ultimaAcaoEm: number
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

/** Cada código corresponde a um cenário de recusa descrito no spec. */
export type CodigoErro =
  | 'SALA_NAO_ENCONTRADA'
  | 'SALA_CHEIA'
  | 'SALA_EXPIRADA'
  | 'CODIGO_INVALIDO'
  | 'APELIDO_INVALIDO'
  | 'APELIDO_EM_USO'
  | 'TOKEN_BANIDO'
  | 'SEM_AUTORIDADE'
  | 'FASE_INVALIDA'
  | 'JOGADOR_AGUARDANDO'
  | 'JOGADOR_NAO_ENCONTRADO'
  | 'JOGADORES_INSUFICIENTES'
  | 'PRONTOS_PENDENTES'
  | 'CARTA_INVALIDA'
  | 'NOTAS_MUITO_LONGAS'
  | 'CHAT_MUITO_LONGO'
  | 'CHAT_VAZIO'
  | 'CHAT_LIMITE_DE_TAXA'
  | 'COMANDO_INVALIDO'
  /** `AJU-38` — limite de jogadores pedido na criação da sala não serve. */
  | 'LIMITE_INVALIDO'
  | 'PACOTE_NAO_ENCONTRADO'
  | 'PACOTE_INDISPONIVEL'
  | 'PACOTE_INSUFICIENTE'
  /** `HUB-03` — `jogoId` que não existe no registro do hub, na criação ou na troca. */
  | 'JOGO_INVALIDO'

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; erro: CodigoErro }

// ---------------------------------------------------------------------------
// Protocolo de mensagens
// ---------------------------------------------------------------------------

/** Cliente → servidor. */
export type Comando =
  | { t: 'ola'; token: string }
  | { t: 'entrar'; apelido: string }
  | { t: 'configurar'; config: Partial<Config> }
  | { t: 'iniciar' }
  | { t: 'cancelar' }
  | { t: 'comecar' }
  | { t: 'escreverCarta'; texto: string }
  | { t: 'marcarPronto'; pronto: boolean }
  | { t: 'sortearOutras' }
  | { t: 'passarVez' }
  | { t: 'pularVez' }
  | { t: 'declararDescobri' }
  | { t: 'responderDeclaracao'; aceita: boolean }
  | { t: 'encerrar' }
  | { t: 'novaPartida' }
  | { t: 'expulsar'; jogadorId: JogadorId }
  | { t: 'transferirHost'; jogadorId: JogadorId }
  | { t: 'chat'; texto: string }
  | { t: 'notas'; texto: string }
  | { t: 'sair' }
  | { t: 'trocarJogo'; jogoId: string }
  | { t: 'abrirVotacao' }
  | { t: 'pausar' }
  | { t: 'retomar' }
  | { t: 'votar'; alvoId: JogadorId | null }
  | { t: 'encerrarVotacao' }

/** Servidor → cliente. */
export type Mensagem =
  | { t: 'projecao'; dados: Projecao }
  | { t: 'entrou'; token: string; jogadorId: JogadorId }
  /** Enviada somente ao socket que originou o comando. */
  | { t: 'erro'; codigo: CodigoErro; mensagem: string }

// ---------------------------------------------------------------------------
// Projeção — o que UM jogador pode ver (AD-008)
// ---------------------------------------------------------------------------

/** `AD-014` — projeção própria de Espião, aninhada em `Projecao.jogo.espiao`. */
export interface ProjecaoEspiao {
  comecaPerguntando: { id: JogadorId; apelido: string }
  rodadaIniciada: boolean
  prontos: number
  total: number
  /** Instante absoluto de vencimento do relógio da rodada; `null` = sem limite ou relógio pausado (votação aberta). */
  prazoRodada: number | null
  souEspiao: boolean
  /** Presente quando `!souEspiao`, ou quando a partida está `encerrada` (revelado a todos). */
  local?: string
  /** Presente quando (`souEspiao && config.espiao.espioesSeVeem`), ou quando `encerrada`. */
  espioes?: { id: JogadorId; apelido: string }[]
  votacaoAberta?: {
    meuVoto: JogadorId | 'pular' | null
    quantosVotaram: number
    total: number
    /**
     * `ESP-27` — quem puxou a mesa pra tela. Ausente quando foi o relógio da
     * rodada que abriu sozinho.
     */
    abertaPor?: { id: JogadorId; apelido: string }
    /** `ESP-28` — instante absoluto em que a votação fecha sozinha. */
    prazoVotacao: number | null
    /** Presente só se `config.espiao.visibilidadeVoto === 'tempoReal'`. */
    votos?: Record<JogadorId, JogadorId | 'pular'>
  }
  /**
   * `ESP-29`…`ESP-34` — o retrato da votação que acabou de fechar. Fica de pé
   * na janela de resultado e, quando a acusação encerrou a partida, segue
   * presente na revelação.
   */
  resultadoVotacao?: ResultadoDaVotacao
  /** `ESP-35` — a rodada está pausada por quem comanda a mesa. */
  pausadaPor?: { id: JogadorId; apelido: string }
}

/**
 * `ESP-29`…`ESP-31` — o que a mesa inteira vê quando a votação fecha. Os votos
 * vêm sempre completos, inclusive com `visibilidadeVoto: 'oculta'`: o sigilo
 * protege a votação enquanto ela corre, não o que ela decidiu.
 */
export interface ResultadoDaVotacao {
  /** votante → alvo. `'pular'` é quem escolheu não acusar ninguém. */
  votos: Record<JogadorId, JogadorId | 'pular'>
  /** Quem abriu a votação; ausente quando foi o relógio. */
  abertaPor?: { id: JogadorId; apelido: string }
  /** Quem a mesa acusou por maioria absoluta. Ausente = ninguém teve maioria. */
  acusado?: { id: JogadorId; apelido: string }
  /** Só verdadeiro quando houve acusado **e** ele era de fato espião. */
  aMesaAcertou: boolean
  /** Votos que o acusado recebeu; `0` quando não houve acusado. */
  votosNoAcusado: number
  /** Maioria absoluta dos ativos — o número que a acusação precisava alcançar. */
  maioriaMinima: number
  totalAtivos: number
  /**
   * `ESP-32` — instante em que a janela de resultado fecha e a rodada volta.
   * `null` quando a partida acabou aqui e não há rodada pra voltar.
   */
  prazoFim: number | null
}

export interface Projecao {
  agoraServidor: number
  sala: {
    codigo: string
    fase: Fase
    hostId: JogadorId
    /** `HUB-01`, `HUB-12` — qual jogo esta sala roda. */
    jogoId: string
    config: Config
    /** `AJU-39` — a lotação exibida é a desta sala, não o teto do produto. */
    limiteJogadores: number
    /** `PKT-18` - pacotes disponíveis quando no lobby */
    pacotesDisponiveis?: PacoteResumo[]
    /** `PKT2-07` — todos os pacotes selecionados, visíveis durante o jogo. Substitui o antigo `pacote` único. */
    pacotesSelecionados?: PacoteResumo[]
  }
  eu: {
    id: JogadorId
    ehHost: boolean
    situacao: Situacao
    /** `DESC-02`, `DESC-03` */
    souConfirmador: boolean
    /** `ESCR-02` */
    alvo?: { id: JogadorId; apelido: string }
    cartaQueEscrevi?: string
    pronto: boolean
    /** `NOTA-01`, `NOTA-02` */
    notas: string
    /** Presente APENAS após `DESC-04` ou `FIM-02` (`JOGO-02`). */
    minhaCarta?: string
    /** `PKT-12` */
    opcoesPacote?: string[]
    /** `PKT-16` */
    jaSorteouOutras?: boolean
  }
  jogadores: Array<{
    id: JogadorId
    apelido: string
    cor: Cor
    conectado: boolean
    situacao: Situacao
    descobriu: boolean
    pronto: boolean
    /** Ausente — não nulo — quando `id === eu.id` e a carta não foi revelada. */
    carta?: string
  }>
  jogo?: {
    vezDe: JogadorId | null
    ordem: JogadorId[]
    /** Instante absoluto de vencimento; o cliente calcula o que falta. */
    prazoTurno: number | null
    /** `ESCR-04` */
    prontos: number
    total: number
    declaracaoPendente?: { jogadorId: JogadorId }
    /** `AD-014` — presente só quando `sala.jogoId === 'espiao'`. */
    espiao?: ProjecaoEspiao
  }
  /** `CHAT-04` */
  chat: MensagemChat[]
}

// ---------------------------------------------------------------------------
// Fronteira core ↔ jogo (AD-002, AD-009)
// ---------------------------------------------------------------------------

/** O que o jogo precisa saber da sala, sem poder mexer nela. */
export interface ContextoDeSala {
  fase: Fase
  hostId: JogadorId
  config: Config
  jogadores: Jogador[]
  /** Quem enviou o comando. */
  autorId: JogadorId
}

/** Anúncio do jogo; o `core` o registra no chat como mensagem de sistema (`CHAT-03`). */
export interface EventoDeJogo {
  texto: string
}

/**
 * Capacidades que o `core` injeta no jogo. O módulo de jogo é puro: nunca
 * alcança o relógio nem a aleatoriedade por conta própria (AD-002, AD-009).
 */
export interface Ambiente {
  agora: number
  aleatorio: () => number
}

/**
 * O jogo descreve o que mudou; quem executa efeito é sempre o `core` (AD-009).
 * `prazos` traz apenas os prazos a redefinir — `null` limpa o prazo.
 */
export type ResultadoReducer<E> =
  | {
      ok: true
      estado: E
      eventos: EventoDeJogo[]
      prazos: Partial<Prazos>
      faseSeguinte?: Fase
      /**
       * `FIM-03`, `ESCR-10` — o jogo não toca no roster; pede ao `core` que
       * promova os jogadores `aguardando` a `ativo` ao voltar para o lobby.
       */
      promoverAguardando?: boolean
    }
  | { ok: false; erro: CodigoErro }

export type ResultadoInicio<E> =
  | { ok: true; valor: E; faseSeguinte?: Fase; prazos?: Partial<Prazos>; eventos?: EventoDeJogo[] }
  | { ok: false; erro: CodigoErro }

/** Contrato de três funções puras entre o `core` e um jogo (AD-009). */
export interface ModuloDeJogo<E, C> {
  iniciarRodada(
    ctx: ContextoDeSala,
    ambiente: Ambiente,
    pacotes?: PacoteCompleto[]
  ): ResultadoInicio<E>
  reduzir(estado: E, ctx: ContextoDeSala, comando: C, ambiente: Ambiente): ResultadoReducer<E>
  /** `estado` é `null` no lobby, quando ainda não há partida. */
  projetar(estado: E | null, sala: EstadoSala<E>, paraJogador: JogadorId): Projecao
}
