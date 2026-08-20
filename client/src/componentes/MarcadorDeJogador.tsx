import type { Cor } from '../../../shared/protocolo'
import { CONTRASTE_DO_JOGADOR, corDoJogador, inicialDoApelido } from './cores'

const TAMANHOS = {
  miudo: 'w-[18px] h-[18px] text-[9px]',
  medio: 'w-[22px] h-[22px] text-[11px]',
  grande: 'w-[30px] h-[30px] text-[13px]',
} as const

export interface PropsDoMarcador {
  apelido: string
  cor: Cor
  tamanho?: keyof typeof TAMANHOS
}

/**
 * Disco colorido com a inicial do apelido (`SALA-07`).
 *
 * **Nunca aparece sozinho**: quem usa o marcador mostra o apelido ao lado. A cor
 * é atalho de leitura, não a informação — quem não distingue cores lê o nome.
 * A inicial dentro do disco é o segundo diferenciador.
 */
export function MarcadorDeJogador({ apelido, cor, tamanho = 'medio' }: PropsDoMarcador) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-pilula font-semibold ${TAMANHOS[tamanho]}`}
      style={{ backgroundColor: corDoJogador(cor), color: CONTRASTE_DO_JOGADOR }}
    >
      {inicialDoApelido(apelido)}
    </span>
  )
}
