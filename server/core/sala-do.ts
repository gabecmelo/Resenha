/**
 * Casca da sala. Implementada em T18 — aqui existe apenas a classe que dá nome
 * ao namespace do Durable Object, fixado pela migração do `wrangler.jsonc`.
 */
export class SalaDurableObject {
  constructor(protected readonly ctx: DurableObjectState) {}

  async fetch(_request: Request): Promise<Response> {
    return new Response('não implementado', { status: 501 })
  }
}
