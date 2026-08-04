import { useState } from 'react'

/** `NOTA-01` — acima disso o servidor recusa; o campo para antes de chegar lá. */
const LIMITE_DE_NOTAS = 2000

export interface PropsDoBloco {
  texto: string
  aoMudar(texto: string): void
}

/**
 * Bloco de anotações do jogador (`NOTA-01`, `NOTA-02`).
 *
 * Só o dono vê — a projeção nunca traz as notas de outra pessoa. Começa
 * recolhido para não disputar espaço com a mesa em 360px.
 */
export function BlocoDeNotas({ texto, aoMudar }: PropsDoBloco) {
  const [aberto, setAberto] = useState(false)
  const linhas = texto === '' ? 0 : texto.split('\n').length

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-painel bg-superficie-2 px-3.5 py-3 text-left"
      >
        <span className="font-mono text-[11px] tracking-[0.1em] text-texto-3 uppercase">
          suas anotações{linhas > 0 && ` · ${linhas} linha${linhas > 1 ? 's' : ''}`}
        </span>
        <span className="text-miudo font-medium text-acento">abrir</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-painel bg-superficie-2 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.1em] text-texto-3 uppercase">
          suas anotações
        </span>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="min-h-11 cursor-pointer text-miudo font-medium text-acento"
        >
          recolher
        </button>
      </div>
      <textarea
        value={texto}
        rows={4}
        maxLength={LIMITE_DE_NOTAS}
        aria-label="Suas anotações"
        placeholder={'Anote o que já descobriu: “não é ator”, “está vivo”…'}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-texto placeholder:text-texto-apagado focus:outline-none"
      />
      <span className="text-[12px] text-texto-3">só você vê · salvo</span>
    </div>
  )
}
