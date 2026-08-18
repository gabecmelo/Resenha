import { useId, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { tocarClique } from '../sons'

/**
 * As variantes da direção Bancada. O primário é esmalte com sombra dura e
 * afunda contra a mesa quando apertado; o secundário é contornado em tinta,
 * como um carimbo; o terciário é pontilhado, para o que é opcional.
 */
const VARIANTES = {
  primario: 'border-0 bg-acento text-acento-contraste font-display shadow-botao',
  secundario: 'border border-controle-linha bg-transparent text-texto font-semibold',
  terciario: 'border border-dashed border-linha bg-transparent text-texto-3 font-semibold',
  destrutivo: 'border-0 bg-risco text-risco-contraste font-display shadow-botao',
} as const

/** Só o que tem sombra pode afundar: o objeto encosta na mesa e a sombra some. */
const AFUNDA = 'motion-safe:active:translate-x-[3px] motion-safe:active:translate-y-[3px] motion-safe:active:shadow-none'

export interface PropsDoBotao extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variante?: keyof typeof VARIANTES
  /**
   * Por que o botão não pode ser usado agora. Presente = desabilitado, e o
   * motivo aparece **abaixo** dele, em texto visível — nunca em tooltip. Não
   * existe desabilitar sem dizer por quê (`HOST-01`, `ESCR-06`): "Iniciar"
   * apagado e mudo trava o grupo.
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
   * Não mostra `motivo` abaixo do botão — usado quando o chamador já exibe a
   * explicação uma única vez em outro lugar (ex.: vários botões do mesmo grupo
   * desabilitados pelo mesmo motivo). O texto continua acessível via
   * `aria-describedby` para leitor de tela.
   */
  motivoOculto?: boolean
  /** Ocupa a linha inteira — a forma das ações principais no mobile. */
  larguraTotal?: boolean
  /** A ação está em curso: o botão escurece e ganha o disco girando. */
  carregando?: boolean
}

/**
 * Alvo de toque mínimo de 44px, sem exceção. A ação primária de uma tela é a
 * mais alta (60px na barra fixa), porque é ela que o dedo procura sem olhar.
 */
export function Botao({
  variante = 'primario',
  motivo,
  selecaoTravada = false,
  motivoOculto = false,
  larguraTotal = false,
  carregando = false,
  className = '',
  onClick,
  children,
  ...props
}: PropsDoBotao) {
  const idDoMotivo = useId()
  const desabilitado = motivo !== undefined || carregando
  const temSombra = variante === 'primario' || variante === 'destrutivo'

  const altura = temSombra
    ? larguraTotal
      ? 'min-h-[60px] text-[21px]'
      : 'min-h-12 text-[17px]'
    : larguraTotal
      ? 'min-h-[52px] text-[16px]'
      : 'min-h-11 text-[15px]'

  /** `FBK-01`, `FBK-02` — som só no clique de um botão habilitado. */
  const aoClicar = (evento: MouseEvent<HTMLButtonElement>) => {
    if (!desabilitado) tocarClique()
    onClick?.(evento)
  }

  return (
    <span className={`flex flex-col gap-2 ${larguraTotal ? 'w-full' : ''}`}>
      <button
        type="button"
        disabled={desabilitado}
        aria-describedby={motivo !== undefined ? idDoMotivo : undefined}
        onClick={aoClicar}
        className={`rounded-botao px-5 transition-[color,background-color,border-color,transform,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${altura} ${
          larguraTotal ? 'w-full' : ''
        } ${
          desabilitado
            ? selecaoTravada
              ? 'cursor-not-allowed border-2 border-acento bg-acento-suave font-semibold text-acento'
              : 'cursor-not-allowed border-0 bg-acento/20 font-display text-texto/45'
            : `cursor-pointer ${VARIANTES[variante]} ${temSombra ? AFUNDA : 'hover:bg-superficie-2'}`
        } ${className}`}
        {...props}
      >
        {carregando ? (
          <span className="flex items-center justify-center gap-2.5">
            <span
              aria-hidden="true"
              className="animacao-girando h-4 w-4 rounded-pilula border-[3px] border-current/35 border-t-current"
            />
            {children}
          </span>
        ) : (
          children
        )}
      </button>

      {motivo !== undefined && (
        <span
          id={idDoMotivo}
          className={
            motivoOculto
              ? 'sr-only'
              : 'flex gap-2 text-apoio leading-snug text-texto-2'
          }
        >
          {!motivoOculto && (
            <span aria-hidden="true" className="text-acento">
              ·
            </span>
          )}
          <span>{motivo}</span>
        </span>
      )}
    </span>
  )
}
