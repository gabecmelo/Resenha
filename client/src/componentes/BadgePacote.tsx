import type { PacoteResumo } from '../../../shared/protocolo'

export function BadgePacote({ pacote }: { pacote: PacoteResumo }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-pilula border border-linha-suave bg-superficie-2 px-3 py-1.5 shadow-sm">
      <span className="text-[14px] leading-none">{pacote.emoji}</span>
      <span className="font-mono text-[11px] font-medium tracking-[0.06em] text-texto-2 uppercase">
        Pacote: {pacote.nome}
      </span>
    </div>
  )
}
