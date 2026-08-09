import { useEffect, useId } from 'react'
import { Botao } from './Botao'

export interface PropsDoModal {
  titulo: string
  /** Uma frase dizendo o que vai acontecer. Em ação destrutiva, diz o que não dá para desfazer. */
  descricao?: string
  rotuloConfirmar?: string
  rotuloCancelar?: string
  /** Expulsar, encerrar: confirmação em vermelho, e o nome de quem é afetado no título. */
  destrutivo?: boolean
  /** `'larga'` acomoda grids de pacote; todo o resto do produto usa o padrão de 420px. */
  largura?: 'padrao' | 'larga'
  children?: React.ReactNode
  aoConfirmar?(): void
  aoCancelar(): void
}

/**
 * Confirmação para ação que muda a vida dos outros.
 *
 * É o único elemento com sombra — sombra existe só para o que flutua.
 */
export function Modal({
  titulo,
  descricao,
  rotuloConfirmar,
  rotuloCancelar = 'Cancelar',
  destrutivo = false,
  largura = 'padrao',
  children,
  aoConfirmar,
  aoCancelar,
}: PropsDoModal) {
  const idDoTitulo = useId()

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoCancelar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoCancelar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={aoCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idDoTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className={`flex w-full ${largura === 'larga' ? 'max-w-[720px] lg:max-w-[1120px]' : 'max-w-[420px]'} max-h-full overflow-y-auto flex-col gap-4 rounded-bloco bg-flutuante p-5 shadow-flutuante`}
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={idDoTitulo} className="text-[20px] font-semibold tracking-tight text-texto">
            {titulo}
          </h2>
          {descricao && <p className="text-[15px] leading-relaxed text-texto-2">{descricao}</p>}
        </div>
        
        {children}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Botao variante="secundario" onClick={aoCancelar}>
            {rotuloCancelar}
          </Botao>
          {rotuloConfirmar && aoConfirmar && (
            <Botao variante={destrutivo ? 'destrutivoCheio' : 'primario'} onClick={aoConfirmar}>
              {rotuloConfirmar}
            </Botao>
          )}
        </div>
      </div>
    </div>
  )
}
