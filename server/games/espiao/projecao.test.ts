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
    pausa: null,
    resultadoVotacao: null,
    pool: ['Submarino', 'Praia', 'Escola'],
    votacoesDaMesa: 0,
    restanteDaRodadaMs: null,
    chutePendente: null,
    chuteFeito: null,
    vencedor: null,
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
    return jogoDe({ votacaoAberta: { abertaEm: 5_000, abertaPor: null, final: false, votos } })
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

  it('mostra quem abriu a votação e o prazo dela (ESP-27, ESP-28)', () => {
    const estado = jogoDe({ votacaoAberta: { abertaEm: 5_000, abertaPor: 'c', final: false, votos: {} } })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.votacaoAberta?.abertaPor).toEqual({
      id: 'c',
      apelido: 'C',
    })
    expect(projecao.jogo?.espiao?.votacaoAberta?.prazoVotacao).toBe(sala.prazos.turno)
  })

  it('votação aberta pelo relógio não atribui `abertaPor` a ninguém (ESP-27)', () => {
    const estado = jogoDe({ votacaoAberta: { abertaEm: 5_000, abertaPor: null, final: false, votos: {} } })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.votacaoAberta?.abertaPor).toBeUndefined()
  })

  it('enquanto a votação corre, o relógio da rodada não corre (ESP-28)', () => {
    const estado = jogoDe({ votacaoAberta: { abertaEm: 5_000, abertaPor: 'a', final: false, votos: {} } })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.prazoRodada).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Resultado da votação (ESP-29, ESP-30, ESP-33)
// ---------------------------------------------------------------------------

describe('resultado da votação (ESP-29, ESP-30, ESP-33)', () => {
  const RESULTADO = {
    votos: { a: 'b', c: 'b' } as Record<JogadorId, JogadorId | 'pular'>,
    abertaPor: 'a',
    acusado: 'b',
    aMesaAcertou: true,
    votosNoAcusado: 2,
    totalAtivos: 3,
    desfecho: 'chuteDoEspiao' as const,
    final: false,
  }

  it('revela quem votou em quem mesmo com `visibilidadeVoto: oculta` (ESP-30)', () => {
    const estado = jogoDe({ resultadoVotacao: RESULTADO })
    const sala = salaDe('jogo', {
      config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, visibilidadeVoto: 'oculta' } },
    })

    const projecao = projetar(estado, sala, 'c')

    expect(projecao.jogo?.espiao?.resultadoVotacao?.votos).toEqual({ a: 'b', c: 'b' })
  })

  it('traz a conta da acusação e o apelido de quem foi acusado (ESP-29)', () => {
    const estado = jogoDe({ resultadoVotacao: RESULTADO })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.resultadoVotacao).toMatchObject({
      acusado: { id: 'b', apelido: 'B' },
      abertaPor: { id: 'a', apelido: 'A' },
      aMesaAcertou: true,
      votosNoAcusado: 2,
      totalAtivos: 3,
      desfecho: 'chuteDoEspiao',
    })
  })

  it('na revelação o resultado não tem prazo pra sumir (ESP-33)', () => {
    const estado = jogoDe({ resultadoVotacao: RESULTADO })
    const sala = salaDe('encerrada')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.resultadoVotacao?.prazoFim).toBeNull()
  })

  it('a mesa toda vê que a rodada está pausada, por quem, e no tempo em que parou (ESP-35)', () => {
    const estado = jogoDe({ pausa: { por: 'a', restanteMs: 90_000 } })
    const sala = salaDe('jogo')

    const projecao = projetar(estado, sala, 'c')

    expect(projecao.jogo?.espiao?.pausadaPor).toEqual({
      id: 'a',
      apelido: 'A',
      restanteMs: 90_000,
    })
  })

  it('sem pausa, `pausadaPor` fica ausente (ESP-35)', () => {
    const projecao = projetar(jogoDe(), salaDe('jogo'), 'a')

    expect(projecao.jogo?.espiao?.pausadaPor).toBeUndefined()
  })

  it('sem votação fechada, `resultadoVotacao` fica ausente (ESP-34)', () => {
    const estado = jogoDe({ resultadoVotacao: null })
    const sala = salaDe('encerrada')

    const projecao = projetar(estado, sala, 'a')

    expect(projecao.jogo?.espiao?.resultadoVotacao).toBeUndefined()
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
