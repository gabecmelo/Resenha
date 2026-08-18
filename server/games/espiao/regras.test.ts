import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  JANELA_DE_RESULTADO_MS,
  type Ambiente,
  type ContextoDeSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../../shared/protocolo'
import type { PacoteCompleto } from '../../../shared/pacotes-dados'
import {
  type ComandoEspiao,
  type EstadoEspiao,
  estadoVazio,
  iniciarRodada,
  reduzir,
} from './regras'

/**
 * `aleatorio` constante faz `embaralhar` rotacionar a lista em 1 posição
 * (`[x0,x1,...,xn-1] → [x1,...,xn-1,x0]`), sempre a mesma rotação — dá
 * resultados 100% previsíveis sem precisar mockar o algoritmo, mesmo padrão
 * de `despacho.test.ts`.
 */
const AMBIENTE: Ambiente = { agora: 10_000, aleatorio: () => 0 }

function jogador(id: JogadorId, situacao: Situacao = 'ativo', conectado = true): Jogador {
  return {
    id,
    tokenHash: `hash-${id}`,
    apelido: id.toUpperCase(),
    cor: 'vermelho',
    entrouEm: 1_000,
    conectado,
    desconectadoEm: conectado ? null : 500,
    situacao,
  }
}

function ctx(over: Partial<ContextoDeSala> = {}): ContextoDeSala {
  return {
    fase: 'jogo',
    hostId: 'a',
    config: { ...CONFIG_PADRAO },
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    prazoTurno: null,
    autorId: 'a',
    ...over,
  }
}

function pacoteDe(locais: string[]): PacoteCompleto {
  return {
    id: 'locais-teste',
    nome: 'Locais de Teste',
    emoji: '🗺️',
    descricao: '',
    quantidade: locais.length,
    jogoId: 'espiao',
    cartas: locais.map((texto) => ({ texto, dificuldade: 'facil' as const })),
  }
}

const LOCAIS_PADRAO = ['Praia', 'Escola', 'Hospital']

function rodadaDe(
  jogadores: Jogador[],
  over: Partial<ContextoDeSala> = {},
  locais: string[] = LOCAIS_PADRAO,
): EstadoEspiao {
  const resultado = iniciarRodada(ctx({ jogadores, ...over }), AMBIENTE, [pacoteDe(locais)])
  if (!resultado.ok) throw new Error(`rodada inesperadamente recusada: ${resultado.erro}`)
  return resultado.valor
}

function rodadaDeResultado(
  jogadores: Jogador[],
  over: Partial<ContextoDeSala> = {},
  locais: string[] = LOCAIS_PADRAO,
) {
  return iniciarRodada(ctx({ jogadores, ...over }), AMBIENTE, [pacoteDe(locais)])
}

function reduzirOk(
  estado: EstadoEspiao,
  contexto: ContextoDeSala,
  comando: ComandoEspiao,
  ambiente: Ambiente = AMBIENTE,
) {
  const resultado = reduzir(estado, contexto, comando, ambiente)
  if (!resultado.ok) throw new Error(`comando inesperadamente recusado: ${resultado.erro}`)
  return resultado
}

/** Leva todos os ativos a marcar PRONTO — a rodada libera. */
function comTodosProntos(estado: EstadoEspiao, base: ContextoDeSala): EstadoEspiao {
  let atual = estado
  for (const j of base.jogadores.filter((x) => x.situacao === 'ativo')) {
    const comoAutor = { ...base, autorId: j.id }
    atual = reduzirOk(atual, comoAutor, { t: 'marcarPronto', pronto: true }).estado
  }
  return atual
}

// ---------------------------------------------------------------------------
// iniciarRodada
// ---------------------------------------------------------------------------

describe('iniciarRodada (ESP-01, ESP-03, ESP-04)', () => {
  it('recusa com menos de 3 jogadores ativos (ESP-03)', () => {
    const resultado = rodadaDeResultado([jogador('a'), jogador('b')])

    expect(resultado).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('recusa quando o nº de espiões configurado não deixa 2+ não-espiões (ESP-02)', () => {
    const resultado = rodadaDeResultado(
      [jogador('a'), jogador('b'), jogador('c')],
      { config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, numEspioes: 2 } } },
    )

    expect(resultado).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('aceita quando o nº de espiões deixa exatamente 2 não-espiões', () => {
    const estado = rodadaDe(
      [jogador('a'), jogador('b'), jogador('c'), jogador('d')],
      { config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, numEspioes: 2 } } },
    )

    expect(estado.espioes).toHaveLength(2)
  })

  it('sorteia local, espiões (na quantidade configurada) e quem começa perguntando (ESP-04)', () => {
    const estado = rodadaDe([jogador('a'), jogador('b'), jogador('c')])

    // Rotação de `['a','b','c']` com `aleatorio` constante é `['b','c','a']`.
    expect({
      espioes: estado.espioes,
      comecaPerguntando: estado.comecaPerguntando,
      local: estado.local,
    }).toEqual({
      espioes: ['b'],
      comecaPerguntando: 'b',
      local: 'Escola', // rotação de `['Praia','Escola','Hospital']` também começa em índice 1
    })
  })

  // `numEspioes: 'auto'` (padrão) — 1 espião até 6 jogadores, 2 a partir de 7.
  // O automático resolve no início da rodada, quando o nº de ativos já é o
  // definitivo; escolha manual do host vence o automático.
  it('auto sorteia 1 espião numa mesa de 6', () => {
    const seis = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => jogador(id))

    expect(rodadaDe(seis).espioes).toHaveLength(1)
  })

  it('auto sorteia 2 espiões a partir de 7 jogadores', () => {
    const sete = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => jogador(id))

    expect(rodadaDe(sete).espioes).toHaveLength(2)
  })

  it('auto conta só os ativos: 7 na sala com 1 aguardando ainda é mesa de 6', () => {
    const jogadores = [
      ...['a', 'b', 'c', 'd', 'e', 'f'].map((id) => jogador(id)),
      jogador('g', 'aguardando'),
    ]

    expect(rodadaDe(jogadores).espioes).toHaveLength(1)
  })

  it('número escolhido pelo host vence o automático', () => {
    const sete = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => jogador(id))

    const estado = rodadaDe(sete, {
      config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, numEspioes: 1 } },
    })

    expect(estado.espioes).toHaveLength(1)
  })

  it('espiões vêm sempre dentre os jogadores ativos, mesmo com jogador aguardando', () => {
    const estado = rodadaDe([
      jogador('a'),
      jogador('b'),
      jogador('c'),
      jogador('d', 'aguardando'),
    ])

    expect(estado.espioes.every((id) => ['a', 'b', 'c'].includes(id))).toBe(true)
  })

  it('a rodada nasce com `prontos` vazio e `rodadaIniciada: false` (ESP-05)', () => {
    const estado = rodadaDe([jogador('a'), jogador('b'), jogador('c')])

    expect({ prontos: estado.prontos, rodadaIniciada: estado.rodadaIniciada }).toEqual({
      prontos: [],
      rodadaIniciada: false,
    })
  })

  it('recusa sem pacotes selecionados', () => {
    const resultado = iniciarRodada(ctx(), AMBIENTE, undefined)

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
  })

  it('recusa quando o pool de locais fica vazio após o filtro de dificuldades', () => {
    const resultado = iniciarRodada(
      ctx({ config: { ...CONFIG_PADRAO, dificuldades: ['dificil'] } }),
      AMBIENTE,
      [pacoteDe(LOCAIS_PADRAO)], // todas as cartas são 'facil'
    )

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_INSUFICIENTE' })
  })
})

// ---------------------------------------------------------------------------
// marcarPronto (ESP-05, ESP-06)
// ---------------------------------------------------------------------------

describe('marcarPronto (ESP-05, ESP-06)', () => {
  it('recusa fora da fase de jogo', () => {
    const estado = rodadaDe([jogador('a'), jogador('b'), jogador('c')])
    const base = ctx({ fase: 'lobby' })

    const resultado = reduzir(estado, base, { t: 'marcarPronto', pronto: true }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('recusa depois que a rodada já iniciou', () => {
    const base = ctx()
    const iniciado = comTodosProntos(rodadaDe(base.jogadores), base)

    const resultado = reduzir(iniciado, base, { t: 'marcarPronto', pronto: true }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('marca o autor como pronto sem liberar a rodada se falta gente', () => {
    const base = ctx()
    const estado = rodadaDe(base.jogadores)

    const resultado = reduzirOk(estado, { ...base, autorId: 'a' }, { t: 'marcarPronto', pronto: true })

    expect({ prontos: resultado.estado.prontos, rodadaIniciada: resultado.estado.rodadaIniciada }).toEqual({
      prontos: ['a'],
      rodadaIniciada: false,
    })
  })

  it('desmarca o autor quando `pronto: false`', () => {
    const base = ctx()
    const marcado = reduzirOk(rodadaDe(base.jogadores), { ...base, autorId: 'a' }, { t: 'marcarPronto', pronto: true }).estado

    const resultado = reduzirOk(marcado, { ...base, autorId: 'a' }, { t: 'marcarPronto', pronto: false })

    expect(resultado.estado.prontos).toEqual([])
  })

  it('quando todos os ativos marcam pronto, libera a rodada e define o prazo (ESP-06)', () => {
    const base = ctx({ config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, tempoRodadaSeg: 300 } } })

    const iniciado = comTodosProntos(rodadaDe(base.jogadores), base)

    expect(iniciado.rodadaIniciada).toBe(true)
  })

  it('o prazo da rodada é `null` quando `tempoRodadaSeg` é `null`', () => {
    const base = ctx({ config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, tempoRodadaSeg: null } } })
    const estado = rodadaDe(base.jogadores, { config: base.config })
    const ativos = base.jogadores.filter((j) => j.situacao === 'ativo')

    let atual = estado
    let ultimoResultado
    for (const j of ativos) {
      ultimoResultado = reduzirOk(atual, { ...base, autorId: j.id }, { t: 'marcarPronto', pronto: true })
      atual = ultimoResultado.estado
    }

    expect(ultimoResultado?.prazos).toEqual({ turno: null })
  })

  it('define `prazos.turno` a partir de `config.espiao.tempoRodadaSeg` (ESP-06)', () => {
    const base = ctx({ config: { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, tempoRodadaSeg: 120 } } })
    const estado = rodadaDe(base.jogadores, { config: base.config })
    const ativos = base.jogadores.filter((j) => j.situacao === 'ativo')

    let atual = estado
    let ultimoResultado
    for (const j of ativos) {
      ultimoResultado = reduzirOk(atual, { ...base, autorId: j.id }, { t: 'marcarPronto', pronto: true })
      atual = ultimoResultado.estado
    }

    expect(ultimoResultado?.prazos).toEqual({ turno: AMBIENTE.agora + 120_000 })
  })
})

// ---------------------------------------------------------------------------
// abrirVotacao / venceuPrazoTurno (ESP-09, ESP-10)
// ---------------------------------------------------------------------------

describe('abrirVotacao (ESP-09)', () => {
  function emRodada(over: Partial<ContextoDeSala> = {}) {
    const base = ctx(over)
    const estado = comTodosProntos(rodadaDe(base.jogadores, over), base)
    return { estado, base }
  }

  it('recusa antes de a rodada iniciar (aguardando prontos)', () => {
    const base = ctx()
    const estado = rodadaDe(base.jogadores)

    const resultado = reduzir(estado, base, { t: 'abrirVotacao' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('qualquer jogador ativo pode abrir a votação, e a mesa registra quem abriu (ESP-27)', () => {
    const { estado, base } = emRodada()

    const resultado = reduzirOk(estado, { ...base, autorId: 'c' }, { t: 'abrirVotacao' })

    expect(resultado.estado.votacaoAberta).toEqual({
      abertaEm: AMBIENTE.agora,
      abertaPor: 'c',
      votos: {},
    })
  })

  it('anuncia à mesa quem abriu a votação, pelo apelido (ESP-27)', () => {
    const { estado, base } = emRodada()

    const resultado = reduzirOk(estado, { ...base, autorId: 'c' }, { t: 'abrirVotacao' })

    const apelido = base.jogadores.find((j) => j.id === 'c')!.apelido
    expect(resultado.eventos).toEqual([{ texto: `${apelido} abriu a votação.` }])
  })

  it('troca o relógio da rodada pelo relógio da votação ao abrir (ESP-28)', () => {
    const { estado, base } = emRodada()

    const resultado = reduzirOk(estado, base, { t: 'abrirVotacao' })

    expect(resultado.prazos).toEqual({
      turno: AMBIENTE.agora + base.config.espiao.tempoVotacaoSeg * 1_000,
    })
  })

  it('recusa abrir enquanto o resultado da votação anterior ainda está na tela (edge case)', () => {
    const { estado, base } = emRodada()
    const aberta = reduzirOk(estado, base, { t: 'abrirVotacao' }).estado
    // Ninguém acerta: fecha com 0 votos e abre a janela de resultado.
    const comResultado = reduzirOk(aberta, base, { t: 'encerrarVotacao' }).estado

    const resultado = reduzir(comResultado, base, { t: 'abrirVotacao' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('recusa abrir uma segunda votação enquanto a primeira está aberta', () => {
    const { estado, base } = emRodada()
    const aberta = reduzirOk(estado, base, { t: 'abrirVotacao' }).estado

    const resultado = reduzir(aberta, base, { t: 'abrirVotacao' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })
})

describe('venceuPrazoTurno abre a votação automaticamente (ESP-10)', () => {
  function emRodada(config = CONFIG_PADRAO) {
    const base = ctx({ config })
    const estado = comTodosProntos(rodadaDe(base.jogadores, { config }), base)
    return { estado, base }
  }

  it('abre a votação quando a rodada está em andamento sem votação aberta', () => {
    const { estado, base } = emRodada()

    const resultado = reduzirOk(estado, base, { t: 'venceuPrazoTurno' })

    // `ESP-27` — sem `abertaPor`: foi o relógio, não uma pessoa.
    expect(resultado.estado.votacaoAberta).toEqual({
      abertaEm: AMBIENTE.agora,
      abertaPor: null,
      votos: {},
    })
    expect(resultado.prazos).toEqual({
      turno: AMBIENTE.agora + base.config.espiao.tempoVotacaoSeg * 1_000,
    })
  })

  it('não faz nada quando `tempoRodadaSeg` é `null` (sem prazo agendado)', () => {
    const config = { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, tempoRodadaSeg: null } }
    const { estado, base } = emRodada(config)

    const resultado = reduzirOk(estado, base, { t: 'venceuPrazoTurno' })

    expect(resultado.estado).toEqual(estado)
  })

  it('fecha a votação sozinho quando o relógio dela vence (ESP-28)', () => {
    const { estado, base } = emRodada()
    const aberta = reduzirOk(estado, base, { t: 'abrirVotacao' }).estado
    const votada = reduzirOk(aberta, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' }).estado

    const resultado = reduzirOk(votada, base, { t: 'venceuPrazoTurno' })

    expect(resultado.estado.votacaoAberta).toBeNull()
    expect(resultado.estado.resultadoVotacao?.votos).toEqual({ a: 'b' })
  })

  it('devolve a rodada quando a janela de resultado vence, com o relógio cheio (ESP-32)', () => {
    const { estado, base } = emRodada()
    const aberta = reduzirOk(estado, base, { t: 'abrirVotacao' }).estado
    const comResultado = reduzirOk(aberta, base, { t: 'encerrarVotacao' }).estado

    const resultado = reduzirOk(comResultado, base, { t: 'venceuPrazoTurno' })

    expect(resultado.estado.resultadoVotacao).toBeNull()
    expect(resultado.prazos).toEqual({
      turno: AMBIENTE.agora + base.config.espiao.tempoRodadaSeg! * 1_000,
    })
  })
})

// ---------------------------------------------------------------------------
// votar / encerrarVotacao / resultado da votação (ESP-11..ESP-14)
// ---------------------------------------------------------------------------

describe('votação — votar e fechamento (ESP-11, ESP-12)', () => {
  function comVotacaoAberta(jogadores: Jogador[] = [jogador('a'), jogador('b'), jogador('c')]) {
    const base = ctx({ jogadores })
    const pronto = comTodosProntos(rodadaDe(jogadores), base)
    const aberta = reduzirOk(pronto, base, { t: 'abrirVotacao' }).estado
    return { estado: aberta, base }
  }

  it('recusa votar sem votação aberta', () => {
    const base = ctx()
    const estado = comTodosProntos(rodadaDe(base.jogadores), base)

    const resultado = reduzir(estado, base, { t: 'votar', alvoId: 'b' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('recusa `alvoId` que não é jogador ativo', () => {
    const { estado, base } = comVotacaoAberta()

    const resultado = reduzir(estado, base, { t: 'votar', alvoId: 'fantasma' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('registra o voto do autor', () => {
    const { estado, base } = comVotacaoAberta()

    const resultado = reduzirOk(estado, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' })

    expect(resultado.estado.votacaoAberta?.votos).toEqual({ a: 'b' })
  })

  it('`alvoId: null` registra "pular"', () => {
    const { estado, base } = comVotacaoAberta()

    const resultado = reduzirOk(estado, { ...base, autorId: 'a' }, { t: 'votar', alvoId: null })

    expect(resultado.estado.votacaoAberta?.votos).toEqual({ a: 'pular' })
  })

  it('um segundo voto do mesmo jogador substitui o anterior, não soma', () => {
    const { estado, base } = comVotacaoAberta()
    const primeiro = reduzirOk(estado, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' }).estado

    const resultado = reduzirOk(primeiro, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'c' })

    expect(resultado.estado.votacaoAberta?.votos).toEqual({ a: 'c' })
  })

  it('fecha automaticamente quando todos os ativos conectados votaram', () => {
    const { estado, base } = comVotacaoAberta()
    let atual = estado
    atual = reduzirOk(atual, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' }).estado
    atual = reduzirOk(atual, { ...base, autorId: 'c' }, { t: 'votar', alvoId: 'b' }).estado

    const resultado = reduzirOk(atual, { ...base, autorId: 'b' }, { t: 'votar', alvoId: 'b' })

    expect(resultado.estado.votacaoAberta).toBeNull()
  })

  it('não fecha enquanto falta jogador ativo conectado votar', () => {
    const { estado, base } = comVotacaoAberta()

    const resultado = reduzirOk(estado, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' })

    expect(resultado.estado.votacaoAberta).not.toBeNull()
  })

  it('desconectado não trava o fechamento: "todos votaram" conta só ativos conectados (edge case)', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c', 'ativo', false)]
    const { estado, base } = comVotacaoAberta(jogadores)
    const comA = reduzirOk(estado, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' }).estado

    const resultado = reduzirOk(comA, { ...base, autorId: 'b' }, { t: 'votar', alvoId: 'b' })

    expect(resultado.estado.votacaoAberta).toBeNull()
  })
})

describe('encerrarVotacao (ESP-12)', () => {
  function comVotacaoAberta() {
    const base = ctx()
    const pronto = comTodosProntos(rodadaDe(base.jogadores), base)
    const aberta = reduzirOk(pronto, base, { t: 'abrirVotacao' }).estado
    return { estado: aberta, base }
  }

  it('recusa fora da fase de jogo', () => {
    const { estado, base } = comVotacaoAberta()

    const resultado = reduzir(estado, { ...base, fase: 'lobby' }, { t: 'encerrarVotacao' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('recusa de quem não é host', () => {
    const { estado, base } = comVotacaoAberta()

    const resultado = reduzir(estado, { ...base, autorId: 'b' }, { t: 'encerrarVotacao' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('recusa sem votação aberta', () => {
    const base = ctx()
    const estado = comTodosProntos(rodadaDe(base.jogadores), base)

    const resultado = reduzir(estado, base, { t: 'encerrarVotacao' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('o host fecha a votação mesmo sem todo mundo ter votado', () => {
    const { estado, base } = comVotacaoAberta()

    const resultado = reduzirOk(estado, base, { t: 'encerrarVotacao' })

    expect(resultado.estado.votacaoAberta).toBeNull()
  })
})

describe('resultado da votação — maioria absoluta sobre o total de ativos (ESP-13, ESP-14)', () => {
  /** 3 ativos: `a` (host), `b` (espião, por rotação com `aleatorio` constante), `c`. */
  function partidaComVotos(votos: Record<JogadorId, JogadorId | 'pular'>) {
    const base = ctx()
    const pronto = comTodosProntos(rodadaDe(base.jogadores), base)
    const abertura = reduzirOk(pronto, base, { t: 'abrirVotacao' })
    let atual = abertura.estado
    let ultimoResultado: ReturnType<typeof reduzirOk> = abertura
    for (const [votante, alvo] of Object.entries(votos)) {
      ultimoResultado = reduzirOk(atual, { ...base, autorId: votante }, { t: 'votar', alvoId: alvo === 'pular' ? null : alvo })
      atual = ultimoResultado.estado
    }
    // Se o último voto não fechou sozinho (nem todos os ativos votaram), o
    // host fecha manualmente — mesmo caminho de `ESP-12`.
    if (atual.votacaoAberta !== null) {
      ultimoResultado = reduzirOk(atual, base, { t: 'encerrarVotacao' })
    }
    return { resultado: ultimoResultado, base }
  }

  it('maioria absoluta em quem é de fato espião encerra a partida revelando local e espiões (ESP-13)', () => {
    const { resultado } = partidaComVotos({ a: 'b', c: 'b' }) // 2 de 3 votam no espião 'b'

    expect({ faseSeguinte: resultado.faseSeguinte, local: resultado.estado.local, espioes: resultado.estado.espioes }).toEqual({
      faseSeguinte: 'encerrada',
      local: 'Escola',
      espioes: ['b'],
    })
  })

  it('maioria em quem não é espião não encerra a partida e abre a janela de resultado (ESP-14, ESP-32)', () => {
    const { resultado } = partidaComVotos({ a: 'c', b: 'c' }) // 2 de 3 votam em 'c', que não é espião

    expect({ faseSeguinte: resultado.faseSeguinte, prazos: resultado.prazos }).toEqual({
      faseSeguinte: undefined,
      prazos: { turno: AMBIENTE.agora + JANELA_DE_RESULTADO_MS },
    })
  })

  it('revela o mapa de votos e a conta da acusação quando a votação fecha (ESP-29, ESP-30)', () => {
    const { resultado } = partidaComVotos({ a: 'c', b: 'c' })

    expect(resultado.estado.resultadoVotacao).toEqual({
      votos: { a: 'c', b: 'c' },
      abertaPor: 'a',
      acusado: 'c',
      aMesaAcertou: false,
      votosNoAcusado: 2,
      maioriaMinima: 2,
      totalAtivos: 3,
    })
  })

  it('o voto do próprio espião conta na maioria que o entrega (ESP-31)', () => {
    // 'b' é o espião e vota em si mesmo pra despistar; com 'a' dá a maioria.
    const { resultado } = partidaComVotos({ a: 'b', b: 'b' })

    expect({
      faseSeguinte: resultado.faseSeguinte,
      acertou: resultado.estado.resultadoVotacao?.aMesaAcertou,
      votos: resultado.estado.resultadoVotacao?.votosNoAcusado,
    }).toEqual({ faseSeguinte: 'encerrada', acertou: true, votos: 2 })
  })

  it('o resultado sobrevive ao fim da partida, sem prazo pra sumir (ESP-33)', () => {
    const { resultado } = partidaComVotos({ a: 'b', c: 'b' })

    expect(resultado.estado.resultadoVotacao?.acusado).toBe('b')
    expect(resultado.prazos).toEqual({ turno: null })
  })

  it('sem maioria, o resultado registra que ninguém foi acusado (ESP-29)', () => {
    const { resultado } = partidaComVotos({ a: 'b', c: 'a' }) // empate

    expect({
      acusado: resultado.estado.resultadoVotacao?.acusado,
      votosNoAcusado: resultado.estado.resultadoVotacao?.votosNoAcusado,
      acertou: resultado.estado.resultadoVotacao?.aMesaAcertou,
    }).toEqual({ acusado: null, votosNoAcusado: 0, acertou: false })
  })

  it('empate não encerra a partida (ESP-14)', () => {
    const { resultado } = partidaComVotos({ a: 'b', c: 'a' }) // 1 voto para 'b', 1 voto para 'a'

    expect(resultado.faseSeguinte).toBeUndefined()
  })

  it('maioria em "pular" não encerra a partida (ESP-14)', () => {
    const { resultado } = partidaComVotos({ a: 'pular', b: 'pular', c: 'pular' })

    expect(resultado.faseSeguinte).toBeUndefined()
  })

  it('0 votos válidos (host encerra sem ninguém votar) conta como "não acertou" (edge case)', () => {
    const { resultado } = partidaComVotos({})

    expect(resultado.faseSeguinte).toBeUndefined()
  })

  /**
   * O denominador da maioria é o total de **ativos**, não o de quem votou
   * (tech decision de `design.md`). Só um caso de comparecimento parcial
   * separa as duas leituras: com todos votando elas coincidem sempre.
   */
  it('maioria entre quem votou, sem ser maioria dos ativos, não encerra a partida (ESP-13)', () => {
    const jogadores = ['a', 'b', 'c', 'd', 'e'].map((id) => jogador(id))
    const base = ctx({ jogadores })
    const pronto = comTodosProntos(rodadaDe(jogadores), base)
    let atual = reduzirOk(pronto, base, { t: 'abrirVotacao' }).estado

    // 'b' é o espião; 2 dos 3 que votaram acusam 'b' — maioria entre votantes
    // (2 de 3), mas não dos 5 ativos (precisa de 3).
    for (const [votante, alvo] of [['a', 'b'], ['c', 'b'], ['d', null]] as const) {
      atual = reduzirOk(atual, { ...base, autorId: votante }, { t: 'votar', alvoId: alvo }).estado
    }
    const resultado = reduzirOk(atual, base, { t: 'encerrarVotacao' })

    expect({ espioes: resultado.estado.espioes, faseSeguinte: resultado.faseSeguinte }).toEqual({
      espioes: ['b'],
      faseSeguinte: undefined,
    })
  })

  it('exatamente metade dos ativos não é maioria absoluta (ESP-13)', () => {
    const jogadores = ['a', 'b', 'c', 'd'].map((id) => jogador(id))
    const base = ctx({ jogadores })
    const pronto = comTodosProntos(rodadaDe(jogadores), base)
    let atual = reduzirOk(pronto, base, { t: 'abrirVotacao' }).estado

    // 'b' é o espião; 2 de 4 ativos o acusam — metade exata, não maioria.
    for (const [votante, alvo] of [['a', 'b'], ['c', 'b'], ['d', null]] as const) {
      atual = reduzirOk(atual, { ...base, autorId: votante }, { t: 'votar', alvoId: alvo }).estado
    }
    const resultado = reduzirOk(atual, base, { t: 'encerrarVotacao' })

    expect({ espioes: resultado.estado.espioes, faseSeguinte: resultado.faseSeguinte }).toEqual({
      espioes: ['b'],
      faseSeguinte: undefined,
    })
  })
})

// ---------------------------------------------------------------------------
// encerrar / novaPartida
// ---------------------------------------------------------------------------

describe('encerrar (ESP-15)', () => {
  it('recusa fora da fase de jogo', () => {
    const base = ctx({ fase: 'lobby' })

    const resultado = reduzir(estadoVazio(), base, { t: 'encerrar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('recusa de quem não é host', () => {
    const base = ctx()
    const estado = rodadaDe(base.jogadores)

    const resultado = reduzir(estado, { ...base, autorId: 'b' }, { t: 'encerrar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('o host encerra a qualquer momento da fase de jogo, revelando local e espiões', () => {
    const base = ctx()
    const estado = rodadaDe(base.jogadores) // ainda "aguardando prontos" — encerrar funciona mesmo assim

    const resultado = reduzirOk(estado, base, { t: 'encerrar' })

    expect({
      faseSeguinte: resultado.faseSeguinte,
      local: resultado.estado.local,
      espioes: resultado.estado.espioes,
    }).toEqual({ faseSeguinte: 'encerrada', local: estado.local, espioes: estado.espioes })
  })
})

describe('novaPartida', () => {
  it('recusa fora da fase encerrada', () => {
    const base = ctx()

    const resultado = reduzir(estadoVazio(), base, { t: 'novaPartida' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('recusa de quem não é host', () => {
    const base = ctx({ fase: 'encerrada' })

    const resultado = reduzir(estadoVazio(), { ...base, autorId: 'b' }, { t: 'novaPartida' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('devolve a sala ao lobby com o estado zerado e promove aguardando', () => {
    const base = ctx({ fase: 'encerrada' })

    const resultado = reduzirOk(estadoVazio(), base, { t: 'novaPartida' })

    expect({
      estado: resultado.estado,
      faseSeguinte: resultado.faseSeguinte,
      promoverAguardando: resultado.promoverAguardando,
    }).toEqual({ estado: estadoVazio(), faseSeguinte: 'lobby', promoverAguardando: true })
  })
})

// ---------------------------------------------------------------------------
// notas
// ---------------------------------------------------------------------------

describe('notas', () => {
  it('persiste a nota privada do autor', () => {
    const base = ctx()
    const estado = rodadaDe(base.jogadores)

    const resultado = reduzirOk(estado, { ...base, autorId: 'c' }, { t: 'notas', texto: 'acho que é a Ana' })

    expect(resultado.estado.notas).toEqual({ c: 'acho que é a Ana' })
  })
})

// ---------------------------------------------------------------------------
// Edge cases — saída de jogador
// ---------------------------------------------------------------------------

describe('saída de jogador durante a rodada (edge cases do spec)', () => {
  it('cancela a partida quando os ativos restantes caem abaixo de 3', () => {
    const base = ctx({ jogadores: [jogador('a'), jogador('b'), jogador('c')] })
    const estado = rodadaDe(base.jogadores)
    // `c` já saiu do roster — `core` remove antes de avisar (mesmo padrão de "Quem Sou Eu").
    const ctxSemC = ctx({ jogadores: [jogador('a'), jogador('b')] })

    const resultado = reduzirOk(estado, ctxSemC, { t: 'saiuJogador', jogadorId: 'c' })

    expect({
      estado: resultado.estado,
      faseSeguinte: resultado.faseSeguinte,
      promoverAguardando: resultado.promoverAguardando,
    }).toEqual({ estado: estadoVazio(), faseSeguinte: 'lobby', promoverAguardando: true })
  })

  it('a partida segue sem espião quando o único espião sai e sobram ativos suficientes', () => {
    const base = ctx({ jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d')] })
    const estado = rodadaDe(base.jogadores) // espião sorteado: 'b' (rotação com aleatorio constante)
    expect(estado.espioes).toEqual(['b'])
    const ctxSemB = ctx({ jogadores: [jogador('a'), jogador('c'), jogador('d')] })

    const resultado = reduzirOk(estado, ctxSemB, { t: 'saiuJogador', jogadorId: 'b' })

    expect(resultado.estado.espioes).toEqual([])
    expect(resultado.faseSeguinte).toBeUndefined() // a partida não é cancelada nem redistribuída
  })

  it('limpa nota, voto e marcação de pronto de quem saiu', () => {
    const base = ctx({ jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d')] })
    const estado = rodadaDe(base.jogadores)
    const comNota = reduzirOk(estado, { ...base, autorId: 'c' }, { t: 'notas', texto: 'nota da c' }).estado
    const comPronto = reduzirOk(comNota, { ...base, autorId: 'c' }, { t: 'marcarPronto', pronto: true }).estado
    const ctxSemC = ctx({ jogadores: [jogador('a'), jogador('b'), jogador('d')] })

    const resultado = reduzirOk(comPronto, ctxSemC, { t: 'saiuJogador', jogadorId: 'c' })

    expect({ notas: resultado.estado.notas, prontos: resultado.estado.prontos }).toEqual({
      notas: {},
      prontos: [],
    })
  })

  it('libera a rodada se quem saiu era o último faltando marcar pronto', () => {
    const base = ctx({ jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d')] })
    const estado = rodadaDe(base.jogadores)
    const comAPronto = reduzirOk(estado, { ...base, autorId: 'a' }, { t: 'marcarPronto', pronto: true }).estado
    const comBPronto = reduzirOk(comAPronto, { ...base, autorId: 'b' }, { t: 'marcarPronto', pronto: true }).estado
    const comDPronto = reduzirOk(comBPronto, { ...base, autorId: 'd' }, { t: 'marcarPronto', pronto: true }).estado
    // 'c' nunca marcou pronto e agora sai — restam 'a', 'b' e 'd', todos prontos.
    const ctxSemC = ctx({ jogadores: [jogador('a'), jogador('b'), jogador('d')] })

    const resultado = reduzirOk(comDPronto, ctxSemC, { t: 'saiuJogador', jogadorId: 'c' })

    expect(resultado.estado.rodadaIniciada).toBe(true)
  })

  it('fecha a votação se quem saiu era o único ativo conectado faltando votar', () => {
    const base = ctx({ jogadores: [jogador('a'), jogador('b'), jogador('c')] })
    const pronto = comTodosProntos(rodadaDe(base.jogadores), base)
    const aberta = reduzirOk(pronto, base, { t: 'abrirVotacao' }).estado
    const comVotoDeA = reduzirOk(aberta, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' }).estado
    // 'c' sai sem votar — só resta 'a' (já votou) e 'b'.
    const ctxSemC = ctx({ jogadores: [jogador('a'), jogador('b')] })
    const comVotoDeB = reduzirOk(comVotoDeA, { ...ctxSemC, autorId: 'b' }, { t: 'votar', alvoId: 'b' }).estado

    const resultado = reduzirOk(comVotoDeB, ctxSemC, { t: 'saiuJogador', jogadorId: 'c' })

    expect(resultado.estado.votacaoAberta).toBeNull()
  })

  it('ignora saída de jogador no lobby ou com a partida já encerrada', () => {
    const estado = estadoVazio()

    const noLobby = reduzir(estado, ctx({ fase: 'lobby' }), { t: 'saiuJogador', jogadorId: 'x' }, AMBIENTE)
    const encerrada = reduzir(estado, ctx({ fase: 'encerrada' }), { t: 'saiuJogador', jogadorId: 'x' }, AMBIENTE)

    expect([noLobby, encerrada]).toEqual([
      { ok: true, estado, eventos: [], prazos: {} },
      { ok: true, estado, eventos: [], prazos: {} },
    ])
  })
})

// ---------------------------------------------------------------------------
// Pausa (ESP-35..ESP-39)
// ---------------------------------------------------------------------------

describe('pausar e retomar a rodada (ESP-35, ESP-36, ESP-37, ESP-38, ESP-39)', () => {
  const AGORA = AMBIENTE.agora
  const PRAZO = AGORA + 200_000

  function emRodada(over: Partial<ContextoDeSala> = {}) {
    const base = ctx({ prazoTurno: PRAZO, ...over })
    const estado = comTodosProntos(rodadaDe(base.jogadores, over), base)
    return { estado, base }
  }

  it('congela o tempo que faltava e conta quem pausou (ESP-35)', () => {
    const { estado, base } = emRodada()

    const resultado = reduzirOk(estado, base, { t: 'pausar' })

    expect(resultado.estado.pausa).toEqual({ por: 'a', restanteMs: 200_000 })
    expect(resultado.prazos).toEqual({ turno: null })
    expect(resultado.eventos).toEqual([
      { texto: `${base.jogadores.find((j) => j.id === 'a')!.apelido} pausou a rodada.` },
    ])
  })

  it('retoma do tempo que restava, e não do tempo cheio (ESP-36)', () => {
    const { estado, base } = emRodada()
    const pausada = reduzirOk(estado, base, { t: 'pausar' }).estado

    // 30s reais se passaram com a mesa parada.
    const depois: Ambiente = { ...AMBIENTE, agora: AGORA + 30_000 }
    const resultado = reduzir(pausada, { ...base, prazoTurno: null }, { t: 'retomar' }, depois)

    expect(resultado.ok && resultado.estado.pausa).toBeNull()
    expect(resultado.ok && resultado.prazos).toEqual({ turno: AGORA + 30_000 + 200_000 })
  })

  it('recusa abrir votação com a rodada pausada, inclusive pro host (ESP-37)', () => {
    const { estado, base } = emRodada()
    const pausada = reduzirOk(estado, base, { t: 'pausar' }).estado

    const resultado = reduzir(pausada, base, { t: 'abrirVotacao' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
  })

  it('recusa votar com a rodada pausada, sem descartar os votos já dados (ESP-37)', () => {
    const { estado, base } = emRodada()
    const aberta = reduzirOk(estado, base, { t: 'abrirVotacao' }).estado
    const votada = reduzirOk(aberta, { ...base, autorId: 'a' }, { t: 'votar', alvoId: 'b' }).estado
    const pausada = reduzirOk(votada, base, { t: 'pausar' }).estado

    const resultado = reduzir(pausada, { ...base, autorId: 'c' }, { t: 'votar', alvoId: 'b' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
    expect(pausada.votacaoAberta?.votos).toEqual({ a: 'b' })
  })

  it('quem não é host não pausa nem retoma (ESP-38)', () => {
    const { estado, base } = emRodada()
    const pausada = reduzirOk(estado, base, { t: 'pausar' }).estado

    expect(reduzir(estado, { ...base, autorId: 'c' }, { t: 'pausar' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'SEM_AUTORIDADE',
    })
    expect(reduzir(pausada, { ...base, autorId: 'c' }, { t: 'retomar' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'SEM_AUTORIDADE',
    })
  })

  it('rodada sem relógio também pausa, e retomar não inventa prazo (ESP-39)', () => {
    const config = { ...CONFIG_PADRAO, espiao: { ...CONFIG_PADRAO.espiao, tempoRodadaSeg: null } }
    const { estado, base } = emRodada({ config, prazoTurno: null })

    const pausada = reduzirOk(estado, base, { t: 'pausar' })
    const retomada = reduzirOk(pausada.estado, base, { t: 'retomar' })

    expect(pausada.estado.pausa).toEqual({ por: 'a', restanteMs: null })
    expect(retomada.prazos).toEqual({ turno: null })
  })

  it('recusa pausar duas vezes e retomar sem pausa', () => {
    const { estado, base } = emRodada()
    const pausada = reduzirOk(estado, base, { t: 'pausar' }).estado

    expect(reduzir(pausada, base, { t: 'pausar' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'COMANDO_INVALIDO',
    })
    expect(reduzir(estado, base, { t: 'retomar' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'COMANDO_INVALIDO',
    })
  })
})
