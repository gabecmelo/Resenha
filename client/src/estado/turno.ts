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
 *
 * Aceita as duas escritas do mesmo tempo: `90` e `1:30`. Quem pensa "um minuto
 * e meio" não deveria ter que fazer a conta na cabeça pra digitar. Em `m:ss` os
 * segundos vão até 59 — `1:90` é erro de digitação, não noventa segundos, e
 * aceitar isso calado devolveria um tempo que ninguém pediu.
 */
export function tempoDigitado(texto: string): number | null {
  const limpo = texto.trim()

  const comDoisPontos = /^(\d{1,3}):([0-5]\d)$/.exec(limpo)
  const segundos = comDoisPontos
    ? Number(comDoisPontos[1]) * 60 + Number(comDoisPontos[2])
    : /^\d+$/.test(limpo)
      ? Number(limpo)
      : null

  if (segundos === null) return null
  if (segundos < TEMPO_TURNO_MIN_SEG || segundos > TEMPO_TURNO_MAX_SEG) return null
  return segundos
}

/**
 * Como esse tempo se escreve no campo, pra reabrir a gaveta e encontrar o que
 * se digitou: `m:ss` de um minuto pra cima, o número cru abaixo disso.
 */
export function paraCampoDeTempo(segundos: number): string {
  if (segundos < 60) return String(segundos)
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
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
