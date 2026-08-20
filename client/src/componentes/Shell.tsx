import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { linkDeConvite } from '../estado/entrada'
import { AlternadorDeTema } from './AlternadorDeTema'
import { LogoResenha } from './LogoResenha'
import { Modal } from './Modal'
import { ModalDeApoio } from './ModalDeApoio'
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
  const [pedindoApoio, setPedindoApoio] = useState(false)

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
            // O nome do jogo é o único elástico da linha: com a moldura, o código,
            // o apoiar, o som, o tema e o sair, um celular estreito não fecha a
            // conta se todo mundo for rígido. O código nunca encolhe (`SALA-08`),
            // então quem cede é o título.
            <span className="min-w-0 shrink truncate text-apoio font-semibold text-texto">
              {titulo}
            </span>
          )}

          {codigo !== undefined && <CopiarConvite codigo={codigo} />}

          <span className="flex-1" />

          <BotaoDeApoio aoAbrir={() => setPedindoApoio(true)} />
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
      {/*
        O respiro de baixo é pra tela que termina em texto. Quando a tela
        termina em barra de ação, ele vira 24px de vazio rolável embaixo dela:
        a pessoa já vê tudo e a página ainda desce. A barra traz o próprio
        respiro (e o `safe-area` do celular), então aqui o do `main` sai.
      */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 pt-4 pb-6 has-[[data-barra-de-acao]]:pb-0 sm:px-4 sm:pt-5">
        {children}
      </main>

      {pedindoApoio && <ModalDeApoio aoFechar={() => setPedindoApoio(false)} />}

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
 * O caminho para apoiar, sempre disponível e nunca no caminho.
 *
 * Fica no cabeçalho porque precisa existir em toda tela — inclusive na de
 * início, para quem quiser voltar e ajudar depois. É ícone puro no celular,
 * onde o código da sala e o sair já disputam a linha, e ganha a palavra do
 * `sm:` pra cima, onde sobra espaço: um ícone de coração sozinho não diz o que
 * faz, e o cabeçalho é o único lugar do produto sem legenda embaixo.
 */
function BotaoDeApoio({ aoAbrir }: { aoAbrir(): void }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      title="Ajude a manter o Resenha no ar"
      className="flex h-11 w-9 flex-none cursor-pointer items-center justify-center gap-1.5 rounded-chip text-texto-3 hover:text-acento sm:w-auto sm:px-2.5"
    >
      <IconeApoio />
      <span className="hidden font-mono text-rotulo uppercase sm:inline">apoiar</span>
    </button>
  )
}

/** Coração de contorno: o gesto certo sem a promessa de recompensa de um cifrão. */
function IconeApoio() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5 4.3 13a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9A4.8 4.8 0 0 1 19.7 13z" />
    </svg>
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
 * A barra de ação (`Kit de Partida` — moldura). Uma ação primária por vez; o
 * resto é secundário ou pílula.
 *
 * **No celular ela é `fixed`.** Era `sticky bottom-0`, e `sticky` só cola
 * quando o elemento sairia da tela — numa tela curta, com a partida ainda
 * vazia, a barra parava no meio do vidro com preto embaixo. Pior: o elemento
 * que gruda depende do pai, e o pai muda de tela pra tela (às vezes é o
 * `main`, às vezes uma coluna do grid), então não havia um ajuste só que
 * servisse pra todas. `fixed` não pergunta nada a ninguém: encosta no rodapé
 * sempre, em qualquer tela.
 *
 * O preço de `fixed` é sair do fluxo e passar por cima do conteúdo. Por isso o
 * espaçador: ele mede a barra e reserva a mesma altura, pra que a última linha
 * da página continue alcançável na rolagem.
 *
 * **No desktop segue `sticky`**, que ali sempre funcionou: a coluna é alta, a
 * barra é um cartão no fim dela e só gruda quando a janela é baixa demais.
 */
export function BarraDeAcao({ children }: { children: ReactNode }) {
  const barra = useRef<HTMLDivElement>(null)
  const [altura, setAltura] = useState(0)

  const medir = useCallback(() => {
    const alvo = barra.current
    if (alvo === null) return
    // Só re-renderiza quando o número muda de verdade, senão isto seria um
    // laço: medir → estado → render → medir.
    setAltura((antes) => (antes === alvo.offsetHeight ? antes : alvo.offsetHeight))
  }, [])

  /*
    Depois de cada render, e antes da pintura: o conteúdo da barra muda (um
    botão, dois, um aviso que entra) e a altura reservada tem que acompanhar no
    mesmo quadro, senão a página pula.

    Medição direta, e não `ResizeObserver`: o observador não roda em aba que o
    navegador não está compondo, e a altura ficaria travada em zero justo no
    caso em que a barra tapa o fim da página.
  */
  useLayoutEffect(medir)

  // Girar o celular ou redimensionar a janela reflui a barra sem passar pelo
  // React — aí não há render pra disparar a medição acima.
  useEffect(() => {
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [medir])

  return (
    <>
      <div aria-hidden="true" style={{ height: altura }} className="mt-3 lg:hidden" />
      <div
        ref={barra}
        data-barra-de-acao=""
        className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 border-t-2 border-controle-linha bg-superficie px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4 lg:sticky lg:inset-x-auto lg:mt-6 lg:rounded-papel lg:border lg:border-linha lg:p-4"
      >
        {children}
      </div>
    </>
  )
}
