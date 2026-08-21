import type { ModuloDeJogo } from '../../protocolo'
import { projetar } from './projecao'
import { type ComandoEnigmas, type EstadoEnigmas, iniciarRodada, reduzir } from './regras'

/**
 * Ponto único onde "Enigmas Sinistros" é montado como módulo de jogo
 * (AD-002, AD-009). O `core` recebe este objeto por injeção — é a única
 * passagem entre as duas camadas, e ela vai do jogo para o `core`.
 */
export const enigmasSinistros: ModuloDeJogo<EstadoEnigmas, ComandoEnigmas> = {
  iniciarRodada,
  reduzir,
  projetar,
}
