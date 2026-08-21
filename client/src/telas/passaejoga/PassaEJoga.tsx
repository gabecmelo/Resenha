import { useState } from 'react'
import { nomeDoJogo } from '../../../../shared/jogos-catalogo'
import { Botao, MarcadorDeJogador, Modal, Shell } from '../../componentes'
import type { MesaLocal } from '../../passaejoga/motor'
import { descartar, guardar, ler } from '../../passaejoga/guarda'
import { Mesa } from './Mesa'
import { Porta } from './Porta'

/**
 * O modo inteiro, atrás de um `import()` (`PJ-05`).
 *
 * Este arquivo é a fronteira do pedaço carregado sob demanda: quem só quer
 * criar uma sala não baixa os cinco jogos, o motor local e o conteúdo todo. Por
 * isso a navegação do modo mora aqui, e não no `App` — lá ela viria junto no
 * pacote principal.
 *
 * Não há roteador: ou a mesa ainda não escolheu jogo (porta), ou escolheu e
 * está montando a partida (mesa), ou a partida já começou. Estado, não rota.
 *
 * A partida em andamento é guardada a cada mudança e lida de volta na
 * montagem (`PJ-32`): um toque errado no "voltar" numa festa não pode custar a
 * partida, e não há servidor pra guardá-la por nós.
 */
export function PassaEJoga({ aoSair }: { aoSair(): void }) {
  const [mesa, setMesa] = useState<MesaLocal | null>(() => ler())
  const [jogoId, setJogoId] = useState<string | null>(null)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  const comecar = (partida: MesaLocal) => {
    guardar(partida)
    setMesa(partida)
  }

  /** `PJ-35` — sair descarta a partida, então a confirmação vem antes. */
  const sair = () => {
    if (mesa === null) {
      aoSair()
      return
    }
    setConfirmandoSaida(true)
  }

  const sairDeVez = () => {
    descartar()
    setMesa(null)
    setConfirmandoSaida(false)
    aoSair()
  }

  return (
    <>
      {mesa !== null ? (
        <PartidaEmAndamento mesa={mesa} aoSair={sair} />
      ) : jogoId === null ? (
        <Porta aoEscolher={setJogoId} aoVoltar={aoSair} />
      ) : (
        <Mesa jogoId={jogoId} aoComecar={comecar} aoVoltar={() => setJogoId(null)} />
      )}

      {confirmandoSaida && (
        <Modal
          titulo="Sair e perder a partida?"
          descricao="A partida desta mesa é descartada e não tem como voltar pra ela — não há sala nem código que a guarde."
          rotuloConfirmar="Sair e perder"
          rotuloCancelar="Ficar na partida"
          destrutivo
          aoConfirmar={sairDeVez}
          aoCancelar={() => setConfirmandoSaida(false)}
        />
      )}
    </>
  )
}

/**
 * A partida que já começou, enquanto as telas de cada jogo não assumem.
 *
 * Mostra a roda na ordem em que o aparelho circula e o último anúncio do
 * motor — que, sem chat, é tudo o que a mesa tem pra ler.
 */
function PartidaEmAndamento({ mesa, aoSair }: { mesa: MesaLocal; aoSair(): void }) {
  const ultimo = mesa.eventos.at(-1)

  return (
    <Shell titulo={nomeDoJogo(mesa.jogoId)}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex flex-col items-start gap-2">
          <span className="selo bg-acento text-acento-contraste">partida em andamento</span>
          <h1 className="font-display text-titulo text-balance text-texto">
            {nomeDoJogo(mesa.jogoId)}
          </h1>
          {ultimo !== undefined && <p className="text-corpo text-texto-2">{ultimo.texto}</p>}
        </div>

        <div className="flex flex-col gap-2 rounded-papel border border-linha bg-superficie p-3.5">
          <span className="font-mono text-rotulo text-texto-3 uppercase">a roda</span>
          <div className="flex flex-wrap gap-2">
            {mesa.sala.jogadores.map((jogador) => (
              <span
                key={jogador.id}
                className="flex items-center gap-1.5 rounded-chip border border-linha px-2.5 py-1.5"
              >
                <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} />
                <span className="text-apoio text-texto-2">{jogador.apelido}</span>
              </span>
            ))}
          </div>
        </div>

        <Botao larguraTotal variante="secundario" onClick={aoSair}>
          Sair do Passa e Joga
        </Botao>
      </div>
    </Shell>
  )
}
