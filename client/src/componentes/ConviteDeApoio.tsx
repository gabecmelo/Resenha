import { useState } from 'react'
import { ModalDeApoio } from './ModalDeApoio'

/**
 * O convite para apoiar, no fim da partida (`APOIO-02`).
 *
 * Este é o único momento do produto em que o pedido cabe: a mesa acabou de rir,
 * as cartas caíram, ninguém está no meio de uma jogada. Fica **abaixo** do que
 * a partida produziu e **acima** da barra de ação, para não disputar atenção
 * com "Voltar ao lobby" — se a escolha for entre doar e jogar de novo, jogar de
 * novo ganha.
 *
 * Pontilhado e sem sombra: na direção Bancada isso é o que se lê como opcional.
 * Um bloco de esmalte aqui pareceria a próxima etapa obrigatória.
 */
export function ConviteDeApoio() {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full cursor-pointer items-start gap-2.5 rounded-papel border border-dashed border-linha p-3.5 text-left transition-colors hover:border-controle-linha"
      >
        <span aria-hidden="true" className="text-[18px] leading-none">
          🍻
        </span>
        <span className="text-apoio leading-relaxed text-texto-2">
          <strong className="font-semibold text-texto">Rendeu resenha?</strong> O Resenha é de
          graça, sem anúncio e sem cadastro. Um Pix de qualquer valor paga o domínio e o servidor.{' '}
          <span className="font-mono text-rotulo text-acento uppercase underline underline-offset-4">
            ajudar
          </span>
        </span>
      </button>

      {aberto && <ModalDeApoio aoFechar={() => setAberto(false)} />}
    </>
  )
}
