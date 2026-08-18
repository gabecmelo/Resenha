import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  JANELA_DE_REVELACAO_MS,
  LIMITE_CARTA_BRANCA,
  RECARGA_DA_BRANCA,
  OPCOES_DE_PERGUNTA,
  REROLLS_INICIAIS,
  TAMANHO_DA_MAO,
  type Ambiente,
  type ContextoDeSala,
  type Jogador,
  type JogadorId,
  type Situacao,
} from '../../../shared/protocolo'
import { CARTAS_TURMA } from '../../../shared/cartas-turma-dados'
import {
  type ComandoCartas,
  type EstadoCartas,
  brancaVoltaEm,
  campeoes,
  iniciarRodada,
  juizDa,
  reduzir,
} from './regras'

const AMBIENTE: Ambiente = { agora: 10_000, aleatorio: () => 0 }
const PACOTE_LEVE = CARTAS_TURMA[0]!.id

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

/** Começa uma partida e para na fase da pergunta, antes de o juiz escolher. */
function partidaCrua(over: Partial<ContextoDeSala> = {}): {
  estado: EstadoCartas
  contexto: ContextoDeSala
} {
  const contexto = ctx(over)
  const inicio = iniciarRodada(contexto, AMBIENTE)
  if (!inicio.ok) throw new Error(`partida não iniciou: ${inicio.erro}`)
  return { estado: inicio.valor, contexto }
}

/** `CCT-35`, `CCT-36` — o juiz escolhe a pergunta e vira pra mesa. */
function abrirPergunta(estado: EstadoCartas, contexto: ContextoDeSala): EstadoCartas {
  const juiz = { ...contexto, autorId: juizDa(estado) }
  const escolhida = aplicar(estado, juiz, { t: 'escolherPergunta', indice: 0 })
  return aplicar(escolhida, juiz, { t: 'revelarPergunta' })
}

/** Começa uma partida de verdade e devolve o estado já na fase de escolha. */
function partida(over: Partial<ContextoDeSala> = {}): { estado: EstadoCartas; contexto: ContextoDeSala } {
  const { estado, contexto } = partidaCrua(over)
  return { estado: abrirPergunta(estado, contexto), contexto }
}

function aplicar(
  estado: EstadoCartas,
  contexto: ContextoDeSala,
  comando: ComandoCartas,
  ambiente: Ambiente = AMBIENTE,
): EstadoCartas {
  const r = reduzir(estado, contexto, comando, ambiente)
  if (!r.ok) throw new Error(`comando recusado: ${r.erro}`)
  return r.estado
}

/** `CCT-38` — o juiz vira a pilha inteira, que é o que destrava o julgamento. */
function revelarTudo(estado: EstadoCartas, contexto: ContextoDeSala): EstadoCartas {
  let atual = estado
  for (let indice = 0; indice < (estado.pilha ?? []).length; indice += 1) {
    atual = aplicar(atual, { ...contexto, autorId: juizDa(atual) }, { t: 'revelarCarta', indice })
  }
  return atual
}

/** Todo mundo que não é juiz joga a primeira carta da própria mão. */
function todosJogam(estado: EstadoCartas, contexto: ContextoDeSala): EstadoCartas {
  let atual = estado
  for (const jogador of contexto.jogadores) {
    if (jogador.id === juizDa(atual) || jogador.situacao !== 'ativo') continue
    const carta = atual.maos[jogador.id]![0]!
    atual = aplicar(atual, { ...contexto, autorId: jogador.id }, {
      t: 'jogarCarta',
      texto: carta,
      daBranca: false,
    })
  }
  return atual
}

/** A pilha fechada e já lida: é daqui que o juiz aponta a vencedora. */
function pilhaNaMesa(estado: EstadoCartas, contexto: ContextoDeSala): EstadoCartas {
  return revelarTudo(todosJogam(estado, contexto), contexto)
}

describe('iniciarRodada', () => {
  it('CCT-02: recusa com menos de 3 jogadores ativos', () => {
    const r = iniciarRodada(ctx({ jogadores: [jogador('a'), jogador('b')] }), AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('CCT-02: jogador aguardando não conta pro mínimo', () => {
    const r = iniciarRodada(
      ctx({ jogadores: [jogador('a'), jogador('b'), jogador('c', 'aguardando')] }),
      AMBIENTE,
    )
    expect(r).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
  })

  it('CCT-34: recusa sem nenhum pacote selecionado', () => {
    const r = iniciarRodada(ctx({ config: { ...CONFIG_PADRAO, pacoteIds: [] } }), AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
  })

  it('CCT-03: distribui uma mão cheia por jogador ativo e vira a pergunta', () => {
    const { estado } = partida()
    expect(estado.rodada).toBe(1)
    expect(estado.pergunta).toContain('_____')
    expect(estado.perguntaRevelada).toBe(true)
    for (const id of ['a', 'b', 'c']) {
      expect(estado.maos[id]).toHaveLength(TAMANHO_DA_MAO)
    }
  })

  it('CCT-03: as mãos não se repetem entre jogadores', () => {
    const { estado } = partida()
    const todas = [...estado.maos['a']!, ...estado.maos['b']!, ...estado.maos['c']!]
    expect(new Set(todas).size).toBe(todas.length)
  })

  it('CCT-03: o juiz sorteado está entre os ativos e a ordem cobre todo mundo', () => {
    const { estado } = partida()
    expect(['a', 'b', 'c']).toContain(juizDa(estado))
    expect([...estado.ordemJuizes].sort()).toEqual(['a', 'b', 'c'])
  })

  it('CCT-19: todo mundo começa com a carta em branco disponível', () => {
    const { estado } = partida()
    for (const id of ['a', 'b', 'c']) expect(brancaVoltaEm(estado, id)).toBe(0)
  })

  it('CCT-36: a partida começa sem relógio — quem larga é o juiz', () => {
    const r = iniciarRodada(ctx(), AMBIENTE)
    expect(r.ok && r.prazos?.turno).toBeNull()
    expect(r.ok && r.valor.fase).toBe('pergunta')
  })

  it('CCT-01, CCT-36: o prazo de escolha sai do config e começa na revelação', () => {
    const { estado, contexto } = partidaCrua()
    const juiz = { ...contexto, autorId: juizDa(estado) }
    const escolhida = aplicar(estado, juiz, { t: 'escolherPergunta', indice: 0 })
    const r = reduzir(escolhida, juiz, { t: 'revelarPergunta' }, AMBIENTE)
    expect(r.ok && r.prazos.turno).toBe(AMBIENTE.agora + 90 * 1000)
  })

  it('CCT-01: "sem tempo" não agenda prazo nenhum', () => {
    const contexto = ctx({
      config: { ...CONFIG_PADRAO, pacoteIds: [PACOTE_LEVE], cartas: { tempoEscolhaSeg: null, metaDePontos: 5 } },
    })
    const { estado } = partidaCrua({
      config: { ...CONFIG_PADRAO, pacoteIds: [PACOTE_LEVE], cartas: { tempoEscolhaSeg: null, metaDePontos: 5 } },
    })
    const juiz = { ...contexto, autorId: juizDa(estado) }
    const escolhida = aplicar(estado, juiz, { t: 'escolherPergunta', indice: 0 })
    const r = reduzir(escolhida, juiz, { t: 'revelarPergunta' }, AMBIENTE)
    expect(r.ok && r.prazos.turno).toBeNull()
  })

  it('CCT-32: só entram cartas dos pacotes escolhidos', () => {
    const pesado = CARTAS_TURMA[1]!
    const { estado } = partida({ config: { ...CONFIG_PADRAO, pacoteIds: [pesado.id] } })
    expect(pesado.perguntas).toContain(estado.pergunta)
  })
})

describe('CCT-35, CCT-36 — o juiz escolhe e vira a pergunta', () => {
  it('CCT-35: o juiz recebe mais de uma pergunta pra escolher', () => {
    const { estado } = partidaCrua()
    expect(estado.fase).toBe('pergunta')
    expect(estado.pergunta).toBe('')
    expect(estado.opcoesPergunta).toHaveLength(OPCOES_DE_PERGUNTA)
    for (const opcao of estado.opcoesPergunta) expect(opcao).toContain('_____')
  })

  it('CCT-35: só o juiz escolhe a pergunta', () => {
    const { estado, contexto } = partidaCrua()
    const outro = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const r = reduzir(estado, { ...contexto, autorId: outro }, { t: 'escolherPergunta', indice: 0 }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('CCT-35: as recusadas voltam pro descarte em vez de sumir', () => {
    const { estado, contexto } = partidaCrua()
    const opcoes = [...estado.opcoesPergunta]
    const depois = aplicar(estado, { ...contexto, autorId: juizDa(estado) }, {
      t: 'escolherPergunta',
      indice: 1,
    })
    expect(depois.pergunta).toBe(opcoes[1])
    expect(depois.opcoesPergunta).toEqual([])
    expect(depois.descartePerguntas).toEqual([opcoes[0], opcoes[2]])
  })

  it('CCT-35: não dá pra trocar a pergunta depois de escolhida', () => {
    const { estado, contexto } = partidaCrua()
    const juiz = { ...contexto, autorId: juizDa(estado) }
    const escolhida = aplicar(estado, juiz, { t: 'escolherPergunta', indice: 0 })
    expect(reduzir(escolhida, juiz, { t: 'escolherPergunta', indice: 1 }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })
  })

  it('CCT-36: revelar sem ter escolhido é recusado', () => {
    const { estado, contexto } = partidaCrua()
    const r = reduzir(estado, { ...contexto, autorId: juizDa(estado) }, { t: 'revelarPergunta' }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('CCT-36: ninguém joga carta antes de a pergunta ser virada', () => {
    const { estado, contexto } = partidaCrua()
    const outro = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const r = reduzir(estado, { ...contexto, autorId: outro }, {
      t: 'jogarCarta',
      texto: estado.maos[outro]![0]!,
      daBranca: false,
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('CCT-36: revelada, a rodada abre para escolha', () => {
    const { estado, contexto } = partidaCrua()
    const depois = abrirPergunta(estado, contexto)
    expect(depois.fase).toBe('escolha')
    expect(depois.perguntaRevelada).toBe(true)
    expect(depois.pergunta).not.toBe('')
  })
})

describe('CCT-38, CCT-39 — a pilha vira uma carta por vez', () => {
  it('CCT-38: a pilha começa inteira virada pra baixo', () => {
    const { estado, contexto } = partida()
    const fechado = todosJogam(estado, contexto)
    expect(fechado.fase).toBe('julgamento')
    expect(fechado.reveladas).toEqual([])
  })

  it('CCT-38: só o juiz vira carta', () => {
    const { estado, contexto } = partida()
    const fechado = todosJogam(estado, contexto)
    const outro = contexto.jogadores.find((j) => j.id !== juizDa(fechado))!.id
    const r = reduzir(fechado, { ...contexto, autorId: outro }, { t: 'revelarCarta', indice: 0 }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('CCT-38: virar duas vezes a mesma carta é recusado', () => {
    const { estado, contexto } = partida()
    const fechado = todosJogam(estado, contexto)
    const juiz = { ...contexto, autorId: juizDa(fechado) }
    const uma = aplicar(fechado, juiz, { t: 'revelarCarta', indice: 0 })
    expect(uma.reveladas).toEqual([0])
    expect(reduzir(uma, juiz, { t: 'revelarCarta', indice: 0 }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })
  })

  it('CCT-39: não dá pra escolher a vencedora com carta ainda virada', () => {
    const { estado, contexto } = partida()
    const fechado = todosJogam(estado, contexto)
    const juiz = { ...contexto, autorId: juizDa(fechado) }
    expect(reduzir(fechado, juiz, { t: 'escolherVencedora', indice: 0 }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })

    const uma = aplicar(fechado, juiz, { t: 'revelarCarta', indice: 0 })
    expect(reduzir(uma, juiz, { t: 'escolherVencedora', indice: 0 }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })

    const todas = aplicar(uma, juiz, { t: 'revelarCarta', indice: 1 })
    expect(reduzir(todas, juiz, { t: 'escolherVencedora', indice: 0 }, AMBIENTE).ok).toBe(true)
  })
})

describe('CCT-06 — jogar a carta', () => {
  it('remove a carta da mão de quem jogou', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const carta = estado.maos[quem]![0]!
    const depois = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: carta,
      daBranca: false,
    })
    expect(depois.maos[quem]).not.toContain(carta)
    expect(depois.jogadas).toEqual([{ autorId: quem, texto: carta, daBranca: false }])
  })

  it('CCT-05: o juiz da rodada não joga', () => {
    const { estado, contexto } = partida()
    const juiz = juizDa(estado)
    const r = reduzir(estado, { ...contexto, autorId: juiz }, {
      t: 'jogarCarta',
      texto: estado.maos[juiz]![0]!,
      daBranca: false,
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('recusa carta que não está na mão', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const r = reduzir(estado, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: 'uma carta que não existe',
      daBranca: false,
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('recusa jogar duas vezes na mesma rodada', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const depois = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: estado.maos[quem]![0]!,
      daBranca: false,
    })
    const r = reduzir(depois, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: depois.maos[quem]![0]!,
      daBranca: false,
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('CCT-08: o último a jogar fecha a escolha e embaralha a pilha', () => {
    const { estado, contexto } = partida()
    const depois = todosJogam(estado, contexto)
    expect(depois.fase).toBe('julgamento')
    expect(depois.pilha).toHaveLength(2)
    expect([...depois.pilha!].sort()).toEqual([0, 1])
  })

  it('CCT-08: o julgamento não tem relógio', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.filter((j) => j.id !== juizDa(estado))
    const meio = aplicar(estado, { ...contexto, autorId: quem[0]!.id }, {
      t: 'jogarCarta',
      texto: estado.maos[quem[0]!.id]![0]!,
      daBranca: false,
    })
    const r = reduzir(meio, { ...contexto, autorId: quem[1]!.id }, {
      t: 'jogarCarta',
      texto: meio.maos[quem[1]!.id]![0]!,
      daBranca: false,
    }, AMBIENTE)
    expect(r.ok && r.prazos.turno).toBeNull()
  })
})

describe('CCT-19…CCT-25 — a carta em branco', () => {
  function jogarBranca(estado: EstadoCartas, contexto: ContextoDeSala, texto: string) {
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    return reduzir(estado, { ...contexto, autorId: quem }, { t: 'jogarCarta', texto, daBranca: true }, AMBIENTE)
  }

  it('CCT-20, CCT-23: entra na pilha como qualquer outra resposta', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const depois = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: '  a piada da mesa  ',
      daBranca: true,
    })
    expect(depois.jogadas).toEqual([{ autorId: quem, texto: 'a piada da mesa', daBranca: true }])
    expect(depois.maos[quem]).toHaveLength(TAMANHO_DA_MAO)
  })

  it('CCT-21: recusa texto vazio ou só com espaços', () => {
    const { estado, contexto } = partida()
    expect(jogarBranca(estado, contexto, '   ')).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('CCT-22: recusa acima do limite de caracteres', () => {
    const { estado, contexto } = partida()
    expect(jogarBranca(estado, contexto, 'x'.repeat(LIMITE_CARTA_BRANCA + 1))).toEqual({
      ok: false,
      erro: 'CARTA_INVALIDA',
    })
    expect(jogarBranca(estado, contexto, 'x'.repeat(LIMITE_CARTA_BRANCA)).ok).toBe(true)
  })

  it('CCT-24: gasta na rodada 1 volta só na rodada 6', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const depois = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: 'escrevi',
      daBranca: true,
    })
    expect(depois.brancaVoltaNa[quem]).toBe(1 + RECARGA_DA_BRANCA)
    expect(brancaVoltaEm(depois, quem)).toBe(RECARGA_DA_BRANCA)
  })

  it('CCT-24: não pode gastar de novo enquanto está indisponível', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const gasta: EstadoCartas = { ...estado, brancaVoltaNa: { ...estado.brancaVoltaNa, [quem]: 6 } }
    const r = reduzir(gasta, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: 'de novo',
      daBranca: true,
    }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'CARTA_INVALIDA' })
  })

  it('CCT-25: a contagem cai a cada rodada até chegar a zero', () => {
    const estado = { rodada: 1, brancaVoltaNa: { a: 6 } } as unknown as EstadoCartas
    expect(brancaVoltaEm(estado, 'a')).toBe(5)
    expect(brancaVoltaEm({ ...estado, rodada: 5 }, 'a')).toBe(1)
    expect(brancaVoltaEm({ ...estado, rodada: 6 }, 'a')).toBe(0)
    expect(brancaVoltaEm({ ...estado, rodada: 7 }, 'a')).toBe(0)
  })
})

describe('CCT-11…CCT-14 — julgamento, ponto e próxima rodada', () => {
  it('CCT-11: só o juiz escolhe a vencedora', () => {
    const { estado, contexto } = partida()
    const fechado = pilhaNaMesa(estado, contexto)
    const naoJuiz = contexto.jogadores.find((j) => j.id !== juizDa(fechado))!.id
    const r = reduzir(fechado, { ...contexto, autorId: naoJuiz }, { t: 'escolherVencedora', indice: 0 }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('CCT-11: recusa índice fora da pilha', () => {
    const { estado, contexto } = partida()
    const fechado = pilhaNaMesa(estado, contexto)
    const juiz = juizDa(fechado)
    for (const indice of [-1, 2, 1.5]) {
      expect(reduzir(fechado, { ...contexto, autorId: juiz }, { t: 'escolherVencedora', indice }, AMBIENTE)).toEqual(
        { ok: false, erro: 'CARTA_INVALIDA' },
      )
    }
  })

  it('CCT-13: o ponto vai pro autor da carta escolhida, não pra quem está na posição', () => {
    const { estado, contexto } = partida()
    const fechado = pilhaNaMesa(estado, contexto)
    const juiz = juizDa(fechado)
    const escolhido = fechado.jogadas[fechado.pilha![1]!]!.autorId
    const depois = aplicar(fechado, { ...contexto, autorId: juiz }, { t: 'escolherVencedora', indice: 1 })
    expect(depois.placar[escolhido]).toBe(1)
    expect(depois.fase).toBe('revelacao')
    expect(depois.vencedoraNaPilha).toBe(1)
  })

  it('CCT-12: a revelação abre uma janela com prazo', () => {
    const { estado, contexto } = partida()
    const fechado = pilhaNaMesa(estado, contexto)
    const r = reduzir(fechado, { ...contexto, autorId: juizDa(fechado) }, { t: 'escolherVencedora', indice: 0 }, AMBIENTE)
    expect(r.ok && r.prazos.turno).toBe(AMBIENTE.agora + JANELA_DE_REVELACAO_MS)
  })

  it('CCT-14: fechada a janela, repõe as mãos, passa o juiz e vira nova pergunta', () => {
    const { estado, contexto } = partida()
    const fechado = pilhaNaMesa(estado, contexto)
    const juizAntes = juizDa(fechado)
    const revelando = aplicar(fechado, { ...contexto, autorId: juizAntes }, { t: 'escolherVencedora', indice: 0 })
    const proxima = aplicar(revelando, contexto, { t: 'venceuPrazoTurno' })

    expect(proxima.rodada).toBe(2)
    expect(juizDa(proxima)).not.toBe(juizAntes)
    expect(proxima.fase).toBe('pergunta')
    expect(proxima.jogadas).toEqual([])
    expect(proxima.pilha).toBeNull()
    expect(proxima.pergunta).not.toBe(fechado.pergunta)
    for (const id of ['a', 'b', 'c']) expect(proxima.maos[id]).toHaveLength(TAMANHO_DA_MAO)
  })

  it('CCT-14: o juiz roda por todo mundo antes de repetir', () => {
    const inicial = partidaCrua()
    const contexto = inicial.contexto
    let estado = inicial.estado
    const vistos: JogadorId[] = []
    for (let i = 0; i < 3; i += 1) {
      vistos.push(juizDa(estado))
      const aberta = abrirPergunta(estado, contexto)
      const fechado = pilhaNaMesa(aberta, contexto)
      const revelando = aplicar(fechado, { ...contexto, autorId: juizDa(fechado) }, {
        t: 'escolherVencedora',
        indice: 0,
      })
      estado = aplicar(revelando, contexto, { t: 'venceuPrazoTurno' })
    }
    expect([...vistos].sort()).toEqual(['a', 'b', 'c'])
    expect(juizDa(estado)).toBe(vistos[0])
  })

  it('CCT-15: a pergunta usada não volta enquanto houver monte', () => {
    const inicial = partidaCrua()
    const contexto = inicial.contexto
    let estado = inicial.estado
    const vistas = new Set<string>()
    for (let i = 0; i < 5; i += 1) {
      const aberta = abrirPergunta(estado, contexto)
      const fechado = pilhaNaMesa(aberta, contexto)
      const revelando = aplicar(fechado, { ...contexto, autorId: juizDa(fechado) }, {
        t: 'escolherVencedora',
        indice: 0,
      })
      estado = aplicar(revelando, contexto, { t: 'venceuPrazoTurno' })
      expect(vistas.has(aberta.pergunta)).toBe(false)
      vistas.add(aberta.pergunta)
    }
  })
})

describe('CCT-40 — a troca de mão', () => {
  it('começa com duas trocas pra cada um', () => {
    const { estado } = partida()
    for (const id of ['a', 'b', 'c']) expect(estado.rerolls[id]).toBe(REROLLS_INICIAIS)
  })

  it('troca a mão inteira e gasta uma', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const antes = [...estado.maos[quem]!]

    const depois = aplicar(estado, { ...contexto, autorId: quem }, { t: 'trocarMao' })

    expect(depois.maos[quem]).toHaveLength(TAMANHO_DA_MAO)
    expect(depois.rerolls[quem]).toBe(REROLLS_INICIAIS - 1)
    // Nenhuma carta velha sobrevive à troca.
    for (const carta of depois.maos[quem]!) expect(antes).not.toContain(carta)
    // E as velhas foram pro descarte, não pro topo do monte.
    for (const carta of antes) expect(depois.descarteRespostas).toContain(carta)
  })

  it('não mexe na mão de mais ninguém', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const outro = contexto.jogadores.find((j) => j.id !== quem && j.id !== juizDa(estado))
    const depois = aplicar(estado, { ...contexto, autorId: quem }, { t: 'trocarMao' })
    if (outro !== undefined) expect(depois.maos[outro.id]).toEqual(estado.maos[outro.id])
  })

  it('acabadas as trocas, o comando é recusado', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const autor = { ...contexto, autorId: quem }
    let atual = estado
    for (let i = 0; i < REROLLS_INICIAIS; i += 1) atual = aplicar(atual, autor, { t: 'trocarMao' })

    expect(atual.rerolls[quem]).toBe(0)
    expect(reduzir(atual, autor, { t: 'trocarMao' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'CARTA_INVALIDA',
    })
  })

  it('o juiz não troca mão — ele não tem mão nesta rodada', () => {
    const { estado, contexto } = partida()
    const r = reduzir(estado, { ...contexto, autorId: juizDa(estado) }, { t: 'trocarMao' }, AMBIENTE)
    expect(r).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
  })

  it('depois de jogar não dá mais pra trocar', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const autor = { ...contexto, autorId: quem }
    const jogou = aplicar(estado, autor, {
      t: 'jogarCarta',
      texto: estado.maos[quem]![0]!,
      daBranca: false,
    })
    expect(reduzir(jogou, autor, { t: 'trocarMao' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })
  })

  it('a cada três rodadas todo mundo ganha mais uma', () => {
    const inicial = partidaCrua()
    const contexto = inicial.contexto
    let estado = inicial.estado
    const porRodada: number[] = []

    for (let i = 0; i < 4; i += 1) {
      porRodada.push(estado.rerolls['a'] ?? 0)
      const fechado = pilhaNaMesa(abrirPergunta(estado, contexto), contexto)
      const revelando = aplicar(fechado, { ...contexto, autorId: juizDa(fechado) }, {
        t: 'escolherVencedora',
        indice: 0,
      })
      estado = aplicar(revelando, contexto, { t: 'venceuPrazoTurno' })
    }

    // Rodadas 1, 2 e 3 com as duas iniciais; a 4ª abre com uma a mais.
    expect(porRodada).toEqual([2, 2, 2, 3])
  })
})

describe('CCT-09, CCT-10 — o relógio da escolha', () => {
  it('CCT-09: o prazo fecha a rodada só com quem jogou', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.filter((j) => j.id !== juizDa(estado))
    const so_um = aplicar(estado, { ...contexto, autorId: quem[0]!.id }, {
      t: 'jogarCarta',
      texto: estado.maos[quem[0]!.id]![0]!,
      daBranca: false,
    })
    const outro = aplicar(so_um, { ...contexto, autorId: quem[1]!.id }, {
      t: 'jogarCarta',
      texto: so_um.maos[quem[1]!.id]![0]!,
      daBranca: false,
    })
    expect(outro.fase).toBe('julgamento')
  })

  it('CCT-10: menos de duas respostas descarta a rodada, sem ponto', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const carta = estado.maos[quem]![0]!
    const um_so = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: carta,
      daBranca: false,
    })
    const depois = aplicar(um_so, contexto, { t: 'venceuPrazoTurno' })

    expect(depois.rodada).toBe(2)
    expect(depois.fase).toBe('pergunta')
    expect(Object.values(depois.placar)).toEqual([0, 0, 0])
    // A carta de quem jogou volta pra mão: a rodada não aconteceu.
    expect(depois.maos[quem]).toContain(carta)
    expect(depois.maos[quem]).toHaveLength(TAMANHO_DA_MAO)
  })

  it('CCT-10: a carta em branco gasta numa rodada descartada volta a valer', () => {
    const { estado, contexto } = partida()
    const quem = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const um_so = aplicar(estado, { ...contexto, autorId: quem }, {
      t: 'jogarCarta',
      texto: 'escrevi à toa',
      daBranca: true,
    })
    const depois = aplicar(um_so, contexto, { t: 'venceuPrazoTurno' })
    expect(brancaVoltaEm(depois, quem)).toBe(0)
  })
})

describe('CCT-26…CCT-30 — placar e fim da partida', () => {
  it('CCT-28: bater a meta encerra a partida quando a revelação sai', () => {
    const contextoMeta = ctx({
      config: { ...CONFIG_PADRAO, pacoteIds: [PACOTE_LEVE], cartas: { tempoEscolhaSeg: 90, metaDePontos: 1 } },
    })
    const inicio = iniciarRodada(contextoMeta, AMBIENTE)
    if (!inicio.ok) throw new Error(inicio.erro)

    const fechado = pilhaNaMesa(abrirPergunta(inicio.valor, contextoMeta), contextoMeta)
    const revelando = aplicar(fechado, { ...contextoMeta, autorId: juizDa(fechado) }, {
      t: 'escolherVencedora',
      indice: 0,
    })
    expect(revelando.metaBatida).toBe(true)

    const fim = reduzir(revelando, contextoMeta, { t: 'venceuPrazoTurno' }, AMBIENTE)
    expect(fim.ok && fim.faseSeguinte).toBe('encerrada')
  })

  it('CCT-28: sem meta, a partida não acaba sozinha', () => {
    const contextoSemMeta = ctx({
      config: { ...CONFIG_PADRAO, pacoteIds: [PACOTE_LEVE], cartas: { tempoEscolhaSeg: 90, metaDePontos: null } },
    })
    const inicio = iniciarRodada(contextoSemMeta, AMBIENTE)
    if (!inicio.ok) throw new Error(inicio.erro)
    const fechado = pilhaNaMesa(abrirPergunta(inicio.valor, contextoSemMeta), contextoSemMeta)
    const revelando = aplicar(fechado, { ...contextoSemMeta, autorId: juizDa(fechado) }, {
      t: 'escolherVencedora',
      indice: 0,
    })
    expect(revelando.metaBatida).toBe(false)
    const seguinte = reduzir(revelando, contextoSemMeta, { t: 'venceuPrazoTurno' }, AMBIENTE)
    expect(seguinte.ok && seguinte.faseSeguinte).toBeUndefined()
  })

  it('CCT-30: empate no topo devolve todos os empatados', () => {
    const estado = { placar: { a: 3, b: 3, c: 1 } } as unknown as EstadoCartas
    expect([...campeoes(estado)].sort()).toEqual(['a', 'b'])
  })

  it('CCT-30: partida sem nenhum ponto não tem campeão', () => {
    const estado = { placar: { a: 0, b: 0 } } as unknown as EstadoCartas
    expect(campeoes(estado)).toEqual([])
  })

  it('CCT-16: só o host encerra, e só durante a partida', () => {
    const { estado, contexto } = partida()
    expect(reduzir(estado, { ...contexto, autorId: 'b' }, { t: 'encerrar' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'SEM_AUTORIDADE',
    })
    const r = reduzir(estado, contexto, { t: 'encerrar' }, AMBIENTE)
    expect(r.ok && r.faseSeguinte).toBe('encerrada')
  })

  it('só o host começa nova partida, e só com a partida encerrada', () => {
    const { estado, contexto } = partida()
    expect(reduzir(estado, contexto, { t: 'novaPartida' }, AMBIENTE)).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })
    const r = reduzir(estado, { ...contexto, fase: 'encerrada' }, { t: 'novaPartida' }, AMBIENTE)
    expect(r.ok && r.faseSeguinte).toBe('lobby')
    expect(r.ok && r.promoverAguardando).toBe(true)
  })
})

describe('CCT-17, CCT-18 — quem sai da sala', () => {
  it('CCT-17: cair abaixo do mínimo cancela a partida', () => {
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

  it('CCT-18: o juiz saindo descarta a rodada e passa a vez', () => {
    const { estado, contexto } = partida({
      jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d')],
    })
    const juiz = juizDa(estado)
    const restantes = contexto.jogadores.filter((j) => j.id !== juiz)
    const depois = aplicar(estado, { ...contexto, jogadores: restantes }, {
      t: 'saiuJogador',
      jogadorId: juiz,
    })
    expect(depois.rodada).toBe(2)
    expect(depois.ordemJuizes).not.toContain(juiz)
    expect(juizDa(depois)).toBe(estado.ordemJuizes[1])
  })

  it('quem sai some do placar e da ordem', () => {
    const { estado, contexto } = partida({
      jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d')],
    })
    const naoJuiz = contexto.jogadores.find((j) => j.id !== juizDa(estado))!.id
    const restantes = contexto.jogadores.filter((j) => j.id !== naoJuiz)
    const depois = aplicar(estado, { ...contexto, jogadores: restantes }, {
      t: 'saiuJogador',
      jogadorId: naoJuiz,
    })
    expect(depois.placar[naoJuiz]).toBeUndefined()
    expect(depois.maos[naoJuiz]).toBeUndefined()
    expect(depois.ordemJuizes).not.toContain(naoJuiz)
  })

  it('quem sai pode ser o último que faltava jogar', () => {
    const { estado, contexto } = partida({
      jogadores: [jogador('a'), jogador('b'), jogador('c'), jogador('d')],
    })
    const naoJuizes = contexto.jogadores.filter((j) => j.id !== juizDa(estado))
    let atual = estado
    for (const j of naoJuizes.slice(0, 2)) {
      atual = aplicar(atual, { ...contexto, autorId: j.id }, {
        t: 'jogarCarta',
        texto: atual.maos[j.id]![0]!,
        daBranca: false,
      })
    }
    const saindo = naoJuizes[2]!.id
    const restantes = contexto.jogadores.filter((j) => j.id !== saindo)
    const depois = aplicar(atual, { ...contexto, jogadores: restantes }, {
      t: 'saiuJogador',
      jogadorId: saindo,
    })
    expect(depois.fase).toBe('julgamento')
  })

  it('quem entra no meio não mexe na partida', () => {
    const { estado, contexto } = partida()
    const r = reduzir(estado, contexto, { t: 'entrouJogador', jogadorId: 'z' }, AMBIENTE)
    expect(r.ok && r.estado).toBe(estado)
  })
})
