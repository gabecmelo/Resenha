import type { EstadoSala, TipoPrazo } from '../../shared/protocolo'

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

/**
 * Folga entre o prazo e o alarme que o cobra.
 *
 * Quem joga no estouro do relógio manda o comando com o cronômetro ainda em
 * zero-e-pouco, e ele leva o tempo da rede mais o de acordar o Durable Object
 * pra chegar. Sem folga esse comando perde a corrida pro alarme: numa mesa de
 * três, o Cartas via uma carta só na pilha, descartava a rodada inteira e
 * passava o juiz — pra mesa parecia que o jogo tinha pulado sozinho.
 *
 * O prazo guardado não muda; é ele que a tela conta. O que atrasa é só a
 * cobrança, e um segundo e meio não se percebe no relógio parado em zero.
 */
export const FOLGA_DO_ALARME_MS = 1_500

/**
 * AD-010 — **único ponto do sistema autorizado a chamar `setAlarm`**. O alarme
 * aponta sempre para o menor prazo pendente, então agendar o turno não pode
 * cancelar a expiração da sala.
 */
export async function reagendar(
  storage: DurableObjectStorage,
  estado: EstadoSala,
): Promise<void> {
  const proximo = menorPrazo(estado)
  if (proximo === null) {
    await storage.deleteAlarm()
    return
  }
  await storage.setAlarm(proximo + FOLGA_DO_ALARME_MS)
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
