import { useState } from 'react'
import type { JogadorId, Projecao } from '../../../../shared/protocolo'
import { Botao, MarcadorDeJogador, Modal } from '../../componentes'
import { tocarClique } from '../../sons'

/**
 * A mesa acusou alguém (`PJ2-12`).
 *
 * Num aparelho só a votação já aconteceu — em voz alta, olhando na cara. O que
 * chega aqui é o resultado dela, e registrar isso com uma urna de N toques
 * seria fazer a mesa repetir no celular a discussão que acabou de ter.
 *
 * Por isso um toque só, dado por quem está segurando o aparelho, e uma
 * confirmação — porque acusar encerra a rodada, e um dedo torto na lista não
 * pode decidir a partida.
 */
export function EspiaoAcusacao({
  projecao,
  rotuloDesistir,
  aoAcusar,
  aoDesistir,
}: {
  projecao: Projecao
  /**
   * O que dizer em vez de acusar. Muda de sentido conforme quem abriu isto:
   * a mesa que se antecipou pode voltar a perguntar, e a mesa que o relógio
   * pegou já não pode — o que resta a ela é não acusar ninguém, que é uma
   * jogada de verdade e não uma desistência.
   */
  rotuloDesistir: string
  aoAcusar(alvoId: JogadorId): void
  aoDesistir(): void
}) {
  const [escolhido, setEscolhido] = useState<JogadorId | null>(null)

  // `ESP-51` — quem já saiu não volta pra lista: não dá pra expulsar duas vezes.
  const expulsos = projecao.jogo?.espiao?.expulsos ?? []
  const naRoda = projecao.jogadores.filter(
    (jogador) => jogador.situacao === 'ativo' && !expulsos.includes(jogador.id),
  )
  const acusado = naRoda.find((jogador) => jogador.id === escolhido)

  if (acusado !== undefined) {
    return (
      <Modal
        titulo={`A mesa acusa ${acusado.apelido}?`}
        descricao="Isso fecha a votação. O que acontece depois depende das regras que a mesa escolheu."
        rotuloConfirmar="Acusar"
        rotuloCancelar="Voltar"
        aoConfirmar={() => aoAcusar(acusado.id)}
        aoCancelar={() => setEscolhido(null)}
      />
    )
  }

  return (
    <Modal
      titulo="Quem a mesa acusou?"
      descricao="Toque em quem a roda apontou. Ninguém mais precisa tocar em nada."
      rotuloCancelar={rotuloDesistir}
      aoCancelar={aoDesistir}
    >
      <ul className="flex flex-col gap-2">
        {naRoda.map((jogador) => (
          <li key={jogador.id}>
            <Botao
              larguraTotal
              variante="secundario"
              onClick={() => {
                tocarClique()
                setEscolhido(jogador.id)
              }}
            >
              <span className="flex items-center gap-2.5">
                <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} />
                {jogador.apelido}
              </span>
            </Botao>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
