import { describe, expect, it } from 'vitest'
import { MAX_NA_MESA, motivoParaComecar, nomesDaMesa } from './nomes'

describe('nomesDaMesa', () => {
  it('mantém a ordem da roda e tira o espaço das pontas (`PJ-07`)', () => {
    expect(nomesDaMesa(['  Ana ', 'Bruno', ' Carla'])).toEqual(['Ana', 'Bruno', 'Carla'])
  })
})

describe('motivoParaComecar', () => {
  it('devolve undefined quando a roda está pronta (`PJ-06`)', () => {
    expect(motivoParaComecar(['Ana', 'Bruno', 'Carla'], 'espiao')).toBeUndefined()
  })

  it('diz quantos faltam para o mínimo do jogo (`PJ-08`, `PJ-31`)', () => {
    expect(motivoParaComecar(['Ana', 'Bruno'], 'espiao')).toBe(
      'Precisa de pelo menos 3 pessoas — falta 1.',
    )
    expect(motivoParaComecar(['Ana'], 'espiao')).toBe('Precisa de pelo menos 3 pessoas — faltam 2.')
  })

  it('cobra o mínimo daquele jogo, não um número único (`PJ-31`)', () => {
    expect(motivoParaComecar(['Ana', 'Bruno'], 'quem-sou-eu')).toBeUndefined()
    expect(motivoParaComecar(['Ana', 'Bruno'], 'dedo-na-cara')).toBe(
      'Precisa de pelo menos 3 pessoas — falta 1.',
    )
  })

  it('recusa nome vazio ou só espaço (`PJ-08`)', () => {
    expect(motivoParaComecar(['Ana', '', 'Carla'], 'espiao')).toBe(
      'Tem um nome em branco — escreva quem é ou tire da roda.',
    )
    expect(motivoParaComecar(['Ana', '   ', 'Carla'], 'espiao')).toBe(
      'Tem um nome em branco — escreva quem é ou tire da roda.',
    )
  })

  it('recusa nome repetido ignorando caixa e espaço nas pontas (`PJ-08`)', () => {
    expect(motivoParaComecar(['Ana', 'Bruno', ' bruno '], 'espiao')).toBe(
      'Tem dois "bruno" na roda — a passagem precisa saber pra quem ir.',
    )
    expect(motivoParaComecar(['Ana', 'Bruno', 'Carla'], 'espiao')).toBeUndefined()
  })

  it(`recusa mais de ${MAX_NA_MESA} pessoas (\`PJ-06\`)`, () => {
    const treze = Array.from({ length: MAX_NA_MESA + 1 }, (_, i) => `Jogador ${i + 1}`)
    expect(motivoParaComecar(treze, 'espiao')).toBe('A mesa cabe até 12 pessoas.')
    expect(motivoParaComecar(treze.slice(0, MAX_NA_MESA), 'espiao')).toBeUndefined()
  })

  it('recusa nome mais comprido que o limite de apelido do produto', () => {
    expect(motivoParaComecar(['Ana', 'Bruno', 'Carlaaaaaaaaaaaaaaaa'], 'espiao')).toBe(
      '"Carlaaaaaaaaaaaaaaaa" passou de 16 caracteres.',
    )
  })
})
