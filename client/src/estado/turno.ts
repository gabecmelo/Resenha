/**
 * Tempo por turno na configuração da sala (`CFG-03`, `AJU-19`, `AJU-20`).
 *
 * Os presets cobrem quase todo grupo; o campo personalizado existe para o resto.
 * A faixa aceita vem do contrato — o cliente não guarda o número.
 *
 * Nada aqui recusa de verdade: quem valida a configuração é o servidor (AD-008).
 * Estas funções só evitam mandar um valor que já se sabe recusado.
 */

import { TEMPO_TURNO_MAX_SEG, TEMPO_TURNO_MIN_SEG } from '../../../shared/protocolo'

export interface OpcaoDeTempo {
  /** `null` é "sem limite" (`JOGO-08`). */
  valor: number | null
  rotulo: string
}

export const PRESETS_DE_TEMPO: readonly OpcaoDeTempo[] = [
  { valor: null, rotulo: 'Sem limite' },
  { valor: 30, rotulo: '30s' },
  { valor: 60, rotulo: '60s' },
  { valor: 90, rotulo: '90s' },
  { valor: 120, rotulo: '2min' },
]

/**
 * `AJU-19`, `AJU-20` — os segundos que o host digitou, ou `null` quando o que
 * está escrito não serve: vazio, com letra, quebrado ou fora da faixa.
 */
export function tempoDigitado(texto: string): number | null {
  const limpo = texto.trim()
  if (!/^\d+$/.test(limpo)) return null

  const segundos = Number(limpo)
  if (segundos < TEMPO_TURNO_MIN_SEG || segundos > TEMPO_TURNO_MAX_SEG) return null
  return segundos
}

/** `AJU-19` — o tempo em vigor não é nenhum dos presets. */
export function ehTempoPersonalizado(tempoTurnoSeg: number | null): boolean {
  return tempoTurnoSeg !== null && !PRESETS_DE_TEMPO.some((o) => o.valor === tempoTurnoSeg)
}

/** Como esse tempo se lê na tela, preset ou não. */
export function rotuloDoTempo(tempoTurnoSeg: number | null): string {
  if (tempoTurnoSeg === null) return 'Sem limite'

  const preset = PRESETS_DE_TEMPO.find((o) => o.valor === tempoTurnoSeg)
  if (preset !== undefined) return preset.rotulo

  const minutos = Math.floor(tempoTurnoSeg / 60)
  const segundos = tempoTurnoSeg % 60
  if (minutos === 0) return `${segundos}s`
  return segundos === 0 ? `${minutos}min` : `${minutos}min ${segundos}s`
}
