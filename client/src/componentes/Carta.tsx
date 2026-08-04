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
  texto?: string
  /** `DESC-06` — já descobriu quem é. */
  descobriu?: boolean
}

/**
 * A carta de um jogador — o componente central da mesa (`JOGO-01`).
 *
 * A sua carta oculta tem a mesma forma, o mesmo tamanho e o mesmo peso das
 * outras. Ela é um espaço que o jogo guarda para você, com a legenda que explica
 * por que está vazio — nunca um erro de carregamento nem um dado que faltou.
 */
export function Carta({ apelido, cor, ehVoce = false, texto, descobriu = false }: PropsDaCarta) {
  const oculta = ehVoce && texto === undefined
  const apagada = descobriu && !ehVoce

  return (
    <article
      className={`flex min-h-[150px] flex-col justify-between gap-3.5 rounded-carta border p-4 ${
        ehVoce ? 'border-acento bg-superficie' : apagada ? 'border-linha bg-superficie-2' : 'border-linha bg-superficie'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <MarcadorDeJogador apelido={apelido} cor={cor} tamanho="miudo" />
        <span
          className={`text-miudo ${
            ehVoce ? 'font-semibold text-acento' : apagada ? 'font-medium text-texto-3' : 'font-medium text-texto-2'
          }`}
        >
          {apelido}
          {ehVoce && ' · você'}
        </span>
      </span>

      {oculta ? (
        <span className="flex min-h-[52px] items-center justify-center rounded-painel bg-acento-suave px-3 py-2.5 text-center font-mono text-[11px] tracking-[0.1em] text-acento uppercase">
          guardada para você
        </span>
      ) : (
        <span className={`text-carta text-balance ${apagada ? 'text-texto-2' : 'text-texto'}`}>
          {texto}
        </span>
      )}

      {oculta && <span className="text-miudo text-texto-2">Todos veem, menos você.</span>}
      {ehVoce && !oculta && (
        <span className="font-mono text-[11px] tracking-[0.1em] text-acento uppercase">
          revelada por você
        </span>
      )}
      {apagada && <span className="text-miudo text-texto-3">já descobriu</span>}
    </article>
  )
}
