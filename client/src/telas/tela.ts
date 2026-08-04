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
}
