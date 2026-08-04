import { describe, expect, it } from 'vitest'
import {
  codigoDaUrl,
  linkDeConvite,
  motivoParaCriar,
  motivoParaEntrar,
  normalizarCodigo,
} from './entrada'

describe('codigoDaUrl', () => {
  it('lê o código do caminho do link de convite', () => {
    expect(codigoDaUrl('/KTVRM')).toBe('KTVRM')
  })

  it('aceita minúsculas e barra no fim', () => {
    expect(codigoDaUrl('/ktvrm/')).toBe('KTVRM')
  })

  it('devolve vazio na raiz', () => {
    expect(codigoDaUrl('/')).toBe('')
  })

  it('devolve vazio quando o caminho não tem 5 letras', () => {
    expect(codigoDaUrl('/KTV')).toBe('')
  })

  it('devolve vazio quando há letra fora do alfabeto do código', () => {
    expect(codigoDaUrl('/KTVIO')).toBe('')
  })
})

describe('normalizarCodigo', () => {
  it('põe em maiúsculas e tira os espaços das pontas', () => {
    expect(normalizarCodigo('  ktvrm ')).toBe('KTVRM')
  })

  it('corta o que passa de 5 letras', () => {
    expect(normalizarCodigo('KTVRMXYZ')).toBe('KTVRM')
  })
})

describe('linkDeConvite', () => {
  it('junta a origem com o código', () => {
    expect(linkDeConvite('https://resenha.app', 'KTVRM')).toBe('https://resenha.app/KTVRM')
  })

  it('não duplica a barra quando a origem já termina em barra', () => {
    expect(linkDeConvite('https://resenha.app/', 'KTVRM')).toBe('https://resenha.app/KTVRM')
  })
})

describe('motivoParaCriar', () => {
  it('não tem motivo quando o apelido serve', () => {
    expect(motivoParaCriar('Caê')).toBeUndefined()
  })

  it('pede o apelido quando o campo está vazio', () => {
    expect(motivoParaCriar('')).toBe('Escreva um apelido para criar a sala.')
  })

  it('trata apelido só de espaços como vazio', () => {
    expect(motivoParaCriar('   ')).toBe('Escreva um apelido para criar a sala.')
  })

  it('recusa apelido de 1 caractere', () => {
    expect(motivoParaCriar('C')).toBe('Curto demais — mínimo 2 caracteres.')
  })

  it('diz quantos caracteres passaram do máximo', () => {
    expect(motivoParaCriar('Caetano das Neves Jr')).toBe('Passou 4 caracteres.')
  })

  it('usa o singular quando passou um caractere só', () => {
    expect(motivoParaCriar('Caetano das Neves')).toBe('Passou 1 caractere.')
  })
})

describe('motivoParaEntrar', () => {
  it('não tem motivo com apelido e código completos', () => {
    expect(motivoParaEntrar('Caê', 'KTVRM')).toBeUndefined()
  })

  it('cobra o apelido antes do código', () => {
    expect(motivoParaEntrar('', '')).toBe('Escreva um apelido para entrar.')
  })

  it('pede as 5 letras quando o código está vazio', () => {
    expect(motivoParaEntrar('Caê', '')).toBe('Digite as 5 letras do código.')
  })

  it('diz quantas letras faltam, no plural', () => {
    expect(motivoParaEntrar('Caê', 'KTV')).toBe('Faltam 2 letras do código.')
  })

  it('diz quantas letras faltam, no singular', () => {
    expect(motivoParaEntrar('Caê', 'KTVR')).toBe('Falta 1 letra do código.')
  })

  it('recusa código com letra fora do alfabeto', () => {
    expect(motivoParaEntrar('Caê', 'KTVIO')).toBe('O código não leva I nem O.')
  })
})
