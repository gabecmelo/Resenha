import { useEffect, useState } from 'react'

/**
 * A batida de suspense antes de uma revelação coletiva.
 *
 * Uma mesa não revela nada no mesmo instante em que a última pessoa aperta o
 * botão: alguém conta até três, todo mundo olha, e só então vira a carta. Sem
 * essa batida o resultado aparece antes de a mesa ter parado de votar — quem
 * apertou por último vê a resposta antes de tirar o dedo da tela.
 */
export const BATIDA_DE_SUSPENSE_MS = 1_500

export interface OpcoesDaBatida {
  duracaoMs?: number
  /**
   * Segurar também quando a tela já nasce revelada. É o caso de uma revelação
   * que troca de tela: pra ela, a virada *é* a entrada. Fora disso o padrão
   * `false` evita repetir a batida pra quem só recarregou a página.
   */
  naEntrada?: boolean
}

/** `true` enquanto a batida ainda corre — a tela deve segurar a revelação. */
export function useBatidaDeSuspense(revelando: boolean, opcoes: OpcoesDaBatida = {}): boolean {
  const { duracaoMs = BATIDA_DE_SUSPENSE_MS, naEntrada = false } = opcoes

  // Já veio revelado na primeira renderização: sem `naEntrada`, não houve
  // virada nenhuma pra segurar.
  const [jaEstavaRevelado] = useState(revelando)
  const [segurando, setSegurando] = useState(revelando && naEntrada)

  // A virada é a transição entre duas renderizações, e é lida como tal — o
  // mesmo padrão da declaração negada em `Jogo.tsx`.
  const [anterior, setAnterior] = useState(revelando)
  if (revelando !== anterior) {
    setAnterior(revelando)
    setSegurando(revelando && !jaEstavaRevelado)
  }

  useEffect(() => {
    if (!segurando) return
    const relogio = setTimeout(() => setSegurando(false), duracaoMs)
    return () => clearTimeout(relogio)
  }, [segurando, duracaoMs])

  return segurando
}
