/**
 * Escolha de tema (claro/escuro).
 *
 * Os dois temas são de primeira classe e todos os tokens já trazem os dois
 * valores (`index.css`): quem decide entre eles é o `color-scheme` em vigor. Por
 * padrão o tema segue o dispositivo; a escolha explícita é guardada e vence a
 * preferência do sistema até ser trocada de novo.
 */

import type { Deposito } from './sessao'

export type Tema = 'claro' | 'escuro'

export const CHAVE_TEMA = 'resenha.tema'

/** Tema escolhido antes, ou `null` quando a pessoa nunca escolheu. */
export function lerTema(deposito: Deposito): Tema | null {
  const guardado = deposito.getItem(CHAVE_TEMA)
  return guardado === 'claro' || guardado === 'escuro' ? guardado : null
}

export function guardarTema(deposito: Deposito, tema: Tema): void {
  deposito.setItem(CHAVE_TEMA, tema)
}

/** O tema que vale agora: a escolha, quando existe; senão o do dispositivo. */
export function temaEfetivo(guardado: Tema | null, prefereEscuro: boolean): Tema {
  if (guardado !== null) return guardado
  return prefereEscuro ? 'escuro' : 'claro'
}

export function alternar(tema: Tema): Tema {
  return tema === 'claro' ? 'escuro' : 'claro'
}
