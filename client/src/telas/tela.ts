import type { Comando, Projecao } from '../../../shared/protocolo'

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
   * **Limite:** se uma tela passar de dois ramos de `modo`, ela se parte em
   * duas em vez de acumular condicionais. Duas telas honestas são melhores que
   * uma que finge ser uma só.
   */
  modo?: 'sala' | 'local'
}

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
