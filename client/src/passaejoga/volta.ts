import type { JogadorId, Projecao } from '../../../shared/protocolo'
import type { ComandoDeJogo } from '../../../shared/jogos/contrato'

/*
  Quem circula, e quando.

  Estas três funções são a tradução de "num aparelho só" para cada jogo: a
  tela de passagem existe onde a sala online tinha uma projeção privada por
  pessoa, e some onde a sala já mostrava a mesma coisa pra todo mundo. Elas
  moram fora do componente por serem puras — projeção entra, ordem sai —, e é
  por isso que dá pra provar cada `PJ-2x` sem montar React.
*/

/** Uma volta do aparelho: por quem ele passa, o que se diz, e se ele volta. */
export interface VoltaDoAparelho {
  /** Na ordem da roda (`PJ-07`). */
  fila: JogadorId[]
  /**
   * O que vem depois do toque. Nunca o segredo em si — e sempre impessoal: um
   * nome não diz o gênero de ninguém, e "ele vai ver" erra metade da mesa.
   */
  instrucao: string
  /**
   * `false` quando o aparelho **fica** com quem o recebeu — a entrega ao
   * próximo narrador dos Enigmas. Aí a volta acaba no toque, sem "esconder e
   * passar": o enigma inteiro é dele.
   */
  escondeAoPassar: boolean
  /**
   * O que sai em nome de quem está escondendo, **antes** de o aparelho andar.
   *
   * É a volta de revelação do Espião (`PJ-25`): esconder o papel é o mesmo
   * gesto que dizer "vi o meu". A ordem importa — o motor só retém o último
   * pronto enquanto a volta ainda não acabou, e é essa retenção que impede o
   * relógio de começar com o celular na mão de alguém (`PJ-26`).
   */
  comandoAoEsconder?: ComandoDeJogo
}

/**
 * Quando o aparelho precisa circular, e por quem (`PJ-21`).
 *
 * As fases sem segredo devolvem `null` e o aparelho fica numa tela só, parado
 * na mesa — é o caso do Dedo na Cara inteiro e dos Enigmas depois da cena
 * aberta.
 */
export function voltaDaFase(projecao: Projecao, aparelhoCom: JogadorId): VoltaDoAparelho | null {
  // `PJ-29` — cada um escreve a carta de alguém sem ninguém ver.
  if (projecao.sala.fase === 'escrita') {
    return {
      fila: ativos(projecao),
      instrucao: 'Uma carta que ninguém mais pode ver.',
      escondeAoPassar: true,
    }
  }

  /*
    `PJ-25` — a volta de revelação: cada um lê o próprio papel antes de a
    rodada existir. Esconder o papel é o mesmo gesto que marcar pronto, e por
    isso o comando viaja junto da volta em vez de virar mais um botão.
  */
  const espiao = projecao.jogo?.espiao
  if (espiao !== undefined && !espiao.rodadaIniciada) {
    return {
      fila: ativos(projecao),
      instrucao: 'O papel desta rodada — o local, ou ser o espião.',
      escondeAoPassar: true,
      comandoAoEsconder: { t: 'marcarPronto', pronto: true },
    }
  }

  /*
    `PJ-28` — a votação também é segredo, e num aparelho só o "voto oculto" da
    sala é literalmente a tela de passagem: um de cada vez, e o próximo não vê
    o que o anterior marcou.
  */
  const votacao = espiao?.votacaoAberta
  if (votacao !== undefined && votacao.quantosVotaram < votacao.total) {
    return {
      fila: ativos(projecao),
      instrucao: 'Um voto que mais ninguém vê.',
      escondeAoPassar: true,
    }
  }

  /*
    `PJ-24` — o narrador mudou e o aparelho ainda está na mão do anterior. A
    entrega vem **antes** de a solução nova aparecer: sem ela, o enigma
    seguinte nasceria aberto na tela de quem acabou de narrar.
  */
  const enigmas = projecao.jogo?.enigmas
  if (enigmas !== undefined && enigmas.narrador.id !== aparelhoCom) {
    return {
      fila: [enigmas.narrador.id],
      instrucao: 'Quem receber narra este enigma — a solução é só de quem narra.',
      escondeAoPassar: false,
    }
  }

  return null
}

/** A roda, na ordem em que a mesa digitou os nomes (`PJ-07`). */
export function ativos(projecao: Projecao): JogadorId[] {
  return projecao.jogadores
    .filter((jogador) => jogador.situacao === 'ativo')
    .map((jogador) => jogador.id)
}

/**
 * De quem é o aparelho quando ele está parado na mesa (`PJ-22`).
 *
 * O Dedo na Cara é o caso que precisa disso: o aparelho não circula, mas cada
 * um aponta o seu dedo tocando na mesma tela. Quem está "com o aparelho" é o
 * próximo que ainda não apontou — sem isso, o primeiro toque seria o único que
 * conta e a contagem nunca fecharia.
 *
 * Nada aqui escolhe alvo nenhum (`AD-003`): só diz de quem é o próximo toque.
 */
export function donoDoAparelho(projecao: Projecao, atual: JogadorId): JogadorId {
  /*
    `PJ-30` — no "Quem Sou Eu?" o aparelho **não** pode ficar com quem está na
    vez. A carta de alguém é escondida exatamente de quem a carrega, então a
    projeção de quem está jogando a vez esconderia justo a carta que a mesa
    precisa ler. O celular fica com o vizinho e é virado pra fora: é o mesmo
    gesto do jogo de papel na testa.
  */
  if (projecao.sala.jogoId === 'quem-sou-eu' && projecao.sala.fase === 'jogo') {
    const vezDe = projecao.jogo?.vezDe
    if (vezDe !== undefined && vezDe !== null && atual === vezDe) {
      const roda = ativos(projecao)
      const depois = roda[(roda.indexOf(vezDe) + 1) % roda.length]
      if (depois !== undefined) return depois
    }
    return atual
  }

  const dedo = projecao.jogo?.dedo
  if (dedo === undefined || dedo.fase !== 'votacao') return atual

  const jaApontaram = new Set(dedo.votos.map((voto) => voto.eleitor.id))
  const proximo = projecao.jogadores.find(
    (jogador) => jogador.situacao === 'ativo' && !jaApontaram.has(jogador.id),
  )
  return proximo?.id ?? atual
}