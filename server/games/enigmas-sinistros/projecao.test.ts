import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type EstadoSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../../shared/protocolo'
import { projetar } from './projecao'
import type { EstadoEnigmas } from './regras'

const ENIGMA = {
  cena: 'O homem morreu de sede dentro de um caminhão-pipa cheio d’água.',
  solucao: 'Ele era o motorista e ficou preso nas ferragens depois de capotar.',
}

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

function estadoDe(over: Partial<EstadoEnigmas> = {}): EstadoEnigmas {
  return {
    monte: [],
    descarte: [],
    ordemNarradores: ['a', 'b', 'c'],
    indiceNarrador: 0,
    rodada: 1,
    enigma: ENIGMA,
    fase: 'enigma',
    perguntas: [],
    proximoIdPergunta: 1,
    declaracao: null,
    tentativas: [],
    desatouId: null,
    placar: { a: 0, b: 0, c: 0 },
    metaBatida: false,
    ...over,
  }
}

function sala(
  estado: EstadoEnigmas | null,
  over: Partial<EstadoSala<EstadoEnigmas>> = {},
): EstadoSala<EstadoEnigmas> {
  return {
    codigo: 'ABC123',
    banidos: [],
    ultimaAcaoEm: 0,
    fase: 'jogo',
    jogoId: 'enigmas-sinistros',
    hostId: 'a',
    limiteJogadores: 12,
    config: { ...CONFIG_PADRAO, pacoteIds: ['enigmas-casos-estranhos'] },
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    jogo: estado,
    chat: [],
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ...over,
  }
}

function enigmasDe(estado: EstadoEnigmas, quem: JogadorId, over = {}) {
  return projetar(estado, sala(estado, over), quem).jogo?.enigmas
}

describe('ENIG-05 — a solução é do narrador', () => {
  const estado = estadoDe()

  it('a cena vai pra mesa toda', () => {
    for (const quem of ['a', 'b', 'c']) {
      expect(enigmasDe(estado, quem)?.cena).toBe(ENIGMA.cena)
    }
  })

  it('a solução só entra na projeção do narrador', () => {
    expect(enigmasDe(estado, 'a')?.solucao).toBe(ENIGMA.solucao)
    for (const quem of ['b', 'c']) {
      expect(enigmasDe(estado, quem)?.solucao).toBeUndefined()
      // Não é a tela que esconde: o texto não trafega.
      expect(JSON.stringify(projetar(estado, sala(estado), quem))).not.toContain('ferragens')
    }
  })

  it('na revelação a solução abre pra mesa inteira', () => {
    const revelando = estadoDe({ fase: 'revelacao', desatouId: 'b' })
    for (const quem of ['a', 'b', 'c']) {
      expect(enigmasDe(revelando, quem)?.solucao).toBe(ENIGMA.solucao)
      expect(enigmasDe(revelando, quem)?.desatou?.id).toBe('b')
    }
  })

  it('com a partida encerrada a solução continua à vista', () => {
    const estado = estadoDe()
    expect(enigmasDe(estado, 'b', { fase: 'encerrada' })?.solucao).toBe(ENIGMA.solucao)
  })
})

describe('ENIG-10, ENIG-11 — o histórico de perguntas', () => {
  const estado = estadoDe({
    perguntas: [
      { id: 1, autorId: 'b', texto: 'ele morreu afogado?', resposta: 'nao' },
      { id: 2, autorId: 'c', texto: 'era o motorista?', resposta: null },
    ],
  })

  it('a mesa toda lê pergunta, autor e resposta', () => {
    for (const quem of ['a', 'b', 'c']) {
      const projetadas = enigmasDe(estado, quem)?.perguntas
      expect(projetadas).toHaveLength(2)
      expect(projetadas?.[0]).toEqual({
        id: 1,
        texto: 'ele morreu afogado?',
        autor: { id: 'b', apelido: 'B' },
        resposta: 'nao',
      })
      expect(projetadas?.[1]?.resposta).toBeNull()
    }
  })

  it('a fila conta só o que falta responder', () => {
    expect(enigmasDe(estado, 'a')?.naFila).toBe(1)
  })

  it('cada um sabe se é a própria pergunta que está na fila', () => {
    expect(enigmasDe(estado, 'c')?.minhaPerguntaNaFila).toBe(true)
    expect(enigmasDe(estado, 'b')?.minhaPerguntaNaFila).toBe(false)
  })
})

describe('ENIG-14 — a declaração pendente', () => {
  const estado = estadoDe({ declaracao: { autorId: 'b', texto: 'foi o paraquedas' } })

  it('a mesa sabe quem declarou, sem ler o que foi declarado', () => {
    const paraC = enigmasDe(estado, 'c')
    expect(paraC?.declaracaoPendente?.autor.apelido).toBe('B')
    expect(paraC?.declaracaoPendente?.texto).toBeUndefined()
    expect(JSON.stringify(projetar(estado, sala(estado), 'c'))).not.toContain('paraquedas')
  })

  it('o narrador lê o texto, porque é ele quem julga', () => {
    expect(enigmasDe(estado, 'a')?.declaracaoPendente?.texto).toBe('foi o paraquedas')
  })

  it('quem declarou continua vendo o que escreveu', () => {
    expect(enigmasDe(estado, 'b')?.declaracaoPendente?.texto).toBe('foi o paraquedas')
    expect(enigmasDe(estado, 'b')?.souEuQueDeclarei).toBe(true)
    expect(enigmasDe(estado, 'c')?.souEuQueDeclarei).toBe(false)
  })
})

describe('ENIG-17, ENIG-24 — tentativas e placar', () => {
  it('ENIG-17: a tentativa julgada é pública, com o veredito junto', () => {
    const estado = estadoDe({
      tentativas: [{ autorId: 'b', texto: 'foi o irmão', acertou: false }],
    })
    for (const quem of ['a', 'b', 'c']) {
      expect(enigmasDe(estado, quem)?.tentativas).toEqual([
        { autor: { id: 'b', apelido: 'B' }, texto: 'foi o irmão', acertou: false },
      ])
    }
  })

  it('ENIG-24: o placar sai ordenado do maior pro menor', () => {
    const estado = estadoDe({ placar: { a: 1, b: 3, c: 2 } })
    expect(enigmasDe(estado, 'a')?.placar.map((l) => l.id)).toEqual(['b', 'c', 'a'])
  })

  it('ENIG-26: os campeões só aparecem com a partida encerrada', () => {
    const estado = estadoDe({ placar: { a: 1, b: 3, c: 3 } })
    expect(enigmasDe(estado, 'a')?.campeoes).toBeUndefined()
    expect(enigmasDe(estado, 'a', { fase: 'encerrada' })?.campeoes?.map((c) => c.id).sort()).toEqual(['b', 'c'])
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
})
