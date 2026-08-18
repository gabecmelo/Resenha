import type {
  EstadoSala,
  Jogador,
  JogadorId,
  Projecao,
  ProjecaoCartas,
} from '../../../shared/protocolo'
import type { EstadoCartas } from './regras'
import { brancaVoltaEm, campeoes, juizDa, quantosDevemJogar } from './regras'

type FichaDeJogador = Projecao['jogadores'][number]

/**
 * Monta o que **um** jogador pode ver (`AD-008`).
 *
 * O que esta função protege, e que nenhuma tela deve reproduzir por conta
 * própria: `CCT-04` — a mão só vai pro dono dela; `CCT-06` — o que alguém
 * jogou não sai daqui antes da pilha fechar; `CCT-08` — a pilha vai
 * embaralhada e **sem autoria**, e a autoria só entra na projeção depois que o
 * juiz escolheu (`CCT-12`). Quem não pode ver não recebe — não é a tela que
 * decide esconder.
 *
 * `estado` é `null` no lobby, quando ainda não há partida.
 */
export function projetar(
  estado: EstadoCartas | null,
  sala: EstadoSala<EstadoCartas>,
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
      jogoId: sala.jogoId,
      config: sala.config,
      limiteJogadores: sala.limiteJogadores,
    },
    eu: {
      id: eu.id,
      ehHost: sala.hostId === eu.id,
      situacao: eu.situacao,
      // `souConfirmador` é mecânica de "Quem Sou Eu" ("Descobri!"); este jogo não tem.
      souConfirmador: false,
      pronto: false,
      notas: '',
    },
    jogadores: sala.jogadores.map((j): FichaDeJogador => fichaDe(j)),
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
      jogoId: 'cartas-contra-a-turma',
    }))
  }

  const ativos = sala.jogadores.filter((j) => j.situacao === 'ativo')
  projecao.jogo = {
    // Campos genéricos de rodízio de turno não fazem sentido aqui: quem "está
    // na vez" é o juiz, e ele vive na projeção do jogo.
    vezDe: null,
    ordem: [],
    prazoTurno: sala.prazos.turno,
    prontos: estado.jogadas.length,
    total: ativos.length,
    cartas: projetarCartas(estado, sala, paraJogador, ativos),
  }

  return projecao
}

function projetarCartas(
  estado: EstadoCartas,
  sala: EstadoSala<EstadoCartas>,
  paraJogador: JogadorId,
  ativos: Jogador[],
): ProjecaoCartas {
  const encerrada = sala.fase === 'encerrada'
  const juizId = juizDa(estado)
  const souJuiz = juizId === paraJogador
  const jaJoguei = estado.jogadas.find((j) => j.autorId === paraJogador)

  const cartas: ProjecaoCartas = {
    rodada: estado.rodada,
    fase: estado.fase,
    pergunta: estado.pergunta,
    juiz: { id: juizId, apelido: apelidoDe(sala, juizId) },
    souJuiz,
    brancaVoltaEm: brancaVoltaEm(estado, paraJogador),
    quantosJogaram: estado.jogadas.length,
    totalEsperado: quantosDevemJogar(estado, {
      fase: sala.fase,
      hostId: sala.hostId,
      config: sala.config,
      jogadores: sala.jogadores,
      prazoTurno: sala.prazos.turno,
      autorId: paraJogador,
    }),
    faltam: ativos
      .filter((j) => j.id !== juizId && !estado.jogadas.some((jogada) => jogada.autorId === j.id))
      .map((j) => ({ id: j.id, apelido: j.apelido })),
    prazoEscolha: estado.fase === 'escolha' ? sala.prazos.turno : null,
    prazoRevelacao: estado.fase === 'revelacao' ? sala.prazos.turno : null,
    placar: placarOrdenado(estado, sala),
    metaDePontos: sala.config.cartas.metaDePontos,
  }

  // `CCT-04`, `CCT-05` — a mão é do dono, e o juiz não tem o que jogar.
  const mao = estado.maos[paraJogador]
  if (mao !== undefined && !souJuiz && !encerrada) cartas.mao = [...mao]
  if (jaJoguei !== undefined) cartas.minhaJogada = jaJoguei.texto

  // `CCT-08` — a pilha só existe depois que a escolha fecha.
  if (estado.pilha !== null && estado.fase !== 'escolha') {
    cartas.pilha = estado.pilha.map((indice) => estado.jogadas[indice]?.texto ?? '')
  }

  // `CCT-12` — a autoria entra na projeção só na revelação.
  if (estado.fase === 'revelacao' && estado.pilha !== null && estado.vencedoraNaPilha !== null) {
    const jogada = estado.jogadas[estado.pilha[estado.vencedoraNaPilha]!]
    if (jogada !== undefined) {
      cartas.vencedora = {
        indice: estado.vencedoraNaPilha,
        texto: jogada.texto,
        autor: { id: jogada.autorId, apelido: apelidoDe(sala, jogada.autorId) },
      }
    }
  }

  // `CCT-29`, `CCT-30` — o campeão só aparece quando a partida acabou.
  if (encerrada) {
    cartas.campeoes = campeoes(estado).map((id) => ({
      id,
      apelido: apelidoDe(sala, id),
      pontos: estado.placar[id] ?? 0,
    }))
  }

  return cartas
}

/** `CCT-26` — do maior pro menor; só jogadores que estão na partida. */
function placarOrdenado(
  estado: EstadoCartas,
  sala: EstadoSala<EstadoCartas>,
): ProjecaoCartas['placar'] {
  return Object.keys(estado.placar)
    .map((id) => ({ id, apelido: apelidoDe(sala, id), pontos: estado.placar[id] ?? 0 }))
    .sort((a, b) => b.pontos - a.pontos || a.apelido.localeCompare(b.apelido))
}

function apelidoDe(sala: EstadoSala<EstadoCartas>, id: JogadorId): string {
  return sala.jogadores.find((j) => j.id === id)?.apelido ?? 'Alguém'
}

function fichaDe(jogador: Jogador): FichaDeJogador {
  return {
    id: jogador.id,
    apelido: jogador.apelido,
    cor: jogador.cor,
    conectado: jogador.conectado,
    situacao: jogador.situacao,
    // Mecânicas de "Quem Sou Eu"; neste jogo ninguém "descobre" nem fica "pronto".
    descobriu: false,
    pronto: false,
  }
}
