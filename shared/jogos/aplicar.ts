import type { EstadoSala, EventoDeJogo, ResultadoReducer } from '../protocolo'
import { TIPOS_DE_PRAZO, definir } from './prazos'

/**
 * O jogo descreve o que mudou; executar é sempre de quem despacha (AD-009).
 *
 * Mora em `shared/` porque despachante há dois — o `core` da sala online e o
 * motor local do Passa e Joga (`AD-017`) — e essa aplicação é a mesma nos dois.
 * O que ela **não** faz é escrever no chat: chat é da sala, e num aparelho só
 * não existe. Por isso devolve os eventos em vez de registrá-los.
 */
export function aplicar<E>(
  sala: EstadoSala<E>,
  resultado: Extract<ResultadoReducer<E>, { ok: true }>,
): EventoDeJogo[] {
  sala.jogo = resultado.estado

  // AD-010 — o jogo só redefine os prazos que citou; os demais ficam intactos.
  for (const tipo of TIPOS_DE_PRAZO) {
    const quando = resultado.prazos[tipo]
    if (quando !== undefined) definir(sala, tipo, quando)
  }

  if (resultado.faseSeguinte !== undefined) sala.fase = resultado.faseSeguinte

  // `ESCR-09`, `FIM-03` — o jogo não toca no roster; quem promove é o `core`.
  if (resultado.promoverAguardando === true) {
    for (const jogador of sala.jogadores) jogador.situacao = 'ativo'
  }

  return resultado.eventos
}
