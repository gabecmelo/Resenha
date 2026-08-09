import type { Dificuldade, PacoteCompleto } from './pacotes-dados'

/**
 * `PKT2-06`, `PKT2-09`, `PKT2-23` — combina os pacotes selecionados num único
 * pool de cartas: união das cartas cujas dificuldades estão em `dificuldades`,
 * deduplicada por texto exato. Em caso de texto repetido entre pacotes
 * diferentes, mantém a primeira ocorrência na ordem de `pacotes`.
 *
 * Pura e determinística — sem I/O, sem aleatoriedade — para que cliente e
 * servidor cheguem sempre ao mesmo pool a partir do mesmo `Config` (AD-012).
 */
export function montarPoolDeCartas(
  pacotes: readonly PacoteCompleto[],
  dificuldades: readonly Dificuldade[],
): string[] {
  const vistos = new Set<string>()
  const pool: string[] = []

  for (const pacote of pacotes) {
    for (const carta of pacote.cartas) {
      if (!dificuldades.includes(carta.dificuldade)) continue
      if (vistos.has(carta.texto)) continue
      vistos.add(carta.texto)
      pool.push(carta.texto)
    }
  }

  return pool
}
