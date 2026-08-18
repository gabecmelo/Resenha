import { useEffect, useId } from 'react'
import { Botao } from './Botao'

export interface PropsDoModal {
  titulo: string
  /** Uma frase dizendo o que vai acontecer. Em ação destrutiva, diz o que não dá para desfazer. */
  descricao?: string
  rotuloConfirmar?: string
  rotuloCancelar?: string
  /** Expulsar, encerrar: borda vinho, selo "AÇÃO SEM VOLTA" e o nome de quem é afetado no título. */
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
 * É um papel levantado da mesa: borda de tinta grossa e sombra dura deslocada,
 * nunca um halo difuso. **A saída segura é sempre o botão de baixo** — o dedo
 * que erra no rodapé cancela, não confirma.
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={aoCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idDoTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className={`flex max-h-full w-full flex-col gap-4 overflow-y-auto rounded-papel border-2 bg-flutuante p-5 shadow-flutuante ${
          destrutivo ? 'border-risco' : 'border-controle-linha'
        } ${largura === 'larga' ? 'max-w-[720px] lg:max-w-[1120px]' : 'max-w-[420px]'}`}
      >
        <div className="flex flex-col items-start gap-2">
          {destrutivo && (
            <span className="selo bg-risco text-risco-contraste">ação sem volta</span>
          )}
          <h2 id={idDoTitulo} className="font-display text-secao text-balance text-texto">
            {titulo}
          </h2>
          {descricao && <p className="text-corpo text-texto-2">{descricao}</p>}
        </div>

        {children}

        {/*
          A ordem é deliberada: confirmar em cima, cancelar embaixo. No celular
          o polegar cai no rodapé, e o que ele encontra ali precisa ser a saída
          que não custa nada.
        */}
        <div className="flex flex-col gap-2.5">
          {rotuloConfirmar && aoConfirmar && (
            <Botao
              larguraTotal
              variante={destrutivo ? 'destrutivo' : 'primario'}
              onClick={aoConfirmar}
            >
              {rotuloConfirmar}
            </Botao>
          )}
          <Botao larguraTotal variante="secundario" onClick={aoCancelar}>
            {rotuloCancelar}
          </Botao>
        </div>
      </div>
    </div>
  )
}
