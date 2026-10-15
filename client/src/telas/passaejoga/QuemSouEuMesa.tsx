import { useState } from 'react'
import type { Comando, JogadorId, Projecao } from '../../../../shared/protocolo'
import { nomeDoJogo } from '../../../../shared/jogos-catalogo'
import { BarraDeAcao, Botao, Carta, FaixaDeFase, Modal, Shell } from '../../componentes'

/**
 * O "Quem Sou Eu?" num aparelho só: o tabuleiro de cartas viradas (`QSE-01`).
 *
 * Não é a tela da sala online com menos botões — é outra coisa. Lá a vez, o
 * relógio e a declaração existem porque seis pessoas em seis aparelhos falariam
 * por cima umas das outras. Aqui a mesa está em volta de um celular só: quem
 * pergunta é quem está falando, quem confirma é quem estiver olhando, e a
 * carta na testa é uma folha que se levanta quando alguém quer relembrar.
 *
 * Por isso não há vez, nem relógio, nem "Descobri!". O que sobra é o gesto do
 * jogo de papel: virar a carta de alguém pra mesa, e virar de volta.
 *
 * As regras do jogo **não** mudaram (`AD-002`, `AD-014`): a vez continua no
 * estado, e a sala online continua usando tudo isso. O que muda é o que esta
 * tela oferece.
 */
export function QuemSouEuMesa({
  projecao,
  enviar,
  aoMostrarCarta,
  aoSair,
}: {
  projecao: Projecao
  enviar(comando: Comando): void
  aoMostrarCarta(alvo: JogadorId): void
  aoSair(): void
}) {
  const { sala, jogadores } = projecao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')

  /*
    `QSE-03` — uma carta aberta por vez. Não é economia de tela: é o que faz o
    gesto ser o do papel na testa. Duas cartas abertas ao mesmo tempo é a mesa
    lendo o jogo de outra pessoa de graça — e, além disso, a carta de quem
    segura o aparelho só existe no payload enquanto ele está com o vizinho
    (`QSE-04`), então duas nunca caberiam.
  */
  const [aberta, setAberta] = useState<JogadorId | null>(null)
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)

  const mostrar = (alvo: JogadorId) => {
    aoMostrarCarta(alvo)
    setAberta(alvo)
  }

  return (
    <Shell
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase selo="na mesa" tom="esmalte">
          Perguntem em voz alta. Toque em “mostrar” pra rever a carta de alguém.
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <h2 className="font-mono text-rotulo text-texto-3 uppercase">
          mesa · {ativos.length} cartas
        </h2>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {ativos.map((jogador) => {
            const estaAberta = aberta === jogador.id
            return (
              <li key={jogador.id} className="flex min-w-0 flex-col gap-1.5">
                <Carta
                  apelido={jogador.apelido}
                  cor={jogador.cor}
                  virada={!estaAberta}
                  {...(estaAberta ? { texto: jogador.carta } : {})}
                />
                <button
                  type="button"
                  onClick={() => (estaAberta ? setAberta(null) : mostrar(jogador.id))}
                  className="min-h-9 w-full cursor-pointer rounded-botao border border-controle-linha text-miudo font-semibold text-texto"
                >
                  {estaAberta ? 'Esconder' : 'Mostrar'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <BarraDeAcao>
        <Botao larguraTotal variante="secundario" onClick={() => setConfirmandoEncerrar(true)}>
          Encerrar partida
        </Botao>
      </BarraDeAcao>

      {/* `QSE-06`, `HOST-07` — encerrar revela tudo; confirma antes. */}
      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="Isso vira o placar e abre a carta de todo mundo."
          rotuloConfirmar="Encerrar e revelar tudo"
          rotuloCancelar="Continuar jogando"
          destrutivo
          aoConfirmar={() => {
            enviar({ t: 'encerrar' })
            setConfirmandoEncerrar(false)
          }}
          aoCancelar={() => setConfirmandoEncerrar(false)}
        />
      )}
    </Shell>
  )
}
