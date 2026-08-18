import { type ReactNode, useState } from 'react'
import { linkDeConvite } from '../estado/entrada'
import { AlternadorDeTema } from './AlternadorDeTema'
import { LogoResenha } from './LogoResenha'
import { Modal } from './Modal'
import { SomToggle } from './SomToggle'

export interface PropsDoShell {
  /**
   * O que a marca diz agora. Fora de partida é "Resenha"; dentro dela vira o
   * nome do jogo, que é a informação útil naquele momento.
   */
  titulo?: string
  /** Código da sala. Ausente na tela de início, onde ainda não há sala. */
  codigo?: string
  /**
   * A faixa de fase: o que está acontecendo agora (vez de alguém, relógio,
   * votação aberta). Sempre a primeira coisa abaixo da moldura, sempre no
   * mesmo lugar — é onde a pessoa olha para se situar.
   */
  faixa?: ReactNode
  /** `CONN-06` — chamado só depois da confirmação. */
  aoSair?(): void
  children: ReactNode
}

/**
 * A moldura do site: uma linha só com marca, sala, som, tema e sair. Quase toda
 * a tela pertence ao jogo, então o cabeçalho não cresce nem ganha navegação —
 * 52px no celular, 56px no desktop, e nada além disso.
 *
 * `SALA-08` — o código fica sempre à vista e um toque nele copia o convite.
 */
export function Shell({ titulo = 'Resenha', codigo, faixa, aoSair, children }: PropsDoShell) {
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-fundo">
      <header className="sticky top-0 z-30 border-b border-linha bg-superficie">
        <div className="mx-auto flex h-13 w-full max-w-[1280px] items-center gap-1.5 pr-1.5 pl-3 sm:h-14 sm:gap-2 sm:pr-2 sm:pl-4">
          {/*
            Fora de uma sala a marca fala sozinha, em caixa baixa; dentro dela o
            disco acende e o nome do jogo assume — é o contexto que importa ali.
          */}
          <LogoResenha tamanho={22} />
          {codigo === undefined ? (
            <span className="flex-none font-display text-[17px] tracking-[-0.01em] text-texto">
              resenha
            </span>
          ) : (
            <span className="flex-none truncate text-apoio font-semibold text-texto">{titulo}</span>
          )}

          {codigo !== undefined && <CopiarConvite codigo={codigo} />}

          <span className="flex-1" />

          <SomToggle />
          <AlternadorDeTema />
          {aoSair !== undefined && (
            <button
              type="button"
              aria-label="Sair da sala"
              title="Sair da sala"
              onClick={() => setConfirmandoSaida(true)}
              className="flex h-11 w-9 flex-none cursor-pointer items-center justify-center rounded-chip text-texto-3 hover:text-texto"
            >
              <IconeSair />
            </button>
          )}
        </div>
      </header>

      {faixa !== undefined && (
        <div className="sticky top-13 z-20 border-b border-linha bg-superficie sm:top-14">
          <div className="mx-auto w-full max-w-[1280px] px-3 py-2.5 sm:px-4">{faixa}</div>
        </div>
      )}

      {/*
        O respiro de cima mora aqui, e não em cada tela: o cabeçalho e a faixa
        são grudentos (`sticky`), e sem esta folga o conteúdo nasce colado neles
        — o papel precisa de margem contra a borda da mesa.
      */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 pt-4 pb-6 sm:px-4 sm:pt-5">
        {children}
      </main>

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

/**
 * Porta com a seta saindo — o mesmo desenho que todo jogo usa para "sair".
 * Vale mais que um glifo bonito: é o ícone que a pessoa já sabe ler sem pensar.
 */
function IconeSair() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 20h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

/** `SALA-08` — o código em destaque e o link de convite a um toque. */
function CopiarConvite({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false)

  return (
    <button
      type="button"
      aria-label={`Copiar o link do convite da sala ${codigo}`}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(linkDeConvite(window.location.origin, codigo))
          .then(() => {
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
          })
          .catch(() => setCopiado(false))
      }}
      className={`flex h-11 min-w-0 flex-none cursor-pointer items-center gap-1.5 rounded-chip border border-dashed px-2.5 font-mono text-dado tracking-[0.1em] transition-colors ${
        copiado ? 'border-pronto text-pronto' : 'border-linha text-texto hover:border-controle-linha'
      }`}
    >
      <span className="truncate">{codigo}</span>
      <span aria-hidden="true" className="flex-none text-texto-3">
        {copiado ? '✓' : '⧉'}
      </span>
    </button>
  )
}

/**
 * A barra de ação fixa (`Kit de Partida` — moldura). No celular ela mora no
 * rodapé, sempre alcançável pelo polegar; do `lg` para cima ela dissolve no fim
 * da coluna, porque no desktop a ação já está à vista.
 *
 * Uma ação primária por vez — o resto é secundário ou pílula.
 */
export function BarraDeAcao({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-4 -mx-3 flex flex-col gap-2.5 border-t-2 border-controle-linha bg-superficie px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:-mx-4 sm:px-4 lg:static lg:mt-6 lg:mx-0 lg:rounded-papel lg:border lg:border-linha lg:p-4">
      {children}
    </div>
  )
}
