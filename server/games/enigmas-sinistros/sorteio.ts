/**
 * Embaralhamento Fisher-Yates com a fonte de aleatoriedade injetada — a mesma
 * dos outros jogos. Sem isso não dá pra testar sorteio, e teste de sorteio é o
 * único jeito de provar que o enigma não sai na ordem do arquivo.
 */
export function embaralhar<T>(itens: readonly T[], aleatorio: () => number): T[] {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
  }
  return copia
}
