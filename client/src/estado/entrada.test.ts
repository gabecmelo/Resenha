import { describe, expect, it } from 'vitest'
import {
  LIMITE_PADRAO,
  caminhoDaSala,
  codigoDaUrl,
  limiteDigitado,
  linkDeConvite,
  motivoParaCriar,
  motivoParaEntrar,
  motivoParaIniciar,
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

describe('caminhoDaSala (AJU-33)', () => {
  it('põe o código da sala no caminho', () => {
    expect(caminhoDaSala('KTVRM')).toBe('/KTVRM')
  })

  it('volta à raiz quando não se está em sala nenhuma', () => {
    expect(caminhoDaSala(null)).toBe('/')
  })

  it('escreve o caminho que `codigoDaUrl` lê de volta', () => {
    expect(codigoDaUrl(caminhoDaSala('KTVRM'))).toBe('KTVRM')
  })
})

describe('motivoParaCriar', () => {
  it('não tem motivo quando o apelido serve', () => {
    expect(motivoParaCriar('Caê', LIMITE_PADRAO)).toBeUndefined()
  })

  it('pede o apelido quando o campo está vazio', () => {
    expect(motivoParaCriar('', LIMITE_PADRAO)).toBe('Escreva um apelido para criar a sala.')
  })

  it('trata apelido só de espaços como vazio', () => {
    expect(motivoParaCriar('   ', LIMITE_PADRAO)).toBe('Escreva um apelido para criar a sala.')
  })

  it('recusa apelido de 1 caractere', () => {
    expect(motivoParaCriar('C', LIMITE_PADRAO)).toBe('Curto demais — mínimo 2 caracteres.')
  })

  it('diz quantos caracteres passaram do máximo', () => {
    expect(motivoParaCriar('Caetano das Neves Jr', LIMITE_PADRAO)).toBe('Passou 4 caracteres.')
  })

  it('usa o singular quando passou um caractere só', () => {
    expect(motivoParaCriar('Caetano das Neves', LIMITE_PADRAO)).toBe('Passou 1 caractere.')
  })

  it('recusa o limite fora da faixa da sala (`AJU-38`)', () => {
    expect(motivoParaCriar('Caê', '21')).toBe('A sala cabe de 2 a 20 pessoas.')
  })

  it('recusa o limite vazio', () => {
    expect(motivoParaCriar('Caê', '')).toBe('A sala cabe de 2 a 20 pessoas.')
  })

  it('cobra o apelido antes do limite', () => {
    expect(motivoParaCriar('', '99')).toBe('Escreva um apelido para criar a sala.')
  })

  it('aceita um limite escolhido dentro da faixa', () => {
    expect(motivoParaCriar('Caê', '3')).toBeUndefined()
  })
})

describe('limiteDigitado (AJU-35, AJU-38)', () => {
  it('abre a criação já preenchida com o padrão de 20 (`AJU-36`)', () => {
    expect(LIMITE_PADRAO).toBe('20')
  })

  it('lê o padrão como limite válido', () => {
    expect(limiteDigitado(LIMITE_PADRAO)).toBe(20)
  })

  it('aceita o mínimo da partida', () => {
    expect(limiteDigitado('2')).toBe(2)
  })

  it('aceita o teto do produto', () => {
    expect(limiteDigitado('20')).toBe(20)
  })

  it('aceita um valor no meio da faixa, com espaços nas pontas', () => {
    expect(limiteDigitado(' 6 ')).toBe(6)
  })

  it('recusa abaixo do mínimo da partida', () => {
    expect(limiteDigitado('1')).toBeNull()
  })

  it('recusa acima do teto do produto', () => {
    expect(limiteDigitado('21')).toBeNull()
  })

  it('recusa campo vazio', () => {
    expect(limiteDigitado('')).toBeNull()
  })

  it('recusa valor com letra', () => {
    expect(limiteDigitado('6a')).toBeNull()
  })

  it('recusa valor quebrado', () => {
    expect(limiteDigitado('4.5')).toBeNull()
  })

  it('recusa valor negativo', () => {
    expect(limiteDigitado('-3')).toBeNull()
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

describe('motivoParaIniciar (AJU-06, AJU-34)', () => {
  it('não tem motivo com o mínimo exato de jogadores ativos', () => {
    expect(motivoParaIniciar(2, 2)).toBeUndefined()
  })

  it('não tem motivo acima do mínimo', () => {
    expect(motivoParaIniciar(5, 2)).toBeUndefined()
  })

  it('diz o que falta com 1 jogador ativo', () => {
    expect(motivoParaIniciar(1, 2)).toBe('Precisa de pelo menos 2 pessoas — falta 1.')
  })

  it('usa o plural quando falta mais de uma pessoa', () => {
    expect(motivoParaIniciar(0, 2)).toBe('Precisa de pelo menos 2 pessoas — faltam 2.')
  })

  // `AD-014` — o mínimo é por jogo. Com o global (2), o lobby de Espião
  // oferecia iniciar com 2 e o servidor recusava depois do clique.
  it('exige o mínimo do jogo, não o do produto (Espião pede 3)', () => {
    expect(motivoParaIniciar(2, 3)).toBe('Precisa de pelo menos 3 pessoas — falta 1.')
    expect(motivoParaIniciar(3, 3)).toBeUndefined()
  })
})
