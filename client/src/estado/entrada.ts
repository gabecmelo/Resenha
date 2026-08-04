/**
 * O que a tela de Início precisa decidir antes de existir conexão: de onde vem
 * o código, o que ainda falta para entrar e qual link se copia.
 *
 * Nada aqui é regra de jogo (AD-008). Quem recusa apelido, código e sala é o
 * servidor — estas funções só evitam que o botão fique apagado e mudo
 * (`HOST-01`, `ESCR-06` valem para todo botão desabilitado do produto).
 */

import { ALFABETO_CODIGO, TAMANHO_CODIGO } from '../../../shared/protocolo'

/** `SALA-03` */
export const MIN_APELIDO = 2
export const MAX_APELIDO = 16

/**
 * Código embutido no link de convite. O caminho é o próprio código —
 * `resenha.app/KTVRM` — e qualquer outra coisa devolve string vazia.
 */
export function codigoDaUrl(caminho: string): string {
  const bruto = caminho.replace(/^\/+/, '').replace(/\/+$/, '')
  const codigo = normalizarCodigo(bruto)
  return codigo.length === TAMANHO_CODIGO && ehCodigoCompleto(codigo) ? codigo : ''
}

/** Forma canônica do que a pessoa digitou: maiúsculas, sem espaços, sem excesso. */
export function normalizarCodigo(digitado: string): string {
  return digitado.trim().toUpperCase().slice(0, TAMANHO_CODIGO)
}

function ehCodigoCompleto(codigo: string): boolean {
  return [...codigo].every((letra) => ALFABETO_CODIGO.includes(letra))
}

/** `SALA-08` — o link que o host manda no grupo. */
export function linkDeConvite(origem: string, codigo: string): string {
  return `${origem.replace(/\/+$/, '')}/${codigo}`
}

/**
 * Por que ainda não dá para criar a sala, ou `undefined` quando dá.
 * O texto vai direto para o botão: desabilitado sem motivo trava o grupo.
 */
export function motivoParaCriar(apelido: string): string | undefined {
  return motivoDoApelido(apelido, 'para criar a sala')
}

/** Por que ainda não dá para entrar, ou `undefined` quando dá. */
export function motivoParaEntrar(apelido: string, codigo: string): string | undefined {
  const doApelido = motivoDoApelido(apelido, 'para entrar')
  if (doApelido !== undefined) return doApelido

  const normalizado = normalizarCodigo(codigo)
  const faltam = TAMANHO_CODIGO - normalizado.length
  if (faltam > 0) {
    return faltam === TAMANHO_CODIGO
      ? 'Digite as 5 letras do código.'
      : `Falta${faltam > 1 ? 'm' : ''} ${faltam} letra${faltam > 1 ? 's' : ''} do código.`
  }
  if (!ehCodigoCompleto(normalizado)) return 'O código não leva I nem O.'

  return undefined
}

function motivoDoApelido(apelido: string, fim: string): string | undefined {
  const limpo = apelido.trim()
  if (limpo.length === 0) return `Escreva um apelido ${fim}.`
  if (limpo.length < MIN_APELIDO) return `Curto demais — mínimo ${MIN_APELIDO} caracteres.`
  if (limpo.length > MAX_APELIDO) {
    return `Passou ${limpo.length - MAX_APELIDO} caractere${limpo.length - MAX_APELIDO > 1 ? 's' : ''}.`
  }
  return undefined
}
