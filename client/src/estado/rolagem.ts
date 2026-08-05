/**
 * Rolagem do histórico de chat (`AJU-29`, `AJU-30`).
 *
 * O painel tem altura própria e rola por dentro, então mensagem nova não
 * empurra a página. Quem decide se a lista acompanha a mensagem nova é esta
 * conta: só arrasta quem já estava no fim.
 */

/** Sobra que ainda conta como "no fim": arredondamento de zoom e sub-pixel. */
export const MARGEM_DO_FIM_PX = 24

export interface Rolagem {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

/**
 * `AJU-30` — o painel está no fim? Quem rolou para cima para reler não é
 * arrastado de volta pela mensagem que chega.
 */
export function estaNoFim(rolagem: Rolagem, margem: number = MARGEM_DO_FIM_PX): boolean {
  return rolagem.scrollHeight - rolagem.scrollTop - rolagem.clientHeight <= margem
}
