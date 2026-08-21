import type {
  EstadoSala,
  Jogador,
  JogadorId,
  PerguntaProjetada,
  Projecao,
  ProjecaoEnigmas,
} from '../../protocolo'
import type { EstadoEnigmas } from './regras'
import { campeoes, narradorDe } from './regras'

type FichaDeJogador = Projecao['jogadores'][number]

/**
 * Monta o que **um** jogador pode ver (`AD-008`).
 *
 * O que esta função protege, e que nenhuma tela deve reproduzir por conta
 * própria: `ENIG-05` — a solução só vai pro narrador, e pra mesa toda depois
 * da revelação; `ENIG-14` — o texto de uma declaração pendente só vai pro
 * narrador e pra quem declarou, porque a mesa lendo a tentativa antes do
 * veredito acabaria com a dedução dos outros. Quem não pode ver não recebe —
 * não é a tela que decide esconder.
 *
 * `estado` é `null` no lobby, quando ainda não há partida.
 */
export function projetar(
  estado: EstadoEnigmas | null,
  sala: EstadoSala<EstadoEnigmas>,
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
      // `souConfirmador` é mecânica de "Quem Sou Eu"; este jogo não tem.
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
      jogoId: 'enigmas-sinistros',
    }))
  }

  const ativos = sala.jogadores.filter((j) => j.situacao === 'ativo')
  projecao.jogo = {
    // Quem "está na vez" aqui é o narrador, e ele vive na projeção do jogo.
    vezDe: null,
    ordem: [],
    prazoTurno: null,
    prontos: estado.perguntas.filter((p) => p.resposta !== null).length,
    total: ativos.length,
    enigmas: projetarEnigmas(estado, sala, paraJogador),
  }

  return projecao
}

function projetarEnigmas(
  estado: EstadoEnigmas,
  sala: EstadoSala<EstadoEnigmas>,
  paraJogador: JogadorId,
): ProjecaoEnigmas {
  const encerrada = sala.fase === 'encerrada'
  const narradorId = narradorDe(estado)
  const souNarrador = narradorId === paraJogador
  // `ENIG-05` — a solução é do narrador enquanto o enigma corre; depois é de todos.
  const podeLerSolucao = souNarrador || estado.fase === 'revelacao' || encerrada

  const enigmas: ProjecaoEnigmas = {
    rodada: estado.rodada,
    fase: estado.fase,
    cena: estado.enigma?.cena ?? '',
    // Entre enigmas não há carta na mesa; `medio` é o meio da escala e não
    // promete nada à mesa enquanto não há cena nenhuma pra qualificar.
    dificuldade: estado.enigma?.dificuldade ?? 'medio',
    narrador: { id: narradorId, apelido: apelidoDe(sala, narradorId) },
    souNarrador,
    modoPergunta: sala.config.enigmas.modoPergunta,
    perguntas: estado.perguntas.map((p): PerguntaProjetada => ({
      id: p.id,
      texto: p.texto,
      autor: { id: p.autorId, apelido: apelidoDe(sala, p.autorId) },
      resposta: p.resposta,
    })),
    naFila: estado.perguntas.filter((p) => p.resposta === null).length,
    minhaPerguntaNaFila: estado.perguntas.some(
      (p) => p.autorId === paraJogador && p.resposta === null,
    ),
    souEuQueDeclarei: estado.declaracao?.autorId === paraJogador,
    tentativas: estado.tentativas.map((t) => ({
      autor: { id: t.autorId, apelido: apelidoDe(sala, t.autorId) },
      texto: t.texto,
      acertou: t.acertou,
    })),
    placar: placarOrdenado(estado, sala),
    metaDePontos: sala.config.enigmas.metaDePontos,
  }

  if (podeLerSolucao && estado.enigma !== null) enigmas.solucao = estado.enigma.solucao

  // `ENIG-14` — a mesa sabe que alguém declarou; o texto é do narrador (e de
  // quem escreveu, que já o conhece).
  if (estado.declaracao !== null) {
    const autorId = estado.declaracao.autorId
    const podeLerTexto = souNarrador || autorId === paraJogador
    enigmas.declaracaoPendente = {
      autor: { id: autorId, apelido: apelidoDe(sala, autorId) },
      ...(podeLerTexto ? { texto: estado.declaracao.texto } : {}),
    }
  }

  // `ENIG-16` — quem desatou aparece com a revelação.
  if (estado.fase === 'revelacao' && estado.desatouId !== null) {
    enigmas.desatou = {
      id: estado.desatouId,
      apelido: apelidoDe(sala, estado.desatouId),
    }
  }

  // `ENIG-25`, `ENIG-26` — o campeão só aparece quando a partida acabou.
  if (encerrada) {
    enigmas.campeoes = campeoes(estado).map((id) => ({
      id,
      apelido: apelidoDe(sala, id),
      pontos: estado.placar[id] ?? 0,
    }))
  }

  return enigmas
}

/** `ENIG-24` — do maior pro menor; só jogadores que estão na partida. */
function placarOrdenado(
  estado: EstadoEnigmas,
  sala: EstadoSala<EstadoEnigmas>,
): ProjecaoEnigmas['placar'] {
  return Object.keys(estado.placar)
    .map((id) => ({ id, apelido: apelidoDe(sala, id), pontos: estado.placar[id] ?? 0 }))
    .sort((a, b) => b.pontos - a.pontos || a.apelido.localeCompare(b.apelido))
}

function apelidoDe(sala: EstadoSala<EstadoEnigmas>, id: JogadorId): string {
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
