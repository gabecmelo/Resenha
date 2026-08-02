import type { JogadorId } from '../../../shared/protocolo'

/**
 * `ESCR-01` — sorteia uma permutação sem ponto fixo: ninguém escreve a própria
 * carta.
 *
 * Implementado como **ciclo aleatório único**: embaralha os jogadores e liga
 * cada um ao seguinte, fechando o círculo. Um ciclo de tamanho ≥ 2 não tem
 * ponto fixo por construção — não há tentativa-e-erro, retry nem caso de falha,
 * o que atende ao edge case do spec para o mínimo de 3 jogadores.
 *
 * A fonte de aleatoriedade é **injetada**: o módulo de jogo é puro e nunca
 * alcança a plataforma por conta própria (AD-002, AD-009).
 *
 * @returns escritor → alvo
 */
export function sortearAlvos(
  ids: readonly JogadorId[],
  aleatorio: () => number,
): Record<JogadorId, JogadorId> {
  const ciclo = embaralhar(ids, aleatorio)

  const atribuicoes: Record<JogadorId, JogadorId> = {}
  for (let i = 0; i < ciclo.length; i += 1) {
    atribuicoes[ciclo[i]] = ciclo[(i + 1) % ciclo.length]
  }
  return atribuicoes
}

/**
 * Fisher-Yates sobre uma cópia — a lista recebida não é alterada.
 * Também é o sorteio da ordem de turnos (`JOGO-03`, `CFG-01`).
 */
export function embaralhar(ids: readonly JogadorId[], aleatorio: () => number): JogadorId[] {
  const copia = [...ids]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1))
    const trocado = copia[i]
    copia[i] = copia[j]
    copia[j] = trocado
  }
  return copia
}
