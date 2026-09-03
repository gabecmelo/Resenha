import { Botao } from '../../componentes'
import { DE_NOVO_NO_APARELHO } from '../tela'

/**
 * O que a mesa pode fazer quando a partida acaba, num aparelho só.
 *
 * Duas saídas, e elas não são a mesma (`PJ2-22`):
 *
 * - **Jogar de novo** é o caminho curto — mesma roda, mesmas regras, mesmo
 *   jogo, começando na hora. É o que a mesa quer nove vezes em dez.
 * - **Voltar ao lobby** é onde se troca de jogo, de pacote e de regra. Antes
 *   dele existir, a única forma de trocar de jogo era sair do modo e digitar
 *   os seis nomes outra vez — e por isso a turma ficava no jogo que já tinha
 *   cansado.
 *
 * Mora aqui, e não nas quatro telas de encerramento, porque é a mesma dupla de
 * botões nas quatro: quatro cópias divergiriam na primeira correção de texto.
 */
export function FimDaPartida({
  aoJogarDeNovo,
  aoVoltarAoLobby,
}: {
  aoJogarDeNovo(): void
  aoVoltarAoLobby(): void
}) {
  return (
    <>
      <Botao larguraTotal onClick={aoJogarDeNovo}>
        {DE_NOVO_NO_APARELHO.rotulo}
      </Botao>
      <Botao larguraTotal variante="secundario" onClick={aoVoltarAoLobby}>
        Voltar ao lobby da mesa
      </Botao>
    </>
  )
}
