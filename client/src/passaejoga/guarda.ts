/**
 * A guarda da partida local (`PJ-20`, `PJ-32`).
 *
 * Numa festa o aparelho cai, apaga, recebe ligação e volta. Um toque errado no
 * "voltar" não pode custar a partida, e não há servidor pra guardá-la por nós:
 * a mesa inteira mora no `localStorage` e é lida de volta na montagem.
 *
 * Duas regras mandam aqui:
 *
 * 1. **`revelado` nunca é serializado.** Recarregar com um segredo à vista
 *    reabre no anúncio da passagem, nunca no conteúdo (`PJ-20`). Não é uma
 *    escolha de formato — é o requisito inteiro, numa linha.
 * 2. **Nada aqui lança.** Versão antiga, JSON corrompido, depósito bloqueado
 *    ou jogo que saiu do registro: tudo devolve `null` em silêncio e a mesa
 *    volta à porta. Uma partida perdida é ruim; um app que não abre é pior.
 */

import { REGISTRO_DE_JOGOS } from '../../../shared/jogos/registro'
import { type Deposito, depositoDoNavegador } from '../estado/sessao'
import { VERSAO_DA_MESA, type MesaLocal } from './motor'

/** Uma partida local de cada vez: a mesa é uma só, e o aparelho também. */
export const CHAVE_DA_MESA = 'resenha.passaejoga'

/** A passagem como ela é gravada: sem `revelado` (`PJ-20`). */
interface PassagemGuardada {
  fila: string[]
  posicao: number
}

export function guardar(mesa: MesaLocal, deposito: Deposito = depositoDoNavegador()): void {
  const passagem: PassagemGuardada | null =
    mesa.passagem === null
      ? null
      : { fila: mesa.passagem.fila, posicao: mesa.passagem.posicao }

  try {
    deposito.setItem(CHAVE_DA_MESA, JSON.stringify({ ...mesa, passagem }))
  } catch {
    // Depósito cheio ou bloqueado: o modo funciona sem persistência, só perde
    // a chance de sobreviver a um recarregamento.
  }
}

/** A mesa guardada, ou `null` quando não há uma que ainda sirva. */
export function ler(deposito: Deposito = depositoDoNavegador()): MesaLocal | null {
  let guardado: string | null
  try {
    guardado = deposito.getItem(CHAVE_DA_MESA)
  } catch {
    return null
  }
  if (guardado === null) return null

  try {
    return interpretar(JSON.parse(guardado))
  } catch {
    return null
  }
}

export function descartar(deposito: Deposito = depositoDoNavegador()): void {
  try {
    deposito.removeItem(CHAVE_DA_MESA)
  } catch {
    // Sem depósito não há o que descartar.
  }
}

/**
 * O que estava gravado só vira mesa se ainda for uma mesa desta versão, deste
 * registro e com partida de pé. Qualquer outra coisa é lixo de uma versão
 * anterior, e lixo não abre partida.
 */
function interpretar(bruto: unknown): MesaLocal | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const mesa = bruto as Partial<MesaLocal>

  if (mesa.versao !== VERSAO_DA_MESA) return null
  if (typeof mesa.jogoId !== 'string' || REGISTRO_DE_JOGOS[mesa.jogoId] === undefined) return null
  if (typeof mesa.sala !== 'object' || mesa.sala === null) return null
  if (!Array.isArray(mesa.sala.jogadores) || mesa.sala.jogadores.length === 0) return null
  if (typeof mesa.aparelhoCom !== 'string') return null

  return {
    versao: mesa.versao,
    jogoId: mesa.jogoId,
    sala: mesa.sala,
    aparelhoCom: mesa.aparelhoCom,
    // `PJ-20` — a volta volta ao anúncio de quem estava com o aparelho, nunca
    // ao conteúdo que ele tinha à vista.
    passagem:
      mesa.passagem === null || mesa.passagem === undefined
        ? null
        : { fila: mesa.passagem.fila, posicao: mesa.passagem.posicao, revelado: false },
    prontoRetido: mesa.prontoRetido ?? null,
    eventos: mesa.eventos ?? [],
  }
}
