import { useEffect, useRef, useState } from 'react'
import type { MensagemChat } from '../../../shared/protocolo'
import { estaNoFim } from '../estado/rolagem'
import { corDoJogador } from './cores'
import { tocarChatMensagem } from '../sons'

/** `CHAT-01`, `AJU-26` — o campo para no limite; o servidor continua validando. */
const LIMITE_DA_MENSAGEM = 300

export interface PropsDoChat {
  /** `CHAT-04` — o histórico como veio na projeção, do mais antigo ao mais novo. */
  mensagens: MensagemChat[]
  /** Ausente deixa o chat só de leitura. */
  aoEnviar?(texto: string): void
}

/**
 * Histórico do chat da sala, com o campo de escrever quando há para onde enviar.
 *
 * O chat é apoio, não canal principal — a conversa acontece por voz (AD-003).
 * Mensagem de sistema é aviso do jogo: mono, centralizada entre duas linhas, sem
 * cor de autor, para não se confundir com gente falando.
 *
 * `AJU-16` — o apelido e a cor vêm gravados na própria mensagem, não da lista de
 * jogadores: quem escreveu continua nomeado depois de sair da sala.
 * `AJU-29` — o histórico tem altura própria e rola por dentro; a página não
 * estica quando a conversa cresce. Quem manda no tamanho é quem está lendo: a
 * caixa tem a mesma alça de arrastar do bloco de notas.
 */
export function Chat({ mensagens, aoEnviar }: PropsDoChat) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      {mensagens.length === 0 ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-1 p-3 text-center">
          <span className="text-[15px] font-medium text-texto-2">Ninguém falou nada aqui</span>
          <span className="text-miudo text-texto-3">
            A resenha é em voz alta. Isto aqui é só apoio.
          </span>
        </div>
      ) : (
        <Historico mensagens={mensagens} />
      )}

      {aoEnviar !== undefined && <Escrever aoEnviar={aoEnviar} />}
    </div>
  )
}

/**
 * Até onde a conversa cresce sozinha antes de a caixa travar de altura. Depois
 * disso quem decide é a alça de arrastar.
 */
const TETO_NATURAL = 0.45

/** `AJU-29`, `AJU-30` — altura limitada, rolagem própria, sem arrastar quem leu. */
function Historico({ mensagens }: { mensagens: MensagemChat[] }) {
  const caixa = useRef<HTMLDivElement>(null)
  // Guardado em ref, e não em estado: o que interessa é onde a rolagem estava
  // **antes** de a mensagem nova entrar, e re-renderizar por isso seria à toa.
  const grudadoNoFim = useRef(true)
  const ultimaQtd = useRef(mensagens.length)

  useEffect(() => {
    if (mensagens.length > ultimaQtd.current) {
      tocarChatMensagem()
    }
    ultimaQtd.current = mensagens.length

    const alvo = caixa.current
    if (alvo === null) return

    /*
     * A altura é escrita direto no elemento, de propósito: depois que a caixa
     * trava (ou que a pessoa arrasta a alça), quem manda nela é o DOM, e o
     * React não pode reescrever isso a cada mensagem nova. Enquanto a conversa
     * é curta não há altura nenhuma — a caixa cresce com o conteúdo.
     */
    if (alvo.style.height === '') {
      const teto = window.innerHeight * TETO_NATURAL
      if (alvo.scrollHeight > teto) alvo.style.height = `${Math.round(teto)}px`
    }

    if (!grudadoNoFim.current) return
    alvo.scrollTop = alvo.scrollHeight
  }, [mensagens.length])

  return (
    <div
      ref={caixa}
      onScroll={(evento) => {
        grudadoNoFim.current = estaNoFim(evento.currentTarget)
      }}
      className="max-h-[80vh] min-h-24 resize-y overflow-y-auto overscroll-contain"
    >
      <ol className="flex flex-col gap-3.5">
        {mensagens.map((mensagem, indice) => {
          if (mensagem.tipo === 'sistema') {
            return (
              <li key={indice} className="flex items-center gap-2.5">
                <span className="flex-1 border-t border-dashed border-linha" />
                <span className="text-center font-mono text-compacto-apoio tracking-[0.1em] text-texto-3 uppercase">
                  {mensagem.texto}
                </span>
                <span className="flex-1 border-t border-dashed border-linha" />
              </li>
            )
          }

          return (
            <li key={indice} className="flex min-w-0 flex-col gap-0.5">
              {/* O apelido vem escrito, não só colorido: a cor é atalho, não a informação. */}
              <span
                className="text-miudo font-semibold"
                style={{ color: corDoJogador(mensagem.cor) }}
              >
                {mensagem.apelido}
              </span>
              <span className="text-[15px] leading-relaxed break-words text-texto">
                {mensagem.texto}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Escrever({ aoEnviar }: { aoEnviar(texto: string): void }) {
  const [texto, setTexto] = useState('')

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (texto.trim() === '') return
        aoEnviar(texto)
        setTexto('')
      }}
    >
      <input
        type="text"
        value={texto}
        maxLength={LIMITE_DA_MENSAGEM}
        placeholder="Escrever no chat…"
        aria-label="Escrever no chat"
        onChange={(evento) => setTexto(evento.target.value)}
        className="min-h-11 w-full min-w-0 rounded-chip border border-linha bg-superficie px-3.5 text-[15px] text-texto caret-acento placeholder:text-texto-apagado focus:border-controle-linha focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Enviar mensagem"
        className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-chip bg-acento text-[18px] text-acento-contraste shadow-chip transition-transform motion-safe:active:translate-x-[2px] motion-safe:active:translate-y-[2px] motion-safe:active:shadow-none"
      >
        ↑
      </button>
    </form>
  )
}

