import type { PacoteResumo } from '../../../shared/protocolo'

/**
 * A tira de pacotes (`Kit de Partida` — moldura): os temas ativos da partida,
 * só leitura. Ninguém troca pacote no meio do jogo, então isto não é controle —
 * é etiqueta.
 */
export function BadgePacote({ pacote }: { pacote: PacoteResumo }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip border border-dashed border-linha px-2.5 py-1.5">
      <span aria-hidden="true" className="text-[13px] leading-none">
        {pacote.emoji}
      </span>
      <span className="font-mono text-compacto-apoio tracking-[0.1em] text-texto-3 uppercase">
        {pacote.nome}
      </span>
    </span>
  )
}
