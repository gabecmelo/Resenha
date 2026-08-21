import type { EstadoSala, TipoPrazo } from '../protocolo'

/**
 * Agendador de prazos da sala (AD-010).
 *
 * Um Durable Object admite um único alarme e `setAlarm()` preserva apenas a
 * chamada mais recente. Por isso os quatro prazos da sala são guardados no
 * documento e multiplexados aqui: quem agenda o alarme lê sempre `menorPrazo`,
 * e definir um prazo nunca cancela os outros.
 */
export const TIPOS_DE_PRAZO: readonly TipoPrazo[] = [
  'turno',
  'migracaoHost',
  'salaVazia',
  'salaOciosa',
]

/** Define (ou limpa, com `null`) um prazo, sem tocar nos demais. */
export function definir(estado: EstadoSala, tipo: TipoPrazo, quando: number | null): void {
  estado.prazos[tipo] = quando
}

/** Prazos ativos cujo vencimento já chegou. */
export function vencidos(estado: EstadoSala, agora: number): TipoPrazo[] {
  return TIPOS_DE_PRAZO.filter((tipo) => {
    const quando = estado.prazos[tipo]
    return quando !== null && quando <= agora
  })
}

/** Próximo vencimento entre os prazos ativos, ou `null` quando não há nenhum. */
export function menorPrazo(estado: EstadoSala): number | null {
  let menor: number | null = null
  for (const tipo of TIPOS_DE_PRAZO) {
    const quando = estado.prazos[tipo]
    if (quando === null) continue
    if (menor === null || quando < menor) menor = quando
  }
  return menor
}
