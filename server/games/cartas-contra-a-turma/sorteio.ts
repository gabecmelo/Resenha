/**
 * Fisher-Yates genérico sobre uma cópia — a lista recebida não é alterada.
 * Reimplementado a partir de `espiao/sorteio.ts` (`AD-002`, jogos são
 * isolados e não importam uns dos outros).
 */
export function embaralhar<T>(itens: readonly T[], aleatorio: () => number): T[] {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1))
    const trocado = copia[i]!
    copia[i] = copia[j]!
    copia[j] = trocado
  }
  return copia
}
