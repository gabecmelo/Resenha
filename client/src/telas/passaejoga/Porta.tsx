import { useState } from 'react'
import {
  CATALOGO_DE_JOGOS,
  jogosDoPassaEJoga,
  type JogoCatalogo,
} from '../../../../shared/jogos-catalogo'
import { Botao, SeletorDeJogos, Shell } from '../../componentes'

/**
 * A porta do Passa e Joga (`PJ-03`, `PJ-04`).
 *
 * A lista vem do catálogo, filtrada por `passaEJoga` — nenhum jogo é citado
 * por nome nesta tela. É o que faz um jogo novo entrar no modo com uma linha
 * de dado, sem que ninguém precise voltar aqui.
 *
 * O que **não** cabe aparece também, pontilhado: sumir em silêncio faria a
 * mesa procurar o jogo favorito por toda a tela antes de desistir. Pontilhado
 * porque não é coisa em que se toca — é ficha informativa.
 */
export function Porta({
  aoEscolher,
  aoVoltar,
}: {
  aoEscolher(jogoId: string): void
  aoVoltar(): void
}) {
  const disponiveis = jogosDoPassaEJoga()
  const [jogoId, setJogoId] = useState(() => disponiveis[0]?.id ?? '')

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex flex-col items-start gap-2">
          <span className="selo bg-acento text-acento-contraste">um celular só</span>
          <h1 className="font-display text-display text-balance text-texto">
            O que a mesa vai jogar?
          </h1>
          <p className="text-corpo text-texto-3">
            O aparelho passa de mão em mão. Ninguém entra em link, ninguém digita código.
          </p>
        </div>

        <SeletorDeJogos jogos={disponiveis} jogoIdSelecionado={jogoId} aoSelecionar={setJogoId} />

        <ForaDoModo />

        <Botao
          larguraTotal
          onClick={() => aoEscolher(jogoId)}
          motivo={jogoId === '' ? 'Nenhum jogo roda num aparelho só ainda.' : undefined}
        >
          Montar a mesa
        </Botao>

        <button
          type="button"
          onClick={aoVoltar}
          className="min-h-11 cursor-pointer self-start font-mono text-rotulo text-texto-3 uppercase underline underline-offset-4"
        >
          ← voltar pro início
        </button>
      </div>
    </Shell>
  )
}

/**
 * `PJ-03` — por que o resto do catálogo não está aqui.
 *
 * O motivo é um só e vale pra todos: mão privada o tempo inteiro. Não é uma
 * lista de desculpas por jogo — é a fronteira do modo, dita uma vez.
 */
function ForaDoModo() {
  const foraDoModo: JogoCatalogo[] = CATALOGO_DE_JOGOS.filter(
    (jogo) => jogo.passaEJoga !== true && jogo.emBreve !== true,
  )
  if (foraDoModo.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 rounded-botao border border-dashed border-linha px-3.5 py-3">
      <span className="font-mono text-rotulo text-texto-3 uppercase">fica de fora</span>
      <span className="text-[15px] font-semibold text-texto-2">
        {foraDoModo.map((jogo) => jogo.nome).join(', ')}
      </span>
      <p className="text-apoio leading-relaxed text-texto-3">
        {foraDoModo.length === 1 ? 'Esse pede' : 'Esses pedem'} um celular por pessoa: cada um
        segura as próprias cartas o tempo todo, e passar o aparelho a cada jogada mataria o jogo.
        {' '}
        {foraDoModo.length === 1 ? 'Ele continua' : 'Eles continuam'} na sala online, como sempre.
      </p>
    </div>
  )
}
