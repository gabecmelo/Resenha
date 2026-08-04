import { useState } from 'react'
import type { Cor, JogadorId, MensagemChat } from '../../../shared/protocolo'
import { corDoJogador } from './cores'

/** `CHAT-01` — acima disso o servidor recusa; o campo para antes de chegar lá. */
const LIMITE_DA_MENSAGEM = 300

export interface PropsDoChat {
  /** `CHAT-04` — o histórico como veio na projeção, do mais antigo ao mais novo. */
  mensagens: MensagemChat[]
  /** Para resolver autor → apelido e cor. */
  jogadores: Array<{ id: JogadorId; apelido: string; cor: Cor }>
  /** Ausente deixa o chat só de leitura. */
  aoEnviar?(texto: string): void
}

/**
 * Histórico do chat da sala, com o campo de escrever quando há para onde enviar.
 *
 * O chat é apoio, não canal principal — a conversa acontece por voz (AD-003).
 * Mensagem de sistema é aviso do jogo: mono, centralizada entre duas linhas, sem
 * cor de autor, para não se confundir com gente falando.
 */
export function Chat({ mensagens, jogadores, aoEnviar }: PropsDoChat) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      {mensagens.length === 0 ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-1 p-3 text-center">
          <span className="text-[15px] font-medium text-texto-2">Ninguém escreveu nada</span>
          <span className="text-miudo text-texto-3">
            O jogo é falado. Use o chat só se precisar.
          </span>
        </div>
      ) : (
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

            const autor = jogadores.find((jogador) => jogador.id === mensagem.autorId)
            return (
              <li key={indice} className="flex min-w-0 flex-col gap-0.5">
                {/* O apelido vem escrito, não só colorido: a cor é atalho, não a informação. */}
                <span
                  className="text-miudo font-semibold"
                  style={autor === undefined ? undefined : { color: corDoJogador(autor.cor) }}
                >
                  {autor?.apelido ?? 'quem saiu'}
                </span>
                <span className="text-[15px] leading-relaxed break-words text-texto">
                  {mensagem.texto}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {aoEnviar !== undefined && <Escrever aoEnviar={aoEnviar} />}
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
        className="min-h-11 w-full min-w-0 rounded-controle border border-controle-linha bg-superficie px-3.5 text-[15px] text-texto placeholder:text-texto-apagado focus:border-acento focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Enviar mensagem"
        className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-controle bg-acento text-[18px] text-acento-contraste"
      >
        ↑
      </button>
    </form>
  )
}
