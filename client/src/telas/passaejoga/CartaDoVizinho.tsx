import { useEffect } from 'react'
import type { Projecao } from '../../../../shared/protocolo'
import { BarraDeAcao, Botao, Shell } from '../../componentes'
import { tocarSuaVez } from '../../sons'

/**
 * A carta acabou de ser escrita, e a mesa precisa vê-la (`PJ2-07`).
 *
 * É o gesto de papel: você escreve o nome, cola na testa da pessoa ao lado, e
 * a roda inteira lê **menos ela**. Num aparelho só, a tela é o papel — por isso
 * ela mostra a carta grande e diz, em vez de esconder, de quem é o rosto que
 * não pode olhar agora.
 *
 * Uma ação só, de propósito (`PJ2-08`, `PJ2-10`): quem está aqui já escreveu, e
 * o que falta é o aparelho andar. Oferecer editar ou começar do lado seria pedir
 * uma decisão onde só existe um movimento.
 */
export function CartaDoVizinho({
  projecao,
  ultimo,
  aoPassar,
  aoSair,
}: {
  projecao: Projecao
  /** Ninguém mais na roda pra receber: o gesto vira fechar, não passar. */
  ultimo: boolean
  aoPassar(): void
  aoSair(): void
}) {
  const dono = projecao.eu.alvo
  const carta = projecao.eu.cartaQueEscrevi

  useEffect(() => {
    tocarSuaVez()
  }, [])

  if (dono === undefined || carta === undefined) return null

  return (
    <Shell titulo="Quem Sou Eu?" aoSair={aoSair}>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 pt-2">
        <p className="text-center font-mono text-rotulo text-texto-3 uppercase">
          a carta de {dono.apelido}
        </p>

        <section className="flex flex-col items-center gap-4 rounded-papel border-2 border-controle-linha bg-superficie p-6 text-center shadow-botao">
          <p className="font-display text-[clamp(2rem,11vw,3.5rem)] leading-[1.05] text-balance text-texto">
            {carta}
          </p>
          <span className="font-mono text-rotulo text-acento uppercase">
            {dono.apelido} não pode ver
          </span>
        </section>

        <p className="text-center text-apoio text-texto-2">
          Mostre a tela pra mesa — todo mundo menos {dono.apelido}. É essa carta que{' '}
          {dono.apelido} vai passar a partida tentando adivinhar.
        </p>
      </div>

      <BarraDeAcao>
        <Botao larguraTotal onClick={aoPassar}>
          {ultimo ? 'A mesa viu — todo mundo já escreveu' : `Passar para ${dono.apelido}`}
        </Botao>
        <p className="text-apoio text-texto-3">
          {ultimo
            ? 'A roda fechou: a próxima tela é a de começar a partida.'
            : `Esconda a tela de ${dono.apelido} antes de entregar o aparelho.`}
        </p>
      </BarraDeAcao>
    </Shell>
  )
}
