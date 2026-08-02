import { aceitar } from './conexoes'

/**
 * Casca da sala. O handshake completo (`ola`, `entrar`, prazos e difusão) chega
 * em T18 — aqui existe apenas o upgrade de WebSocket, que é o que dá ao
 * registro de conexões um socket hibernável de verdade.
 */
export class SalaDurableObject {
  constructor(protected readonly ctx: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('esperado upgrade para websocket', { status: 426 })
    }
    return aceitar(this.ctx)
  }
}
