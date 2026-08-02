import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type Ambiente,
  type ContextoDeSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../../shared/protocolo'
import {
  CARTA_MAX_CARACTERES,
  type ComandoQuemSouEu,
  type EstadoQuemSouEu,
  MIN_JOGADORES,
  iniciarRodada,
  reduzir,
} from './regras'

const AMBIENTE: Ambiente = { agora: 10_000, aleatorio: Math.random }

function jogador(id: JogadorId, situacao: Situacao = 'ativo', entrouEm = 1_000): Jogador {
  return {
    id,
    tokenHash: `hash-${id}`,
    apelido: id.toUpperCase(),
    cor: 'carmim',
    entrouEm,
    conectado: true,
    desconectadoEm: null,
    situacao,
  }
}

function ctx(over: Partial<ContextoDeSala> = {}): ContextoDeSala {
  return {
    fase: 'escrita',
    hostId: 'a',
    config: { ...CONFIG_PADRAO },
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    autorId: 'a',
    ...over,
  }
}

function rodadaDe(jogadores: Jogador[]): EstadoQuemSouEu {
  const resultado = iniciarRodada(jogadores, AMBIENTE)
  if (!resultado.ok) throw new Error(`rodada inesperadamente recusada: ${resultado.erro}`)
  return resultado.valor
}

function reduzirOk(
  estado: EstadoQuemSouEu,
  contexto: ContextoDeSala,
  comando: ComandoQuemSouEu,
  ambiente: Ambiente = AMBIENTE,
) {
  const resultado = reduzir(estado, contexto, comando, ambiente)
  if (!resultado.ok) throw new Error(`comando inesperadamente recusado: ${resultado.erro}`)
  return resultado
}

/** Leva a fase de escrita ao ponto em que o host pode acionar "Começar". */
function todosEscrevemEProntos(estado: EstadoQuemSouEu, base: ContextoDeSala): EstadoQuemSouEu {
  let atual = estado
  for (const j of base.jogadores.filter((x) => x.situacao === 'ativo')) {
    const comoAutor = { ...base, autorId: j.id }
    atual = reduzirOk(atual, comoAutor, { t: 'escreverCarta', texto: `carta de ${j.id}` }).estado
    atual = reduzirOk(atual, comoAutor, { t: 'marcarPronto', pronto: true }).estado
  }
  return atual
}

// ---------------------------------------------------------------------------

describe('iniciarRodada (ESCR-01, HOST-01)', () => {
  it('recusa iniciar com menos de 3 jogadores ativos', () => {
    const resultado = iniciarRodada([jogador('a'), jogador('b')], AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('aceita iniciar com exatamente 3 jogadores ativos', () => {
    const estado = rodadaDe([jogador('a'), jogador('b'), jogador('c')])

    expect(Object.keys(estado.atribuicoes).sort()).toEqual(['a', 'b', 'c'])
  })

  it('atribui a cada ativo um alvo diferente de si mesmo', () => {
    const estado = rodadaDe([jogador('a'), jogador('b'), jogador('c'), jogador('d')])

    const pontosFixos = Object.keys(estado.atribuicoes).filter(
      (id) => estado.atribuicoes[id] === id,
    )
    expect({ pontosFixos, alvos: Object.values(estado.atribuicoes).sort() }).toEqual({
      pontosFixos: [],
      alvos: ['a', 'b', 'c', 'd'],
    })
  })

  it('deixa os jogadores aguardando fora do sorteio (SALA-10)', () => {
    const estado = rodadaDe([
      jogador('a'),
      jogador('b'),
      jogador('c'),
      jogador('d', 'aguardando'),
    ])

    expect(Object.keys(estado.atribuicoes).sort()).toEqual(['a', 'b', 'c'])
    expect(Object.values(estado.atribuicoes)).not.toContain('d')
  })

  it('recusa quando os ativos são menos de 3, mesmo com jogadores aguardando na sala', () => {
    const resultado = iniciarRodada(
      [jogador('a'), jogador('b'), jogador('c', 'aguardando')],
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('começa sem cartas, sem prontos e sem rodízio', () => {
    const estado = rodadaDe([jogador('a'), jogador('b'), jogador('c')])

    expect({
      cartas: estado.cartas,
      prontos: estado.prontos,
      ordem: estado.ordem,
      vezDe: estado.vezDe,
      reveladoParaTodos: estado.reveladoParaTodos,
    }).toEqual({ cartas: {}, prontos: [], ordem: [], vezDe: null, reveladoParaTodos: false })
  })
})

describe('escreverCarta (ESCR-03)', () => {
  it('recusa carta com mais de 60 caracteres', () => {
    const estado = rodadaDe(ctx().jogadores)

    const resultado = reduzir(
      estado,
      ctx(),
      { t: 'escreverCarta', texto: 'x'.repeat(CARTA_MAX_CARACTERES + 1) },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('aceita carta com exatamente 60 caracteres', () => {
    const estado = rodadaDe(ctx().jogadores)
    const texto = 'x'.repeat(CARTA_MAX_CARACTERES)

    const { estado: novo } = reduzirOk(estado, ctx(), { t: 'escreverCarta', texto })

    expect(novo.cartas[estado.atribuicoes['a']]).toBe(texto)
  })

  it('recusa carta formada apenas por espaços', () => {
    const estado = rodadaDe(ctx().jogadores)

    const resultado = reduzir(estado, ctx(), { t: 'escreverCarta', texto: '    ' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('recusa carta vazia', () => {
    const estado = rodadaDe(ctx().jogadores)

    const resultado = reduzir(estado, ctx(), { t: 'escreverCarta', texto: '' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('normaliza quebras de linha para uma única linha', () => {
    const estado = rodadaDe(ctx().jogadores)

    const { estado: novo } = reduzirOk(estado, ctx(), {
      t: 'escreverCarta',
      texto: 'De Volta\npara o\r\nFuturo',
    })

    expect(novo.cartas[estado.atribuicoes['a']]).toBe('De Volta para o Futuro')
  })

  it('guarda a carta sob o dono, não sob quem a escreveu', () => {
    const estado = rodadaDe(ctx().jogadores)
    const alvoDeA = estado.atribuicoes['a']

    const { estado: novo } = reduzirOk(estado, ctx(), { t: 'escreverCarta', texto: 'Chapolin' })

    expect(Object.keys(novo.cartas)).toEqual([alvoDeA])
    expect(novo.cartas['a']).toBeUndefined()
  })

  it('não altera o estado recebido quando a carta é recusada', () => {
    const estado = rodadaDe(ctx().jogadores)
    const antes = structuredClone(estado)

    reduzir(estado, ctx(), { t: 'escreverCarta', texto: '   ' }, AMBIENTE)

    expect(estado).toEqual(antes)
  })

  it('recusa escrever fora da fase de escrita', () => {
    const estado = rodadaDe(ctx().jogadores)

    const resultado = reduzir(
      estado,
      ctx({ fase: 'jogo' }),
      { t: 'escreverCarta', texto: 'Chapolin' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('recusa escrever de quem entrou depois e não tem alvo', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')]
    const estado = rodadaDe(jogadores)

    const resultado = reduzir(
      estado,
      ctx({ jogadores, autorId: 'd' }),
      { t: 'escreverCarta', texto: 'Chapolin' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })
})

describe('marcarPronto (ESCR-04, ESCR-05)', () => {
  it('registra o jogador entre os prontos', () => {
    const estado = rodadaDe(ctx().jogadores)
    const comCarta = reduzirOk(estado, ctx(), { t: 'escreverCarta', texto: 'Chapolin' }).estado

    const { estado: novo } = reduzirOk(comCarta, ctx(), { t: 'marcarPronto', pronto: true })

    expect(novo.prontos).toEqual(['a'])
  })

  it('recusa PRONTO de quem ainda não escreveu a carta', () => {
    const estado = rodadaDe(ctx().jogadores)

    const resultado = reduzir(estado, ctx(), { t: 'marcarPronto', pronto: true }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('desmarcar PRONTO tira o jogador da lista de prontos', () => {
    const estado = rodadaDe(ctx().jogadores)
    const pronto = todosEscrevemEProntos(estado, ctx())

    const { estado: novo } = reduzirOk(pronto, ctx(), { t: 'marcarPronto', pronto: false })

    expect(novo.prontos).toEqual(['b', 'c'])
  })

  it('desmarcar PRONTO libera a edição da carta enquanto a fase é escrita', () => {
    const estado = rodadaDe(ctx().jogadores)
    const pronto = todosEscrevemEProntos(estado, ctx())
    const solto = reduzirOk(pronto, ctx(), { t: 'marcarPronto', pronto: false }).estado

    const { estado: novo } = reduzirOk(solto, ctx(), { t: 'escreverCarta', texto: 'Outra carta' })

    expect(novo.cartas[estado.atribuicoes['a']]).toBe('Outra carta')
  })

  it('recusa editar a carta enquanto o jogador está PRONTO', () => {
    const estado = rodadaDe(ctx().jogadores)
    const pronto = todosEscrevemEProntos(estado, ctx())

    const resultado = reduzir(pronto, ctx(), { t: 'escreverCarta', texto: 'Outra' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('anuncia no chat quando o último ativo fica PRONTO (CHAT-03)', () => {
    const estado = rodadaDe(ctx().jogadores)
    const doisProntos = todosEscrevemEProntos(estado, {
      ...ctx(),
      jogadores: [jogador('a'), jogador('b')],
    })
    const contexto = { ...ctx(), autorId: 'c' }
    const comCarta = reduzirOk(doisProntos, contexto, {
      t: 'escreverCarta',
      texto: 'carta de c',
    }).estado

    const { eventos } = reduzirOk(comCarta, contexto, { t: 'marcarPronto', pronto: true })

    expect(eventos).toHaveLength(1)
  })

  it('não anuncia enquanto houver ativo pendente', () => {
    const estado = rodadaDe(ctx().jogadores)
    const comCarta = reduzirOk(estado, ctx(), { t: 'escreverCarta', texto: 'Chapolin' }).estado

    const { eventos } = reduzirOk(comCarta, ctx(), { t: 'marcarPronto', pronto: true })

    expect(eventos).toEqual([])
  })
})

describe('comecar (ESCR-06, HOST-06)', () => {
  it('recusa começar enquanto houver ativo pendente', () => {
    const estado = rodadaDe(ctx().jogadores)
    const comCarta = reduzirOk(estado, ctx(), { t: 'escreverCarta', texto: 'Chapolin' }).estado
    const umPronto = reduzirOk(comCarta, ctx(), { t: 'marcarPronto', pronto: true }).estado

    const resultado = reduzir(umPronto, ctx(), { t: 'comecar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'PRONTOS_PENDENTES' })
  })

  it('move a sala para o jogo quando todos os ativos estão PRONTO', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(ctx().jogadores), ctx())

    const resultado = reduzirOk(pronto, ctx(), { t: 'comecar' })

    expect(resultado.faseSeguinte).toBe('jogo')
  })

  it('recusa começar quando quem aciona não é o host', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(ctx().jogadores), ctx())

    const resultado = reduzir(pronto, ctx({ autorId: 'b' }), { t: 'comecar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('não exige PRONTO de quem está aguardando', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')]
    const contexto = ctx({ jogadores })
    const pronto = todosEscrevemEProntos(rodadaDe(jogadores), contexto)

    const resultado = reduzirOk(pronto, contexto, { t: 'comecar' })

    expect(resultado.faseSeguinte).toBe('jogo')
    expect(resultado.estado.ordem).not.toContain('d')
  })
})

describe('cancelar (ESCR-09, ESCR-10)', () => {
  it('descarta as cartas e devolve a sala ao lobby', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(ctx().jogadores), ctx())

    const resultado = reduzirOk(pronto, ctx(), { t: 'cancelar' })

    expect({
      fase: resultado.faseSeguinte,
      cartas: resultado.estado.cartas,
      atribuicoes: resultado.estado.atribuicoes,
      prontos: resultado.estado.prontos,
    }).toEqual({ fase: 'lobby', cartas: {}, atribuicoes: {}, prontos: [] })
  })

  it('pede a promoção de quem estava aguardando, para incluí-lo na próxima', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(ctx().jogadores), ctx())

    const resultado = reduzirOk(pronto, ctx(), { t: 'cancelar' })

    expect(resultado.promoverAguardando).toBe(true)
  })

  it('recusa cancelar quando quem aciona não é o host', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(ctx().jogadores), ctx())

    const resultado = reduzir(pronto, ctx({ autorId: 'c' }), { t: 'cancelar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })
})

describe('saída de jogador durante a escrita (ESCR-07, ESCR-08)', () => {
  const quatro = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]

  it('descarta todas as cartas escritas', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(quatro), ctx({ jogadores: quatro }))
    const restantes = [jogador('a'), jogador('b'), jogador('c')]

    const resultado = reduzirOk(pronto, ctx({ jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'd',
    })

    expect(resultado.estado.cartas).toEqual({})
  })

  it('sorteia novos alvos entre os ativos restantes', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(quatro), ctx({ jogadores: quatro }))
    const restantes = [jogador('a'), jogador('b'), jogador('c')]

    const resultado = reduzirOk(pronto, ctx({ jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'd',
    })

    const atribuicoes = resultado.estado.atribuicoes
    expect({
      escritores: Object.keys(atribuicoes).sort(),
      alvos: Object.values(atribuicoes).sort(),
      pontosFixos: Object.keys(atribuicoes).filter((id) => atribuicoes[id] === id),
    }).toEqual({
      escritores: ['a', 'b', 'c'],
      alvos: ['a', 'b', 'c'],
      pontosFixos: [],
    })
  })

  it('zera todos os PRONTO', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(quatro), ctx({ jogadores: quatro }))
    const restantes = [jogador('a'), jogador('b'), jogador('c')]

    const resultado = reduzirOk(pronto, ctx({ jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'd',
    })

    expect(resultado.estado.prontos).toEqual([])
  })

  it('cancela a partida e volta ao lobby quando sobram menos de 3 ativos', () => {
    const trio = ctx().jogadores
    const pronto = todosEscrevemEProntos(rodadaDe(trio), ctx())
    const restantes = [jogador('a'), jogador('b')]

    const resultado = reduzirOk(pronto, ctx({ jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'c',
    })

    expect({
      fase: resultado.faseSeguinte,
      atribuicoes: resultado.estado.atribuicoes,
      cartas: resultado.estado.cartas,
      minimo: MIN_JOGADORES,
    }).toEqual({ fase: 'lobby', atribuicoes: {}, cartas: {}, minimo: 3 })
  })

  it('anuncia a redistribuição no chat (CHAT-03)', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(quatro), ctx({ jogadores: quatro }))
    const restantes = [jogador('a'), jogador('b'), jogador('c')]

    const resultado = reduzirOk(pronto, ctx({ jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'd',
    })

    expect(resultado.eventos).toHaveLength(1)
  })

  it('não redistribui quando quem sai estava apenas aguardando', () => {
    const jogadores = [...ctx().jogadores, jogador('d', 'aguardando')]
    const pronto = todosEscrevemEProntos(rodadaDe(jogadores), ctx({ jogadores }))

    const resultado = reduzirOk(pronto, ctx(), { t: 'saiuJogador', jogadorId: 'd' })

    expect(resultado.estado).toEqual(pronto)
  })
})

describe('entrada de jogador durante a escrita (ESCR-10)', () => {
  it('não redistribui os alvos nem zera os PRONTO', () => {
    const pronto = todosEscrevemEProntos(rodadaDe(ctx().jogadores), ctx())
    const jogadores = [...ctx().jogadores, jogador('d', 'aguardando')]

    const resultado = reduzirOk(pronto, ctx({ jogadores }), {
      t: 'entrouJogador',
      jogadorId: 'd',
    })

    expect(resultado.estado).toEqual(pronto)
  })
})
