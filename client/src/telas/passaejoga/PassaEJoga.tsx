import { useState } from 'react'
import { Modal } from '../../componentes'
import type { MesaLocal } from '../../passaejoga/motor'
import { descartar, guardar, ler } from '../../passaejoga/guarda'
import { Mesa } from './Mesa'
import { Partida } from './Partida'
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

  /** `PJ-32` — cada mudança de mesa é gravada; é o que sobrevive ao recarregar. */
  const anotar = (partida: MesaLocal) => {
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
        <Partida mesa={mesa} aoMudar={anotar} aoSair={sair} />
      ) : jogoId === null ? (
        <Porta aoEscolher={setJogoId} aoVoltar={aoSair} />
      ) : (
        <Mesa jogoId={jogoId} aoComecar={anotar} aoVoltar={() => setJogoId(null)} />
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
