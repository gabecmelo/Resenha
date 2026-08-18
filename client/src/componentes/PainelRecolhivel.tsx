import { useState, type ReactNode } from 'react'

/**
 * No desktop os painéis de apoio (notas, resenha) ficam abertos na coluna
 * lateral; no celular eles começam recolhidos, para não roubar a mesa. Isto é o
 * estado inicial, não uma trava: a pessoa abre e fecha o que quiser depois.
 */
export function abreNoDesktop(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(min-width: 1024px)').matches
}

export interface PropsDoPainel {
  /** Em caixa baixa; a tipografia carimba. */
  rotulo: string
  /** O número ao lado do rótulo — mensagens não lidas, linhas escritas. */
  contagem?: number | undefined
  children: ReactNode
}

/**
 * Painel de apoio que abre no lugar, empurrando a página — nunca por cima dela
 * (mesmo motivo do `BlocoDeNotas`: quem está no meio de uma anotação ou de uma
 * resposta não pode ser obrigado a fechar uma caixa antes de agir).
 */
export function PainelRecolhivel({ rotulo, contagem, children }: PropsDoPainel) {
  const [aberto, setAberto] = useState(abreNoDesktop)

  return (
    <div className="flex flex-col rounded-papel border border-linha bg-superficie">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((estava) => !estava)}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="font-mono text-rotulo text-texto-3 uppercase">
          {rotulo}
          {contagem !== undefined && contagem > 0 && ` · ${contagem}`}
        </span>
        <span className="text-miudo font-semibold text-acento">
          {aberto ? 'recolher' : 'abrir'}
        </span>
      </button>

      {aberto && <div className="border-t border-dashed border-linha p-3.5">{children}</div>}
    </div>
  )
}
