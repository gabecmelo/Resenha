import type { Cor } from '../../../shared/protocolo'
import { MarcadorDeJogador } from './MarcadorDeJogador'

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
 * A sua carta selada ocupa o mesmo lugar de sempre na grade e tem **a mesma
 * altura, a mesma borda e a mesma sombra** das outras: muda só o conteúdo.
 * Verso hachurado, moldura pontilhada e a frase impressa — é um lugar guardado,
 * nunca um erro de carregamento nem um dado que faltou.
 *
 * O estado nunca é só cor: cada marcação leva um glifo e uma palavra, para
 * quem não distingue matiz e para tela lavada de sol.
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

  const marca = ehAVezDele
    ? { glifo: '◆', palavra: 'vez', cor: 'text-acento' }
    : descobriu
      ? { glifo: '✓', palavra: 'achou', cor: 'text-pronto' }
      : !conectado
        ? { glifo: '○', palavra: 'fora', cor: 'text-texto-3' }
        : ehHost
          ? { glifo: '★', palavra: 'host', cor: 'text-texto-3' }
          : null

  return (
    <article
      className={`flex min-w-0 flex-col gap-2 border bg-superficie ${
        compacta ? 'min-h-[94px] rounded-botao p-2.5' : 'min-h-[120px] rounded-papel p-3'
      } ${
        ehAVezDele
          ? 'border-2 border-controle-linha shadow-chip'
          : ehVoce
            ? 'border-2 border-acento'
            : 'border-linha'
      } ${apagada ? 'bg-superficie-2' : ''} ${conectado ? '' : 'opacity-50'}`}
    >
      <div className="flex items-center gap-1.5">
        <MarcadorDeJogador apelido={apelido} cor={cor} tamanho="medio" />
        {/* A cor é atalho de leitura; o apelido escrito é a informação. */}
        <span
          className={`min-w-0 flex-1 truncate font-semibold ${
            compacta ? 'text-compacto' : 'text-miudo'
          }`}
        >
          {apelido}
          {ehVoce && <span className="text-texto-3"> · você</span>}
        </span>
        {marca !== null && (
          <span
            className={`flex-none font-mono text-compacto-apoio whitespace-nowrap ${marca.cor}`}
          >
            <span aria-hidden="true">{marca.glifo}</span>
            {!compacta && ` ${marca.palavra}`}
            {compacta && <span className="sr-only"> {marca.palavra}</span>}
          </span>
        )}
      </div>

      {selada ? (
        <span className="verso-secreto flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-center">
          <span className="font-mono text-compacto-apoio tracking-[0.14em] text-acento uppercase">
            a mesa sabe
          </span>
          {!compacta && (
            <span className="font-mono text-compacto-apoio tracking-[0.14em] text-acento uppercase">
              você descobre
            </span>
          )}
        </span>
      ) : (
        /* `VIS-02` — na mesa cheia a carta encolhe, mas nunca é cortada:
           carta ilegível é o mesmo que carta ausente. */
        <span
          className={`flex flex-1 items-center justify-center text-center font-display text-balance [overflow-wrap:anywhere] ${
            compacta ? 'text-compacto' : 'text-carta'
          } ${apagada ? 'text-texto-2' : 'text-texto'}`}
        >
          {texto}
        </span>
      )}
    </article>
  )
}
