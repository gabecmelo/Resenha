import { SalaDeJogo } from './core/sala-do'
import { quemSouEu } from './games/quem-sou-eu'
import type { EstadoQuemSouEu } from './games/quem-sou-eu/regras'

/**
 * Ponto único onde o jogo entra na sala (AD-002): a casca genérica vive em
 * `core/` e recebe o módulo por injeção; nenhum arquivo de `core/` importa
 * `games/`. Trocar de jogo é trocar esta classe.
 */
export class SalaDurableObject extends SalaDeJogo<EstadoQuemSouEu> {
  constructor(ctx: DurableObjectState) {
    super(ctx, quemSouEu)
  }
}

export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response('não implementado', { status: 501 })
  },
}
