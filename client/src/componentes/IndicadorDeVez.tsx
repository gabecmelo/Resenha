import { useEffect, useState } from 'react'
import type { Cor } from '../../../shared/protocolo'
import {
  estaAcabando,
  formatarTempo,
  fracaoRestante,
  restanteAte,
} from '../estado/relogio'
import { MarcadorDeJogador } from './MarcadorDeJogador'

export interface PropsDoIndicador {
  ehSuaVez: boolean
  /** Quem está na vez. Ausente quando ninguém está. */
  apelido?: string | undefined
  cor?: Cor | undefined
  /** `JOGO-11` — a vez continua de quem caiu; a faixa diz isso em vez de esconder. */
  conectado?: boolean
  /** `JOGO-07` — instante absoluto de vencimento; `null` é sem limite. */
  prazoTurno: number | null
  /** `CFG-03` — duração configurada, para desenhar quanto já passou. */
  duracaoSeg: number | null
}

/**
 * A faixa que responde "o que eu faço agora" (`VIS-03`).
 *
 * É a primeira coisa abaixo do cabeçalho e ocupa a largura toda no celular:
 * quando a vez é sua, ela é um bloco de cor cheia — não há como confundir com a
 * vez de outra pessoa, que é uma faixa neutra. Perto do fim, vira aviso.
 *
 * A contagem sai do instante absoluto que veio na projeção, então relógio
 * atrasado no cliente ou reconexão no meio do turno não desalinham ninguém.
 */
export function IndicadorDeVez({
  ehSuaVez,
  apelido,
  cor,
  conectado = true,
  prazoTurno,
  duracaoSeg,
}: PropsDoIndicador) {
  const restante = useRestante(prazoTurno, duracaoSeg)
  const acabando = ehSuaVez && estaAcabando(restante)

  return (
    <section
      aria-live="polite"
      className={`-mx-4 -mt-5 flex flex-col gap-2 px-4 py-3.5 sm:mx-0 sm:mt-0 sm:rounded-painel ${
        acabando
          ? 'bg-risco'
          : ehSuaVez
            ? 'bg-acento'
            : 'border-b border-linha bg-superficie-2 sm:border-b-0'
      }`}
    >
      <div className="flex items-center gap-3">
        {!ehSuaVez && apelido !== undefined && cor !== undefined && (
          <span className={conectado ? '' : 'opacity-50'}>
            <MarcadorDeJogador apelido={apelido} cor={cor} tamanho="grande" />
          </span>
        )}

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`font-mono text-[11px] tracking-[0.12em] uppercase ${
              acabando
                ? 'text-risco-contraste/75'
                : ehSuaVez
                  ? 'text-acento-contraste/75'
                  : 'text-texto-3'
            }`}
          >
            {acabando ? 'sua vez está acabando' : ehSuaVez ? 'é a sua vez' : 'é a vez de'}
          </span>
          <span
            className={`truncate text-[18px] font-semibold tracking-[-0.02em] ${
              ehSuaVez ? (acabando ? 'text-risco-contraste' : 'text-acento-contraste') : 'text-texto'
            }`}
          >
            {ehSuaVez
              ? acabando
                ? 'Pergunte agora ou passa'
                : prazoTurno === null
                  ? 'Sem pressa, sem relógio'
                  : 'Faça uma pergunta em voz alta'
              : apelido === undefined
                ? 'Ninguém na vez'
                : conectado
                  ? apelido
                  : `${apelido} · caiu`}
          </span>
        </span>

        {restante === null ? (
          ehSuaVez && (
            <span className="flex-none text-right font-mono text-[11px] leading-tight tracking-[0.12em] text-acento-contraste/75 uppercase">
              sem
              <br />
              limite
            </span>
          )
        ) : (
          <span
            className={`flex-none font-mono text-[26px] font-medium tracking-[-0.02em] ${
              acabando
                ? 'animacao-pulso text-risco-contraste'
                : ehSuaVez
                  ? 'text-acento-contraste'
                  : 'text-texto-2'
            }`}
          >
            {formatarTempo(restante)}
          </span>
        )}
      </div>

      {ehSuaVez && restante !== null && (
        <span
          className={`block h-1 overflow-hidden rounded-pilula ${
            acabando ? 'bg-risco-contraste/25' : 'bg-acento-contraste/25'
          }`}
        >
          <span
            className={`block h-1 rounded-pilula ${
              acabando ? 'bg-risco-contraste' : 'bg-acento-contraste'
            }`}
            style={{ width: `${fracaoRestante(restante, duracaoSeg) * 100}%` }}
          />
        </span>
      )}
    </section>
  )
}

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
function useRestante(prazoTurno: number | null, duracaoSeg: number | null): number | null {
  const [agora, setAgora] = useState(() => getAgora())

  useEffect(() => {
    if (prazoTurno === null) return
    const relogio = setInterval(() => setAgora(getAgora()), 500)
    return () => clearInterval(relogio)
  }, [prazoTurno])

  return restanteAte(prazoTurno, agora, duracaoSeg)
}
