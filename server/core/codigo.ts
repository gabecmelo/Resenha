import { ALFABETO_CODIGO, TAMANHO_CODIGO, type Resultado } from '../../shared/protocolo'

/** `SALA-01` — o formato do código é do protocolo; aqui ficam gerar e validar. */
export { ALFABETO_CODIGO, TAMANHO_CODIGO }

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
