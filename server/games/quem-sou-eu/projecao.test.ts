import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type Cor,
  type EstadoSala,
  type Fase,
  type Jogador,
  type JogadorId,
  MAX_JOGADORES,
  type Projecao,
  type Situacao,
} from '../../../shared/protocolo'
import type { EstadoQuemSouEu } from './regras'
import { projetar } from './projecao'

/**
 * Textos improváveis de colidir com qualquer outra parte do payload — o teste
 * de não-vazamento procura por eles no JSON inteiro da projeção.
 */
const CARTAS: Record<JogadorId, string> = {
  a: 'ZORGLUBIANO-ALFA-9174',
  b: 'QUIMBUNDO-BETA-5520',
  c: 'XERIFOSTOMO-GAMA-3381',
}

const NOTAS: Record<JogadorId, string> = {
  a: 'nota-privada-de-A-PLUTONIO-771',
  b: 'nota-privada-de-B-SELENITA-882',
  c: 'nota-privada-de-C-TITANITA-993',
}

const ATIVOS = ['a', 'b', 'c']
const FASES_DE_PARTIDA: Fase[] = ['escrita', 'jogo', 'encerrada']

function jogador(id: JogadorId, situacao: Situacao = 'ativo', entrouEm = 1_000): Jogador {
  return {
    id,
    tokenHash: `hash-${id}`,
    apelido: id.toUpperCase(),
    cor: `cor-${id}` as Cor,
    entrouEm,
    conectado: true,
    desconectadoEm: null,
    situacao,
  }
}

/** Rodada com todas as cartas escritas, notas preenchidas e rodízio montado. */
function jogoDe(over: Partial<EstadoQuemSouEu> = {}): EstadoQuemSouEu {
  return {
    atribuicoes: { a: 'b', b: 'c', c: 'a' },
    cartas: { ...CARTAS },
    prontos: [...ATIVOS],
    ordem: [...ATIVOS],
    vezDe: 'a',
    descobriram: [],
    declaracaoPendente: null,
    reveladoParaTodos: false,
    notas: { ...NOTAS },
    ...over,
  }
}

function salaDe(
  fase: Fase,
  over: Partial<EstadoSala<EstadoQuemSouEu>> = {},
): EstadoSala<EstadoQuemSouEu> {
  return {
    codigo: 'ABCDE',
    fase,
    hostId: 'a',
    limiteJogadores: MAX_JOGADORES,
    jogadores: [
      jogador('a', 'ativo', 1_000),
      jogador('b', 'ativo', 2_000),
      jogador('c', 'ativo', 3_000),
      jogador('d', 'aguardando', 4_000),
    ],
    banidos: [],
    config: { ...CONFIG_PADRAO },
    chat: [
      { em: 1_500, texto: 'bora!', tipo: 'jogador', autorId: 'b', apelido: 'B', cor: 'laranja' },
      { em: 1_600, texto: 'A partida começou.', tipo: 'sistema' },
    ],
    jogo: null,
    prazos: { turno: 90_000, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ultimaAcaoEm: 2_000,
    ...over,
  }
}

/** Procura o texto no payload inteiro, inclusive em campos aninhados. */
function payloadContem(projecao: Projecao, texto: string): boolean {
  return JSON.stringify(projecao).includes(texto)
}

// ---------------------------------------------------------------------------
// JOGO-02 — o requisito mais crítico do produto
// ---------------------------------------------------------------------------

describe('não-vazamento da própria carta (JOGO-02)', () => {
  it('nunca inclui a carta do jogador em nenhum lugar do payload, em nenhuma fase', () => {
    const vazamentos: string[] = []

    for (const fase of FASES_DE_PARTIDA) {
      const jogo = jogoDe()
      const sala = salaDe(fase, { jogo })
      for (const id of ATIVOS) {
        if (payloadContem(projetar(jogo, sala, id), CARTAS[id])) vazamentos.push(`${fase}/${id}`)
      }
    }

    expect(vazamentos).toEqual([])
  })

  it('nunca inclui a carta do jogador enquanto há declaração pendente', () => {
    const vazamentos: string[] = []

    for (const declarante of ATIVOS) {
      const jogo = jogoDe({ declaracaoPendente: { jogadorId: declarante, declaradaEm: 5_000 } })
      const sala = salaDe('jogo', { jogo })
      for (const id of ATIVOS) {
        if (payloadContem(projetar(jogo, sala, id), CARTAS[id])) {
          vazamentos.push(`pendente:${declarante}/${id}`)
        }
      }
    }

    expect(vazamentos).toEqual([])
  })

  it('nunca inclui a carta de quem ainda não descobriu, mesmo com outro já confirmado', () => {
    const jogo = jogoDe({ descobriram: ['b'] })
    const sala = salaDe('jogo', { jogo })

    const vazamentos = ['a', 'c'].filter((id) =>
      payloadContem(projetar(jogo, sala, id), CARTAS[id]),
    )

    expect(vazamentos).toEqual([])
  })

  it('o detector de vazamento não é vazio: as cartas dos outros estão no payload', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    const projecaoDeA = projetar(jogo, sala, 'a')

    expect(payloadContem(projecaoDeA, CARTAS['b'])).toBe(true)
    expect(payloadContem(projecaoDeA, CARTAS['c'])).toBe(true)
  })
})

describe('lista de cartas (JOGO-01)', () => {
  it('traz a carta de todos os outros jogadores ativos', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    const projecao = projetar(jogo, sala, 'a')

    const cartas = Object.fromEntries(projecao.jogadores.map((j) => [j.id, j.carta]))
    expect(cartas).toEqual({
      a: undefined,
      b: CARTAS['b'],
      c: CARTAS['c'],
      d: undefined,
    })
  })

  it('omite o campo da própria carta em vez de enviá-lo vazio', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    const projecao = projetar(jogo, sala, 'b')

    const ficha = projecao.jogadores.find((j) => j.id === 'b')
    expect(ficha !== undefined && 'carta' in ficha).toBe(false)
  })

  it('não traz minhaCarta durante o jogo', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    expect(projetar(jogo, sala, 'a').eu.minhaCarta).toBeUndefined()
  })
})

describe('revelação após a confirmação (DESC-04)', () => {
  const jogo = jogoDe({ descobriram: ['b'] })
  const sala = salaDe('jogo', { jogo })

  it('mostra a carta ao jogador que teve a descoberta confirmada', () => {
    expect(projetar(jogo, sala, 'b').eu.minhaCarta).toBe(CARTAS['b'])
  })

  it('a própria carta continua ausente para quem não teve confirmação', () => {
    const comMinhaCarta = ['a', 'b', 'c'].filter(
      (id) => projetar(jogo, sala, id).eu.minhaCarta !== undefined,
    )

    expect(comMinhaCarta).toEqual(['b'])
  })

  it('marca o jogador como "descobriu" para todos', () => {
    const projecao = projetar(jogo, sala, 'c')

    expect(projecao.jogadores.filter((j) => j.descobriu).map((j) => j.id)).toEqual(['b'])
  })
})

describe('revelação geral (FIM-02)', () => {
  const jogo = jogoDe({ reveladoParaTodos: true })
  const sala = salaDe('encerrada', { jogo })

  it('mostra a própria carta a todos os jogadores ativos', () => {
    const minhas = Object.fromEntries(
      ATIVOS.map((id) => [id, projetar(jogo, sala, id).eu.minhaCarta]),
    )

    expect(minhas).toEqual(CARTAS)
  })

  it('mostra todas as cartas na lista de jogadores', () => {
    const projecao = projetar(jogo, sala, 'a')

    expect(Object.fromEntries(projecao.jogadores.map((j) => [j.id, j.carta]))).toEqual({
      ...CARTAS,
      d: undefined,
    })
  })

  it('mostra todas as cartas também a quem está aguardando', () => {
    const projecao = projetar(jogo, sala, 'd')

    expect(
      Object.fromEntries(
        projecao.jogadores.filter((j) => j.situacao === 'ativo').map((j) => [j.id, j.carta]),
      ),
    ).toEqual(CARTAS)
  })
})

describe('alvo e carta escrita (ESCR-02, ESCR-04)', () => {
  it('traz o alvo do jogador com id e apelido', () => {
    const jogo = jogoDe()
    const sala = salaDe('escrita', { jogo })

    expect(projetar(jogo, sala, 'a').eu.alvo).toEqual({ id: 'b', apelido: 'B' })
  })

  it('traz a carta que o jogador escreveu', () => {
    const jogo = jogoDe()
    const sala = salaDe('escrita', { jogo })

    expect(projetar(jogo, sala, 'a').eu.cartaQueEscrevi).toBe(CARTAS['b'])
  })

  it('não traz alvo nem carta escrita para quem está aguardando', () => {
    const jogo = jogoDe()
    const sala = salaDe('escrita', { jogo })

    const eu = projetar(jogo, sala, 'd').eu
    expect({ alvo: eu.alvo, cartaQueEscrevi: eu.cartaQueEscrevi }).toEqual({
      alvo: undefined,
      cartaQueEscrevi: undefined,
    })
  })

  it('conta o progresso "N de M prontos" apenas entre os ativos', () => {
    const jogo = jogoDe({ prontos: ['a', 'b'] })
    const sala = salaDe('escrita', { jogo })

    expect(projetar(jogo, sala, 'c').jogo).toMatchObject({ prontos: 2, total: 3 })
  })

  it('marca na lista quem já está PRONTO', () => {
    const jogo = jogoDe({ prontos: ['a', 'b'] })
    const sala = salaDe('escrita', { jogo })

    const projecao = projetar(jogo, sala, 'c')

    expect(projecao.jogadores.filter((j) => j.pronto).map((j) => j.id)).toEqual(['a', 'b'])
  })

  describe('com pacote (PKT-12, PKT-23, PKT-24)', () => {
    it('projeta as opções do pacote para o próprio jogador', () => {
      const jogo = jogoDe({
        pacotesSelecionados: [{ id: 'filmes', nome: 'Filmes', emoji: '🎬' }],
        opcoesPorJogador: { a: ['Matrix', 'Titanic', 'Avatar'] },
      })
      const sala = salaDe('escrita', { jogo })

      const projecao = projetar(jogo, sala, 'a')

      expect(projecao.eu.opcoesPacote).toEqual(['Matrix', 'Titanic', 'Avatar'])
      // Outros não veem as minhas opções
      expect(projetar(jogo, sala, 'b').eu.opcoesPacote).toBeUndefined()
    })

    it('projeta o status de jaSorteouOutras para o jogador', () => {
      const jogo = jogoDe({
        pacotesSelecionados: [{ id: 'filmes', nome: 'Filmes', emoji: '🎬' }],
        jaSorteouOutras: { a: true },
      })
      const sala = salaDe('escrita', { jogo })

      expect(projetar(jogo, sala, 'a').eu.jaSorteouOutras).toBe(true)
      expect(projetar(jogo, sala, 'b').eu.jaSorteouOutras).toBe(false)
    })
  })

  describe('pacotesSelecionados na sala (T9, `PKT2-07`)', () => {
    it('projeta um único pacote selecionado, na fase jogo', () => {
      const jogo = jogoDe({
        pacotesSelecionados: [{ id: 'filmes', nome: 'Filmes', emoji: '🎬' }],
      })
      const sala = salaDe('jogo', { jogo })

      const projecao = projetar(jogo, sala, 'a')

      expect(projecao.sala.pacotesSelecionados).toEqual([
        { id: 'filmes', nome: 'Filmes', emoji: '🎬', descricao: '', quantidade: 0 },
      ])
    })

    it('projeta todos os pacotes selecionados, não só o primeiro, na fase encerrada (`PKT2-07`)', () => {
      const jogo = jogoDe({
        pacotesSelecionados: [
          { id: 'filmes', nome: 'Filmes', emoji: '🎬' },
          { id: 'anime', nome: 'Anime', emoji: '🍥' },
        ],
      })
      const sala = salaDe('encerrada', { jogo })

      const projecao = projetar(jogo, sala, 'a')

      expect(projecao.sala.pacotesSelecionados).toEqual([
        { id: 'filmes', nome: 'Filmes', emoji: '🎬', descricao: '', quantidade: 0 },
        { id: 'anime', nome: 'Anime', emoji: '🍥', descricao: '', quantidade: 0 },
      ])
    })

    it('não projeta pacotesSelecionados quando modoPacote não é pacote (mesma regra de `PKT-25`)', () => {
      const jogo = jogoDe()
      const sala = salaDe('jogo', { jogo })

      const projecao = projetar(jogo, sala, 'a')

      expect(projecao.sala.pacotesSelecionados).toBeUndefined()
    })
  })
})

describe('bloco de notas (NOTA-01, NOTA-02)', () => {
  it('traz as notas do próprio jogador', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    expect(projetar(jogo, sala, 'b').eu.notas).toBe(NOTAS['b'])
  })

  it('nunca traz a nota de outro jogador em nenhum lugar do payload', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    const vazamentos: string[] = []
    for (const leitor of ATIVOS) {
      const projecao = projetar(jogo, sala, leitor)
      for (const dono of ATIVOS) {
        if (dono !== leitor && payloadContem(projecao, NOTAS[dono])) {
          vazamentos.push(`${leitor} viu nota de ${dono}`)
        }
      }
    }

    expect(vazamentos).toEqual([])
  })

  it('devolve notas vazias para quem nunca escreveu', () => {
    const jogo = jogoDe({ notas: {} })
    const sala = salaDe('jogo', { jogo })

    expect(projetar(jogo, sala, 'a').eu.notas).toBe('')
  })
})

describe('quem confirma a declaração (DESC-02, DESC-03)', () => {
  it('marca souConfirmador apenas para o host quando outro jogador declara', () => {
    const jogo = jogoDe({ declaracaoPendente: { jogadorId: 'c', declaradaEm: 5_000 } })
    const sala = salaDe('jogo', { jogo })

    const confirmadores = ['a', 'b', 'c', 'd'].filter(
      (id) => projetar(jogo, sala, id).eu.souConfirmador,
    )

    expect(confirmadores).toEqual(['a'])
  })

  it('marca souConfirmador para o mais antigo conectado quando o host declara', () => {
    const jogo = jogoDe({ declaracaoPendente: { jogadorId: 'a', declaradaEm: 5_000 } })
    const sala = salaDe('jogo', { jogo })

    const confirmadores = ['a', 'b', 'c', 'd'].filter(
      (id) => projetar(jogo, sala, id).eu.souConfirmador,
    )

    expect(confirmadores).toEqual(['b'])
  })

  it('não marca ninguém como confirmador quando não há declaração pendente', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    const confirmadores = ['a', 'b', 'c', 'd'].filter(
      (id) => projetar(jogo, sala, id).eu.souConfirmador,
    )

    expect(confirmadores).toEqual([])
  })

  it('anuncia a declaração pendente identificando o jogador, sem a carta (DESC-01)', () => {
    const jogo = jogoDe({ declaracaoPendente: { jogadorId: 'c', declaradaEm: 5_000 } })
    const sala = salaDe('jogo', { jogo })

    const projecao = projetar(jogo, sala, 'c')

    expect(projecao.jogo?.declaracaoPendente).toEqual({ jogadorId: 'c' })
    expect(payloadContem(projecao, CARTAS['c'])).toBe(false)
  })
})

describe('sala e chat (CHAT-04)', () => {
  it('entrega o histórico de chat da sala', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    expect(projetar(jogo, sala, 'a').chat).toEqual(sala.chat)
  })

  it('traz o prazo do turno como instante absoluto', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    expect(projetar(jogo, sala, 'a').jogo?.prazoTurno).toBe(90_000)
  })

  it('identifica o host e a situação de quem recebe a projeção', () => {
    const jogo = jogoDe()
    const sala = salaDe('jogo', { jogo })

    expect(projetar(jogo, sala, 'd').eu).toMatchObject({
      id: 'd',
      ehHost: false,
      situacao: 'aguardando',
    })
  })
})

describe('lobby, antes de existir partida', () => {
  it('não traz bloco de jogo nem carta alguma', () => {
    const sala = salaDe('lobby')

    const projecao = projetar(null, sala, 'a')

    expect(projecao.jogo).toBeUndefined()
    expect(projecao.jogadores.every((j) => j.carta === undefined)).toBe(true)
  })

  it('não traz alvo, notas nem confirmação pendente', () => {
    const sala = salaDe('lobby')

    expect(projetar(null, sala, 'a').eu).toEqual({
      id: 'a',
      ehHost: true,
      situacao: 'ativo',
      souConfirmador: false,
      pronto: false,
      notas: '',
    })
  })
})
