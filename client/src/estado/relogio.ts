/**
 * Contagem regressiva do turno (`JOGO-07`, `JOGO-08`).
 *
 * A projeção manda o **instante absoluto** de vencimento (`jogo.prazoTurno`), e
 * não quantos segundos faltam: quem calcula o que resta é o cliente, a cada
 * segundo. É o que faz uma reconexão no meio do turno, uma aba que ficou
 * dormindo ou um relógio de servidor adiantado não desalinharem ninguém.
 *
 * Aqui só vive a conta. Quem decide se a vez passou é o servidor (AD-008).
 */

/** Abaixo disto o tempo deixa de ser informação e vira aviso. */
export const ACABANDO_MS = 10_000

/**
 * Milissegundos até o vencimento. `null` quando não há prazo — a configuração
 * "sem limite" (`CFG-03`, `JOGO-08`) nunca agenda um.
 *
 * Nunca devolve negativo: prazo vencido é zero, porque quem avança a vez é o
 * servidor e a tela não deve antecipar isso contando para trás.
 */
export function restanteAte(prazoTurno: number | null, agora: number): number | null {
  if (prazoTurno === null) return null
  return Math.max(prazoTurno - agora, 0)
}

/** `m:ss`, arredondando para cima — "0:01" ainda é um segundo de jogo. */
export function formatarTempo(restanteMs: number): string {
  const segundos = Math.ceil(restanteMs / 1000)
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
}

export function estaAcabando(restanteMs: number | null): boolean {
  return restanteMs !== null && restanteMs <= ACABANDO_MS
}

/**
 * Quanto do turno ainda resta, de 0 a 1, para desenhar a barra. Sem duração
 * configurada não há proporção a mostrar: devolve 0.
 */
export function fracaoRestante(restanteMs: number | null, duracaoSeg: number | null): number {
  if (restanteMs === null || duracaoSeg === null || duracaoSeg <= 0) return 0
  return Math.min(restanteMs / (duracaoSeg * 1000), 1)
}
