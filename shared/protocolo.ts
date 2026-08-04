/**
 * Contrato entre cliente e servidor — fonte única de verdade do protocolo.
 *
 * Importado por `client/` e por `server/`. Não contém regra de jogo nem código
 * de plataforma: só tipos.
 */

// ---------------------------------------------------------------------------
// Sala
// ---------------------------------------------------------------------------

export type Fase = 'lobby' | 'escrita' | 'jogo' | 'encerrada'

/**
 * `SALA-01` — formato do código da sala. Alfabeto sem os caracteres ambíguos ao
 * ditar em voz alta (`I`, `O`, e por consequência os dígitos `0` e `1`, que não
 * entram). Vive aqui porque cliente e servidor precisam do mesmo formato: o
 * servidor para gerar e validar, o cliente para guiar quem digita.
 */
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const TAMANHO_CODIGO = 5

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

export interface Config {
  /** `CFG-01` */
  ordemTurnos: 'sorteada' | 'entrada'
  /** `CFG-02` */
  aoDescobrir: 'continua' | 'sai'
  /** `CFG-03`, `JOGO-08` — `null` significa "sem limite". */
  tempoTurnoSeg: number | null
}

/** Padrões de uma sala recém-criada (`CFG-05`). */
export const CONFIG_PADRAO: Config = {
  ordemTurnos: 'sorteada',
  aoDescobrir: 'sai',
  tempoTurnoSeg: null,
}

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

/** `CHAT-03` — mensagem de sistema é um tipo distinto, não uma flag opcional. */
export type MensagemChat =
  | { em: number; texto: string; tipo: 'jogador'; autorId: JogadorId }
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
  /** Em ordem de entrada. */
  jogadores: Jogador[]
  /** Hashes de token expulsos (`HOST-02`, `CONN-04`). */
  banidos: string[]
  config: Config
  /** Ring buffer, máximo de 200 (`CHAT-05`). */
  chat: MensagemChat[]
  jogo: E | null
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

/** Servidor → cliente. */
export type Mensagem =
  | { t: 'projecao'; dados: Projecao }
  | { t: 'entrou'; token: string; jogadorId: JogadorId }
  /** Enviada somente ao socket que originou o comando. */
  | { t: 'erro'; codigo: CodigoErro; mensagem: string }

// ---------------------------------------------------------------------------
// Projeção — o que UM jogador pode ver (AD-008)
// ---------------------------------------------------------------------------

export interface Projecao {
  sala: { codigo: string; fase: Fase; hostId: JogadorId; config: Config }
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

/** Contrato de três funções puras entre o `core` e um jogo (AD-009). */
export interface ModuloDeJogo<E, C> {
  iniciarRodada(jogadores: Jogador[], ambiente: Ambiente): Resultado<E>
  reduzir(estado: E, ctx: ContextoDeSala, comando: C, ambiente: Ambiente): ResultadoReducer<E>
  /** `estado` é `null` no lobby, quando ainda não há partida. */
  projetar(estado: E | null, sala: EstadoSala<E>, paraJogador: JogadorId): Projecao
}
