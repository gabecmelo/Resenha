import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type EstadoSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../../shared/protocolo'
import { projetar } from './projecao'
import type { EstadoCartas, JogadaDaRodada } from './regras'

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

function estadoDe(over: Partial<EstadoCartas> = {}): EstadoCartas {
  return {
    montePerguntas: ['sobra 1', 'sobra 2'],
    monteRespostas: ['resto'],
    descartePerguntas: [],
    descarteRespostas: [],
    ordemJuizes: ['a', 'b', 'c'],
    indiceJuiz: 0,
    rodada: 1,
    opcoesPergunta: [],
    pergunta: 'A vida é _____.',
    perguntaRevelada: true,
    maos: { a: ['mao de A'], b: ['mao de B'], c: ['mao de C'] },
    brancaVoltaNa: { a: 0, b: 0, c: 0 },
    rerolls: { a: 2, b: 2, c: 2 },
    jogadas: [],
    pilha: null,
    reveladas: [],
    vencedoraNaPilha: null,
    placar: { a: 0, b: 0, c: 0 },
    fase: 'escolha',
    metaBatida: false,
    ...over,
  }
}

function sala(estado: EstadoCartas | null, over: Partial<EstadoSala<EstadoCartas>> = {}): EstadoSala<EstadoCartas> {
  return {
    codigo: 'ABC123',
    criadaEm: 0,
    fase: 'jogo',
    jogoId: 'cartas-contra-a-turma',
    hostId: 'a',
    limiteJogadores: 12,
    config: { ...CONFIG_PADRAO, pacoteIds: ['cartas-roda-de-amigos'] },
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    jogo: estado,
    chat: [],
    prazos: { turno: 50_000, salaOciosa: null, salaExpirada: null },
    ...over,
  } as EstadoSala<EstadoCartas>
}

const JOGADAS: JogadaDaRodada[] = [
  { autorId: 'b', texto: 'resposta do B', daBranca: false },
  { autorId: 'c', texto: 'resposta do C', daBranca: true },
]

describe('CCT-04 — a mão é do dono', () => {
  it('cada jogador só recebe a própria mão', () => {
    const estado = estadoDe()
    expect(projetar(estado, sala(estado), 'b').jogo?.cartas?.mao).toEqual(['mao de B'])
    expect(projetar(estado, sala(estado), 'c').jogo?.cartas?.mao).toEqual(['mao de C'])
  })

  it('CCT-05: o juiz não recebe mão jogável', () => {
    const estado = estadoDe()
    const projecao = projetar(estado, sala(estado), 'a')
    expect(projecao.jogo?.cartas?.souJuiz).toBe(true)
    expect(projecao.jogo?.cartas?.mao).toBeUndefined()
  })

  it('a mão de outro jogador não vaza em lugar nenhum da projeção', () => {
    const estado = estadoDe()
    const serializada = JSON.stringify(projetar(estado, sala(estado), 'b'))
    expect(serializada).not.toContain('mao de A')
    expect(serializada).not.toContain('mao de C')
  })
})

describe('CCT-06, CCT-07 — a escolha corre às escuras', () => {
  it('o que alguém jogou não sai antes da pilha fechar', () => {
    const estado = estadoDe({ jogadas: JOGADAS })
    const serializada = JSON.stringify(projetar(estado, sala(estado), 'a'))
    expect(serializada).not.toContain('resposta do B')
    expect(serializada).not.toContain('resposta do C')
  })

  it('quem jogou vê a própria carta', () => {
    const estado = estadoDe({ jogadas: JOGADAS })
    expect(projetar(estado, sala(estado), 'b').jogo?.cartas?.minhaJogada).toBe('resposta do B')
  })

  it('CCT-07: a mesa vê quantos jogaram e quem falta, não o quê', () => {
    const estado = estadoDe({ jogadas: [JOGADAS[0]!] })
    const cartas = projetar(estado, sala(estado), 'a').jogo?.cartas
    expect(cartas?.quantosJogaram).toBe(1)
    expect(cartas?.totalEsperado).toBe(2)
    expect(cartas?.faltam).toEqual([{ id: 'c', apelido: 'C' }])
  })

  it('o juiz nunca entra na lista de quem falta', () => {
    const estado = estadoDe()
    expect(projetar(estado, sala(estado), 'a').jogo?.cartas?.faltam.map((j) => j.id)).toEqual(['b', 'c'])
  })

  it('jogador aguardando não conta no total esperado', () => {
    const estado = estadoDe()
    const comEspera = sala(estado, {
      jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')],
    })
    expect(projetar(estado, comEspera, 'a').jogo?.cartas?.totalEsperado).toBe(2)
  })
})

describe('CCT-08 — a pilha é anônima', () => {
  const estado = estadoDe({
    jogadas: JOGADAS,
    pilha: [1, 0],
    reveladas: [0, 1],
    fase: 'julgamento',
  })

  it('CCT-38: virada pra baixo, a pilha viaja sem texto nenhum', () => {
    const fechada = estadoDe({ jogadas: JOGADAS, pilha: [1, 0], fase: 'julgamento' })
    const cartas = projetar(fechada, sala(fechada), 'a').jogo?.cartas
    expect(cartas?.pilha).toEqual([null, null])
    expect(cartas?.todasReveladas).toBe(false)
    // Nem pro juiz: virada pra baixo é virada pra baixo pra mesa inteira.
    expect(JSON.stringify(projetar(fechada, sala(fechada), 'a'))).not.toContain('resposta do B')
  })

  it('CCT-38: o texto entra na projeção de todo mundo assim que o juiz vira', () => {
    const uma = estadoDe({ jogadas: JOGADAS, pilha: [1, 0], reveladas: [0], fase: 'julgamento' })
    for (const quem of ['a', 'b', 'c']) {
      expect(projetar(uma, sala(uma), quem).jogo?.cartas?.pilha).toEqual(['resposta do C', null])
    }
  })

  it('a pilha sai embaralhada, na ordem que o servidor sorteou', () => {
    expect(projetar(estado, sala(estado), 'a').jogo?.cartas?.pilha).toEqual([
      'resposta do C',
      'resposta do B',
    ])
  })

  it('nenhuma autoria acompanha a pilha antes da escolha do juiz', () => {
    const cartas = projetar(estado, sala(estado), 'a').jogo?.cartas
    expect(cartas?.vencedora).toBeUndefined()
    expect(JSON.stringify(cartas?.pilha)).not.toContain('"autor"')
  })

  it('a pilha não existe enquanto a escolha está aberta', () => {
    const aberta = estadoDe({ jogadas: JOGADAS })
    expect(projetar(aberta, sala(aberta), 'a').jogo?.cartas?.pilha).toBeUndefined()
  })
})

describe('CCT-12, CCT-13 — a revelação', () => {
  const estado = estadoDe({
    jogadas: JOGADAS,
    pilha: [1, 0],
    fase: 'revelacao',
    vencedoraNaPilha: 0,
    placar: { a: 0, b: 0, c: 1 },
  })

  it('a autoria da vencedora aparece, e só dela', () => {
    const cartas = projetar(estado, sala(estado), 'b').jogo?.cartas
    expect(cartas?.vencedora).toEqual({
      indice: 0,
      texto: 'resposta do C',
      autor: { id: 'c', apelido: 'C' },
    })
  })

  it('CCT-26: o placar sai do maior pro menor', () => {
    const cartas = projetar(estado, sala(estado), 'a').jogo?.cartas
    expect(cartas?.placar).toEqual([
      { id: 'c', apelido: 'C', pontos: 1 },
      { id: 'a', apelido: 'A', pontos: 0 },
      { id: 'b', apelido: 'B', pontos: 0 },
    ])
  })
})

describe('CCT-29 — a partida encerrada', () => {
  const estado = estadoDe({ placar: { a: 2, b: 5, c: 5 }, fase: 'revelacao' })

  it('o campeão aparece só quando a partida acabou', () => {
    expect(projetar(estado, sala(estado), 'a').jogo?.cartas?.campeoes).toBeUndefined()
    const fim = projetar(estado, sala(estado, { fase: 'encerrada' }), 'a').jogo?.cartas
    expect(fim?.campeoes?.map((c) => c.id).sort()).toEqual(['b', 'c'])
  })

  it('CCT-29: quem chegou depois de encerrada vê o placar final', () => {
    const tarde = sala(estado, {
      fase: 'encerrada',
      jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')],
    })
    const cartas = projetar(estado, tarde, 'd').jogo?.cartas
    expect(cartas?.placar).toHaveLength(3)
    expect(cartas?.campeoes).toHaveLength(2)
  })
})

describe('projeção geral', () => {
  it('no lobby não há projeção de jogo', () => {
    const projecao = projetar(null, sala(null, { fase: 'lobby' }), 'a')
    expect(projecao.jogo).toBeUndefined()
    expect(projecao.sala.jogoId).toBe('cartas-contra-a-turma')
  })

  it('o prazo só aparece na fase a que ele pertence', () => {
    const escolha = estadoDe()
    const escolhaProj = projetar(escolha, sala(escolha), 'a').jogo?.cartas
    expect(escolhaProj?.prazoEscolha).toBe(50_000)
    expect(escolhaProj?.prazoRevelacao).toBeNull()

    const revelacao = estadoDe({ fase: 'revelacao' })
    const revProj = projetar(revelacao, sala(revelacao), 'a').jogo?.cartas
    expect(revProj?.prazoEscolha).toBeNull()
    expect(revProj?.prazoRevelacao).toBe(50_000)
  })

  it('CCT-25: a projeção diz em quantas rodadas a branca volta', () => {
    const estado = estadoDe({ rodada: 3, brancaVoltaNa: { a: 0, b: 6, c: 0 } })
    expect(projetar(estado, sala(estado), 'b').jogo?.cartas?.brancaVoltaEm).toBe(3)
    expect(projetar(estado, sala(estado), 'c').jogo?.cartas?.brancaVoltaEm).toBe(0)
  })

  it('projetar pra quem não está na sala é erro de programação, não de usuário', () => {
    const estado = estadoDe()
    expect(() => projetar(estado, sala(estado), 'z')).toThrow()
  })
})
