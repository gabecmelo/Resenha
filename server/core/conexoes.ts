import type { JogadorId, Mensagem, Projecao } from '../../shared/protocolo'

/**
 * Registro de conexões da sala.
 *
 * Com a Hibernation API o construtor do Durable Object roda de novo depois de
 * cada hibernação e qualquer mapa em memória some junto. Por isso o vínculo
 * socket → jogador não vive num campo de instância: ele é gravado **no próprio
 * socket** via `serializeAttachment`, que é o único estado que a plataforma
 * preserva fora do storage (AD-005).
 */
interface Vinculo {
  jogadorId: JogadorId
}

/**
 * Abre o par de sockets e entrega o lado servidor à Hibernation API.
 * `acceptWebSocket` (em vez de `accept`) é o que permite ao Durable Object
 * hibernar sem derrubar as conexões (`CONN-05`).
 */
export function aceitar(ctx: DurableObjectState): Response {
  const par = new WebSocketPair()
  ctx.acceptWebSocket(par[1])
  return new Response(null, { status: 101, webSocket: par[0] })
}

/** `CONN-02` — o socket passa a responder por um jogador. */
export function vincular(ws: WebSocket, jogadorId: JogadorId): void {
  const vinculo: Vinculo = { jogadorId }
  ws.serializeAttachment(vinculo)
}

/** `null` enquanto o socket não se identificou (`ola` ou `entrar`). */
export function jogadorDe(ws: WebSocket): JogadorId | null {
  const vinculo = ws.deserializeAttachment() as Vinculo | null
  return vinculo === null ? null : vinculo.jogadorId
}

/** Um jogador pode ter mais de um socket aberto (duas abas, por exemplo). */
export function socketsDe(ctx: DurableObjectState, jogadorId: JogadorId): WebSocket[] {
  return ctx.getWebSockets().filter((ws) => jogadorDe(ws) === jogadorId)
}

export function enviar(ws: WebSocket, mensagem: Mensagem): void {
  ws.send(JSON.stringify(mensagem))
}

/**
 * AD-008 — cada socket recebe a projeção montada para o **seu** jogador, nunca
 * um estado comum filtrado no cliente. Socket ainda sem vínculo é pulado: ele
 * não representa ninguém, e a difusão dos demais não pode depender dele.
 */
export function difundir(
  ctx: DurableObjectState,
  projetar: (paraJogador: JogadorId) => Projecao,
): void {
  for (const ws of ctx.getWebSockets()) {
    const jogadorId = jogadorDe(ws)
    if (jogadorId === null) continue
    enviar(ws, { t: 'projecao', dados: projetar(jogadorId) })
  }
}
