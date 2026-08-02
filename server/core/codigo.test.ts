import { describe, expect, it } from 'vitest'
import { ALFABETO_CODIGO, TAMANHO_CODIGO, gerarCodigo, normalizarCodigo } from './codigo'

describe('gerarCodigo (SALA-01)', () => {
  it('não usa os caracteres ambíguos I, O, 0 e 1 no alfabeto', () => {
    expect([...'IO01'].filter((c) => ALFABETO_CODIGO.includes(c))).toEqual([])
  })

  it('gera código de 5 letras maiúsculas do alfabeto, em 1000 sorteios', () => {
    const foraDoContrato = Array.from({ length: 1000 }, () => gerarCodigo()).filter(
      (codigo) =>
        codigo.length !== TAMANHO_CODIGO || [...codigo].some((c) => !ALFABETO_CODIGO.includes(c)),
    )

    expect(foraDoContrato).toEqual([])
  })

  it('mapeia o sorteio mínimo para a primeira letra do alfabeto', () => {
    expect(gerarCodigo(() => 0)).toBe('AAAAA')
  })

  it('mapeia o sorteio máximo para a última letra do alfabeto', () => {
    expect(gerarCodigo(() => 0.999999)).toBe('ZZZZZ')
  })
})

describe('normalizarCodigo', () => {
  it('devolve em maiúsculas um código digitado em minúsculas', () => {
    expect(normalizarCodigo('abcde')).toEqual({ ok: true, valor: 'ABCDE' })
  })

  it('devolve inalterado um código já em maiúsculas', () => {
    expect(normalizarCodigo('ABCDE')).toEqual({ ok: true, valor: 'ABCDE' })
  })

  it('ignora espaços nas pontas', () => {
    expect(normalizarCodigo('  abcde  ')).toEqual({ ok: true, valor: 'ABCDE' })
  })

  it('recusa código curto demais', () => {
    expect(normalizarCodigo('ABCD')).toEqual({ ok: false, erro: 'CODIGO_INVALIDO' })
  })

  it('recusa código longo demais', () => {
    expect(normalizarCodigo('ABCDEF')).toEqual({ ok: false, erro: 'CODIGO_INVALIDO' })
  })

  it('recusa letra fora do alfabeto', () => {
    expect(normalizarCodigo('ABCDI')).toEqual({ ok: false, erro: 'CODIGO_INVALIDO' })
  })

  it('recusa dígito no lugar de letra', () => {
    expect(normalizarCodigo('ABCD1')).toEqual({ ok: false, erro: 'CODIGO_INVALIDO' })
  })
})
