import type {
  EstadoSala,
  Jogador,
  JogadorId,
  Projecao,
  ProjecaoEspiao,
  ResultadoDaVotacao,
} from '../../../shared/protocolo'
import type { EstadoEspiao } from './regras'

type FichaDeJogador = Projecao['jogadores'][number]

/**
 * Monta o que **um** jogador pode ver. `ESP-07`, `ESP-08` — esconde o local
 * de quem é espião; `ESP-17` — esconde os outros espiões conforme
 * `config.espiao.espioesSeVeem`; `ESP-18`/`ESP-19` — esconde os votos
 * conforme `config.espiao.visibilidadeVoto`; `ESP-16` — revela tudo quando a
 * partida está `encerrada`, mesmo pra quem entrou depois.
 *
 * `estado` é `null` no lobby, quando ainda não há partida.
 */
export function projetar(
  estado: EstadoEspiao | null,
  sala: EstadoSala<EstadoEspiao>,
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
      // `souConfirmador` é mecânica de "Quem Sou Eu" ("Descobri!"); Espião não tem.
      souConfirmador: false,
      pronto: estado?.prontos.includes(paraJogador) ?? false,
      notas: estado?.notas[paraJogador] ?? '',
    },
    jogadores: sala.jogadores.map((j) => fichaDe(j, estado)),
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
      jogoId: 'espiao',
    }))
  }

  const ativos = sala.jogadores.filter((j) => j.situacao === 'ativo')
  projecao.jogo = {
    // Campos genéricos de rodízio de turno não fazem sentido em Espião.
    vezDe: null,
    ordem: [],
    prazoTurno: sala.prazos.turno,
    prontos: ativos.filter((j) => estado.prontos.includes(j.id)).length,
    total: ativos.length,
    espiao: projetarEspiao(estado, sala, paraJogador, ativos),
  }

  return projecao
}

function projetarEspiao(
  estado: EstadoEspiao,
  sala: EstadoSala<EstadoEspiao>,
  paraJogador: JogadorId,
  ativos: Jogador[],
): ProjecaoEspiao {
  const encerrada = sala.fase === 'encerrada'
  const souEspiao = estado.espioes.includes(paraJogador)

  const espiao: ProjecaoEspiao = {
    comecaPerguntando: {
      id: estado.comecaPerguntando,
      apelido: apelidoDe(sala, estado.comecaPerguntando),
    },
    rodadaIniciada: estado.rodadaIniciada,
    prontos: ativos.filter((j) => estado.prontos.includes(j.id)).length,
    total: ativos.length,
    prazoRodada: sala.prazos.turno,
    souEspiao,
  }

  // `ESP-07`, `ESP-08`, `ESP-16`
  if (!souEspiao || encerrada) espiao.local = estado.local

  // `ESP-17`, `ESP-16`
  if (encerrada || (souEspiao && sala.config.espiao.espioesSeVeem)) {
    espiao.espioes = estado.espioes.map((id) => ({ id, apelido: apelidoDe(sala, id) }))
  }

  // `ESP-35` — a mesa inteira precisa saber que está parada, e por quem.
  if (estado.pausa !== null) {
    espiao.pausadaPor = {
      id: estado.pausa.por,
      apelido: apelidoDe(sala, estado.pausa.por),
      restanteMs: estado.pausa.restanteMs,
    }
  }

  // `ESP-32` — o relógio da rodada só corre quando é a rodada que está de pé;
  // nas outras duas janelas o mesmo prazo pertence à votação ou ao resultado.
  if (estado.votacaoAberta !== null || estado.resultadoVotacao !== null) {
    espiao.prazoRodada = null
  }

  const votacao = estado.votacaoAberta
  if (votacao !== null) {
    const conectadosAtivos = ativos.filter((j) => j.conectado)
    const aberta: NonNullable<ProjecaoEspiao['votacaoAberta']> = {
      meuVoto: votacao.votos[paraJogador] ?? null,
      // `ESP-06` (edge case) — só ativos conectados contam.
      quantosVotaram: conectadosAtivos.filter((j) => votacao.votos[j.id] !== undefined).length,
      total: conectadosAtivos.length,
      // `ESP-28` — o prazo `turno` pertence à votação enquanto ela está aberta.
      prazoVotacao: sala.prazos.turno,
    }
    // `ESP-27` — sem `abertaPor`, foi o relógio da rodada que abriu.
    if (votacao.abertaPor !== null) {
      aberta.abertaPor = {
        id: votacao.abertaPor,
        apelido: apelidoDe(sala, votacao.abertaPor),
      }
    }
    // `ESP-18`, `ESP-19`
    if (sala.config.espiao.visibilidadeVoto === 'tempoReal') {
      aberta.votos = votacao.votos
    }
    espiao.votacaoAberta = aberta
  }

  // `ESP-30` — fechada a votação, o mapa de votos é público pra mesa inteira,
  // inclusive com `visibilidadeVoto: 'oculta'`: o sigilo protegia a decisão
  // enquanto ela estava sendo tomada, não o que ela decidiu.
  const resultado = estado.resultadoVotacao
  if (resultado !== null) {
    const projetado: ResultadoDaVotacao = {
      votos: resultado.votos,
      aMesaAcertou: resultado.aMesaAcertou,
      votosNoAcusado: resultado.votosNoAcusado,
      maioriaMinima: resultado.maioriaMinima,
      totalAtivos: resultado.totalAtivos,
      // `ESP-33` — encerrada a partida, o resultado não tem mais prazo: ele fica.
      prazoFim: encerrada ? null : sala.prazos.turno,
    }
    if (resultado.abertaPor !== null) {
      projetado.abertaPor = {
        id: resultado.abertaPor,
        apelido: apelidoDe(sala, resultado.abertaPor),
      }
    }
    if (resultado.acusado !== null) {
      projetado.acusado = { id: resultado.acusado, apelido: apelidoDe(sala, resultado.acusado) }
    }
    espiao.resultadoVotacao = projetado
  }

  return espiao
}

function fichaDe(jogador: Jogador, estado: EstadoEspiao | null): FichaDeJogador {
  return {
    id: jogador.id,
    apelido: jogador.apelido,
    cor: jogador.cor,
    conectado: jogador.conectado,
    situacao: jogador.situacao,
    // `descobriu` é mecânica de "Quem Sou Eu"; Espião nunca a usa.
    descobriu: false,
    pronto: estado?.prontos.includes(jogador.id) ?? false,
  }
}

function apelidoDe(sala: EstadoSala<EstadoEspiao>, id: JogadorId): string {
  return sala.jogadores.find((j) => j.id === id)?.apelido ?? 'um jogador'
}
