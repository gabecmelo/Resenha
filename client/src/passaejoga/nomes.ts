/**
 * Quem vai jogar, antes de existir partida (`PJ-06`, `PJ-08`).
 *
 * No Passa e Joga o nome não é apelido de sala: é como a tela de passagem
 * chama alguém em voz alta ("Passe pro Bruno"). Por isso dois nomes iguais são
 * recusados mesmo diferindo em caixa ou em espaço nas pontas — a mesa não
 * distingue "bruno" de "Bruno " quando o aparelho está na mão errada.
 *
 * Nada aqui é regra de jogo (`AD-008`). Quem recusa de verdade continua sendo
 * `iniciarRodada`, pelo mesmo caminho da sala online (`PJ-31`); estas funções
 * só evitam que o botão fique apagado e mudo, como `motivoParaIniciar` já faz
 * no lobby.
 */

import { minJogadoresDoJogo } from '../../../shared/jogos-catalogo'
import { MAX_APELIDO, motivoParaIniciar } from '../estado/entrada'

/**
 * Quantas pessoas cabem numa mesa de um aparelho só.
 *
 * Não é o limite da sala online (`MAX_JOGADORES`), que é outro problema: aqui
 * o teto é a volta de passagem. Acima disso o aparelho demora mais pra dar a
 * volta do que a rodada inteira dura.
 */
export const MAX_NA_MESA = 12

/** Os nomes como o motor os recebe: sem espaço nas pontas, na ordem da roda. */
export function nomesDaMesa(digitados: string[]): string[] {
  return digitados.map((nome) => nome.trim())
}

/**
 * Por que a partida ainda não pode começar, ou `undefined` quando pode.
 *
 * O texto vai direto para o botão: desabilitado sem motivo trava a mesa.
 * A ordem das checagens é a ordem do que dá pra consertar primeiro — um campo
 * em branco é mais concreto que "faltam duas pessoas".
 */
export function motivoParaComecar(digitados: string[], jogoId: string): string | undefined {
  const nomes = nomesDaMesa(digitados)

  if (nomes.length > MAX_NA_MESA) {
    return `A mesa cabe até ${MAX_NA_MESA} pessoas.`
  }

  if (nomes.some((nome) => nome.length === 0)) {
    return 'Tem um nome em branco — escreva quem é ou tire da roda.'
  }

  const comprido = nomes.find((nome) => nome.length > MAX_APELIDO)
  if (comprido !== undefined) {
    return `"${comprido}" passou de ${MAX_APELIDO} caracteres.`
  }

  const repetido = primeiroRepetido(nomes)
  if (repetido !== undefined) {
    return `Tem dois "${repetido}" na roda — a passagem precisa saber pra quem ir.`
  }

  return motivoParaIniciar(nomes.length, minJogadoresDoJogo(jogoId))
}

/** O primeiro nome que já tinha aparecido antes, ignorando caixa. */
function primeiroRepetido(nomes: string[]): string | undefined {
  const vistos = new Set<string>()
  for (const nome of nomes) {
    const chave = nome.toLocaleLowerCase('pt-BR')
    if (vistos.has(chave)) return nome
    vistos.add(chave)
  }
  return undefined
}
