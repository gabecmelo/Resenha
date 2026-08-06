import {
  CORES,
  MAX_JOGADORES,
  MIN_JOGADORES,
  type Cor,
  type EstadoSala,
  type Jogador,
  type JogadorId,
  type Resultado,
} from '../../shared/protocolo'

/** `SALA-03` */
export const APELIDO_MIN = 2
export const APELIDO_MAX = 16

export interface DadosDeEntrada {
  id: JogadorId
  apelido: string
  /** O `core` recebe o hash pronto: derivar o hash é assíncrono e impuro. */
  tokenHash: string
}

/**
 * `AJU-35`, `AJU-36`, `AJU-38` — o limite com que a sala nasce, a partir do que
 * veio na criação.
 *
 * Ausente e inválido são caminhos diferentes: quem não pediu limite nenhum
 * recebe o padrão do produto; quem pediu um valor que não serve não abre sala.
 */
export function limiteDeEntrada(pedido: unknown): Resultado<number> {
  if (pedido === undefined || pedido === null) return { ok: true, valor: MAX_JOGADORES }
  if (typeof pedido !== 'number' || !Number.isInteger(pedido)) {
    return { ok: false, erro: 'LIMITE_INVALIDO' }
  }
  if (pedido < MIN_JOGADORES || pedido > MAX_JOGADORES) {
    return { ok: false, erro: 'LIMITE_INVALIDO' }
  }
  return { ok: true, valor: pedido }
}

/** `SALA-07` — primeira cor da paleta ainda não usada na sala. */
export function corLivre(estado: EstadoSala): Cor {
  const usadas = new Set<string>(estado.jogadores.map((j) => j.cor))
  const livre = CORES.find((cor) => !usadas.has(cor))
  if (!livre) throw new Error('paleta esgotada')
  return livre
}

/**
 * `SALA-03`, `SALA-04`, `SALA-07`, `SALA-09`, `SALA-10`, `CONN-04`.
 * `AJU-37` — a lotação é a da sala, não o teto do produto.
 * Em caso de recusa a sala fica intocada.
 */
export function entrar(
  estado: EstadoSala,
  dados: DadosDeEntrada,
  agora: number,
): Resultado<Jogador> {
  if (estado.banidos.includes(dados.tokenHash)) return { ok: false, erro: 'TOKEN_BANIDO' }
  if (estado.jogadores.length >= estado.limiteJogadores) return { ok: false, erro: 'SALA_CHEIA' }

  const apelido = dados.apelido.trim()
  if (apelido.length < APELIDO_MIN || apelido.length > APELIDO_MAX) {
    return { ok: false, erro: 'APELIDO_INVALIDO' }
  }
  const comparavel = apelido.toLocaleLowerCase('pt-BR')
  if (estado.jogadores.some((j) => j.apelido.toLocaleLowerCase('pt-BR') === comparavel)) {
    return { ok: false, erro: 'APELIDO_EM_USO' }
  }

  const jogador: Jogador = {
    id: dados.id,
    tokenHash: dados.tokenHash,
    apelido,
    cor: corLivre(estado),
    entrouEm: agora,
    conectado: true,
    desconectadoEm: null,
    situacao: estado.fase === 'lobby' ? 'ativo' : 'aguardando',
  }
  estado.jogadores.push(jogador)
  return { ok: true, valor: jogador }
}

/** `CONN-02`, `CONN-04` — devolve a mesma vaga; token banido nunca volta. */
export function reconectar(estado: EstadoSala, tokenHash: string): Resultado<Jogador> {
  if (estado.banidos.includes(tokenHash)) return { ok: false, erro: 'TOKEN_BANIDO' }

  const jogador = estado.jogadores.find((j) => j.tokenHash === tokenHash)
  if (!jogador) return { ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' }

  jogador.conectado = true
  jogador.desconectadoEm = null
  return { ok: true, valor: jogador }
}

/** `HOST-02` — remove da sala e bane o token daquela sala. */
export function expulsar(estado: EstadoSala, alvoId: JogadorId): Resultado<Jogador> {
  const posicao = estado.jogadores.findIndex((j) => j.id === alvoId)
  if (posicao === -1) return { ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' }

  const [removido] = estado.jogadores.splice(posicao, 1)
  estado.banidos.push(removido.tokenHash)
  return { ok: true, valor: removido }
}

/** `HOST-03` */
export function transferirHost(estado: EstadoSala, novoHostId: JogadorId): Resultado {
  if (!estado.jogadores.some((j) => j.id === novoHostId)) {
    return { ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' }
  }
  estado.hostId = novoHostId
  return { ok: true, valor: undefined }
}

/**
 * `HOST-04` — passa o comando ao conectado há mais tempo, medido pela entrada
 * na sala. Devolve `null` quando não há outro jogador conectado.
 */
export function migrarHost(estado: EstadoSala): JogadorId | null {
  let escolhido: Jogador | null = null
  for (const jogador of estado.jogadores) {
    if (!jogador.conectado || jogador.id === estado.hostId) continue
    if (escolhido === null || jogador.entrouEm < escolhido.entrouEm) escolhido = jogador
  }
  if (escolhido === null) return null

  estado.hostId = escolhido.id
  return escolhido.id
}
