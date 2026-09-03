import type {
  EstadoSala,
  Jogador,
  JogadorId,
  Projecao,
  ProjecaoDedo,
  VotoProjetado,
} from '../../protocolo'
import type { EstadoDedo } from './regras'
import { campeoes } from './regras'

type FichaDeJogador = Projecao['jogadores'][number]

/**
 * Monta o que **um** jogador pode ver (`AD-008`).
 *
 * O que esta função protege, e que nenhuma tela deve reproduzir por conta
 * própria: `DEDO-08` — numa sala de votação secreta, enquanto a votação está
 * aberta o alvo de cada dedo **não sai do servidor**. A mesa recebe só a lista
 * de quem já apontou. Se o alvo viajasse e a tela escondesse, bastaria abrir o
 * inspetor pra saber pra quem o outro apontou antes de apontar — e aí o jogo
 * inteiro é outro.
 *
 * A exceção é o próprio dedo: `meuVoto` sempre volta pra quem o deu, senão a
 * pessoa não consegue nem conferir o que marcou.
 *
 * `estado` é `null` no lobby, quando ainda não há partida.
 */
export function projetar(
  estado: EstadoDedo | null,
  sala: EstadoSala<EstadoDedo>,
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
      jogoId: 'dedo-na-cara',
    }))
  }

  const ativos = sala.jogadores.filter((j) => j.situacao === 'ativo')
  projecao.jogo = {
    // Ninguém "está na vez" neste jogo: a mesa aponta junto.
    vezDe: null,
    ordem: [],
    prazoTurno: null,
    prontos: Object.keys(estado.votos).length,
    total: ativos.length,
    dedo: projetarDedo(estado, sala, paraJogador),
  }

  return projecao
}

function projetarDedo(
  estado: EstadoDedo,
  sala: EstadoSala<EstadoDedo>,
  paraJogador: JogadorId,
): ProjecaoDedo {
  const encerrada = sala.fase === 'encerrada'
  // `DEDO-11` — a apuração abre os dedos pra mesa inteira, inclusive na sala
  // secreta: a revelação é o jogo, o sigilo só existe pra que ela aconteça.
  const dedosAVista = estado.fase === 'apuracao' || encerrada || sala.config.dedo.votacao === 'aberta'

  const dedo: ProjecaoDedo = {
    rodada: estado.rodada,
    fase: estado.fase,
    carta: estado.carta ?? '',
    votacao: sala.config.dedo.votacao,
    autoVoto: sala.config.dedo.autoVoto,
    meuVoto: estado.votos[paraJogador] ?? null,
    quantosVotaram: Object.keys(estado.votos).length,
    quantosDevemVotar: sala.jogadores.filter((j) => j.situacao === 'ativo' && j.conectado).length,
    votos: Object.entries(estado.votos).map(([eleitorId, alvoId]): VotoProjetado => {
      const eleitor = { id: eleitorId, apelido: apelidoDe(sala, eleitorId) }
      // O próprio dedo volta sempre; o dos outros só quando estão à vista.
      if (!dedosAVista && eleitorId !== paraJogador) return { eleitor }
      return { eleitor, alvo: { id: alvoId, apelido: apelidoDe(sala, alvoId) } }
    }),
    empatou: estado.empatou,
    placar: placarOrdenado(estado, sala),
    metaDePontos: sala.config.dedo.metaDePontos,
  }

  // `DEDO-12` — quem levou a carta aparece com a apuração.
  if (estado.vencedorId !== null) {
    dedo.vencedor = {
      id: estado.vencedorId,
      apelido: apelidoDe(sala, estado.vencedorId),
      votos: estado.votosNoVencedor,
    }
  }

  // `DEDO-18`, `DEDO-19` — o campeão só aparece quando a partida acabou.
  if (encerrada) {
    dedo.campeoes = campeoes(estado).map((id) => ({
      id,
      apelido: apelidoDe(sala, id),
      pontos: estado.placar[id] ?? 0,
    }))
  }

  return dedo
}

/** `DEDO-16` — do maior pro menor; só jogadores que estão na partida. */
function placarOrdenado(estado: EstadoDedo, sala: EstadoSala<EstadoDedo>): ProjecaoDedo['placar'] {
  return Object.keys(estado.placar)
    .map((id) => ({ id, apelido: apelidoDe(sala, id), pontos: estado.placar[id] ?? 0 }))
    .sort((a, b) => b.pontos - a.pontos || a.apelido.localeCompare(b.apelido))
}

function apelidoDe(sala: EstadoSala<EstadoDedo>, id: JogadorId): string {
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
