/**
 * A fila de segredo do Passa e Joga (`PJ-17`…`PJ-19`).
 *
 * Num aparelho só, quem protege o segredo é a tela: antes de mostrar qualquer
 * coisa privada, ela nomeia **quem** deve estar com o aparelho e não monta nada
 * do conteúdo. É um gesto só, igual nos quatro jogos — se cada um inventasse o
 * seu, a mesa erraria justo no momento em que o erro custa o segredo.
 *
 * A ordem da fila é a ordem em que a mesa digitou os nomes, que é a ordem da
 * roda (`PJ-07`): assim o aparelho anda de vizinho pra vizinho em vez de
 * atravessar a mesa.
 *
 * Tudo aqui é puro e imutável. `avancar` devolve uma passagem nova com
 * `revelado` já em `false` — zerar num segundo passo abriria a janela de um
 * quadro em que o conteúdo de quem acabou de esconder aparece pra quem está
 * recebendo (`PJ-19`).
 */

import type { JogadorId } from '../../../shared/protocolo'

export interface Passagem {
  /** Na ordem da roda. */
  fila: JogadorId[]
  posicao: number
  /**
   * `true` só enquanto o conteúdo está à vista. Nunca é persistido: recarregar
   * com um segredo na tela reabre no anúncio daquele jogador (`PJ-20`).
   */
  revelado: boolean
}

/** Uma fila nova, parada no anúncio do primeiro da roda. */
export function criarPassagem(fila: JogadorId[]): Passagem {
  return { fila: [...fila], posicao: 0, revelado: false }
}

/** `true` quando o aparelho já deu a volta inteira. */
export function acabou(passagem: Passagem): boolean {
  return passagem.posicao >= passagem.fila.length
}

/**
 * De quem é o aparelho agora — sempre um jogador só, nunca dois. `null` quando
 * a volta acabou: quem chama pergunta em vez de tropeçar num índice vazio.
 */
export function deQuemE(passagem: Passagem): JogadorId | null {
  return passagem.fila[passagem.posicao] ?? null
}

/** Quem recebeu confirmou que está com o aparelho: o conteúdo pode aparecer. */
export function revelar(passagem: Passagem): Passagem {
  if (acabou(passagem)) return passagem
  return { ...passagem, revelado: true }
}

/**
 * "Esconder e passar": esconde e anda um lugar no mesmo despacho. Numa fila
 * terminada não anda mais — o índice não passa do fim.
 */
export function avancar(passagem: Passagem): Passagem {
  if (acabou(passagem)) return passagem
  return { ...passagem, posicao: passagem.posicao + 1, revelado: false }
}
