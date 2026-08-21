import type { ModuloDeJogo } from '../../protocolo'
import { projetar } from './projecao'
import { type ComandoCartas, type EstadoCartas, iniciarRodada, reduzir } from './regras'

/**
 * Ponto único onde "Cartas Contra a Turma" é montado como módulo de jogo
 * (AD-002, AD-009). O `core` recebe este objeto por injeção — é a única
 * passagem entre as duas camadas, e ela vai do jogo para o `core`.
 */
export const cartasContraATurma: ModuloDeJogo<EstadoCartas, ComandoCartas> = {
  iniciarRodada,
  reduzir,
  projetar,
}
