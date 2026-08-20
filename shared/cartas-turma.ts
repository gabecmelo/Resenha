import type { PacoteDeCartasTurma } from './cartas-turma-dados'

/** Os dois baralhos de uma partida, já combinados e sem repetição. */
export interface BaralhoDaPartida {
  perguntas: string[]
  respostas: string[]
}

/**
 * `CCT-32` — combina os pacotes selecionados num único par de baralhos: união
 * das perguntas e das respostas, deduplicada por texto exato, mantendo a
 * primeira ocorrência na ordem de `pacotes`.
 *
 * Pura e determinística — mesma razão de `montarPoolDeCartas` (`AD-012`):
 * cliente e servidor precisam chegar ao mesmo baralho a partir do mesmo
 * `Config`, sem round-trip.
 */
export function montarBaralho(pacotes: readonly PacoteDeCartasTurma[]): BaralhoDaPartida {
  return {
    perguntas: unir(pacotes.map((p) => p.perguntas)),
    respostas: unir(pacotes.map((p) => p.respostas)),
  }
}

function unir(listas: readonly (readonly string[])[]): string[] {
  const vistos = new Set<string>()
  const resultado: string[] = []

  for (const lista of listas) {
    for (const texto of lista) {
      if (vistos.has(texto)) continue
      vistos.add(texto)
      resultado.push(texto)
    }
  }

  return resultado
}
