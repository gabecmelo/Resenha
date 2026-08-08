import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type Ambiente,
  type Config,
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
    cor: 'vermelho',
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

function rodadaDe(
  jogadores: Jogador[],
  over: Partial<ContextoDeSala> = {},
  pacote?: { id: string; nome: string; emoji: string; cartas: readonly string[] }
): EstadoQuemSouEu {
  const resultado = iniciarRodada(ctx({ jogadores, ...over }), AMBIENTE, pacote)
  if (!resultado.ok) throw new Error(`rodada inesperadamente recusada: ${resultado.erro}`)
  return resultado.valor
}

function rodadaDeResultado(
  jogadores: Jogador[],
  over: Partial<ContextoDeSala> = {},
  pacote?: { id: string; nome: string; emoji: string; cartas: readonly string[] }
) {
  return iniciarRodada(ctx({ jogadores, ...over }), AMBIENTE, pacote)
}

function reduzirOk(
  estado: EstadoQuemSouEu,
  contexto: ContextoDeSala,
  comando: ComandoQuemSouEu,
  ambiente: Ambiente = AMBIENTE,
) {
  let estadoHack = estado;
  if (comando.t === 'declararDescobri' && estado.vezDe !== contexto.autorId) {
    estadoHack = { ...estado, vezDe: contexto.autorId };
  }
  const resultado = reduzir(estadoHack, contexto, comando, ambiente)
  if (!resultado.ok) throw new Error(`comando inesperadamente recusado: \${resultado.erro}`)
  if (resultado.ok && estadoHack !== estado) {
    if (resultado.estado === estadoHack) {
      resultado.estado = estado;
    } else {
      resultado.estado.vezDe = estado.vezDe;
    }
  }
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

/** Sala já em JOGO. Ordem "entrada" por padrão, para o rodízio ser previsível. */
function emJogo(over: Partial<ContextoDeSala> = {}) {
  const base = ctx({ config: { ...CONFIG_PADRAO, ordemTurnos: 'entrada' }, ...over })
  const pronto = todosEscrevemEProntos(rodadaDe(base.jogadores), base)
  const { estado } = reduzirOk(pronto, base, { t: 'comecar' })
  return { estado, contexto: ctx({ ...base, fase: 'jogo' }) }
}

// ---------------------------------------------------------------------------

describe('iniciarRodada (ESCR-01, AJU-06, AJU-08)', () => {
  it('recusa iniciar com apenas 1 jogador ativo', () => {
    const resultado = rodadaDeResultado([jogador('a')])

    expect(resultado).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('aceita iniciar com exatamente 2 jogadores ativos (AJU-06)', () => {
    const estado = rodadaDe([jogador('a'), jogador('b')])

    expect(Object.keys(estado.atribuicoes).sort()).toEqual(['a', 'b'])
  })

  it('produz o ciclo A→B→A com exatamente 2 jogadores, sem ponto fixo (AJU-08)', () => {
    for (let i = 0; i < 200; i += 1) {
      const estado = rodadaDe([jogador('a'), jogador('b')])

      expect(estado.atribuicoes).toEqual({ a: 'b', b: 'a' })
    }
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

  it('recusa quando os ativos são menos de 2, mesmo com jogadores aguardando na sala', () => {
    const resultado = rodadaDeResultado(
      [jogador('a'), jogador('b', 'aguardando'), jogador('c', 'aguardando')]
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

describe('iniciarRodada com pacote (PKT-08, PKT-09, PKT-11)', () => {
  const pacoteMock = {
    id: 'filmes',
    nome: 'Filmes',
    emoji: '🎬',
    cartas: ['Matrix', 'Titanic', 'Avatar', 'Alien', 'Shrek'],
  }

  it('recusa pacote com menos cartas do que jogadores ativos (PKT-09)', () => {
    const pequeno = { ...pacoteMock, cartas: ['Matrix'] }
    const resultado = rodadaDeResultado([jogador('a'), jogador('b')], {}, pequeno)
    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_INSUFICIENTE' })
  })

  it('com distribuição aleatória, pula a fase de escrita e preenche cartas (PKT-08, PKT-10)', () => {
    const estado = rodadaDe(
      [jogador('a'), jogador('b'), jogador('c')],
      { config: { ...CONFIG_PADRAO, modoDistribuicao: 'aleatoria' } },
      pacoteMock
    )
    
    // As cartas foram preenchidas e os jogadores marcados como prontos
    expect(Object.keys(estado.cartas)).toHaveLength(3)
    expect(estado.prontos.sort()).toEqual(['a', 'b', 'c'])
    expect(estado.vezDe).not.toBeNull()
  })

  it('com distribuição escolha, gera opcoesPorJogador e vai para escrita (PKT-11)', () => {
    const estado = rodadaDe(
      [jogador('a'), jogador('b'), jogador('c')],
      { config: { ...CONFIG_PADRAO, modoDistribuicao: 'escolha' } },
      pacoteMock
    )
    
    expect(Object.keys(estado.cartas)).toHaveLength(0)
    expect(estado.prontos).toEqual([])
    
    // Todos recebem opções (são 5 cartas no pacote e 3 jogadores)
    // Pela lógica, distribuirá 1 opção para cada, já que 5 / 3 = 1
    expect(estado.opcoesPorJogador?.['a']).toHaveLength(1)
    expect(estado.opcoesPorJogador?.['b']).toHaveLength(1)
    expect(estado.opcoesPorJogador?.['c']).toHaveLength(1)
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

  describe('com pacote (PKT-14)', () => {
    const pacoteMock = {
      id: 'filmes',
      nome: 'Filmes',
      emoji: '🎬',
      cartas: ['Matrix', 'Titanic', 'Avatar', 'Alien', 'Shrek', 'Rocky', 'Terminator'],
    }

    it('aceita carta se estiver entre as opções do jogador', () => {
      const estado = rodadaDe(
        ctx().jogadores,
        { config: { ...CONFIG_PADRAO, modoDistribuicao: 'escolha' } },
        pacoteMock
      )
      const opcaoValida = estado.opcoesPorJogador!['a'][0]

      const resultado = reduzir(estado, ctx(), { t: 'escreverCarta', texto: opcaoValida }, AMBIENTE)
      expect(resultado.ok).toBe(true)
      if (resultado.ok) {
        expect(resultado.estado.cartas[estado.atribuicoes['a']]).toBe(opcaoValida)
      }
    })

    it('recusa carta se não estiver entre as opções do jogador', () => {
      const estado = rodadaDe(
        ctx().jogadores,
        { config: { ...CONFIG_PADRAO, modoDistribuicao: 'escolha' } },
        pacoteMock
      )
      // A string a seguir nunca estará nas opções sorteadas,
      // a menos que haja muito poucas cartas e ela foi sorteada.
      // O mock tem 7 cartas. 3 jogadores * 1 opção = 3 sorteadas.
      const resultado = reduzir(estado, ctx(), { t: 'escreverCarta', texto: 'A Bela e a Fera' }, AMBIENTE)
      expect(resultado).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
    })
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

describe('sortearOutras (PKT-15, PKT-16, PKT-33)', () => {
  const pacoteMock = {
    id: 'filmes',
    nome: 'Filmes',
    emoji: '🎬',
    cartas: Array.from({ length: 20 }, (_, i) => `Filme ${i + 1}`),
  }

  function setupEscolha() {
    return rodadaDe(
      ctx().jogadores,
      { config: { ...CONFIG_PADRAO, modoDistribuicao: 'escolha' } },
      pacoteMock
    )
  }

  it('substitui as 5 opções do jogador por 5 novas do pacote (PKT-15, PKT-33)', () => {
    const estado = setupEscolha()
    const opcoesAntigas = estado.opcoesPorJogador!['a']

    const { estado: novo } = reduzirOk(estado, ctx(), { t: 'sortearOutras' })

    const opcoesNovas = novo.opcoesPorJogador!['a']
    expect(opcoesNovas).toHaveLength(5)
    expect(opcoesNovas).not.toEqual(opcoesAntigas)
    // Marca que já sorteou
    expect(novo.jaSorteouOutras?.['a']).toBe(true)
    // As cartas restantes do pacote devem diminuir em 5
    expect(novo.cartasRestantesPacote?.length).toBe(estado.cartasRestantesPacote!.length - 5)
  })

  it('recusa se o jogador já tiver sorteado outras opções (PKT-16)', () => {
    const estado = setupEscolha()
    const primeiroSorteio = reduzirOk(estado, ctx(), { t: 'sortearOutras' }).estado

    const resultado = reduzir(primeiroSorteio, ctx(), { t: 'sortearOutras' }, AMBIENTE)
    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('recusa se o jogador já estiver PRONTO', () => {
    const estado = setupEscolha()
    const opcao = estado.opcoesPorJogador!['a'][0]
    const comCarta = reduzirOk(estado, ctx(), { t: 'escreverCarta', texto: opcao }).estado
    const pronto = reduzirOk(comCarta, ctx(), { t: 'marcarPronto', pronto: true }).estado

    const resultado = reduzir(pronto, ctx(), { t: 'sortearOutras' }, AMBIENTE)
    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('recusa se a distribuição não for "escolha"', () => {
    const estado = rodadaDe(ctx().jogadores) // Livre
    const resultado = reduzir(estado, ctx(), { t: 'sortearOutras' }, AMBIENTE)
    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
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

  it('leva ao jogo uma partida de 2 jogadores (AJU-06)', () => {
    const jogadores = [jogador('a'), jogador('b')]
    const contexto = ctx({ jogadores, config: { ...CONFIG_PADRAO, ordemTurnos: 'entrada' } })
    const pronto = todosEscrevemEProntos(rodadaDe(jogadores), contexto)

    const resultado = reduzirOk(pronto, contexto, { t: 'comecar' })

    expect({ fase: resultado.faseSeguinte, ordem: resultado.estado.ordem }).toEqual({
      fase: 'jogo',
      ordem: ['a', 'b'],
    })
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

  it('redistribui, sem cancelar, quando ainda sobram 2 ativos (AJU-07)', () => {
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
    }).toEqual({ fase: undefined, atribuicoes: { a: 'b', b: 'a' } })
  })

  it('cancela a partida e volta ao lobby quando sobram menos de 2 ativos (AJU-07)', () => {
    const trio = ctx().jogadores
    const pronto = todosEscrevemEProntos(rodadaDe(trio), ctx())
    const restantes = [jogador('a')]

    const resultado = reduzirOk(pronto, ctx({ jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'c',
    })

    expect({
      fase: resultado.faseSeguinte,
      atribuicoes: resultado.estado.atribuicoes,
      cartas: resultado.estado.cartas,
      minimo: MIN_JOGADORES,
    }).toEqual({ fase: 'lobby', atribuicoes: {}, cartas: {}, minimo: 2 })
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

describe('ordem do rodízio (JOGO-03, CFG-01)', () => {
  it('respeita a ordem de entrada quando a configuração é "entrada"', () => {
    const { estado } = emJogo()

    expect(estado.ordem).toEqual(['a', 'b', 'c'])
  })

  it('deixa fora do rodízio quem está aguardando', () => {
    const jogadores = [...ctx().jogadores, jogador('d', 'aguardando')]

    const { estado } = emJogo({ jogadores })

    expect(estado.ordem).toEqual(['a', 'b', 'c'])
  })

  it('inclui exatamente os ativos quando a configuração é "sorteada"', () => {
    const base = ctx({ config: { ...CONFIG_PADRAO, ordemTurnos: 'sorteada' } })
    const pronto = todosEscrevemEProntos(rodadaDe(base.jogadores), base)

    const { estado } = reduzirOk(pronto, base, { t: 'comecar' })

    expect([...estado.ordem].sort()).toEqual(['a', 'b', 'c'])
  })

  it('sorteia de fato a ordem quando a configuração é "sorteada"', () => {
    const base = ctx({ config: { ...CONFIG_PADRAO, ordemTurnos: 'sorteada' } })
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d'), jogador('e')]
    const contexto = ctx({ ...base, jogadores })
    const pronto = todosEscrevemEProntos(rodadaDe(jogadores), contexto)

    const ordens = new Set<string>()
    for (let i = 0; i < 200; i += 1) {
      ordens.add(JSON.stringify(reduzirOk(pronto, contexto, { t: 'comecar' }).estado.ordem))
    }

    expect(ordens.size).toBeGreaterThan(1)
  })

  it('começa a partida com a vez do primeiro da ordem', () => {
    const { estado } = emJogo()

    expect(estado.vezDe).toBe('a')
  })
})

describe('passarVez e pularVez (JOGO-04, JOGO-05, JOGO-06)', () => {
  it('avança para o próximo da ordem quando o jogador da vez passa', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' })

    expect(resultado.estado.vezDe).toBe('b')
  })

  it('deixa o host avançar a vez mesmo sem ser o jogador da vez', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' })
    const daVezB = resultado.estado

    expect(reduzirOk(daVezB, { ...contexto, autorId: 'a' }, { t: 'passarVez' }).estado.vezDe).toBe(
      'c',
    )
  })

  it('rejeita quem não é o jogador da vez nem o host', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzir(
      estado,
      { ...contexto, autorId: 'c' },
      { t: 'passarVez' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('rejeita passar a vez fora da fase de jogo', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzir(
      estado,
      { ...contexto, fase: 'escrita' },
      { t: 'passarVez' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('deixa o host pular a vez de qualquer jogador', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'pularVez' })

    expect(resultado.estado.vezDe).toBe('b')
  })

  it('rejeita pular a vez quando quem aciona não é o host', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzir(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' }, AMBIENTE)
    const daVezB = resultado.ok ? resultado.estado : estado

    expect(reduzir(daVezB, { ...contexto, autorId: 'b' }, { t: 'pularVez' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'SEM_AUTORIDADE',
    })
  })

  it('anuncia a troca de vez no chat (CHAT-03)', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' })

    expect(resultado.eventos).toEqual([{ texto: 'É a vez de B.' }])
  })
})

describe('volta ao início da ordem (JOGO-09)', () => {
  it('devolve a vez ao primeiro do rodízio quando o último passa', () => {
    const { estado, contexto } = emJogo()
    const daVezB = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' }).estado
    const daVezC = reduzirOk(daVezB, { ...contexto, autorId: 'b' }, { t: 'passarVez' }).estado

    const resultado = reduzirOk(daVezC, { ...contexto, autorId: 'c' }, { t: 'passarVez' })

    expect(resultado.estado.vezDe).toBe('a')
  })
})

describe('tempo por turno (JOGO-07, JOGO-08, CFG-03)', () => {
  const comTempo = { ...CONFIG_PADRAO, ordemTurnos: 'entrada' as const, tempoTurnoSeg: 30 }

  it('agenda o prazo do turno ao começar a partida', () => {
    const base = ctx({ config: comTempo })
    const pronto = todosEscrevemEProntos(rodadaDe(base.jogadores), base)

    const resultado = reduzirOk(pronto, base, { t: 'comecar' })

    expect(resultado.prazos).toEqual({ turno: AMBIENTE.agora + 30_000 })
  })

  it('reagenda o prazo do turno a cada troca de vez', () => {
    const { estado, contexto } = emJogo({ config: comTempo })

    const resultado = reduzir(
      estado,
      { ...contexto, autorId: 'a' },
      { t: 'passarVez' },
      { ...AMBIENTE, agora: 50_000 },
    )

    expect(resultado.ok && resultado.prazos).toEqual({ turno: 80_000 })
  })

  it('avança a vez quando o prazo do turno vence', () => {
    const { estado, contexto } = emJogo({ config: comTempo })

    const resultado = reduzirOk(estado, contexto, { t: 'venceuPrazoTurno' })

    expect(resultado.estado.vezDe).toBe('b')
  })

  it('não agenda prazo de turno quando a configuração é "sem limite"', () => {
    const base = ctx({ config: { ...CONFIG_PADRAO, ordemTurnos: 'entrada' } })
    const pronto = todosEscrevemEProntos(rodadaDe(base.jogadores), base)

    const resultado = reduzirOk(pronto, base, { t: 'comecar' })

    expect(resultado.prazos).toEqual({ turno: null })
  })

  it('nunca avança a vez por tempo quando a configuração é "sem limite"', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, contexto, { t: 'venceuPrazoTurno' })

    expect(resultado.estado.vezDe).toBe('a')
  })
})

describe('saída de jogador durante o jogo (JOGO-10)', () => {
  it('avança a vez quando quem sai é o jogador da vez', () => {
    const { estado, contexto } = emJogo()
    const restantes = [jogador('b'), jogador('c')]

    const resultado = reduzirOk(estado, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'a',
    })

    expect(resultado.estado.vezDe).toBe('b')
  })

  it('devolve a vez ao primeiro do rodízio quando quem sai é o último da ordem', () => {
    const { estado, contexto } = emJogo()
    const daVezC = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'pularVez' }).estado
    const daVezCDeFato = reduzirOk(daVezC, { ...contexto, autorId: 'a' }, { t: 'pularVez' }).estado
    const restantes = [jogador('a'), jogador('b')]

    const resultado = reduzirOk(daVezCDeFato, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'c',
    })

    expect(resultado.estado.vezDe).toBe('a')
  })

  it('mantém a vez quando quem sai não é o jogador da vez', () => {
    const { estado, contexto } = emJogo()
    const restantes = [jogador('a'), jogador('b')]

    const resultado = reduzirOk(estado, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'c',
    })

    expect(resultado.estado.vezDe).toBe('a')
  })

  it('tira o jogador do rodízio e some com a carta dele', () => {
    const { estado, contexto } = emJogo()
    const restantes = [jogador('a'), jogador('b')]

    const resultado = reduzirOk(estado, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'c',
    })

    expect(resultado.estado.ordem).toEqual(['a', 'b'])
    expect(Object.keys(resultado.estado.cartas).sort()).toEqual(['a', 'b'])
    expect(Object.keys(resultado.estado.atribuicoes)).not.toContain('c')
    expect(Object.values(resultado.estado.atribuicoes)).not.toContain('c')
  })

  it('não redistribui as cartas dos que ficaram', () => {
    const { estado, contexto } = emJogo()
    const restantes = [jogador('a'), jogador('b')]

    const resultado = reduzirOk(estado, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'c',
    })

    expect(resultado.estado.cartas['a']).toBe(estado.cartas['a'])
    expect(resultado.estado.cartas['b']).toBe(estado.cartas['b'])
  })
})

describe('declararDescobri (DESC-01, DESC-09, DESC-10)', () => {
  it('retorna SEM_AUTORIDADE quando não é a vez do jogador', () => {
    const { estado, contexto } = emJogo()
    const resultado = reduzir(estado, { ...contexto, autorId: 'b' }, { t: 'declararDescobri' }, AMBIENTE)
    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('permite declarar quando é a vez do jogador', () => {
    const { estado, contexto } = emJogo()
    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'declararDescobri' })
    expect(resultado.estado.declaracaoPendente).not.toBeNull()
  })
  it('coloca a declaração em pendente', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'b' }, { t: 'declararDescobri' })

    expect(resultado.estado.declaracaoPendente).toEqual({
      jogadorId: 'b',
      declaradaEm: AMBIENTE.agora,
    })
  })

  it('não revela nenhuma carta ao declarar', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'b' }, { t: 'declararDescobri' })

    expect({
      cartas: resultado.estado.cartas,
      descobriram: resultado.estado.descobriram,
      reveladoParaTodos: resultado.estado.reveladoParaTodos,
    }).toEqual({ cartas: estado.cartas, descobriram: [], reveladoParaTodos: false })
  })

  it('anuncia a declaração no chat (CHAT-03)', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'b' }, { t: 'declararDescobri' })

    expect(resultado.eventos).toEqual([{ texto: 'B declarou que descobriu!' }])
  })

  it('recusa declarar fora da fase de jogo', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzir(
      estado,
      { ...contexto, fase: 'escrita', autorId: 'b' },
      { t: 'declararDescobri' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('recusa declaração de quem está apenas aguardando', () => {
    const jogadores = [...ctx().jogadores, jogador('d', 'aguardando')]
    const { estado, contexto } = emJogo({ jogadores })

    const resultado = reduzir(
      estado,
      { ...contexto, jogadores, autorId: 'd' },
      { t: 'declararDescobri' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('ignora a segunda declaração seguida do mesmo jogador, sem alterar o estado', () => {
    const { estado, contexto } = emJogo()
    const comoB = { ...contexto, autorId: 'b' }
    const pendente = reduzirOk(estado, comoB, { t: 'declararDescobri' }).estado

    const resultado = reduzirOk(pendente, comoB, { t: 'declararDescobri' })

    expect(resultado.estado).toEqual(pendente)
    expect(resultado.eventos).toEqual([])
  })

  it('ignora a declaração de quem já teve a descoberta confirmada', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]
    const { estado, contexto } = emJogo({ jogadores })
    const comoB = { ...contexto, jogadores, autorId: 'b' }
    const pendente = reduzirOk(estado, comoB, { t: 'declararDescobri' }).estado
    const confirmado = reduzirOk(pendente, { ...contexto, jogadores, autorId: 'a' }, {
      t: 'responderDeclaracao',
      aceita: true,
    }).estado

    const resultado = reduzirOk(confirmado, comoB, { t: 'declararDescobri' })

    expect(resultado.estado).toEqual(confirmado)
  })

  it('recusa a declaração de outro jogador enquanto há uma pendente (DESC-10)', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzir(
      pendente,
      { ...contexto, autorId: 'c' },
      { t: 'declararDescobri' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
    expect(pendente.declaracaoPendente).toEqual({ jogadorId: 'b', declaradaEm: AMBIENTE.agora })
  })
})

describe('quem confirma a declaração (DESC-02, DESC-03)', () => {
  it('encaminha a confirmação ao host quando quem declara não é o host', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzirOk(pendente, { ...contexto, autorId: 'a' }, {
      t: 'responderDeclaracao',
      aceita: true,
    })

    expect(resultado.estado.descobriram).toEqual(['b'])
  })

  it('encaminha ao mais antigo entre os demais conectados quando o host declara', () => {
    const jogadores = [jogador('a', 'ativo', 1_000), jogador('b', 'ativo', 2_000), jogador('c', 'ativo', 3_000)]
    const { estado, contexto } = emJogo({ jogadores })
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'a' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzirOk(pendente, { ...contexto, jogadores, autorId: 'b' }, {
      t: 'responderDeclaracao',
      aceita: true,
    })

    expect(resultado.estado.descobriram).toEqual(['a'])
  })

  it('ignora quem está aguardando ao escolher quem confirma no lugar do host', () => {
    const jogadores = [
      jogador('a', 'ativo', 1_000),
      jogador('b', 'aguardando', 2_000),
      jogador('c', 'ativo', 3_000),
      jogador('d', 'ativo', 4_000),
    ]
    const { estado, contexto } = emJogo({ jogadores })
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'a' }, {
      t: 'declararDescobri',
    }).estado

    const recusado = reduzir(
      pendente,
      { ...contexto, jogadores, autorId: 'b' },
      { t: 'responderDeclaracao', aceita: true },
      AMBIENTE,
    )
    const aceito = reduzirOk(pendente, { ...contexto, jogadores, autorId: 'c' }, {
      t: 'responderDeclaracao',
      aceita: true,
    })

    expect(recusado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
    expect(aceito.estado.descobriram).toEqual(['a'])
  })

  it('ignora desconectados ao escolher quem confirma no lugar do host', () => {
    const jogadores = [
      jogador('a', 'ativo', 1_000),
      { ...jogador('b', 'ativo', 2_000), conectado: false },
      jogador('c', 'ativo', 3_000),
    ]
    const { estado, contexto } = emJogo({ jogadores })
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'a' }, {
      t: 'declararDescobri',
    }).estado

    const recusado = reduzir(
      pendente,
      { ...contexto, jogadores, autorId: 'b' },
      { t: 'responderDeclaracao', aceita: true },
      AMBIENTE,
    )
    const aceito = reduzirOk(pendente, { ...contexto, jogadores, autorId: 'c' }, {
      t: 'responderDeclaracao',
      aceita: true,
    })

    expect(recusado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
    expect(aceito.estado.descobriram).toEqual(['a'])
  })

  it('rejeita a resposta de quem não é o confirmador', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzir(
      pendente,
      { ...contexto, autorId: 'c' },
      { t: 'responderDeclaracao', aceita: true },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('não deixa o host confirmar a própria declaração', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'a' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzir(
      pendente,
      { ...contexto, autorId: 'a' },
      { t: 'responderDeclaracao', aceita: true },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })
})

describe('confirmar a declaração (DESC-04)', () => {
  // Quatro jogadores: com `AJU-18` quem descobre sempre sai do rodízio, e com
  // três o primeiro "Descobri!" já mexeria no desfecho da partida.
  const quatro = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]

  function confirmadoDeB() {
    const { estado, contexto } = emJogo({ jogadores: quatro })
    const pendente = reduzirOk(estado, { ...contexto, jogadores: quatro, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado

    return reduzirOk(pendente, { ...contexto, jogadores: quatro, autorId: 'a' }, {
      t: 'responderDeclaracao',
      aceita: true,
    })
  }

  it('marca o declarante como "descobriu" e limpa a pendência', () => {
    const resultado = confirmadoDeB()

    expect({
      descobriram: resultado.estado.descobriram,
      pendente: resultado.estado.declaracaoPendente,
    }).toEqual({ descobriram: ['b'], pendente: null })
  })

  it('não revela as cartas dos demais jogadores', () => {
    const resultado = confirmadoDeB()

    expect(resultado.estado.reveladoParaTodos).toBe(false)
  })

  it('anuncia a confirmação no chat (CHAT-03)', () => {
    const resultado = confirmadoDeB()

    expect(resultado.eventos).toEqual([{ texto: 'B descobriu!' }])
  })
})

describe('negar a declaração (DESC-05)', () => {
  it('descarta a declaração sem revelar nem marcar descoberta', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzirOk(pendente, { ...contexto, autorId: 'a' }, {
      t: 'responderDeclaracao',
      aceita: false,
    })

    expect({
      pendente: resultado.estado.declaracaoPendente,
      descobriram: resultado.estado.descobriram,
      reveladoParaTodos: resultado.estado.reveladoParaTodos,
    }).toEqual({ pendente: null, descobriram: [], reveladoParaTodos: false })
  })

  it('permite ao jogador declarar novamente depois da negativa', () => {
    const { estado, contexto } = emJogo()
    const comoB = { ...contexto, autorId: 'b' }
    const pendente = reduzirOk(estado, comoB, { t: 'declararDescobri' }).estado
    const negado = reduzirOk(pendente, { ...contexto, autorId: 'a' }, {
      t: 'responderDeclaracao',
      aceita: false,
    }).estado

    const resultado = reduzirOk(negado, comoB, { t: 'declararDescobri' })

    expect(resultado.estado.declaracaoPendente).toEqual({
      jogadorId: 'b',
      declaradaEm: AMBIENTE.agora,
    })
  })

  it('anuncia a negativa no chat (CHAT-03)', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzirOk(pendente, { ...contexto, autorId: 'a' }, {
      t: 'responderDeclaracao',
      aceita: false,
    })

    expect(resultado.eventos).toEqual(
      expect.arrayContaining([{ texto: 'Ainda não: B não descobriu.' }])
    )
  })
})

describe('efeito de descobrir sobre o rodízio (DESC-06, DESC-08, AJU-18)', () => {
  const quatro = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]
  const sai = { ...CONFIG_PADRAO, ordemTurnos: 'entrada' as const }

  function confirmadoPara(id: string, config: Config = sai, jogadores = quatro) {
    const { estado, contexto } = emJogo({ jogadores, config })
    const pendente = reduzirOk(estado, { ...contexto, autorId: id }, {
      t: 'declararDescobri',
    }).estado
    // `DESC-03` — quando quem declara é o host, quem confirma é outro jogador.
    const confirmador = id === contexto.hostId ? 'b' : 'a'
    return reduzirOk(pendente, { ...contexto, autorId: confirmador }, {
      t: 'responderDeclaracao',
      aceita: true,
    })
  }

  it('remove do rodízio todo jogador cuja descoberta é confirmada (AJU-18)', () => {
    const resultado = confirmadoPara('c')

    expect(resultado.estado.ordem).toEqual(['a', 'b', 'd'])
  })

  it('avança a vez quando quem sai do rodízio era o jogador da vez', () => {
    const resultado = confirmadoPara('a')

    expect({ ordem: resultado.estado.ordem, vezDe: resultado.estado.vezDe }).toEqual({
      ordem: ['b', 'c', 'd'],
      vezDe: 'b',
    })
  })

  it('não encerra a partida enquanto restar mais de um no rodízio', () => {
    const resultado = confirmadoPara('c')

    expect({
      fase: resultado.faseSeguinte,
      revelado: resultado.estado.reveladoParaTodos,
    }).toEqual({ fase: undefined, revelado: false })
  })
})

// ---------------------------------------------------------------------------
// `AJU-09`…`AJU-14` substituem `DESC-08`: a partida não encerra mais sozinha
// quando sobra um jogador no rodízio.
// ---------------------------------------------------------------------------

describe('o último do rodízio continua jogando (AJU-09, AJU-10, AJU-11, AJU-13)', () => {
  const comTempo = { ...CONFIG_PADRAO, ordemTurnos: 'entrada' as const, tempoTurnoSeg: 30 }

  /** Trio em jogo com `b` e `c` já confirmados: só `a` continua no rodízio. */
  function soRestaA() {
    const { estado, contexto } = emJogo({ config: comTempo })
    let atual = estado
    let ultima = null as ReturnType<typeof reduzirOk> | null
    for (const id of ['b', 'c']) {
      const pendente = reduzirOk(atual, { ...contexto, autorId: id }, {
        t: 'declararDescobri',
      }).estado
      ultima = reduzirOk(pendente, { ...contexto, autorId: 'a' }, {
        t: 'responderDeclaracao',
        aceita: true,
      })
      atual = ultima.estado
    }
    if (ultima === null) throw new Error('nenhuma confirmação executada')
    return { estado: atual, contexto, ultima }
  }

  it('mantém a partida em JOGO quando a confirmação deixa exatamente um (AJU-09)', () => {
    const { estado, ultima } = soRestaA()

    expect({
      fase: ultima.faseSeguinte,
      revelado: estado.reveladoParaTodos,
      ordem: estado.ordem,
      vezDe: estado.vezDe,
    }).toEqual({ fase: undefined, revelado: false, ordem: ['a'], vezDe: 'a' })
  })

  it('limpa o prazo de turno na confirmação que deixa um só (AJU-11)', () => {
    const { ultima } = soRestaA()

    expect(ultima.prazos).toEqual({ turno: null })
  })

  it('não avança o rodízio quando o último passa a vez (AJU-10, AJU-11)', () => {
    const { estado, contexto } = soRestaA()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' })

    expect({
      vezDe: resultado.estado.vezDe,
      ordem: resultado.estado.ordem,
      prazos: resultado.prazos,
    }).toEqual({ vezDe: 'a', ordem: ['a'], prazos: { turno: null } })
  })

  it('não avança nem reagenda quando o host pula a vez do último (AJU-10, AJU-12)', () => {
    const { estado, contexto } = soRestaA()

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'pularVez' })

    expect({ vezDe: resultado.estado.vezDe, prazos: resultado.prazos }).toEqual({
      vezDe: 'a',
      prazos: { turno: null },
    })
  })

  it('não avança nem reagenda quando o prazo de turno vence com um só (AJU-10, AJU-11)', () => {
    const { estado, contexto } = soRestaA()

    const resultado = reduzirOk(estado, contexto, { t: 'venceuPrazoTurno' })

    expect({ vezDe: resultado.estado.vezDe, prazos: resultado.prazos }).toEqual({
      vezDe: 'a',
      prazos: { turno: null },
    })
  })

  it('revela todas as cartas e encerra quando o último declara e é confirmado (AJU-13)', () => {
    const { estado, contexto } = soRestaA()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'a' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzirOk(pendente, { ...contexto, autorId: 'b' }, {
      t: 'responderDeclaracao',
      aceita: true,
    })

    expect({
      fase: resultado.faseSeguinte,
      revelado: resultado.estado.reveladoParaTodos,
      ordem: resultado.estado.ordem,
      vezDe: resultado.estado.vezDe,
      prazos: resultado.prazos,
    }).toEqual({
      fase: 'encerrada',
      revelado: true,
      ordem: [],
      vezDe: null,
      prazos: { turno: null },
    })
  })

  it('preserva o texto das cartas para a revelação final (AJU-13)', () => {
    const { estado, contexto } = soRestaA()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'a' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzirOk(pendente, { ...contexto, autorId: 'b' }, {
      t: 'responderDeclaracao',
      aceita: true,
    })

    expect(resultado.estado.cartas).toEqual(estado.cartas)
  })
})

describe('rodízio esvaziado por saída (AJU-14)', () => {
  it('encerra a partida e revela tudo quando o último do rodízio sai da sala', () => {
    const { estado, contexto } = emJogo()
    let atual = estado
    for (const id of ['b', 'c']) {
      const pendente = reduzirOk(atual, { ...contexto, autorId: id }, {
        t: 'declararDescobri',
      }).estado
      atual = reduzirOk(pendente, { ...contexto, autorId: 'a' }, {
        t: 'responderDeclaracao',
        aceita: true,
      }).estado
    }
    // `b` e `c` seguem na sala: o rodízio esvazia sem que a sala esvazie.
    const restantes = [jogador('b'), jogador('c')]

    const resultado = reduzirOk(atual, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'a',
    })

    expect({
      fase: resultado.faseSeguinte,
      revelado: resultado.estado.reveladoParaTodos,
      ordem: resultado.estado.ordem,
      vezDe: resultado.estado.vezDe,
      prazos: resultado.prazos,
    }).toEqual({
      fase: 'encerrada',
      revelado: true,
      ordem: [],
      vezDe: null,
      prazos: { turno: null },
    })
  })

  it('passa a vez ao que restou e limpa o prazo quando o penúltimo sai (AJU-10, AJU-11)', () => {
    const comTempo = { ...CONFIG_PADRAO, ordemTurnos: 'entrada' as const, tempoTurnoSeg: 30 }
    const jogadores = [jogador('a'), jogador('b')]
    const base = ctx({ jogadores, config: comTempo })
    const pronto = todosEscrevemEProntos(rodadaDe(jogadores), base)
    const { estado } = reduzirOk(pronto, base, { t: 'comecar' })

    const resultado = reduzirOk(estado, ctx({ ...base, fase: 'jogo', jogadores: [jogador('b')] }), {
      t: 'saiuJogador',
      jogadorId: 'a',
    })

    expect({
      fase: resultado.faseSeguinte,
      ordem: resultado.estado.ordem,
      vezDe: resultado.estado.vezDe,
      prazos: resultado.prazos,
    }).toEqual({ fase: undefined, ordem: ['b'], vezDe: 'b', prazos: { turno: null } })
  })
})

describe('saída de jogador com declaração pendente (DESC-01)', () => {
  it('descarta a declaração de quem sai da sala', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado
    const restantes = [jogador('a'), jogador('c')]

    const resultado = reduzirOk(pendente, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'b',
    })

    expect(resultado.estado.declaracaoPendente).toBeNull()
  })
})

describe('encerrar a partida (FIM-01, FIM-02, HOST-06)', () => {
  it('move a sala para encerrada', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, contexto, { t: 'encerrar' })

    expect(resultado.faseSeguinte).toBe('encerrada')
  })

  it('marca todas as cartas como reveladas', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, contexto, { t: 'encerrar' })

    expect(resultado.estado.reveladoParaTodos).toBe(true)
  })

  it('preserva o texto das cartas para a revelação', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, contexto, { t: 'encerrar' })

    expect(resultado.estado.cartas).toEqual(estado.cartas)
  })

  it('encerra o rodízio e o prazo do turno', () => {
    const { estado, contexto } = emJogo({
      config: { ...CONFIG_PADRAO, ordemTurnos: 'entrada', tempoTurnoSeg: 60 },
    })

    const resultado = reduzirOk(estado, contexto, { t: 'encerrar' })

    expect({ vezDe: resultado.estado.vezDe, prazos: resultado.prazos }).toEqual({
      vezDe: null,
      prazos: { turno: null },
    })
  })

  it('descarta a declaração pendente ao encerrar', () => {
    const { estado, contexto } = emJogo()
    const pendente = reduzirOk(estado, { ...contexto, autorId: 'b' }, {
      t: 'declararDescobri',
    }).estado

    const resultado = reduzirOk(pendente, contexto, { t: 'encerrar' })

    expect(resultado.estado.declaracaoPendente).toBeNull()
  })

  it('recusa encerrar quando quem aciona não é o host', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzir(estado, { ...contexto, autorId: 'b' }, { t: 'encerrar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('recusa encerrar fora da fase de jogo', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzir(estado, { ...contexto, fase: 'escrita' }, { t: 'encerrar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })
})

describe('nova partida (FIM-03, FIM-04, NOTA-04)', () => {
  function encerrada(over: Partial<ContextoDeSala> = {}) {
    const { estado, contexto } = emJogo(over)
    const fim = reduzirOk(estado, contexto, { t: 'encerrar' }).estado
    return { estado: fim, contexto: ctx({ ...contexto, fase: 'encerrada' }) }
  }

  it('devolve a sala ao lobby', () => {
    const { estado, contexto } = encerrada()

    const resultado = reduzirOk(estado, contexto, { t: 'novaPartida' })

    expect(resultado.faseSeguinte).toBe('lobby')
  })

  it('limpa cartas, alvos, "descobriu" e rodízio', () => {
    const { estado, contexto } = encerrada()

    const resultado = reduzirOk(estado, contexto, { t: 'novaPartida' })

    expect({
      cartas: resultado.estado.cartas,
      atribuicoes: resultado.estado.atribuicoes,
      descobriram: resultado.estado.descobriram,
      ordem: resultado.estado.ordem,
      prontos: resultado.estado.prontos,
      reveladoParaTodos: resultado.estado.reveladoParaTodos,
    }).toEqual({
      cartas: {},
      atribuicoes: {},
      descobriram: [],
      ordem: [],
      prontos: [],
      reveladoParaTodos: false,
    })
  })

  it('limpa o bloco de notas de todos os jogadores (NOTA-04)', () => {
    const { estado, contexto } = encerrada()
    const comNotas = { ...estado, notas: { a: 'perguntei sobre filmes', b: 'não sou animal' } }

    const resultado = reduzirOk(comNotas, contexto, { t: 'novaPartida' })

    expect(resultado.estado.notas).toEqual({})
  })

  it('pede ao core a promoção de quem estava aguardando', () => {
    const { estado, contexto } = encerrada()

    const resultado = reduzirOk(estado, contexto, { t: 'novaPartida' })

    expect(resultado.promoverAguardando).toBe(true)
  })

  it('não altera jogadores, apelidos, cores nem configurações (FIM-04)', () => {
    const { estado, contexto } = encerrada()
    const antes = structuredClone(contexto)

    reduzirOk(estado, contexto, { t: 'novaPartida' })

    expect(contexto).toEqual(antes)
  })

  it('recusa nova partida de quem não é o host', () => {
    const { estado, contexto } = encerrada()

    const resultado = reduzir(
      estado,
      { ...contexto, autorId: 'b' },
      { t: 'novaPartida' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('recusa nova partida enquanto a partida não foi encerrada', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzir(estado, contexto, { t: 'novaPartida' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })
})

describe('saída de todos os ativos durante o jogo (FIM-05)', () => {
  it('encerra a partida e devolve a sala ao lobby', () => {
    const { estado, contexto } = emJogo()
    let atual = estado
    let ultimo = null as ReturnType<typeof reduzirOk> | null

    for (const [indice, id] of ['a', 'b', 'c'].entries()) {
      const restantes = ['a', 'b', 'c'].slice(indice + 1).map((x) => jogador(x))
      ultimo = reduzirOk(atual, ctx({ ...contexto, jogadores: restantes }), {
        t: 'saiuJogador',
        jogadorId: id,
      })
      atual = ultimo.estado
    }

    expect(ultimo?.faseSeguinte).toBe('lobby')
  })

  it('zera o estado da partida quando o último ativo sai', () => {
    const { estado, contexto } = emJogo()

    const resultado = reduzirOk(estado, ctx({ ...contexto, jogadores: [] }), {
      t: 'saiuJogador',
      jogadorId: 'a',
    })

    expect({
      cartas: resultado.estado.cartas,
      atribuicoes: resultado.estado.atribuicoes,
      ordem: resultado.estado.ordem,
      vezDe: resultado.estado.vezDe,
    }).toEqual({ cartas: {}, atribuicoes: {}, ordem: [], vezDe: null })
  })

  it('pede a promoção de quem estava aguardando quando todos os ativos saem', () => {
    const { estado, contexto } = emJogo()
    const restantes = [jogador('d', 'aguardando')]

    const resultado = reduzirOk(estado, ctx({ ...contexto, jogadores: restantes }), {
      t: 'saiuJogador',
      jogadorId: 'a',
    })

    expect({ fase: resultado.faseSeguinte, promover: resultado.promoverAguardando }).toEqual({
      fase: 'lobby',
      promover: true,
    })
  })
})

describe('jogador desconectado (JOGO-11)', () => {
  it('mantém a vez com o jogador desconectado, sem pulá-lo', () => {
    const jogadores = [jogador('a'), { ...jogador('b'), conectado: false }, jogador('c')]
    const { estado, contexto } = emJogo({ jogadores })

    const resultado = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' })

    expect(resultado.estado.vezDe).toBe('b')
  })

  it('permite ao host pular a vez de um jogador desconectado', () => {
    const jogadores = [jogador('a'), { ...jogador('b'), conectado: false }, jogador('c')]
    const { estado, contexto } = emJogo({ jogadores })
    const daVezB = reduzirOk(estado, { ...contexto, autorId: 'a' }, { t: 'passarVez' }).estado

    const resultado = reduzirOk(daVezB, { ...contexto, autorId: 'a' }, { t: 'pularVez' })

    expect(resultado.estado.vezDe).toBe('c')
  })
})
