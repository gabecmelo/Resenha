/**
 * Embaralhamento Fisher-Yates com a fonte de aleatoriedade injetada.
 *
 * Reimplementado, e não importado dos outros jogos: jogos são isolados
 * (`AD-002`). São quinze linhas duplicadas em troca de nenhuma dependência
 * entre pastas de `games/`.
 */
export function embaralhar<T>(itens: readonly T[], aleatorio: () => number): T[] {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
  }
  return copia
}
