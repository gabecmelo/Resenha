import { useEffect } from 'react'
import type { Projecao } from '../../../../shared/protocolo'
import { nomeDoJogo } from '../../../../shared/jogos-catalogo'
import { BarraDeAcao, Botao, MarcadorDeJogador, Shell } from '../../componentes'
import { tocarSuaVez } from '../../sons'

/**
 * O começo do Espião num aparelho só (`PJ-25`, `PJ-26`).
 *
 * São duas telas, e não uma `EspiaoAguardando` com dois modos. Na sala, aquela
 * tela é uma espera: cada um marca pronto no próprio celular e olha os outros
 * marcarem. Aqui não há espera nenhuma — há uma **volta**, em que o aparelho
 * anda de vizinho pra vizinho e cada um lê o papel dele. O que as duas telas
 * têm em comum é o nome do jogo; o resto é outro desenho, e fingir que é a
 * mesma tela custaria um condicional em cada bloco.
 */

/**
 * O papel de quem está com o aparelho, revelado (`PJ-25`).
 *
 * Ele chega da mesma `projetar` do servidor (`AD-008`): o local do vizinho
 * nunca existiu nesta tela, em vez de existir e ficar escondido. Quem passa
 * adiante é a barra da passagem, e ela é a mesma dos quatro jogos.
 */
export function EspiaoPapel({ projecao, aoSair }: { projecao: Projecao; aoSair(): void }) {
  const espiao = projecao.jogo?.espiao
  const eu = projecao.jogadores.find((jogador) => jogador.id === projecao.eu.id)

  // O papel abrindo é o instante do jogo. Vale som, e é o mesmo da sala.
  useEffect(() => {
    tocarSuaVez()
  }, [])

  if (espiao === undefined) return null

  return (
    <Shell titulo={nomeDoJogo(projecao.sala.jogoId)} aoSair={aoSair}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex items-center gap-2.5">
          {eu !== undefined && (
            <MarcadorDeJogador apelido={eu.apelido} cor={eu.cor} tamanho="grande" />
          )}
          <span className="font-mono text-rotulo text-texto-3 uppercase">
            o papel de {eu?.apelido ?? 'quem está com o aparelho'}
          </span>
        </div>

        {espiao.souEspiao ? (
          <section className="flex flex-col gap-2 rounded-papel border-2 border-risco bg-superficie p-5 shadow-[var(--sombra-botao)]">
            <span className="selo bg-risco text-risco-contraste">só você leu isto</span>
            <p className="font-display text-display text-balance text-texto">Você é o espião.</p>
            <p className="text-corpo leading-snug text-texto-2">
              Você não sabe o local. Pergunte como quem sabe, responda como quem esteve lá.
            </p>
          </section>
        ) : (
          <section className="flex flex-col gap-2 rounded-papel border-2 border-controle-linha bg-superficie p-5 shadow-[var(--sombra-botao)]">
            <span className="font-mono text-rotulo text-texto-3 uppercase">o local é</span>
            <p className="font-display text-display text-balance text-texto">{espiao.local}</p>
            <p className="text-corpo leading-snug text-texto-2">
              Alguém nesta mesa não sabe disso. Responda sem entregar o lugar de graça.
            </p>
          </section>
        )}

        <p className="text-apoio leading-snug text-texto-3">
          Guarde na cabeça e passe adiante. Ninguém mais vai ver esta tela.
        </p>
      </div>
    </Shell>
  )
}

/**
 * "Todos prontos?" — o único gatilho do relógio (`PJ-26`).
 *
 * O aparelho já deu a volta inteira e o último pronto está **retido** no motor.
 * É este toque que o solta, e é por isso que ele existe: sem ele, o relógio
 * começaria a correr com o celular ainda na mão do último a esconder o papel,
 * e a mesa perderia meia rodada só se reunindo.
 */
export function EspiaoTodosProntos({
  projecao,
  aoComecar,
  aoSair,
}: {
  projecao: Projecao
  aoComecar(): void
  aoSair(): void
}) {
  const espiao = projecao.jogo?.espiao
  if (espiao === undefined) return null

  const comeca = projecao.jogadores.find(
    (jogador) => jogador.id === espiao.comecaPerguntando.id,
  )

  return (
    <Shell titulo={nomeDoJogo(projecao.sala.jogoId)} aoSair={aoSair}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex flex-col items-start gap-2">
          <span className="selo bg-acento text-acento-contraste">todo mundo já viu</span>
          <h1 className="font-display text-display text-balance text-texto">Todos prontos?</h1>
          <p className="text-corpo text-texto-3">
            O aparelho deu a volta e cada um sabe o que precisa saber. Deixe o celular no meio da
            mesa — daqui pra frente ele é só o relógio.
          </p>
        </div>

        <section className="flex items-center gap-2.5 rounded-papel border border-linha bg-superficie px-3.5 py-3">
          <span className="font-mono text-rotulo text-texto-3 uppercase">começa perguntando</span>
          <span aria-hidden="true" className="min-w-6 flex-1 border-b border-dotted border-linha" />
          {comeca !== undefined && (
            <MarcadorDeJogador apelido={comeca.apelido} cor={comeca.cor} />
          )}
          <span className="min-w-0 truncate font-semibold text-texto">
            {espiao.comecaPerguntando.apelido}
          </span>
        </section>

        <p className="text-apoio leading-snug text-texto-3">
          O relógio só começa quando alguém tocar aqui embaixo. As perguntas correm em voz alta,
          de qualquer um pra qualquer um — o aparelho fica parado.
        </p>
      </div>

      <BarraDeAcao>
        <Botao larguraTotal onClick={aoComecar}>
          Começar a rodada
        </Botao>
      </BarraDeAcao>
    </Shell>
  )
}
