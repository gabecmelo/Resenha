/**
 * O que a tela de Início precisa decidir antes de existir conexão: de onde vem
 * o código, o que ainda falta para entrar e qual link se copia.
 *
 * Nada aqui é regra de jogo (AD-008). Quem recusa apelido, código e sala é o
 * servidor — estas funções só evitam que o botão fique apagado e mudo
 * (`HOST-01`, `ESCR-06` valem para todo botão desabilitado do produto).
 */

import { jogoDoCatalogo } from '../../../shared/jogos-catalogo'
import {
  ALFABETO_CODIGO,
  MAX_JOGADORES,
  MIN_JOGADORES,
  TAMANHO_CODIGO,
} from '../../../shared/protocolo'

/**
 * Jogo pedido pela busca da URL (`/?jogo=espiao`).
 *
 * Quem chega pelas páginas indexáveis veio procurando **aquele** jogo, e cair
 * na tela inicial com outro selecionado é fazer a pessoa refazer à mão a
 * escolha que ela já tinha feito no Google.
 *
 * Só o catálogo decide o que vale: um valor desconhecido devolve `null` e a
 * tela segue com o padrão. Isto é sugestão de interface, não comando — quem
 * recusa `jogoId` de verdade continua sendo o servidor, ao criar a sala.
 */
export function jogoDaUrl(busca: string): string | null {
  const pedido = new URLSearchParams(busca).get('jogo')
  if (pedido === null) return null

  const jogo = jogoDoCatalogo(pedido)
  // `emBreve` está no catálogo mas não é jogável: selecionar deixaria a tela
  // com um jogo que o botão "Criar" recusa.
  return jogo === undefined || jogo.emBreve === true ? null : jogo.id
}

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
 * `AJU-33` — o caminho que reflete a sala em que se está, ou a raiz quando não
 * se está em nenhuma.
 *
 * É o inverso de `codigoDaUrl`: o que esta função escreve, aquela lê de volta ao
 * recarregar. Sem isso a reentrada automática (`AJU-01`) só valia para quem
 * chegou pelo link de convite — quem criou a sala ou digitou o código ficava com
 * a URL na raiz e caía no formulário.
 */
export function caminhoDaSala(codigo: string | null): string {
  return codigo === null ? '/' : `/${codigo}`
}

/**
 * `AJU-35`, `AJU-36` — o limite com que a tela de criação abre. Vem do
 * contrato: é o mesmo padrão que o servidor aplica a quem não escolhe nada.
 */
export const LIMITE_PADRAO = String(MAX_JOGADORES)

/**
 * `AJU-35`, `AJU-38` — quantas pessoas quem cria a sala pediu que coubessem,
 * ou `null` quando o que está escrito não serve: vazio, com letra ou fora da
 * faixa.
 *
 * A faixa vem do contrato (AD-011). Como no tempo por turno, isto não recusa
 * nada de verdade — só evita mandar ao servidor o que já se sabe recusado.
 */
export function limiteDigitado(texto: string): number | null {
  const limpo = texto.trim()
  if (!/^\d+$/.test(limpo)) return null

  const limite = Number(limpo)
  if (limite < MIN_JOGADORES || limite > MAX_JOGADORES) return null
  return limite
}

/**
 * Por que ainda não dá para criar a sala, ou `undefined` quando dá.
 * O texto vai direto para o botão: desabilitado sem motivo trava o grupo.
 */
export function motivoParaCriar(apelido: string, limite: string): string | undefined {
  const doApelido = motivoDoApelido(apelido, 'para criar a sala')
  if (doApelido !== undefined) return doApelido

  if (limiteDigitado(limite) === null) {
    return `A sala cabe de ${MIN_JOGADORES} a ${MAX_JOGADORES} pessoas.`
  }
  return undefined
}

/**
 * Por que o código digitado ainda não serve, ou `undefined` quando serve.
 *
 * Vive separado do apelido porque na porta de entrada os dois passos são
 * separados: primeiro se acha a sala, depois se diz como te chamam.
 */
export function motivoDoCodigo(codigo: string): string | undefined {
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

/** Por que ainda não dá para entrar, ou `undefined` quando dá. */
export function motivoParaEntrar(apelido: string, codigo: string): string | undefined {
  const doApelido = motivoDoApelido(apelido, 'para entrar')
  if (doApelido !== undefined) return doApelido

  return motivoDoCodigo(codigo)
}

/**
 * `AJU-06`, `AJU-34` — por que o host ainda não pode iniciar, ou `undefined`
 * quando pode.
 *
 * O mínimo é **por jogo** (`AD-014`): vem de `minJogadores` no catálogo, não de
 * uma constante única. Espião precisa de 3 e "Quem Sou Eu?" de 2 — usar o
 * global aqui deixava o lobby de Espião oferecendo iniciar com 2 e o servidor
 * recusando depois do clique.
 */
export function motivoParaIniciar(ativos: number, minimo: number): string | undefined {
  const faltam = minimo - ativos
  if (faltam <= 0) return undefined
  return `Precisa de pelo menos ${minimo} pessoas — ${
    faltam === 1 ? 'falta 1' : `faltam ${faltam}`
  }.`
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
