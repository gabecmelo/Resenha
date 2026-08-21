import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  type Ambiente,
  type ContextoDeSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../protocolo'
import { CARTAS_DEDO } from '../../dedo-dados'
import {
  type ComandoDedo,
  type EstadoDedo,
  campeoes,
  iniciarRodada,
  quantosDevemApontar,
  reduzir,
  todosApontaram,
} from './regras'

const AMBIENTE: Ambiente = { agora: 10_000, aleatorio: () => 0 }
const PACOTE = CARTAS_DEDO[0]!.id

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

function ctx(over: Partial<ContextoDeSala> = {}): ContextoDeSala {
  return {
    fase: 'jogo',
    hostId: 'a',
    config: { ...CONFIG_PADRAO, pacoteIds: [PACOTE] },
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    prazoTurno: null,
    autorId: 'a',
    ...over,
  }
}

function partida(over: Partial<ContextoDeSala> = {}): {
  estado: EstadoDedo
  contexto: ContextoDeSala
} {
  const contexto = ctx(over)
  const inicio = iniciarRodada(contexto, AMBIENTE)
  if (!inicio.ok) throw new Error(`partida não iniciou: ${inicio.erro}`)
  return { estado: inicio.valor, contexto }
}

function aplicar(estado: EstadoDedo, contexto: ContextoDeSala, comando: ComandoDedo): EstadoDedo {
  const r = reduzir(estado, contexto, comando, AMBIENTE)
  if (!r.ok) throw new Error(`comando recusado: ${r.erro}`)
  return r.estado
}

/** Aponta na voz de `quem`, sem repetir o `{ ...contexto, autorId }` toda hora. */
function apontar(
  estado: EstadoDedo,
  contexto: ContextoDeSala,
  quem: JogadorId,
  alvoId: JogadorId,
): EstadoDedo {
  return aplicar(estado, { ...contexto, autorId: quem }, { t: 'apontar', alvoId })
}

describe('DEDO-01, DEDO-02 — o começo da partida', () => {
  it('vira a primeira carta e zera o placar de todo mundo', () => {
    const { estado } = partida()
    expect(estado.rodada).toBe(1)
    expect(estado.carta).toBeTypeOf('string')
    expect(estado.carta).not.toBe('')
    expect(estado.fase).toBe('votacao')
    expect(estado.placar).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('recusa a partida com menos de três ativos', () => {
    const inicio = iniciarRodada(ctx({ jogadores: [jogador('a'), jogador('b')] }), AMBIENTE)
    expect(inicio).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('não conta quem está aguardando pro mínimo', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c', 'aguardando')]
    expect(iniciarRodada(ctx({ jogadores }), AMBIENTE).ok).toBe(false)
  })

  it('recusa quando nenhum pacote escolhido existe', () => {
    const contexto = ctx({ config: { ...CONFIG_PADRAO, pacoteIds: ['pacote-que-nao-existe'] } })
    expect(iniciarRodada(contexto, AMBIENTE)).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
  })

  it('guarda os pacotes escolhidos pra mesa saber de onde vêm as cartas', () => {
    const { estado } = partida()
    expect(estado.pacotesSelecionados?.map((p) => p.id)).toEqual([PACOTE])
  })
})

describe('DEDO-05, DEDO-06 — apontar', () => {
  it('registra o dedo e espera os outros', () => {
    const { estado, contexto } = partida()
    const depois = apontar(estado, contexto, 'a', 'b')
    expect(depois.votos).toEqual({ a: 'b' })
    expect(depois.fase).toBe('votacao')
  })

  it('apontar de novo troca o dedo de lugar em vez de somar', () => {
    const { estado, contexto } = partida()
    const um = apontar(estado, contexto, 'a', 'b')
    const dois = apontar(um, contexto, 'a', 'c')
    expect(dois.votos).toEqual({ a: 'c' })
  })

  it('DEDO-06: com auto-voto desligado ninguém aponta pra si', () => {
    const { estado, contexto } = partida()
    const r = reduzir(estado, contexto, { t: 'apontar', alvoId: 'a' }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('DEDO-06: com auto-voto ligado o dedo na própria cara vale', () => {
    const config = { ...CONFIG_PADRAO, pacoteIds: [PACOTE], dedo: { ...CONFIG_PADRAO.dedo, autoVoto: true } }
    const { estado, contexto } = partida({ config })
    expect(apontar(estado, contexto, 'a', 'a').votos).toEqual({ a: 'a' })
  })

  it('não aceita dedo apontado pra quem não está jogando', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')]
    const { estado, contexto } = partida({ jogadores })
    expect(reduzir(estado, contexto, { t: 'apontar', alvoId: 'd' }, AMBIENTE).ok).toBe(false)
  })

  it('quem está aguardando não aponta', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d', 'aguardando')]
    const { estado, contexto } = partida({ jogadores })
    const r = reduzir(estado, { ...contexto, autorId: 'd' }, { t: 'apontar', alvoId: 'a' }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'JOGADOR_AGUARDANDO' })
  })

  it('não se aponta durante a apuração', () => {
    const { estado, contexto } = partida()
    let depois = apontar(estado, contexto, 'a', 'b')
    depois = apontar(depois, contexto, 'b', 'c')
    depois = apontar(depois, contexto, 'c', 'b')
    expect(depois.fase).toBe('apuracao')
    const r = reduzir(depois, contexto, { t: 'apontar', alvoId: 'c' }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })
})

describe('DEDO-11, DEDO-12, DEDO-13 — a contagem dos dedos', () => {
  it('fecha sozinha quando o último aponta e dá o ponto a quem levou mais dedos', () => {
    const { estado, contexto } = partida()
    let depois = apontar(estado, contexto, 'a', 'b')
    depois = apontar(depois, contexto, 'c', 'b')
    expect(depois.fase).toBe('votacao')
    depois = apontar(depois, contexto, 'b', 'a')

    expect(depois.fase).toBe('apuracao')
    expect(depois.vencedorId).toBe('b')
    expect(depois.votosNoVencedor).toBe(2)
    expect(depois.empatou).toBe(false)
    expect(depois.placar).toEqual({ a: 0, b: 1, c: 0 })
  })

  it('DEDO-13: dois no topo é empate, e no empate ninguém pontua', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]
    const { estado, contexto } = partida({ jogadores })
    let depois = apontar(estado, contexto, 'a', 'b')
    depois = apontar(depois, contexto, 'b', 'a')
    depois = apontar(depois, contexto, 'c', 'a')
    depois = apontar(depois, contexto, 'd', 'b')

    expect(depois.fase).toBe('apuracao')
    expect(depois.empatou).toBe(true)
    expect(depois.vencedorId).toBeNull()
    expect(depois.placar).toEqual({ a: 0, b: 0, c: 0, d: 0 })
  })

  it('DEDO-10: a mesa não espera quem caiu da sala', () => {
    const jogadores = [jogador('a'), jogador('b'), { ...jogador('c'), conectado: false }]
    const { estado, contexto } = partida({ jogadores })
    expect(quantosDevemApontar(contexto)).toBe(2)

    let depois = apontar(estado, contexto, 'a', 'b')
    depois = apontar(depois, contexto, 'b', 'a')
    expect(todosApontaram(depois, contexto)).toBe(true)
    expect(depois.fase).toBe('apuracao')
    // Um dedo pra cada: empate, e a contagem fechou mesmo assim.
    expect(depois.empatou).toBe(true)
  })
})

describe('DEDO-04, DEDO-15 — a próxima carta', () => {
  it('limpa os dedos, avança a rodada e vira outra carta', () => {
    const { estado, contexto } = partida()
    let depois = apontar(estado, contexto, 'a', 'b')
    depois = apontar(depois, contexto, 'b', 'c')
    depois = apontar(depois, contexto, 'c', 'b')
    const carta = depois.carta

    const virada = aplicar(depois, { ...contexto, autorId: 'c' }, { t: 'proximaCarta' })
    expect(virada.rodada).toBe(2)
    expect(virada.fase).toBe('votacao')
    expect(virada.votos).toEqual({})
    expect(virada.vencedorId).toBeNull()
    expect(virada.carta).not.toBe(carta)
    expect(virada.descarte).toEqual([carta])
    // O placar da rodada anterior continua de pé.
    expect(virada.placar.b).toBe(1)
  })

  it('não vira carta durante a votação', () => {
    const { estado, contexto } = partida()
    expect(reduzir(estado, contexto, { t: 'proximaCarta' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })
  })

  it('DEDO-04: com o monte vazio o descarte volta embaralhado em vez de acabar a partida', () => {
    const { estado, contexto } = partida()
    const gasto: EstadoDedo = { ...estado, fase: 'apuracao', monte: [], descarte: ['carta velha'] }
    const virada = aplicar(gasto, contexto, { t: 'proximaCarta' })
    expect(virada.carta).toBe('carta velha')
    // A carta que saiu da mesa entrou no descarte e o descarte virou monte na
    // mesma virada: sobra ela no monte, e nada no descarte.
    expect(virada.descarte).toEqual([])
    expect(virada.monte).toEqual([estado.carta])
  })
})

describe('DEDO-17, DEDO-18, DEDO-19 — o fim da partida', () => {
  const config = {
    ...CONFIG_PADRAO,
    pacoteIds: [PACOTE],
    dedo: { ...CONFIG_PADRAO.dedo, metaDePontos: 1 },
  }

  function ateAMeta(): { estado: EstadoDedo; contexto: ContextoDeSala } {
    const { estado, contexto } = partida({ config })
    let depois = apontar(estado, contexto, 'a', 'b')
    depois = apontar(depois, contexto, 'b', 'c')
    depois = apontar(depois, contexto, 'c', 'b')
    return { estado: depois, contexto }
  }

  it('marca a meta batida sem tirar a carta da mesa na hora', () => {
    const { estado } = ateAMeta()
    expect(estado.metaBatida).toBe(true)
    expect(estado.fase).toBe('apuracao')
    expect(estado.carta).toBeTypeOf('string')
  })

  it('DEDO-17: a próxima carta encerra a partida quando a meta já caiu', () => {
    const { estado, contexto } = ateAMeta()
    const r = reduzir(estado, contexto, { t: 'proximaCarta' }, AMBIENTE)
    expect(r.ok && r.faseSeguinte).toBe('encerrada')
    expect(r.ok && r.estado.rodada).toBe(1)
  })

  it('DEDO-19: empate no topo do placar não é desempatado', () => {
    const estado: EstadoDedo = { ...partida().estado, placar: { a: 3, b: 3, c: 1 } }
    expect(campeoes(estado).sort()).toEqual(['a', 'b'])
  })

  it('sem ponto nenhum no placar não há campeão', () => {
    const estado: EstadoDedo = { ...partida().estado, placar: { a: 0, b: 0 } }
    expect(campeoes(estado)).toEqual([])
  })

  it('só o host encerra', () => {
    const { estado, contexto } = partida()
    expect(reduzir(estado, { ...contexto, autorId: 'b' }, { t: 'encerrar' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'SEM_AUTORIDADE',
    })
    const r = reduzir(estado, contexto, { t: 'encerrar' }, AMBIENTE)
    expect(r.ok && r.faseSeguinte).toBe('encerrada')
  })

  it('nova partida devolve a sala ao lobby, e só na fase encerrada', () => {
    const { estado, contexto } = partida()
    expect(reduzir(estado, contexto, { t: 'novaPartida' }, AMBIENTE).ok).toBe(false)

    const encerrada = { ...contexto, fase: 'encerrada' as const }
    const r = reduzir(estado, encerrada, { t: 'novaPartida' }, AMBIENTE)
    expect(r.ok && r.faseSeguinte).toBe('lobby')
    expect(r.ok && r.estado.rodada).toBe(0)
    expect(r.ok && r.promoverAguardando).toBe(true)
  })
})

describe('quem entra e quem sai', () => {
  it('quem chega no meio não remonta a partida corrente', () => {
    const { estado, contexto } = partida()
    const depois = aplicar(estado, contexto, { t: 'entrouJogador', jogadorId: 'd' })
    expect(depois).toBe(estado)
  })

  it('quem sai leva junto o dedo que deu e os que recebeu', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]
    const { estado, contexto } = partida({ jogadores })
    let depois = apontar(estado, contexto, 'a', 'c')
    depois = apontar(depois, contexto, 'b', 'c')

    const semC = { ...contexto, jogadores: jogadores.filter((j) => j.id !== 'c') }
    const r = aplicar(depois, semC, { t: 'saiuJogador', jogadorId: 'c' })
    expect(r.votos).toEqual({})
    expect(r.placar).not.toHaveProperty('c')
  })

  it('a saída de quem faltava apontar fecha a contagem na hora', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]
    const { estado, contexto } = partida({ jogadores })
    let depois = apontar(estado, contexto, 'a', 'c')
    depois = apontar(depois, contexto, 'b', 'c')
    depois = apontar(depois, contexto, 'c', 'a')
    expect(depois.fase).toBe('votacao')

    const semD = { ...contexto, jogadores: jogadores.filter((j) => j.id !== 'd') }
    const fechou = aplicar(depois, semD, { t: 'saiuJogador', jogadorId: 'd' })
    expect(fechou.fase).toBe('apuracao')
    expect(fechou.vencedorId).toBe('c')
  })

  it('se a mesa toda apontou pra quem saiu, a carta volta a esperar dedos', () => {
    const jogadores = [jogador('a'), jogador('b'), jogador('c'), jogador('d')]
    const { estado, contexto } = partida({ jogadores })
    let depois = apontar(estado, contexto, 'a', 'd')
    depois = apontar(depois, contexto, 'b', 'd')
    depois = apontar(depois, contexto, 'c', 'd')

    const semD = { ...contexto, jogadores: jogadores.filter((j) => j.id !== 'd') }
    const sobrou = aplicar(depois, semD, { t: 'saiuJogador', jogadorId: 'd' })
    expect(sobrou.votos).toEqual({})
    expect(sobrou.fase).toBe('votacao')
  })

  it('cair abaixo do mínimo cancela a partida e devolve a sala ao lobby', () => {
    const { estado, contexto } = partida()
    const semC = { ...contexto, jogadores: [jogador('a'), jogador('b')] }
    const r = reduzir(estado, semC, { t: 'saiuJogador', jogadorId: 'c' }, AMBIENTE)
    expect(r.ok && r.faseSeguinte).toBe('lobby')
    expect(r.ok && r.estado.rodada).toBe(0)
  })

  it('quem sai do lobby ou da sala encerrada não mexe em nada', () => {
    const { estado, contexto } = partida()
    const encerrada = { ...contexto, fase: 'encerrada' as const, jogadores: [jogador('a')] }
    const r = reduzir(estado, encerrada, { t: 'saiuJogador', jogadorId: 'b' }, AMBIENTE)
    expect(r.ok && r.estado).toBe(estado)
  })
})

describe('comandos que este jogo não usa', () => {
  it('o prazo de turno vencido não faz nada, porque nenhuma carta agenda relógio', () => {
    const { estado, contexto } = partida()
    expect(aplicar(estado, contexto, { t: 'venceuPrazoTurno' })).toBe(estado)
  })
})
