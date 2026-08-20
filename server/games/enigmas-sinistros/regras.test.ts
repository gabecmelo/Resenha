import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  LIMITE_DECLARACAO,
  LIMITE_PERGUNTA,
  type Ambiente,
  type ContextoDeSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../../shared/protocolo'
import { ENIGMAS } from '../../../shared/enigmas-dados'
import {
  type ComandoEnigmas,
  type EstadoEnigmas,
  campeoes,
  iniciarRodada,
  narradorDe,
  reduzir,
} from './regras'

const AMBIENTE: Ambiente = { agora: 10_000, aleatorio: () => 0 }
const PACOTE_LEVE = ENIGMAS[0]!.id

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
    config: { ...CONFIG_PADRAO, pacoteIds: [PACOTE_LEVE] },
    jogadores: [jogador('a'), jogador('b'), jogador('c')],
    prazoTurno: null,
    autorId: 'a',
    ...over,
  }
}

function partida(over: Partial<ContextoDeSala> = {}): {
  estado: EstadoEnigmas
  contexto: ContextoDeSala
} {
  const contexto = ctx(over)
  const inicio = iniciarRodada(contexto, AMBIENTE)
  if (!inicio.ok) throw new Error(`partida não iniciou: ${inicio.erro}`)
  return { estado: inicio.valor, contexto }
}

function aplicar(
  estado: EstadoEnigmas,
  contexto: ContextoDeSala,
  comando: ComandoEnigmas,
): EstadoEnigmas {
  const r = reduzir(estado, contexto, comando, AMBIENTE)
  if (!r.ok) throw new Error(`comando recusado: ${r.erro}`)
  return r.estado
}

/** Quem não narra a rodada — a mesa que pergunta. */
function mesa(estado: EstadoEnigmas, contexto: ContextoDeSala): JogadorId[] {
  return contexto.jogadores.filter((j) => j.id !== narradorDe(estado)).map((j) => j.id)
}

/** O caminho inteiro: alguém declara e o narrador aceita. */
function desatar(
  estado: EstadoEnigmas,
  contexto: ContextoDeSala,
  quem: JogadorId,
): EstadoEnigmas {
  const declarada = aplicar(estado, { ...contexto, autorId: quem }, {
    t: 'declararSolucao',
    texto: 'foi o mordomo',
  })
  return aplicar(declarada, { ...contexto, autorId: narradorDe(declarada) }, {
    t: 'julgarDeclaracao',
    acertou: true,
  })
}

describe('iniciarRodada', () => {
  it('ENIG-02: recusa com menos de 3 jogadores ativos', () => {
    const r = iniciarRodada(ctx({ jogadores: [jogador('a'), jogador('b')] }), AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('ENIG-02: jogador aguardando não conta pro mínimo', () => {
    const r = iniciarRodada(
      ctx({ jogadores: [jogador('a'), jogador('b'), jogador('c', 'aguardando')] }),
      AMBIENTE,
    )
    expect(r).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('ENIG-32: recusa sem nenhum pacote selecionado', () => {
    const r = iniciarRodada(ctx({ config: { ...CONFIG_PADRAO, pacoteIds: [] } }), AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
  })

  it('ENIG-03: vira o primeiro enigma e sorteia a ordem dos narradores', () => {
    const { estado } = partida()
    expect(estado.rodada).toBe(1)
    expect(estado.enigma?.cena.length).toBeGreaterThan(0)
    expect(estado.enigma?.solucao.length).toBeGreaterThan(0)
    expect([...estado.ordemNarradores].sort()).toEqual(['a', 'b', 'c'])
    expect(['a', 'b', 'c']).toContain(narradorDe(estado))
  })

  it('ENIG-06: o enigma não agenda relógio nenhum', () => {
    const r = iniciarRodada(ctx(), AMBIENTE)
    expect(r.ok && r.prazos?.turno).toBeNull()
  })

  it('ENIG-32: só entram enigmas dos pacotes escolhidos', () => {
    const pesado = ENIGMAS[1]!
    const r = iniciarRodada(ctx({ config: { ...CONFIG_PADRAO, pacoteIds: [pesado.id] } }), AMBIENTE)
    if (!r.ok) throw new Error(r.erro)
    expect(pesado.enigmas.map((e) => e.cena)).toContain(r.valor.enigma?.cena)
  })
})

describe('ENIG-08…ENIG-11 — a fila de perguntas', () => {
  it('a pergunta entra na fila sem resposta', () => {
    const { estado, contexto } = partida()
    const quem = mesa(estado, contexto)[0]!
    const depois = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'perguntarEnigma',
      texto: '  Ele morreu?  ',
    })
    expect(depois.perguntas).toEqual([
      { id: 1, autorId: quem, texto: 'Ele morreu?', resposta: null },
    ])
  })

  it('ENIG-07: o narrador responde, não pergunta', () => {
    const { estado, contexto } = partida()
    const r = reduzir(estado, { ...contexto, autorId: narradorDe(estado) }, {
      t: 'perguntarEnigma',
      texto: 'posso?',
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('ENIG-08: recusa pergunta vazia ou acima do limite', () => {
    const { estado, contexto } = partida()
    const autor = { ...contexto, autorId: mesa(estado, contexto)[0]! }
    for (const texto of ['   ', 'x'.repeat(LIMITE_PERGUNTA + 1)]) {
      expect(reduzir(estado, autor, { t: 'perguntarEnigma', texto }, AMBIENTE)).toEqual({
        ok: false,
        erro: 'CARTA_INVALIDA',
      })
    }
  })

  it('ENIG-08: uma pergunta por vez — a segunda espera a resposta da primeira', () => {
    const { estado, contexto } = partida()
    const autor = { ...contexto, autorId: mesa(estado, contexto)[0]! }
    const uma = aplicar(estado, autor, { t: 'perguntarEnigma', texto: 'era de noite?' })

    expect(reduzir(uma, autor, { t: 'perguntarEnigma', texto: 'chovia?' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })

    const respondida = aplicar(uma, { ...contexto, autorId: narradorDe(uma) }, {
      t: 'responderPergunta',
      perguntaId: 1,
      resposta: 'sim',
    })
    expect(aplicar(respondida, autor, { t: 'perguntarEnigma', texto: 'chovia?' }).perguntas).toHaveLength(2)
  })

  it('ENIG-09: o narrador responde e a resposta fica colada na pergunta', () => {
    const { estado, contexto } = partida()
    const quem = mesa(estado, contexto)[0]!
    const perguntada = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'perguntarEnigma',
      texto: 'era de noite?',
    })
    const depois = aplicar(perguntada, { ...contexto, autorId: narradorDe(estado) }, {
      t: 'responderPergunta',
      perguntaId: 1,
      resposta: 'naoImporta',
    })
    expect(depois.perguntas[0]!.resposta).toBe('naoImporta')
  })

  it('ENIG-09: só o narrador responde, e só uma vez', () => {
    const { estado, contexto } = partida()
    const quem = mesa(estado, contexto)[0]!
    const perguntada = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'perguntarEnigma',
      texto: 'era de noite?',
    })

    expect(
      reduzir(perguntada, { ...contexto, autorId: quem }, {
        t: 'responderPergunta',
        perguntaId: 1,
        resposta: 'sim',
      }, AMBIENTE),
    ).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })

    const narrador = { ...contexto, autorId: narradorDe(estado) }
    const respondida = aplicar(perguntada, narrador, {
      t: 'responderPergunta',
      perguntaId: 1,
      resposta: 'sim',
    })
    expect(
      reduzir(respondida, narrador, { t: 'responderPergunta', perguntaId: 1, resposta: 'nao' }, AMBIENTE),
    ).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('ENIG-33: no modo em voz alta a batida entra sozinha, sem texto', () => {
    const emVoz = { ...CONFIG_PADRAO, pacoteIds: [PACOTE_LEVE], enigmas: { modoPergunta: 'voz' as const, metaDePontos: 5 } }
    const { estado, contexto } = partida({ config: emVoz })
    const narrador = { ...contexto, autorId: narradorDe(estado) }

    const depois = aplicar(estado, narrador, { t: 'responderPergunta', perguntaId: null, resposta: 'nao' })
    expect(depois.perguntas).toEqual([
      { id: 1, autorId: narradorDe(estado), texto: '', resposta: 'nao' },
    ])

    // E a pergunta escrita não existe nesse modo.
    expect(
      reduzir(estado, { ...contexto, autorId: mesa(estado, contexto)[0]! }, {
        t: 'perguntarEnigma',
        texto: 'era de noite?',
      }, AMBIENTE),
    ).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('ENIG-33: no modo fila a batida solta é recusada', () => {
    const { estado, contexto } = partida()
    const r = reduzir(estado, { ...contexto, autorId: narradorDe(estado) }, {
      t: 'responderPergunta',
      perguntaId: null,
      resposta: 'sim',
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })
})

describe('ENIG-14…ENIG-18 — declarar, julgar e entregar', () => {
  it('ENIG-14: a declaração fica pendente até o narrador julgar', () => {
    const { estado, contexto } = partida()
    const quem = mesa(estado, contexto)[0]!
    const depois = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'declararSolucao',
      texto: 'ele pulou de paraquedas',
    })
    expect(depois.declaracao).toEqual({ autorId: quem, texto: 'ele pulou de paraquedas' })
    expect(depois.fase).toBe('enigma')
  })

  it('ENIG-14: uma declaração por vez, e o narrador não declara', () => {
    const { estado, contexto } = partida()
    const [um, dois] = mesa(estado, contexto)
    const uma = aplicar(estado, { ...contexto, autorId: um! }, {
      t: 'declararSolucao',
      texto: 'foi o irmão',
    })

    expect(
      reduzir(uma, { ...contexto, autorId: dois! }, { t: 'declararSolucao', texto: 'foi a mãe' }, AMBIENTE),
    ).toEqual({ ok: false, erro: 'FASE_INVALIDA' })

    expect(
      reduzir(estado, { ...contexto, autorId: narradorDe(estado) }, {
        t: 'declararSolucao',
        texto: 'eu sei, eu escrevi',
      }, AMBIENTE),
    ).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('ENIG-14: recusa declaração vazia ou acima do limite', () => {
    const { estado, contexto } = partida()
    const autor = { ...contexto, autorId: mesa(estado, contexto)[0]! }
    for (const texto of ['  ', 'x'.repeat(LIMITE_DECLARACAO + 1)]) {
      expect(reduzir(estado, autor, { t: 'declararSolucao', texto }, AMBIENTE)).toEqual({
        ok: false,
        erro: 'CARTA_INVALIDA',
      })
    }
  })

  it('ENIG-17: errar não elimina — vira histórico e o enigma continua', () => {
    const { estado, contexto } = partida()
    const quem = mesa(estado, contexto)[0]!
    const declarada = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'declararSolucao',
      texto: 'foi o mordomo',
    })
    const depois = aplicar(declarada, { ...contexto, autorId: narradorDe(estado) }, {
      t: 'julgarDeclaracao',
      acertou: false,
    })

    expect(depois.fase).toBe('enigma')
    expect(depois.declaracao).toBeNull()
    expect(depois.tentativas).toEqual([{ autorId: quem, texto: 'foi o mordomo', acertou: false }])
    expect(depois.placar[quem]).toBe(0)

    // E dá pra tentar de novo.
    expect(
      aplicar(depois, { ...contexto, autorId: quem }, { t: 'declararSolucao', texto: 'foi o vizinho' })
        .declaracao,
    ).not.toBeNull()
  })

  it('ENIG-15, ENIG-16: acertar dá o ponto e abre a revelação', () => {
    const { estado, contexto } = partida()
    const quem = mesa(estado, contexto)[0]!
    const depois = desatar(estado, contexto, quem)

    expect(depois.fase).toBe('revelacao')
    expect(depois.desatouId).toBe(quem)
    expect(depois.placar[quem]).toBe(1)
    expect(depois.tentativas).toEqual([{ autorId: quem, texto: 'foi o mordomo', acertou: true }])
  })

  it('ENIG-15: só o narrador julga', () => {
    const { estado, contexto } = partida()
    const [um, dois] = mesa(estado, contexto)
    const declarada = aplicar(estado, { ...contexto, autorId: um! }, {
      t: 'declararSolucao',
      texto: 'foi o mordomo',
    })
    expect(
      reduzir(declarada, { ...contexto, autorId: dois! }, { t: 'julgarDeclaracao', acertou: true }, AMBIENTE),
    ).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('ENIG-18: o narrador entrega a solução e ninguém pontua', () => {
    const { estado, contexto } = partida()
    const depois = aplicar(estado, { ...contexto, autorId: narradorDe(estado) }, {
      t: 'entregarSolucao',
    })
    expect(depois.fase).toBe('revelacao')
    expect(depois.desatouId).toBeNull()
    expect(Object.values(depois.placar)).toEqual([0, 0, 0])
  })

  it('ENIG-18: só o narrador entrega', () => {
    const { estado, contexto } = partida()
    const r = reduzir(estado, { ...contexto, autorId: mesa(estado, contexto)[0]! }, {
      t: 'entregarSolucao',
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })
})

describe('ENIG-19…ENIG-21 — troca de enigma', () => {
  it('ENIG-19: o próximo enigma limpa a mesa e passa o narrador', () => {
    const { estado, contexto } = partida()
    const narradorAntes = narradorDe(estado)
    const desatado = desatar(estado, contexto, mesa(estado, contexto)[0]!)
    const proxima = aplicar(desatado, { ...contexto, autorId: narradorAntes }, { t: 'proximoEnigma' })

    expect(proxima.rodada).toBe(2)
    expect(narradorDe(proxima)).not.toBe(narradorAntes)
    expect(proxima.fase).toBe('enigma')
    expect(proxima.perguntas).toEqual([])
    expect(proxima.tentativas).toEqual([])
    expect(proxima.desatouId).toBeNull()
    expect(proxima.enigma?.cena).not.toBe(estado.enigma?.cena)
  })

  it('ENIG-20: só o narrador da rodada avança', () => {
    const { estado, contexto } = partida()
    const desatado = desatar(estado, contexto, mesa(estado, contexto)[0]!)
    const r = reduzir(desatado, { ...contexto, autorId: mesa(estado, contexto)[0]! }, {
      t: 'proximoEnigma',
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('ENIG-19: o narrador roda por todo mundo antes de repetir', () => {
    const inicial = partida()
    const contexto = inicial.contexto
    let estado = inicial.estado
    const vistos: JogadorId[] = []

    for (let i = 0; i < 3; i += 1) {
      const narrador = narradorDe(estado)
      vistos.push(narrador)
      const entregue = aplicar(estado, { ...contexto, autorId: narrador }, { t: 'entregarSolucao' })
      estado = aplicar(entregue, { ...contexto, autorId: narrador }, { t: 'proximoEnigma' })
    }

    expect([...vistos].sort()).toEqual(['a', 'b', 'c'])
    expect(narradorDe(estado)).toBe(vistos[0])
  })

  it('ENIG-21: o enigma usado não volta enquanto houver monte', () => {
    const inicial = partida()
    const contexto = inicial.contexto
    let estado = inicial.estado
    const vistas = new Set<string>()

    for (let i = 0; i < 6; i += 1) {
      const cena = estado.enigma!.cena
      expect(vistas.has(cena)).toBe(false)
      vistas.add(cena)
      const narrador = narradorDe(estado)
      const entregue = aplicar(estado, { ...contexto, autorId: narrador }, { t: 'entregarSolucao' })
      estado = aplicar(entregue, { ...contexto, autorId: narrador }, { t: 'proximoEnigma' })
    }
  })

  it('ENIG-21: monte vazio reembaralha o descarte em vez de acabar a partida', () => {
    const inicial = partida()
    const contexto = inicial.contexto
    let estado = inicial.estado
    const total = ENIGMAS[0]!.enigmas.length

    for (let i = 0; i < total + 2; i += 1) {
      expect(estado.enigma).not.toBeNull()
      const narrador = narradorDe(estado)
      const entregue = aplicar(estado, { ...contexto, autorId: narrador }, { t: 'entregarSolucao' })
      estado = aplicar(entregue, { ...contexto, autorId: narrador }, { t: 'proximoEnigma' })
    }
    expect(estado.enigma).not.toBeNull()
  })
})

describe('ENIG-24…ENIG-26 — placar e fim da partida', () => {
  it('ENIG-25: bater a meta encerra a partida ao avançar', () => {
    const contextoMeta = ctx({
      config: {
        ...CONFIG_PADRAO,
        pacoteIds: [PACOTE_LEVE],
        enigmas: { modoPergunta: 'fila', metaDePontos: 1 },
      },
    })
    const inicio = iniciarRodada(contextoMeta, AMBIENTE)
    if (!inicio.ok) throw new Error(inicio.erro)

    const desatado = desatar(inicio.valor, contextoMeta, mesa(inicio.valor, contextoMeta)[0]!)
    expect(desatado.metaBatida).toBe(true)

    const fim = reduzir(desatado, { ...contextoMeta, autorId: narradorDe(desatado) }, {
      t: 'proximoEnigma',
    }, AMBIENTE)
    expect(fim.ok && fim.faseSeguinte).toBe('encerrada')
  })

  it('ENIG-25: sem meta, a partida não acaba sozinha', () => {
    const contextoSemMeta = ctx({
      config: {
        ...CONFIG_PADRAO,
        pacoteIds: [PACOTE_LEVE],
        enigmas: { modoPergunta: 'fila', metaDePontos: null },
      },
    })
    const inicio = iniciarRodada(contextoSemMeta, AMBIENTE)
    if (!inicio.ok) throw new Error(inicio.erro)

    const desatado = desatar(inicio.valor, contextoSemMeta, mesa(inicio.valor, contextoSemMeta)[0]!)
    expect(desatado.metaBatida).toBe(false)
    const seguinte = reduzir(desatado, { ...contextoSemMeta, autorId: narradorDe(desatado) }, {
      t: 'proximoEnigma',
    }, AMBIENTE)
    expect(seguinte.ok && seguinte.faseSeguinte).toBeUndefined()
  })

  it('ENIG-26: empate no topo não é desempatado', () => {
    const { estado } = partida()
    expect(campeoes({ ...estado, placar: { a: 2, b: 2, c: 1 } }).sort()).toEqual(['a', 'b'])
    expect(campeoes({ ...estado, placar: { a: 0, b: 0, c: 0 } })).toEqual([])
  })

  it('ENIG-22: só o host encerra na mão', () => {
    const { estado, contexto } = partida()
    expect(reduzir(estado, { ...contexto, autorId: 'b' }, { t: 'encerrar' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'SEM_AUTORIDADE',
    })
    const r = reduzir(estado, { ...contexto, autorId: 'a' }, { t: 'encerrar' }, AMBIENTE)
    expect(r.ok && r.faseSeguinte).toBe('encerrada')
  })
})

describe('ENIG-23 — quem sai não trava a mesa', () => {
  it('o narrador saindo descarta o enigma e passa a vez', () => {
    const { estado, contexto } = partida()
    const narrador = narradorDe(estado)
    const restantes = contexto.jogadores.filter((j) => j.id !== narrador)
    const depois = reduzir(
      estado,
      { ...contexto, jogadores: [...restantes, jogador('d')] },
      { t: 'saiuJogador', jogadorId: narrador },
      AMBIENTE,
    )
    if (!depois.ok) throw new Error(depois.erro)
    expect(depois.estado.rodada).toBe(2)
    expect(narradorDe(depois.estado)).not.toBe(narrador)
    expect(depois.estado.ordemNarradores).not.toContain(narrador)
  })

  it('abaixo do mínimo, a partida é cancelada e a sala volta pro lobby', () => {
    const { estado, contexto } = partida()
    const r = reduzir(
      estado,
      { ...contexto, jogadores: [jogador('a'), jogador('b')] },
      { t: 'saiuJogador', jogadorId: 'c' },
      AMBIENTE,
    )
    expect(r.ok && r.faseSeguinte).toBe('lobby')
    expect(r.ok && r.promoverAguardando).toBe(true)
  })

  it('a declaração de quem saiu não fica pendurada esperando veredito', () => {
    const { estado, contexto } = partida()
    const quem = mesa(estado, contexto)[0]!
    const declarada = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'declararSolucao',
      texto: 'foi o mordomo',
    })
    const restantes = contexto.jogadores.filter((j) => j.id !== quem)
    const r = reduzir(
      declarada,
      { ...contexto, jogadores: [...restantes, jogador('d')] },
      { t: 'saiuJogador', jogadorId: quem },
      AMBIENTE,
    )
    if (!r.ok) throw new Error(r.erro)
    expect(r.estado.declaracao).toBeNull()
  })
})
