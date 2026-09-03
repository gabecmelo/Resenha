import { describe, expect, it } from 'vitest'
import { acabou, avancar, criarPassagem, deQuemE, revelar } from './passagem'

describe('criarPassagem', () => {
  it('nasce na ordem da roda, no primeiro jogador', () => {
    const passagem = criarPassagem(['j1', 'j2', 'j3'])

    expect(passagem).toEqual({ fila: ['j1', 'j2', 'j3'], posicao: 0, revelado: false })
  })

  it('nasce sem nada revelado (`PJ-17`)', () => {
    expect(criarPassagem(['j1']).revelado).toBe(false)
  })

  it('não guarda a lista de quem chamou', () => {
    const nomes = ['j1', 'j2']
    const passagem = criarPassagem(nomes)

    nomes.push('j3')

    expect(passagem.fila).toEqual(['j1', 'j2'])
  })
})

describe('deQuemE', () => {
  it('nomeia sempre um jogador só (`PJ-17`)', () => {
    expect(deQuemE(criarPassagem(['j1', 'j2', 'j3']))).toBe('j1')
  })

  it('anda de vizinho pra vizinho, na ordem da roda (`PJ-07`)', () => {
    const primeira = criarPassagem(['j1', 'j2', 'j3'])
    const segunda = avancar(primeira)

    expect([deQuemE(segunda), deQuemE(avancar(segunda))]).toEqual(['j2', 'j3'])
  })

  it('devolve null quando a volta acabou, em vez de estourar o índice', () => {
    const passagem = avancar(criarPassagem(['j1']))

    expect(deQuemE(passagem)).toBeNull()
  })
})

describe('revelar', () => {
  it('mostra o conteúdo de quem está com o aparelho (`PJ-18`)', () => {
    const passagem = revelar(criarPassagem(['j1', 'j2']))

    expect({ revelado: passagem.revelado, de: deQuemE(passagem) }).toEqual({
      revelado: true,
      de: 'j1',
    })
  })

  it('não revela nada numa fila que já acabou', () => {
    const passagem = revelar(avancar(criarPassagem(['j1'])))

    expect(passagem.revelado).toBe(false)
  })
})

describe('avancar', () => {
  it('esconde e anda no mesmo despacho — nunca revelado na posição nova (`PJ-19`)', () => {
    const passagem = avancar(revelar(criarPassagem(['j1', 'j2'])))

    expect({ posicao: passagem.posicao, revelado: passagem.revelado }).toEqual({
      posicao: 1,
      revelado: false,
    })
  })

  it('a volta inteira nunca passa por um estado revelado em posição recém-avançada', () => {
    let passagem = criarPassagem(['j1', 'j2', 'j3'])
    const flagrantes: { posicao: number; revelado: boolean }[] = []

    while (!acabou(passagem)) {
      passagem = revelar(passagem)
      passagem = avancar(passagem)
      flagrantes.push({ posicao: passagem.posicao, revelado: passagem.revelado })
    }

    expect(flagrantes).toEqual([
      { posicao: 1, revelado: false },
      { posicao: 2, revelado: false },
      { posicao: 3, revelado: false },
    ])
  })

  it('não muda a passagem anterior', () => {
    const primeira = revelar(criarPassagem(['j1', 'j2']))

    avancar(primeira)

    expect(primeira).toEqual({ fila: ['j1', 'j2'], posicao: 0, revelado: true })
  })

  it('numa fila de um item só, um avanço já encerra a volta', () => {
    const passagem = avancar(revelar(criarPassagem(['j1'])))

    expect(acabou(passagem)).toBe(true)
  })

  it('não passa do fim quando chamada de novo numa fila terminada', () => {
    const terminada = avancar(criarPassagem(['j1']))

    expect(avancar(terminada).posicao).toBe(1)
  })
})

describe('acabou', () => {
  it('é falso enquanto ainda há alguém pra receber o aparelho', () => {
    expect(acabou(criarPassagem(['j1', 'j2']))).toBe(false)
  })

  it('é verdadeiro numa fila vazia — rodada sem segredo nenhum (`PJ-21`)', () => {
    expect(acabou(criarPassagem([]))).toBe(true)
  })
})
