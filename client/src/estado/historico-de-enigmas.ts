import type { PerguntaProjetada, RespostaDoNarrador } from '../../../shared/protocolo'

/** As abas do histórico: tudo, ou uma das três respostas. */
export type FiltroDoHistorico = 'tudo' | RespostaDoNarrador

export interface LinhaDoHistorico {
  pergunta: PerguntaProjetada
  /**
   * A ordem em que a pergunta foi feita **neste enigma**, 1-based.
   *
   * Não é a posição na lista à vista, e a diferença é o ponto: se fosse,
   * trocar de aba renumeraria tudo e a mesa perderia a referência que acabou
   * de usar em voz alta ("a 3 deu não"). No modo fila isso deixa buracos na
   * sequência — a 4 ainda está esperando resposta —, e o buraco é informação
   * honesta, não defeito.
   */
  numero: number
}

/**
 * `ENIG-10` — o que já foi respondido, numerado e filtrado.
 *
 * A numeração sai da lista inteira (com as que ainda estão na fila) e a
 * filtragem vem depois: é o que mantém o número estável enquanto a mesa troca
 * de aba.
 */
export function linhasDoHistorico(
  perguntas: PerguntaProjetada[],
  filtro: FiltroDoHistorico,
): LinhaDoHistorico[] {
  return perguntas
    .map((pergunta, indice) => ({ pergunta, numero: indice + 1 }))
    .filter(({ pergunta }) => pergunta.resposta !== null)
    .filter(({ pergunta }) => filtro === 'tudo' || pergunta.resposta === filtro)
}

/** Quantas respondidas por aba, pro contador que vai no rótulo de cada uma. */
export function contarPorAba(perguntas: PerguntaProjetada[]): Record<FiltroDoHistorico, number> {
  const respondidas = perguntas.filter((p) => p.resposta !== null)
  return {
    tudo: respondidas.length,
    sim: respondidas.filter((p) => p.resposta === 'sim').length,
    nao: respondidas.filter((p) => p.resposta === 'nao').length,
    naoImporta: respondidas.filter((p) => p.resposta === 'naoImporta').length,
  }
}
