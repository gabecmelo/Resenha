export type TipoDeBanner = 'reconectando' | 'desconectado' | 'expirada'

export interface PropsDoBanner {
  tipo: TipoDeBanner
  /** Ação de saída do estado: "Tentar de novo" ou "Criar outra". */
  aoAgir?(): void
}

const TEXTOS: Record<TipoDeBanner, { frase: string; acao?: string }> = {
  // `CONN-03` — a vaga está guardada; comunicar sem alarmar.
  reconectando: { frase: 'Reconectando… sua carta continua guardada.' },
  desconectado: { frase: 'Sem conexão. O jogo segue sem você.', acao: 'Tentar de novo' },
  // `CONN-07`, `CONN-08`
  expirada: { frase: 'Esta sala expirou.', acao: 'Criar outra' },
}

/**
 * Faixa acima do jogo dizendo, numa frase, o que está acontecendo com a conexão.
 * Ocupa a largura toda e nunca empurra o jogo para fora da tela.
 */
export function BannerDeConexao({ tipo, aoAgir }: PropsDoBanner) {
  const { frase, acao } = TEXTOS[tipo]
  const risco = tipo !== 'reconectando'

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-2.5 rounded-painel border px-3.5 py-3 ${
        risco ? 'border-risco-linha bg-risco-suave' : 'border-linha bg-superficie-2'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-none rounded-pilula ${risco ? 'bg-risco' : 'bg-texto-3 animacao-pulso'}`}
      />
      <span className="min-w-[160px] flex-1 text-apoio text-texto">{frase}</span>
      {acao !== undefined && aoAgir !== undefined && (
        <button
          type="button"
          onClick={aoAgir}
          className="min-h-11 cursor-pointer text-apoio font-semibold text-risco"
        >
          {acao}
        </button>
      )}
    </div>
  )
}
