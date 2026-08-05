import { describe, expect, it } from 'vitest'
import { MARGEM_DO_FIM_PX, estaNoFim } from './rolagem'

describe('estaNoFim — mensagem nova só arrasta quem já estava no fim (AJU-30)', () => {
  it('é verdadeiro com o painel exatamente no fim', () => {
    expect(estaNoFim({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })).toBe(true)
  })

  it('é verdadeiro a um fio do fim, dentro da margem', () => {
    expect(estaNoFim({ scrollTop: 590, scrollHeight: 1000, clientHeight: 400 })).toBe(true)
  })

  it('é verdadeiro na margem exata', () => {
    expect(
      estaNoFim({ scrollTop: 600 - MARGEM_DO_FIM_PX, scrollHeight: 1000, clientHeight: 400 }),
    ).toBe(true)
  })

  it('é falso para quem rolou para cima além da margem', () => {
    expect(
      estaNoFim({ scrollTop: 600 - MARGEM_DO_FIM_PX - 1, scrollHeight: 1000, clientHeight: 400 }),
    ).toBe(false)
  })

  it('é falso para quem foi ler o começo da conversa', () => {
    expect(estaNoFim({ scrollTop: 0, scrollHeight: 1000, clientHeight: 400 })).toBe(false)
  })

  it('é verdadeiro quando a conversa ainda não enche o painel', () => {
    expect(estaNoFim({ scrollTop: 0, scrollHeight: 200, clientHeight: 400 })).toBe(true)
  })
})
