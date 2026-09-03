import type { EstadoSala } from '../../shared/protocolo'
import { menorPrazo } from '../../shared/jogos/prazos'

/**
 * O que sobrou do agendador aqui: o alarme (AD-010). O resto — definir, ver o
 * que venceu, achar o menor prazo — é aritmética pura e mora em
 * `shared/jogos/prazos.ts`, porque o motor local do Passa e Joga também conta
 * o tempo e não tem alarme nenhum pra chamar (AD-017).
 */
export { TIPOS_DE_PRAZO, definir, menorPrazo, vencidos } from '../../shared/jogos/prazos'

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
