import type { ReactNode } from 'react'

const TONS = {
  esmalte: 'bg-acento text-acento-contraste',
  mostarda: 'bg-aviso text-aviso-contraste',
  pronto: 'bg-pronto text-pronto-contraste',
  tinta: 'bg-controle-linha text-fundo',
} as const

export interface PropsDaFaixa {
  /** A etiqueta carimbada: "SUA VEZ", "VOTAÇÃO ABERTA", "ASSISTINDO". */
  selo?: string
  tom?: keyof typeof TONS
  /** No lugar do selo, quando o que importa é *de quem* é a vez. */
  marcador?: ReactNode
  /** A linha de orientação: responde "o que eu faço agora?". */
  children: ReactNode
  /** O relógio da fase, quando existe. */
  relogio?: ReactNode
}

/**
 * A faixa de fase (`Kit de Partida` — moldura): o que está acontecendo agora,
 * numa linha, sempre no mesmo lugar logo abaixo do cabeçalho.
 *
 * O selo é a forma de o produto gritar sem pintar a tela inteira — uma etiqueta
 * em caixa alta, levemente torta, do jeito de um carimbo.
 */
export function FaixaDeFase({ selo, tom = 'esmalte', marcador, children, relogio }: PropsDaFaixa) {
  return (
    <div className="flex items-center gap-2.5">
      {marcador ?? (selo !== undefined && <span className={`selo ${TONS[tom]}`}>{selo}</span>)}
      <div className="min-w-0 flex-1 text-apoio leading-snug text-texto">{children}</div>
      {relogio}
    </div>
  )
}

/**
 * O relógio da faixa, nas duas variantes previstas pelo kit (de turno e de
 * partida) — o que muda é quem passa o prazo, não o desenho.
 *
 * `acabando` não pisca sozinho: ele troca de cor e ganha o disco pulsando, para
 * que a informação continue de pé para quem desligou a animação.
 */
export function RelogioDaFaixa({
  texto,
  acabando = false,
}: {
  /** Já formatado (`0:42`), ou `null` quando a partida não tem limite. */
  texto: string | null
  acabando?: boolean
}) {
  if (texto === null) {
    return (
      <span className="flex-none rounded-chip border border-linha px-2.5 py-2 font-mono text-rotulo text-texto-3 uppercase">
        sem limite
      </span>
    )
  }

  return (
    <span
      aria-live="polite"
      className={`flex flex-none items-center gap-1.5 rounded-chip border px-2.5 py-2 ${
        acabando ? 'border-acento text-acento' : 'border-linha text-texto'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-pilula ${
          acabando ? 'animacao-pulso bg-acento' : 'bg-pronto'
        }`}
      />
      <span className="font-mono text-[15px] font-medium tabular-nums">{texto}</span>
    </span>
  )
}
