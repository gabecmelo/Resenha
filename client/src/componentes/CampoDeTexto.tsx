import { useId } from 'react'

export interface PropsDoCampo {
  rotulo: string
  valor: string
  aoMudar(valor: string): void
  placeholder?: string | undefined
  /** Texto de apoio abaixo do campo, quando não há erro. */
  dica?: string | undefined
  /** Limite de caracteres. Presente = mostra contador. */
  limite?: number | undefined
  /** Campo travado — usado quando o jogador já marcou PRONTO (`ESCR-05`). */
  travado?: boolean
  /** Erro vindo do servidor, que vence a contagem local. */
  erro?: string | undefined
  /** Código de sala: mono e espaçado, do jeito que se dita em voz alta. */
  mono?: boolean
  /** `SALA-02` — quem chega por link já cai com o cursor no apelido. */
  autoFoco?: boolean
  aoTeclarEnter?(): void
}

/**
 * Campo de uma linha com rótulo, contador e erro de limite.
 *
 * **O erro mora no campo**, nunca num alerta no topo da tela: o rótulo, o
 * contador e a borda mudam juntos para esmalte, e a mensagem entra logo abaixo
 * com o triângulo. Quem errou não precisa procurar onde.
 *
 * `AJU-26` — o campo para no limite, e texto colado acima dele é truncado. A
 * trava é conveniência, não regra: quem recusa de verdade continua sendo o
 * servidor. O contador segue à vista para a pessoa saber onde está.
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
  mono = false,
  autoFoco = false,
  aoTeclarEnter,
}: PropsDoCampo) {
  const id = useId()
  const excedente = limite === undefined ? 0 : Math.max(valor.length - limite, 0)
  const aviso =
    erro ??
    (excedente > 0
      ? `Passou ${excedente} caractere${excedente > 1 ? 's' : ''} do limite.`
      : undefined)
  const errado = aviso !== undefined

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={`text-[15px] font-semibold ${errado ? 'text-acento' : 'text-texto'}`}
        >
          {rotulo}
        </label>
        {limite !== undefined && (
          <span
            className={`flex-none font-mono text-[12px] tabular-nums ${
              errado ? 'text-acento' : 'text-texto-3'
            }`}
          >
            {valor.length}/{limite}
          </span>
        )}
      </div>

      <input
        id={id}
        type="text"
        value={valor}
        placeholder={placeholder}
        maxLength={limite}
        disabled={travado}
        autoFocus={autoFoco}
        aria-invalid={errado}
        aria-describedby={`${id}-apoio`}
        onChange={(evento) => aoMudar(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') aoTeclarEnter?.()
        }}
        className={`min-h-[52px] w-full rounded-chip border-2 bg-superficie px-3.5 text-texto caret-acento placeholder:text-texto-apagado focus:outline-none disabled:cursor-not-allowed disabled:border-dashed disabled:bg-superficie-2 disabled:text-texto-2 ${
          mono ? 'font-mono text-[20px] tracking-[0.28em] uppercase' : 'text-[17px]'
        } ${errado ? 'border-acento' : 'border-linha focus:border-controle-linha'}`}
      />

      <div id={`${id}-apoio`} className="flex gap-2">
        {errado && (
          <span aria-hidden="true" className="flex-none text-acento">
            ▲
          </span>
        )}
        <span className={`text-apoio leading-snug ${errado ? 'text-acento' : 'text-texto-3'}`}>
          {aviso ?? dica}
        </span>
      </div>
    </div>
  )
}
