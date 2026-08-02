import type { Resultado } from '../../shared/protocolo'

/**
 * `SALA-01` — alfabeto sem os caracteres ambíguos ao ditar em voz alta
 * (`I`, `O`, e por consequência os dígitos `0` e `1`, que não entram).
 */
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const TAMANHO_CODIGO = 5

/** `SALA-01` — código de 5 letras maiúsculas. */
export function gerarCodigo(aleatorio: () => number = Math.random): string {
  let codigo = ''
  for (let i = 0; i < TAMANHO_CODIGO; i += 1) {
    codigo += ALFABETO_CODIGO[Math.floor(aleatorio() * ALFABETO_CODIGO.length)]
  }
  return codigo
}

/**
 * Devolve a forma canônica do código digitado, ou recusa. Aceita minúsculas e
 * espaços nas pontas; recusa comprimento errado e caracteres fora do alfabeto.
 */
export function normalizarCodigo(texto: string): Resultado<string> {
  const codigo = texto.trim().toUpperCase()

  if (codigo.length !== TAMANHO_CODIGO) return { ok: false, erro: 'CODIGO_INVALIDO' }
  for (const letra of codigo) {
    if (!ALFABETO_CODIGO.includes(letra)) return { ok: false, erro: 'CODIGO_INVALIDO' }
  }

  return { ok: true, valor: codigo }
}
