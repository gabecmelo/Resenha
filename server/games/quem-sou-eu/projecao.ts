import type {
  EstadoSala,
  Jogador,
  JogadorId,
  Projecao,
} from '../../../shared/protocolo'
import { type EstadoQuemSouEu, confirmadorDe } from './regras'

type FichaDeJogador = Projecao['jogadores'][number]

/**
 * Monta o que **um** jogador pode ver. É o guardião do `JOGO-02`.
 *
 * A carta do próprio jogador não é filtrada do payload: ela nunca chega a ser
 * construída nele. Existe um único ponto onde uma carta entra na projeção —
 * `podeVerCarta` — e ele recebe "para quem".
 *
 * `estado` é `null` no lobby, quando ainda não há partida.
 */
export function projetar(
  estado: EstadoQuemSouEu | null,
  sala: EstadoSala<EstadoQuemSouEu>,
  paraJogador: JogadorId,
): Projecao {
  const eu = sala.jogadores.find((j) => j.id === paraJogador)
  if (eu === undefined) throw new Error(`jogador fora da sala: ${paraJogador}`)

  const projecao: Projecao = {
    agoraServidor: 0,
    sala: {
      codigo: sala.codigo,
      fase: sala.fase,
      hostId: sala.hostId,
      // `HUB-01`, `HUB-12` — qual jogo esta sala roda.
      jogoId: sala.jogoId,
      config: sala.config,
      // `AJU-39` — a lotação que a tela mostra é a desta sala.
      limiteJogadores: sala.limiteJogadores,
    },
    eu: {
      id: eu.id,
      ehHost: sala.hostId === eu.id,
      situacao: eu.situacao,
      souConfirmador: ehConfirmador(estado, sala, paraJogador),
      pronto: estado?.prontos.includes(paraJogador) ?? false,
      // `NOTA-02` — só as notas de quem recebe a projeção.
      notas: estado?.notas[paraJogador] ?? '',
    },
    jogadores: sala.jogadores.map((j) => fichaDe(j, estado, paraJogador)),
    // `CHAT-04`
    chat: sala.chat,
  }

  if (estado === null) return projecao

  if (estado.pacotesSelecionados && estado.pacotesSelecionados.length > 0) {
    projecao.sala.pacotesSelecionados = estado.pacotesSelecionados.map((p) => ({
      id: p.id,
      nome: p.nome,
      emoji: p.emoji,
      descricao: '',
      quantidade: 0,
    }))
  }

  if (estado.opcoesPorJogador?.[paraJogador]) {
    projecao.eu.opcoesPacote = estado.opcoesPorJogador[paraJogador]
  }

  if (estado.jaSorteouOutras) {
    projecao.eu.jaSorteouOutras = estado.jaSorteouOutras[paraJogador] ?? false
  }

  // `ESCR-02` — o alvo e a carta que este jogador escreveu. O sorteio sem ponto
  // fixo garante que o alvo nunca é ele mesmo, então isto não revela a própria.
  const alvoId = estado.atribuicoes[paraJogador]
  if (alvoId !== undefined) {
    const alvo = sala.jogadores.find((j) => j.id === alvoId)
    if (alvo !== undefined) projecao.eu.alvo = { id: alvo.id, apelido: alvo.apelido }

    const escrita = estado.cartas[alvoId]
    if (escrita !== undefined) projecao.eu.cartaQueEscrevi = escrita
  }

  // `DESC-04`, `FIM-02` — a própria carta só existe no payload depois de revelada.
  const minha = estado.cartas[paraJogador]
  if (minha !== undefined && cartaRevelada(estado, paraJogador)) {
    projecao.eu.minhaCarta = minha
  }

  const ativos = sala.jogadores.filter((j) => j.situacao === 'ativo')
  projecao.jogo = {
    vezDe: estado.vezDe,
    ordem: estado.ordem,
    prazoTurno: sala.prazos.turno,
    // `ESCR-04` — progresso sem revelar conteúdo.
    prontos: ativos.filter((j) => estado.prontos.includes(j.id)).length,
    total: ativos.length,
  }
  if (estado.declaracaoPendente !== null) {
    projecao.jogo.declaracaoPendente = { jogadorId: estado.declaracaoPendente.jogadorId }
  }

  return projecao
}

function fichaDe(
  jogador: Jogador,
  estado: EstadoQuemSouEu | null,
  paraJogador: JogadorId,
): FichaDeJogador {
  const ficha: FichaDeJogador = {
    id: jogador.id,
    apelido: jogador.apelido,
    cor: jogador.cor,
    conectado: jogador.conectado,
    situacao: jogador.situacao,
    descobriu: estado?.descobriram.includes(jogador.id) ?? false,
    pronto: estado?.prontos.includes(jogador.id) ?? false,
  }
  if (estado === null) return ficha

  const carta = estado.cartas[jogador.id]
  if (carta !== undefined && podeVerCarta(estado, jogador.id, paraJogador)) {
    ficha.carta = carta
  }
  return ficha
}

/**
 * O único ponto do sistema que decide se uma carta entra num payload.
 * `JOGO-01` — a carta dos outros é sempre visível.
 * `JOGO-02` — a própria só depois de `DESC-04` ou `FIM-02`.
 */
function podeVerCarta(
  estado: EstadoQuemSouEu,
  dono: JogadorId,
  paraJogador: JogadorId,
): boolean {
  if (dono !== paraJogador) return true
  return cartaRevelada(estado, dono)
}

function cartaRevelada(estado: EstadoQuemSouEu, dono: JogadorId): boolean {
  return estado.reveladoParaTodos || estado.descobriram.includes(dono)
}

/** `DESC-02`, `DESC-03` */
function ehConfirmador(
  estado: EstadoQuemSouEu | null,
  sala: EstadoSala<EstadoQuemSouEu>,
  paraJogador: JogadorId,
): boolean {
  const pendente = estado?.declaracaoPendente
  if (pendente === null || pendente === undefined) return false
  return confirmadorDe(sala.hostId, sala.jogadores, pendente.jogadorId) === paraJogador
}
