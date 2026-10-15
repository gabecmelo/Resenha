import type { Comando, JogadorId, Projecao } from '../../../shared/protocolo'

/**
 * O que toda tela recebe.
 *
 * A tela desenha a `Projecao` e devolve `Comando` — nada mais. Nenhuma delas
 * decide de quem é a vez, quem pode agir ou o que aparece: isso já veio pronto
 * do servidor (AD-008).
 */
export interface PropsDaTela {
  projecao: Projecao
  enviar(comando: Comando): void
  /** `CONN-06` — sair de vez desta sala. */
  aoSair(): void
  /**
   * Onde a partida está rodando: numa sala com um aparelho por pessoa, ou num
   * aparelho só passando de mão em mão (`PJ-22`…`PJ-30`).
   *
   * A tela é a mesma nos dois modos — o que muda é o que existe em volta dela:
   * num aparelho só não há código de sala, não há chat, e a pessoa de quem a
   * tela fala precisa ser nomeada, porque quem segura o celular muda a cada
   * toque.
   *
   * **Limite (`AD-018`):** contam os ramos que decidem **estrutura** — escolher
   * só a cópia não conta. Passou de dois, primeiro unifique a decisão espalhada
   * num componente; só se sobrarem mais de duas decisões de verdade a tela se
   * parte. Duas telas honestas são melhores que uma que finge ser uma só — mas
   * duas cópias da mesma leitura da projeção são piores que as duas coisas.
   * Estourar sem unificar nem partir exige exceção nomeada no `STATE.md`: hoje
   * só o `EspiaoJogo` tem uma.
   */
  modo?: 'sala' | 'local'
  /**
   * Um comando em nome de outra pessoa que não a que está com o aparelho.
   *
   * Só existe no modo local, e por um motivo só: no Enigmas em voz alta quem
   * desatou contou a versão **falando**, e o celular está — e continua — na mão
   * de quem narra (`PJ-23`). O gesto é de quem falou; o toque é de quem ouviu.
   * Registrar em nome do narrador seria mentir pro placar.
   */
  enviarComo?(autorId: JogadorId, comando: Comando): void
  /**
   * `PJ2-22` — volta pro lobby da mesa, guardando os nomes.
   *
   * Só existe no modo local, e não é o mesmo gesto que "jogar de novo": aqui a
   * partida acaba e a mesa volta a poder escolher — outro jogo, outras regras,
   * outro pacote — sem que ninguém redigite nome nenhum.
   */
  aoVoltarAoLobby?(): void
}

/**
 * O convite pra próxima partida num aparelho só (`PJ-34`).
 *
 * É o caminho curto: a mesma mesa, na mesma ordem da roda, jogando de novo sem
 * passar por tela nenhuma. Quem quiser trocar de jogo ou mexer nas regras tem
 * o lobby da mesa ao lado (`PJ2-22`) — que também não pede os nomes de volta.
 *
 * Mora aqui, e não em cada tela de encerramento, porque o rótulo é o mesmo nas
 * quatro: quatro cópias divergiriam na primeira correção de texto.
 *
 * Só o rótulo. A explicação que existia aqui dizia o que "jogar de novo" já
 * diz.
 */
export const DE_NOVO_NO_APARELHO = {
  rotulo: 'Jogar de novo',
} as const

/**
 * O código da sala como a moldura o quer.
 *
 * Num aparelho só não há sala, e o código chega vazio: aí a chave não vai — a
 * moldura fecha o espaço do convite em vez de mostrar um código em branco. Com
 * `exactOptionalPropertyTypes` não basta mandar `undefined`; a chave precisa
 * mesmo estar ausente.
 */
export function molduraDaSala(codigo: string): { codigo?: string } {
  return codigo === '' ? {} : { codigo }
}
