import { useId, type ButtonHTMLAttributes } from 'react'

const VARIANTES = {
  primario: 'bg-acento border-acento text-acento-contraste font-semibold hover:bg-acento-forte',
  secundario: 'bg-transparent border-controle-linha text-texto font-medium hover:bg-superficie-2',
  destrutivo: 'bg-transparent border-risco-linha text-risco font-medium hover:bg-risco-suave',
  destrutivoCheio: 'bg-risco border-risco text-risco-contraste font-semibold',
} as const

export interface PropsDoBotao extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variante?: keyof typeof VARIANTES
  /**
   * Por que o botão não pode ser usado agora. Presente = desabilitado, e o
   * motivo aparece ao lado. Não existe desabilitar sem dizer por quê
   * (`HOST-01`, `ESCR-06`): "Iniciar" apagado e mudo trava o grupo.
   */
  motivo?: string
  /** Ocupa a linha inteira — a forma das ações principais no mobile. */
  larguraTotal?: boolean
}

/** Altura mínima de toque: 44px, em todas as variantes. */
export function Botao({
  variante = 'primario',
  motivo,
  larguraTotal = false,
  className = '',
  ...props
}: PropsDoBotao) {
  const idDoMotivo = useId()
  const desabilitado = motivo !== undefined

  return (
    <span
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${larguraTotal ? 'w-full' : ''}`}
    >
      <button
        type="button"
        disabled={desabilitado}
        aria-describedby={desabilitado ? idDoMotivo : undefined}
        className={`min-h-11 rounded-controle border px-5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${
          larguraTotal ? 'w-full' : ''
        } ${
          desabilitado
            ? 'cursor-not-allowed border-linha bg-superficie-2 font-semibold text-texto-apagado'
            : `cursor-pointer ${VARIANTES[variante]}`
        } ${className}`}
        {...props}
      />
      {desabilitado && (
        <span id={idDoMotivo} className="max-w-[26ch] text-apoio text-texto-2">
          {motivo}
        </span>
      )}
    </span>
  )
}
