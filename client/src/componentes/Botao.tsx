import { useId, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { tocarClique } from '../sons'

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
  motivo?: string | undefined
  /**
   * O botão está desabilitado, mas representa uma opção já selecionada (ex.:
   * o único nível de dificuldade ativo, que não pode ser desmarcado) — não o
   * cinza genérico de "essa ação não pode ser feita agora", que faria a opção
   * parecer desmarcada.
   */
  selecaoTravada?: boolean
  /**
   * Não mostra `motivo` ao lado do botão — usado quando o chamador já exibe
   * a explicação uma única vez em outro lugar (ex.: vários botões do mesmo
   * grupo desabilitados pelo mesmo motivo). O texto continua acessível via
   * `aria-describedby` para leitor de tela.
   */
  motivoOculto?: boolean
  /** Ocupa a linha inteira — a forma das ações principais no mobile. */
  larguraTotal?: boolean
}

/** Altura mínima de toque: 44px, em todas as variantes. */
export function Botao({
  variante = 'primario',
  motivo,
  selecaoTravada = false,
  motivoOculto = false,
  larguraTotal = false,
  className = '',
  onClick,
  ...props
}: PropsDoBotao) {
  const idDoMotivo = useId()
  const desabilitado = motivo !== undefined

  /** `FBK-01`, `FBK-02` — som só no clique de um botão habilitado. */
  const aoClicar = (evento: MouseEvent<HTMLButtonElement>) => {
    if (!desabilitado) tocarClique()
    onClick?.(evento)
  }

  return (
    <span
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${larguraTotal ? 'w-full' : ''}`}
    >
      <button
        type="button"
        disabled={desabilitado}
        aria-describedby={desabilitado && motivo ? idDoMotivo : undefined}
        onClick={aoClicar}
        className={`min-h-11 rounded-controle border px-5 text-[15px] transition-[color,background-color,border-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${
          larguraTotal ? 'w-full' : ''
        } ${
          desabilitado
            ? selecaoTravada
              ? 'cursor-not-allowed border-acento bg-acento-suave font-semibold text-acento'
              : 'cursor-not-allowed border-linha bg-superficie-2 font-semibold text-texto-apagado'
            : `cursor-pointer motion-safe:active:scale-[0.97] ${VARIANTES[variante]}`
        } ${className}`}
        {...props}
      />
      {desabilitado && motivo && (
        <span
          id={idDoMotivo}
          className={motivoOculto ? 'sr-only' : 'max-w-[26ch] text-apoio text-texto-2'}
        >
          {motivo}
        </span>
      )}
    </span>
  )
}
