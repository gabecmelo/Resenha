import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type EstadoSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../../shared/protocolo'
import { projetar } from './projecao'
import type { EstadoDedo } from './regras'

const CARTA = 'Quem aqui some do grupo e volta como se nada tivesse acontecido'

function jogador(id: JogadorId, situacao: Situacao = 'ativo'): Jogador {
  return {
    id,
    tokenHash: `hash-${id}`,
    apelido: id.toUpperCase(),
    cor: 'vermelho',
    entrouEm: 1_000,
    conectado: true,
    desconectadoEm: null,
    situacao,
  }
}

function estadoDe(over: Partial<EstadoDedo> = {}): EstadoDedo {
  return {
    monte: [],
    descarte: [],
    rodada: 1,
    carta: CARTA,
    fase: 'votacao',
    votos: {},
    vencedorId: null,
    votosNoVencedor: 0,
    empatou: false,
    placar: { a: 0, b: 0, c: 0 },
    metaBatida: false,
    ...over,
  }
}

function sala(
  estado: EstadoDedo | null,
  over: Partial<EstadoSala<EstadoDedo>> = {},
): EstadoSala<EstadoDedo> {
  return {
    codigo: 'ABCDE',
    banidos: [],
    ultimaAcaoEm: 0,
    fase: 'jogo',
    jogoId: 'dedo-na-cara',
    hostId: 'a',
    limiteJogadores: 12,
    config: { ...CONFIG_PADRAO, pacoteIds: ['dedo-role'] },
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    jogo: estado,
    chat: [],
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ...over,
  }
}

function dedoDe(estado: EstadoDedo, quem: JogadorId, over: Partial<EstadoSala<EstadoDedo>> = {}) {
  return projetar(estado, sala(estado, over), quem).jogo?.dedo
}

/** Sala com a votação aberta na configuração. */
function aberta(over: Partial<EstadoSala<EstadoDedo>> = {}): Partial<EstadoSala<EstadoDedo>> {
  return {
    config: {
      ...CONFIG_PADRAO,
      pacoteIds: ['dedo-role'],
      dedo: { ...CONFIG_PADRAO.dedo, votacao: 'aberta' },
    },
    ...over,
  }
}

describe('DEDO-03 — a carta é da mesa inteira', () => {
  it('todo mundo lê a mesma pergunta, sem narrador', () => {
    const estado = estadoDe()
    for (const quem of ['a', 'b', 'c']) {
      expect(dedoDe(estado, quem)?.carta).toBe(CARTA)
    }
  })

  it('ninguém está "na vez": a mesa aponta junto', () => {
    const estado = estadoDe()
    expect(projetar(estado, sala(estado), 'a').jogo?.vezDe).toBeNull()
  })
})

describe('DEDO-08 — o sigilo da votação secreta', () => {
  const estado = estadoDe({ votos: { a: 'b', b: 'c' } })

  it('o alvo do dedo alheio não sai do servidor enquanto a votação está aberta', () => {
    const paraC = dedoDe(estado, 'c')
    expect(paraC?.votos).toEqual([{ eleitor: { id: 'a', apelido: 'A' } }, { eleitor: { id: 'b', apelido: 'B' } }])
    // Não é a tela que esconde: o alvo não trafega.
    expect(JSON.stringify(projetar(estado, sala(estado), 'c'))).not.toContain('"alvo"')
  })

  it('a mesa vê quem já apontou e quantos faltam', () => {
    const paraC = dedoDe(estado, 'c')
    expect(paraC?.quantosVotaram).toBe(2)
    expect(paraC?.quantosDevemVotar).toBe(3)
  })

  it('o próprio dedo sempre volta pra quem o deu', () => {
    expect(dedoDe(estado, 'a')?.meuVoto).toBe('b')
    expect(dedoDe(estado, 'a')?.votos.find((v) => v.eleitor.id === 'a')?.alvo?.id).toBe('b')
    expect(dedoDe(estado, 'c')?.meuVoto).toBeNull()
  })

  it('na votação aberta os dedos vão à vista desde o começo', () => {
    const paraC = dedoDe(estado, 'c', aberta())
    expect(paraC?.votacao).toBe('aberta')
    expect(paraC?.votos.map((v) => v.alvo?.apelido)).toEqual(['B', 'C'])
  })
})

describe('DEDO-11, DEDO-12 — a revelação', () => {
  const estado = estadoDe({
    fase: 'apuracao',
    votos: { a: 'b', b: 'c', c: 'b' },
    vencedorId: 'b',
    votosNoVencedor: 2,
    placar: { a: 0, b: 1, c: 0 },
  })

  it('a apuração abre todos os dedos, inclusive na sala secreta', () => {
    for (const quem of ['a', 'b', 'c']) {
      expect(dedoDe(estado, quem)?.votos.map((v) => v.alvo?.id)).toEqual(['b', 'c', 'b'])
    }
  })

  it('quem levou a carta aparece com a contagem junto', () => {
    expect(dedoDe(estado, 'a')?.vencedor).toEqual({ id: 'b', apelido: 'B', votos: 2 })
    expect(dedoDe(estado, 'a')?.empatou).toBe(false)
  })

  it('DEDO-13: no empate não há vencedor, e a mesa sabe que empatou', () => {
    const empatada = estadoDe({
      fase: 'apuracao',
      votos: { a: 'b', b: 'a' },
      empatou: true,
      placar: { a: 0, b: 0 },
    })
    expect(dedoDe(empatada, 'a')?.vencedor).toBeUndefined()
    expect(dedoDe(empatada, 'a')?.empatou).toBe(true)
  })
})

describe('DEDO-16, DEDO-18 — placar e campeões', () => {
  it('o placar sai ordenado do maior pro menor', () => {
    const estado = estadoDe({ placar: { a: 1, b: 3, c: 2 } })
    expect(dedoDe(estado, 'a')?.placar.map((l) => l.id)).toEqual(['b', 'c', 'a'])
  })

  it('a meta configurada acompanha o placar, pra tela desenhar o quanto falta', () => {
    expect(dedoDe(estadoDe(), 'a')?.metaDePontos).toBe(CONFIG_PADRAO.dedo.metaDePontos)
  })

  it('os campeões só aparecem com a partida encerrada', () => {
    const estado = estadoDe({ placar: { a: 1, b: 3, c: 3 } })
    expect(dedoDe(estado, 'a')?.campeoes).toBeUndefined()
    expect(dedoDe(estado, 'a', { fase: 'encerrada' })?.campeoes?.map((c) => c.id).sort()).toEqual([
      'b',
      'c',
    ])
  })

  it('com a partida encerrada os dedos da última carta continuam à vista', () => {
    const estado = estadoDe({ votos: { a: 'b', b: 'c' } })
    expect(dedoDe(estado, 'c', { fase: 'encerrada' })?.votos[0]?.alvo?.id).toBe('b')
  })
})

describe('DEDO-10 — quem caiu não é esperado', () => {
  it('a conta de quem deve apontar ignora desconectados', () => {
    const jogadores = [jogador('a'), jogador('b'), { ...jogador('c'), conectado: false }]
    expect(dedoDe(estadoDe(), 'a', { jogadores })?.quantosDevemVotar).toBe(2)
  })

  it('quem está aguardando também não entra na conta', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')]
    expect(dedoDe(estadoDe(), 'a', { jogadores })?.quantosDevemVotar).toBe(3)
  })
})

describe('projeção fora da partida', () => {
  it('no lobby não há projeção de jogo', () => {
    expect(projetar(null, sala(null, { fase: 'lobby' }), 'a').jogo).toBeUndefined()
  })

  it('quem não está na sala não recebe projeção nenhuma', () => {
    const estado = estadoDe()
    expect(() => projetar(estado, sala(estado), 'z')).toThrow()
  })

  it('os pacotes escolhidos chegam à sala pra tela nomear a fonte das cartas', () => {
    const estado = estadoDe({ pacotesSelecionados: [{ id: 'dedo-role', nome: 'O Rolê', emoji: '🍻' }] })
    const projecao = projetar(estado, sala(estado), 'a')
    expect(projecao.sala.pacotesSelecionados?.map((p) => p.nome)).toEqual(['O Rolê'])
  })
})
