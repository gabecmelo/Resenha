import type { JogoDaSala } from '../core/despacho'
import { quemSouEu } from './quem-sou-eu'

/**
 * Único arquivo do projeto que sabe quais jogos concretos existem (`HUB-13`).
 * Adicionar um jogo é adicionar uma linha aqui — nenhum outro arquivo de
 * `core/` ou `index.ts` muda de estrutura.
 *
 * O `as JogoDaSala<unknown>` é o único apagamento de tipo do projeto (`AD-013`);
 * cada módulo de jogo continua totalmente tipado em `E` dentro da sua própria
 * pasta.
 */
export const REGISTRO_DE_JOGOS: Record<string, JogoDaSala<unknown>> = {
  'quem-sou-eu': quemSouEu as JogoDaSala<unknown>,
}
