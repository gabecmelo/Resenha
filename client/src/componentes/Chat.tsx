import { useEffect, useRef, useState } from 'react'
import type { MensagemChat } from '../../../shared/protocolo'
import { estaNoFim } from '../estado/rolagem'
import { corDoJogador } from './cores'

/** `CHAT-01`, `AJU-26` â€” o campo para no limite; o servidor continua validando. */
const LIMITE_DA_MENSAGEM = 300

export interface PropsDoChat {
  /** `CHAT-04` â€” o histÃ³rico como veio na projeÃ§Ã£o, do mais antigo ao mais novo. */
  mensagens: MensagemChat[]
  /** Ausente deixa o chat sÃ³ de leitura. */
  aoEnviar?(texto: string): void
}

/**
 * HistÃ³rico do chat da sala, com o campo de escrever quando hÃ¡ para onde enviar.
 *
 * O chat Ã© apoio, nÃ£o canal principal â€” a conversa acontece por voz (AD-003).
 * Mensagem de sistema Ã© aviso do jogo: mono, centralizada entre duas linhas, sem
 * cor de autor, para nÃ£o se confundir com gente falando.
 *
 * `AJU-16` â€” o apelido e a cor vÃªm gravados na prÃ³pria mensagem, nÃ£o da lista de
 * jogadores: quem escreveu continua nomeado depois de sair da sala.
 * `AJU-29` â€” o histÃ³rico tem altura prÃ³pria e rola por dentro; a pÃ¡gina nÃ£o
 * estica quando a conversa cresce.
 */
export function Chat({ mensagens, aoEnviar }: PropsDoChat) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      {mensagens.length === 0 ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-1 p-3 text-center">
          <span className="text-[15px] font-medium text-texto-2">NinguÃ©m escreveu nada</span>
          <span className="text-miudo text-texto-3">
            O jogo Ã© falado. Use o chat sÃ³ se precisar.
          </span>
        </div>
      ) : (
        <Historico mensagens={mensagens} />
      )}

      {aoEnviar !== undefined && <Escrever aoEnviar={aoEnviar} />}
    </div>
  )
}

/** `AJU-29`, `AJU-30` â€” altura limitada, rolagem prÃ³pria, sem arrastar quem leu. */
function Historico({ mensagens }: { mensagens: MensagemChat[] }) {
  const caixa = useRef<HTMLDivElement>(null)
  // Guardado em ref, e nÃ£o em estado: o que interessa Ã© onde a rolagem estava
  // **antes** de a mensagem nova entrar, e re-renderizar por isso seria Ã  toa.
  const grudadoNoFim = useRef(true)

  useEffect(() => {
    const alvo = caixa.current
    if (alvo === null || !grudadoNoFim.current) return
    alvo.scrollTop = alvo.scrollHeight
  }, [mensagens.length])

  return (
    <div
      ref={caixa}
      onScroll={(evento) => {
        grudadoNoFim.current = estaNoFim(evento.currentTarget)
      }}
      className="max-h-[45vh] min-h-0 overflow-y-auto overscroll-contain"
    >
      <ol className="flex flex-col gap-3.5">
        {mensagens.map((mensagem, indice) => {
          if (mensagem.tipo === 'sistema') {
            return (
              <li key={indice} className="flex items-center gap-2.5">
                <span className="h-px flex-1 bg-linha-suave" />
                <span className="text-center font-mono text-[11px] tracking-[0.08em] text-texto-3 uppercase">
                  {mensagem.texto}
                </span>
                <span className="h-px flex-1 bg-linha-suave" />
              </li>
            )
          }

          return (
            <li key={indice} className="flex min-w-0 flex-col gap-0.5">
              {/* O apelido vem escrito, nÃ£o sÃ³ colorido: a cor Ã© atalho, nÃ£o a informaÃ§Ã£o. */}
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
        placeholder="Escrever no chatâ€¦"
        aria-label="Escrever no chat"
        onChange={(evento) => setTexto(evento.target.value)}
        className="min-h-11 w-full min-w-0 rounded-controle border border-controle-linha bg-superficie px-3.5 text-[15px] text-texto placeholder:text-texto-apagado focus:border-acento focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Enviar mensagem"
        className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-controle bg-acento text-[18px] text-acento-contraste"
      >
        â†‘
      </button>
    </form>
  )
}

