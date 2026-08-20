import type { JogadorId } from '../../../shared/protocolo'

/**
 * Fisher-Yates genérico sobre uma cópia — a lista recebida não é alterada.
 * Reimplementado a partir de `quem-sou-eu/sorteio.ts` (`AD-002`, jogos são
 * isolados), agora genérico em `T` porque Espião só precisa embaralhar ids.
 */
export function embaralhar<T>(itens: readonly T[], aleatorio: () => number): T[] {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1))
    const trocado = copia[i]
    copia[i] = copia[j]
    copia[j] = trocado
  }
  return copia
}

/** `ESP-04` — sorteia `quantidade` espiões distintos dentre os jogadores ativos. */
export function sortearEspioes(
  ativos: readonly JogadorId[],
  quantidade: number,
  aleatorio: () => number,
): JogadorId[] {
  return embaralhar(ativos, aleatorio).slice(0, quantidade)
}
