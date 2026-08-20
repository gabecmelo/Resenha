import { useEffect, useState } from 'react'
import { getAgora, restanteAte } from './relogio'

/**
 * Milissegundos que faltam, relidos a cada tique. `null` quando não há prazo.
 *
 * O tique é mais rápido que o segundo mostrado de propósito: o prazo pode mudar
 * a qualquer momento (a vez passou, alguém reconectou) e meio segundo de atraso
 * na primeira leitura já não aparece na tela.
 *
 * `AJU-31` — a duração entra na conta como teto: sem ela, um relógio de cliente
 * atrasado faria um turno de 30s começar em `0:31`.
 */
export function useRestante(prazo: number | null, duracaoSeg: number | null): number | null {
  const [agora, setAgora] = useState(() => getAgora())

  useEffect(() => {
    if (prazo === null) return
    const relogio = setInterval(() => setAgora(getAgora()), 500)
    return () => clearInterval(relogio)
  }, [prazo])

  return restanteAte(prazo, agora, duracaoSeg)
}
