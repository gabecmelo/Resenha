import type { Cor } from '../../../shared/protocolo'
import { MarcadorDeJogador } from './MarcadorDeJogador'

/** A trama do papel selado: duas faixas do próprio acento, sem cor nova. */
const TRAMA_SELADA =
  'repeating-linear-gradient(135deg, var(--acento-linha) 0 6px, var(--acento-suave) 6px 12px)'

export interface PropsDaCarta {
  /** De quem é a carta — o papelzinho na testa dessa pessoa. */
  apelido: string
  cor: Cor
  ehVoce?: boolean
  /**
   * O que está escrito. **Ausente** — não vazio — quando é a sua carta e ela
   * ainda não foi revelada: o servidor nunca a constrói no seu payload
   * (`JOGO-02`, AD-008).
   */
  texto?: string | undefined
  /** `DESC-06` — já descobriu quem é. */
  descobriu?: boolean
  ehHost?: boolean
  /** `JOGO-03` — está perguntando agora. */
  ehAVezDele?: boolean
  /** `CONN-03` */
  conectado?: boolean
  /** `VIS-02` — forma enxuta, para a mesa de 20 caber em 360px. */
  compacta?: boolean
}

/**
 * A carta de um jogador — o componente central da mesa (`JOGO-01`).
 *
 * A sua carta oculta ocupa o mesmo lugar de sempre na lista e tem o mesmo peso
 * das outras. Ela não é um vazio: é papel selado, com moldura própria e a
 * palavra `selada` — nunca um erro de carregamento nem um dado que faltou.
 *
 * No celular cada carta é uma linha; a partir de `sm` ela vira bloco e o texto
 * cresce, que é o que ocupa a largura sobrando numa mesa de 3 pessoas.
 */
export function Carta({
  apelido,
  cor,
  ehVoce = false,
  texto,
  descobriu = false,
  ehHost = false,
  ehAVezDele = false,
  conectado = true,
  compacta = false,
}: PropsDaCarta) {
  const selada = ehVoce && texto === undefined
  const apagada = descobriu && !ehVoce

  return (
    <article
      className={`flex min-w-0 items-center gap-3 border ${
        compacta
          ? 'rounded-painel px-2.5 py-2'
          : 'rounded-bloco px-3.5 py-3 sm:flex-col sm:items-start sm:gap-3.5 sm:p-5'
      } ${
        ehVoce
          ? 'border-acento bg-acento-suave'
          : ehAVezDele
            ? 'border-acento-linha bg-superficie'
            : apagada
              ? 'border-linha bg-superficie-2'
              : 'border-linha bg-superficie'
      } ${conectado ? '' : 'opacity-60'}`}
    >
      <MarcadorDeJogador apelido={apelido} cor={cor} tamanho={compacta ? 'medio' : 'grande'} />

      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:w-full">
        {/* A cor é atalho de leitura; o apelido escrito é a informação. */}
        <span
          className={`truncate font-mono tracking-[0.1em] uppercase ${
            compacta ? 'text-[9px]' : 'text-[10px]'
          } ${ehVoce || ehAVezDele || descobriu ? 'text-acento' : 'text-texto-3'}`}
        >
          {apelido}
          {ehVoce && ' · você'}
          {ehHost && ' · host'}
          {ehAVezDele && ' · perguntando'}
          {descobriu && ' · descobriu'}
          {!conectado && ' · desconectado'}
        </span>

        {selada ? (
          <span
            style={{ background: TRAMA_SELADA }}
            className="flex min-h-9 items-center justify-center rounded-controle border border-dashed border-acento px-3 sm:min-h-[74px]"
          >
            <span className="font-mono text-[11px] tracking-[0.14em] text-acento uppercase sm:text-[13px] sm:tracking-[0.16em]">
              selada
            </span>
          </span>
        ) : (
          /* `VIS-02` — na mesa cheia a carta encolhe, mas nunca é cortada:
             carta ilegível é o mesmo que carta ausente. */
          <span
            className={`font-semibold tracking-[-0.02em] text-balance [overflow-wrap:anywhere] ${
              compacta ? 'text-[16px] leading-[1.3]' : 'text-[19px] leading-[1.15] sm:text-[30px]'
            } ${apagada ? 'text-texto-2' : 'text-texto'}`}
          >
            {texto}
          </span>
        )}

        {selada && !compacta && (
          <span className="text-[12px] leading-snug text-texto-2">
            Todo mundo lê a sua. Só você não.
          </span>
        )}
      </span>
    </article>
  )
}
