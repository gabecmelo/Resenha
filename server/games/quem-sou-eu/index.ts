import type { ModuloDeJogo } from '../../../shared/protocolo'
import { projetar } from './projecao'
import { type ComandoQuemSouEu, type EstadoQuemSouEu, iniciarRodada, reduzir } from './regras'

/**
 * Ponto único onde "Quem Sou Eu?" é montado como módulo de jogo (AD-002,
 * AD-009). O `core` recebe este objeto por injeção — é a única passagem entre
 * as duas camadas, e ela vai do jogo para o `core`, nunca ao contrário.
 */
export const quemSouEu: ModuloDeJogo<EstadoQuemSouEu, ComandoQuemSouEu> = {
  iniciarRodada,
  reduzir,
  projetar,
}
