import type { Comando, JogadorId, ModuloDeJogo } from '../protocolo'

/**
 * O contrato entre quem despacha e um jogo. Mora em `shared/` porque agora há
 * dois despachantes — o `core` da sala online e o motor local do Passa e Joga
 * — e o que eles têm em comum é justamente este contrato (`AD-017`).
 */

/** Avisos que o `core` entrega ao jogo. Não vêm de cliente: nascem da sala. */
export type AvisoDeSala =
  | { t: 'saiuJogador'; jogadorId: JogadorId }
  | { t: 'entrouJogador'; jogadorId: JogadorId }
  | { t: 'venceuPrazoTurno' }

/** Comandos que o `core` não resolve sozinho — são do jogo, seja ele qual for. */
type TipoDeComandoDoCore =
  | 'ola'
  | 'entrar'
  | 'configurar'
  | 'iniciar'
  | 'expulsar'
  | 'transferirHost'
  | 'chat'
  | 'sair'
  | 'trocarJogo'

export type ComandoDeJogo = Exclude<Comando, { t: TipoDeComandoDoCore }>
export type EntradaDoJogo = ComandoDeJogo | AvisoDeSala

/**
 * O que o `core` exige de um módulo de jogo. É a única forma pela qual um jogo
 * entra no `core`: por injeção, nunca por import (AD-002).
 */
export type JogoDaSala<E> = ModuloDeJogo<E, EntradaDoJogo>
