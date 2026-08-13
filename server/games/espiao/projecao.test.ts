import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type Cor,
  type EstadoSala,
  type Fase,
  type Jogador,
  type JogadorId,
  MAX_JOGADORES,
  type Situacao,
} from '../../../shared/protocolo'
import type { EstadoEspiao } from './regras'
import { projetar } from './projecao'

function jogador(id: JogadorId, situacao: Situacao = 'ativo', conectado = true): Jogador {
  return {
    id,
    tokenHash: `hash-${id}`,
    apelido: id.toUpperCase(),
    cor: `cor-${id}` as Cor,
    entrouEm: 1_000,
    conectado,
    desconectadoEm: conectado ? null : 500,
    situacao,
  }
}

/** Rodada em andamento: `b` é o espião, `a` começa perguntando. */
function jogoDe(over: Partial<EstadoEspiao> = {}): EstadoEspiao {
  return {
    local: 'Submarino',
    espioes: ['b'],
    comecaPerguntando: 'a',
    prontos: ['a', 'b', 'c'],
    rodadaIniciada: true,
    votacaoAberta: null,
    notas: {},
    ...over,
  }
}

function salaDe(
  fase: Fase,
  over: Partial<EstadoSala<EstadoEspiao>> = {},
): EstadoSala<EstadoEspiao> {
  return {
    codigo: 'ABCDE',
    fase,
    hostId: 'a',
    jogoId: 'espiao',
    limiteJogadores: MAX_JOGADORES,
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    banidos: [],
    config: { ...CONFIG_PADRAO },
    chat: [],
    jogo: null,
    prazos: { turno: 90_000, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ultimaAcaoEm: 2_000,
    ...over,
  }
}

// ---------------------------------------------------------------------------
// Local (ESP-07, ESP-08)
// ---------------------------------------------------------------------------

describe('visibilidade do local (ESP-07, ESP-08)', () => {
  it('esconde o local de quem é espião', () => {
    const estado = jogoDe()
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'b')

    expect(projecao.jogo?.espiao?.local).toBeUndefined()
  })

  it('mostra o local pra quem não é espião', () => {
    const estado = jogoDe()
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.local).toBe('Submarino')
  })

  it('sinaliza `souEspiao: true` na própria projeção do espião', () => {
    const estado = jogoDe()
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'b')

    expect(projecao.jogo?.espiao?.souEspiao).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Espiões entre si (ESP-17)
// ---------------------------------------------------------------------------

describe('visibilidade de outros espiões (ESP-17)', () => {
  it('espiões se veem quando `espioesSeVeem` está ligado', () => {
    const estado = jogoDe({ espioes: ['a', 'b'] })
    const sala = salaDe('jogo', {
      config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, espioesSeVeem: true } },
    })

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.espioes).toEqual([
      { id: 'a', apelido: 'A' },
      { id: 'b', apelido: 'B' },
    ])
  })

  it('espiões não se veem quando `espioesSeVeem` está desligado — só sabe que é espião', () => {
    const estado = jogoDe({ espioes: ['a', 'b'] })
    const sala = salaDe('jogo', {
      config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, espioesSeVeem: false } },
    })

    const projecao = projetar(estado, sala, 'a')

    expect({ souEspiao: projecao.jogo?.espiao?.souEspiao, espioes: projecao.jogo?.espiao?.espioes }).toEqual({
      souEspiao: true,
      espioes: undefined,
    })
  })

  it('quem não é espião nunca vê a lista de espiões durante a rodada', () => {
    const estado = jogoDe({ espioes: ['b'] })
    const sala = salaDe('jogo', {
      config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, espioesSeVeem: true } },
    })

    const projecao = projetar(estado, sala, 'c')

    expect(projecao.jogo?.espiao?.espioes).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Fase encerrada (ESP-16)
// ---------------------------------------------------------------------------

describe('revelação ao encerrar (ESP-16)', () => {
  it('revela local e espiões pra todos, mesmo quem era espião', () => {
    const estado = jogoDe({ espioes: ['b'] })
    const sala = salaDe('encerrada')

    const paraA = projetar(estado, sala, 'a')
    const paraB = projetar(estado, sala, 'b')

    expect([paraA.jogo?.espiao?.local, paraB.jogo?.espiao?.local]).toEqual(['Submarino', 'Submarino'])
    expect([paraA.jogo?.espiao?.espioes, paraB.jogo?.espiao?.espioes]).toEqual([
      [{ id: 'b', apelido: 'B' }],
      [{ id: 'b', apelido: 'B' }],
    ])
  })

  it('revela pra quem entrou na sala depois de encerrada', () => {
    const estado = jogoDe({ espioes: ['b'] })
    const sala = salaDe('encerrada', {
      jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')],
    })

    const projecao = projetar(estado, sala, 'd')

    expect({ local: projecao.jogo?.espiao?.local, espioes: projecao.jogo?.espiao?.espioes }).toEqual({
      local: 'Submarino',
      espioes: [{ id: 'b', apelido: 'B' }],
    })
  })
})

// ---------------------------------------------------------------------------
// Votação (ESP-18, ESP-19)
// ---------------------------------------------------------------------------

describe('visibilidade da votação (ESP-18, ESP-19)', () => {
  function estadoComVotacao(votos: Record<JogadorId, JogadorId | 'pular'>): EstadoEspiao {
    return jogoDe({ votacaoAberta: { abertaEm: 5_000, votos } })
  }

  it('`tempoReal` mostra os votos, atualizados conforme cada jogador vota', () => {
    const estado = estadoComVotacao({ a: 'b' })
    const sala = salaDe('jogo', {
      config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, visibilidadeVoto: 'tempoReal' } },
    })

    const projecao = projetar(estado, sala, 'c')

    expect(projecao.jogo?.espiao?.votacaoAberta?.votos).toEqual({ a: 'b' })
  })

  it('`oculta` esconde os votos enquanto a votação está aberta', () => {
    const estado = estadoComVotacao({ a: 'b' })
    const sala = salaDe('jogo', {
      config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, visibilidadeVoto: 'oculta' } },
    })

    const projecao = projetar(estado, sala, 'c')

    expect(projecao.jogo?.espiao?.votacaoAberta?.votos).toBeUndefined()
  })

  it('`meuVoto` reflete o voto do próprio jogador', () => {
    const estado = estadoComVotacao({ a: 'b', c: 'pular' })
    const sala = salaDe('jogo')

    const paraA = projetar(estado, sala, 'a')
    const paraC = projetar(estado, sala, 'c')
    const paraB = projetar(estado, sala, 'b')

    expect([
      paraA.jogo?.espiao?.votacaoAberta?.meuVoto,
      paraC.jogo?.espiao?.votacaoAberta?.meuVoto,
      paraB.jogo?.espiao?.votacaoAberta?.meuVoto,
    ]).toEqual(['b', 'pular', null])
  })

  it('`quantosVotaram`/`total` contam só ativos conectados', () => {
    const estado = estadoComVotacao({ a: 'b' })
    const sala = salaDe('jogo', {
      jogadores: [jogador('a'), jogador('b', 'ativo', false), jogador('c')],
    })

    const projecao = projetar(estado, sala, 'a')

    expect({
      quantosVotaram: projecao.jogo?.espiao?.votacaoAberta?.quantosVotaram,
      total: projecao.jogo?.espiao?.votacaoAberta?.total,
    }).toEqual({ quantosVotaram: 1, total: 2 })
  })

  it('sem votação aberta, `votacaoAberta` fica ausente', () => {
    const estado = jogoDe({ votacaoAberta: null })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.votacaoAberta).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Campos gerais
// ---------------------------------------------------------------------------

describe('campos gerais da projeção de Espião', () => {
  it('estado `null` (lobby) não monta `jogo`', () => {
    const sala = salaDe('lobby')

    const projecao = projetar(null, sala, 'a')

    expect(projecao.jogo).toBeUndefined()
  })

  it('`comecaPerguntando` traz id e apelido', () => {
    const estado = jogoDe({ comecaPerguntando: 'c' })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.comecaPerguntando).toEqual({ id: 'c', apelido: 'C' })
  })

  it('`rodadaIniciada` e `prontos`/`total` refletem o estado', () => {
    const estado = jogoDe({ rodadaIniciada: false, prontos: ['a'] })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect({
      rodadaIniciada: projecao.jogo?.espiao?.rodadaIniciada,
      prontos: projecao.jogo?.espiao?.prontos,
      total: projecao.jogo?.espiao?.total,
    }).toEqual({ rodadaIniciada: false, prontos: 1, total: 3 })
  })

  it('a nota gravada nunca chega à projeção de outro jogador', () => {
    const estado = jogoDe({ notas: { a: 'segredo de a' } })
    const sala = salaDe('jogo')

    const paraOutro = JSON.stringify(projetar(estado, sala, 'b'))

    expect(paraOutro).not.toContain('segredo de a')
    expect(projetar(estado, sala, 'a').eu.notas).toBe('segredo de a')
  })
})
