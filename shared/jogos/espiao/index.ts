import type { ModuloDeJogo } from '../../protocolo'
import { projetar } from './projecao'
import { type ComandoEspiao, type EstadoEspiao, iniciarRodada, reduzir } from './regras'

/**
 * Ponto único onde "Espião" é montado como módulo de jogo (AD-002, AD-009).
 * O `core` recebe este objeto por injeção — é a única passagem entre as duas
 * camadas, e ela vai do jogo para o `core`, nunca ao contrário.
 */
export const espiao: ModuloDeJogo<EstadoEspiao, ComandoEspiao> = {
  iniciarRodada,
  reduzir,
  projetar,
}
