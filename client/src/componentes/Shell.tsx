import { type ReactNode, useState } from 'react'
import { linkDeConvite } from '../estado/entrada'
import { AlternadorDeTema } from './AlternadorDeTema'
import { LogoResenha } from './LogoResenha'
import { Modal } from './Modal'
import { SomToggle } from './SomToggle'

export interface PropsDoShell {
  /** Código da sala. Ausente na tela de início, onde ainda não há sala. */
  codigo?: string
  /** Uma linha sobre o momento da sala: "5 pessoas · Quem Sou Eu?". */
  legenda?: string
  /** `CONN-06` — chamado só depois da confirmação. */
  aoSair?(): void
  children: ReactNode
}

/**
 * A moldura do site: uma linha só com marca, sala, tema e sair. Quase toda a
 * tela pertence ao jogo, então o cabeçalho não cresce nem ganha navegação.
 *
 * `SALA-08` — o código fica sempre à vista e um toque nele copia o convite.
 *
 * `AJU-27` — os dois lados seguem a mesma régua: cada elemento tem a mesma
 * altura de toque e as margens negativas das pontas devolvem o texto à margem
 * da página, para que a marca à esquerda e o "Sair" à direita fiquem alinhados
 * com o conteúdo abaixo em qualquer largura.
 */
export function Shell({ codigo, legenda, aoSair, children }: PropsDoShell) {
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-fundo">
      <header className="sticky top-0 z-30 border-b border-linha bg-fundo">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-2 px-4 sm:h-15 sm:gap-3">
          <span className="flex h-11 flex-none items-center gap-2 text-[15px] font-semibold tracking-tight text-texto">
            <LogoResenha tamanho={22} />
            Resenha
          </span>

          {legenda !== undefined && (
            <span className="hidden min-w-0 flex-1 items-center truncate text-miudo text-texto-3 sm:flex">
              {legenda}
            </span>
          )}

          <span className="-mr-2 flex min-w-0 flex-1 items-center justify-end gap-1 sm:flex-none sm:gap-2">
            {codigo !== undefined && <CopiarConvite codigo={codigo} />}
            <SomToggle />
            <AlternadorDeTema />
            {aoSair !== undefined && (
              <button
                type="button"
                onClick={() => setConfirmandoSaida(true)}
                className="flex h-11 flex-none cursor-pointer items-center rounded-controle px-2 text-apoio font-medium text-texto-2 hover:text-texto"
              >
                Sair
              </button>
            )}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-5 pb-16">{children}</main>

      {confirmandoSaida && aoSair !== undefined && (
        <Modal
          titulo="Sair da sala?"
          descricao="Sua vaga é liberada e a carta que escreveram para você é descartada. Para voltar, é preciso entrar de novo pelo código."
          rotuloConfirmar="Sair"
          rotuloCancelar="Ficar"
          destrutivo
          aoConfirmar={aoSair}
          aoCancelar={() => setConfirmandoSaida(false)}
        />
      )}
    </div>
  )
}

/** `SALA-08` — o código em destaque e o link de convite a um toque. */
function CopiarConvite({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(linkDeConvite(window.location.origin, codigo))
          .then(() => {
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
          })
          .catch(() => setCopiado(false))
      }}
      className="flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-controle px-2 hover:bg-superficie-2"
    >
      <span className="font-mono text-[15px] font-medium tracking-[0.08em] text-texto">
        {codigo}
      </span>
      <span className="shrink-0 text-miudo text-texto-3">{copiado ? 'copiado' : 'copiar'}</span>
    </button>
  )
}
