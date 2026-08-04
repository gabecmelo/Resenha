import { useEffect, useState } from 'react'
import type { Cor } from '../../../shared/protocolo'
import { MarcadorDeJogador } from './MarcadorDeJogador'

/** Abaixo disto o tempo vira sinal de risco. */
const ACABANDO_MS = 10_000

export interface PropsDoIndicador {
  ehSuaVez: boolean
  /** Quem está na vez. Ausente quando ninguém está. */
  apelido?: string
  cor?: Cor
  /** `JOGO-07` — instante absoluto de vencimento; `null` é sem limite. */
  prazoTurno: number | null
  /** `CFG-03` — duração configurada, para desenhar quanto já passou. */
  duracaoSeg: number | null
}

/**
 * Responde "o que eu faço agora" (`VIS-03`).
 *
 * O tempo é uma linha fina e um número mono — nunca um alarme. A contagem sai do
 * instante absoluto que veio na projeção, então relógio parado no cliente ou
 * reconexão no meio do turno não desalinham ninguém.
 */
export function IndicadorDeVez({
  ehSuaVez,
  apelido,
  cor,
  prazoTurno,
  duracaoSeg,
}: PropsDoIndicador) {
  const restante = useRestante(prazoTurno)
  const acabando = restante !== null && restante <= ACABANDO_MS
  const fracao =
    restante === null || duracaoSeg === null ? 0 : Math.min(restante / (duracaoSeg * 1000), 1)

  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-3 rounded-painel border bg-superficie px-4 py-4.5 ${
        acabando ? 'border-risco-linha' : 'border-linha'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        {ehSuaVez ? (
          <span className="text-titulo text-texto">É a sua vez</span>
        ) : apelido !== undefined && cor !== undefined ? (
          <span className="inline-flex items-center gap-2.5 text-secao font-medium text-texto-2">
            <MarcadorDeJogador apelido={apelido} cor={cor} />
            Vez de {apelido}
          </span>
        ) : (
          <span className="text-secao text-texto-2">Ninguém na vez</span>
        )}

        {restante !== null && (
          <span
            className={`font-mono text-[16px] font-medium ${acabando ? 'text-risco' : 'text-texto-2'}`}
          >
            {formatarTempo(restante)}
          </span>
        )}
      </div>

      {restante !== null && (
        <span className={`block h-[3px] rounded-pilula ${acabando ? 'bg-risco-suave' : 'bg-superficie-2'}`}>
          <span
            className={`block h-[3px] rounded-pilula ${acabando ? 'bg-risco' : 'bg-acento'}`}
            style={{ width: `${fracao * 100}%` }}
          />
        </span>
      )}

      {acabando ? (
        <span className="text-miudo text-risco">Acabando o tempo — a vez passa para o próximo.</span>
      ) : prazoTurno === null && ehSuaVez ? (
        <span className="font-mono text-[12px] tracking-[0.1em] text-texto-3 uppercase">
          sem limite de tempo
        </span>
      ) : (
        <span className="text-[15px] text-texto-2">
          {ehSuaVez
            ? 'Faça uma pergunta de sim ou não em voz alta.'
            : 'Responda quando a pergunta vier.'}
        </span>
      )}
    </section>
  )
}

/** Milissegundos que faltam, atualizados a cada segundo. `null` quando não há prazo. */
function useRestante(prazoTurno: number | null): number | null {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    if (prazoTurno === null) return
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(relogio)
  }, [prazoTurno])

  if (prazoTurno === null) return null
  return Math.max(prazoTurno - agora, 0)
}

function formatarTempo(restanteMs: number): string {
  const segundos = Math.ceil(restanteMs / 1000)
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
}
