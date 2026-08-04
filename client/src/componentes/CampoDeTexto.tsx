import { useId } from 'react'

export interface PropsDoCampo {
  rotulo: string
  valor: string
  aoMudar(valor: string): void
  placeholder?: string
  /** Texto de apoio abaixo do campo, quando não há erro. */
  dica?: string
  /** Limite de caracteres. Presente = mostra contador. */
  limite?: number
  /** Campo travado — usado quando o jogador já marcou PRONTO (`ESCR-05`). */
  travado?: boolean
  /** Erro vindo do servidor, que vence a contagem local. */
  erro?: string
  aoTeclarEnter?(): void
}

/**
 * Campo de uma linha com rótulo, contador e erro de limite.
 *
 * O contador é aviso, não trava: o campo aceita passar do limite e diz quanto
 * passou. Quem recusa de verdade é o servidor — o cliente não guarda regra.
 */
export function CampoDeTexto({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  dica,
  limite,
  travado = false,
  erro,
  aoTeclarEnter,
}: PropsDoCampo) {
  const id = useId()
  const excedente = limite === undefined ? 0 : Math.max(valor.length - limite, 0)
  const aviso =
    erro ?? (excedente > 0 ? `Passou ${excedente} caractere${excedente > 1 ? 's' : ''} do limite.` : undefined)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-apoio font-medium text-texto">
        {rotulo}
      </label>
      <input
        id={id}
        type="text"
        value={valor}
        placeholder={placeholder}
        disabled={travado}
        aria-invalid={aviso !== undefined}
        aria-describedby={`${id}-apoio`}
        onChange={(evento) => aoMudar(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') aoTeclarEnter?.()
        }}
        className={`min-h-12 w-full rounded-controle border bg-superficie px-3.5 text-corpo text-texto placeholder:text-texto-apagado disabled:cursor-not-allowed disabled:bg-superficie-2 disabled:text-texto-2 ${
          aviso === undefined ? 'border-controle-linha focus:border-acento' : 'border-risco'
        } focus:outline-none`}
      />
      <div id={`${id}-apoio`} className="flex justify-between gap-3">
        <span className={`text-[12px] ${aviso === undefined ? 'text-texto-3' : 'text-risco'}`}>
          {aviso ?? dica}
        </span>
        {limite !== undefined && (
          <span
            className={`shrink-0 font-mono text-[12px] ${
              excedente > 0 ? 'font-medium text-risco' : 'text-texto-3'
            }`}
          >
            {valor.length}/{limite}
          </span>
        )}
      </div>
    </div>
  )
}
