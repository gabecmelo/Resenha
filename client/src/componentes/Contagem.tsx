import { useEffect, useRef, useState } from 'react'
import { tocarClique, tocarSuaVez } from '../sons'

const PASSO_MS = 700

/**
 * Três, dois, um — a batida antes da carta nova (`PJ2-18`, `PJ2-21`).
 *
 * Numa mesa, virar a carta seguinte no instante em que a anterior fecha atropela
 * a reação da rodada que acabou. A contagem existe pra dar esse respiro e pra
 * juntar os olhos de todo mundo na tela ao mesmo tempo — que é o que faz a carta
 * chegar pra mesa inteira, e não pra quem já estava olhando.
 *
 * Pulável por toque, e isso não é detalhe: uma mesa embalada não pode ficar
 * esperando a animação de um app que se acha o mestre de cerimônias.
 */
export function Contagem({ aoTerminar }: { aoTerminar(): void }) {
  const [restam, setRestam] = useState(3)
  // O fim dispara uma vez só: `aoTerminar` costuma despachar um comando, e
  // despachar duas vezes viraria carta dobrada.
  const jaTerminou = useRef(false)

  const terminar = () => {
    if (jaTerminou.current) return
    jaTerminou.current = true
    aoTerminar()
  }

  useEffect(() => {
    if (restam <= 0) {
      tocarSuaVez()
      terminar()
      return
    }
    tocarClique()
    const relogio = window.setTimeout(() => setRestam((quanto) => quanto - 1), PASSO_MS)
    return () => window.clearTimeout(relogio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restam])

  return (
    <button
      type="button"
      onClick={terminar}
      aria-label={`${restam}. Toque para pular a contagem`}
      className="fixed inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-4 bg-fundo"
    >
      <span
        key={restam}
        className="font-display text-[clamp(5rem,30vw,11rem)] leading-none text-texto tabular-nums"
      >
        {restam}
      </span>
      <span className="font-mono text-rotulo text-texto-3 uppercase">toque para pular</span>
    </button>
  )
}
