import { describe, expect, it } from 'vitest'
import { depositoEmMemoria } from './sessao'
import { CHAVE_TEMA, alternar, guardarTema, lerTema, temaEfetivo } from './tema'

describe('lerTema', () => {
  it('devolve null quando ninguém escolheu ainda', () => {
    expect(lerTema(depositoEmMemoria())).toBeNull()
  })

  it('devolve o tema guardado', () => {
    const deposito = depositoEmMemoria()
    guardarTema(deposito, 'escuro')
    expect(lerTema(deposito)).toBe('escuro')
  })

  it('ignora valor guardado que não é um tema', () => {
    const deposito = depositoEmMemoria()
    deposito.setItem(CHAVE_TEMA, 'roxo')
    expect(lerTema(deposito)).toBeNull()
  })

  it('a escolha nova substitui a anterior', () => {
    const deposito = depositoEmMemoria()
    guardarTema(deposito, 'escuro')
    guardarTema(deposito, 'claro')
    expect(lerTema(deposito)).toBe('claro')
  })
})

describe('temaEfetivo', () => {
  it('segue o dispositivo quando não há escolha — claro', () => {
    expect(temaEfetivo(null, false)).toBe('claro')
  })

  it('segue o dispositivo quando não há escolha — escuro', () => {
    expect(temaEfetivo(null, true)).toBe('escuro')
  })

  it('a escolha vence a preferência do dispositivo', () => {
    expect(temaEfetivo('claro', true)).toBe('claro')
    expect(temaEfetivo('escuro', false)).toBe('escuro')
  })
})

describe('alternar', () => {
  it('vai e volta entre os dois temas', () => {
    expect(alternar('claro')).toBe('escuro')
    expect(alternar('escuro')).toBe('claro')
  })
})
