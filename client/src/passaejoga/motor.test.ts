import { describe, expect, it } from 'vitest'
import type { Ambiente, Config } from '../../../shared/protocolo'
import { CONFIG_PADRAO } from '../../../shared/protocolo'
import { minJogadoresDoJogo } from '../../../shared/jogos-catalogo'
import { type MesaLocal, cobrarPrazos, enviar, iniciar, projetar } from './motor'
import type { ComandoDeJogo } from '../../../shared/jogos/contrato'

const AGORA = 1_700_000_000_000

const NOMES = ['Ana', 'Bruno', 'Carla', 'Dedé', 'Elis', 'Fábio']

/**
 * Aleatoriedade injetada e determinística (MINSTD): o mesmo sorteio em toda
 * execução, sem `Math.random` entrando no meio de um teste de regra.
 */
function ambiente(agora = AGORA): Ambiente {
  let semente = 7
  return {
    agora,
    aleatorio: () => {
      semente = (semente * 16807) % 2147483647
      return semente / 2147483647
    },
  }
}

/**
 * O mínimo que cada jogo precisa pra montar partida. Enigmas e Dedo leem
 * `config.pacoteIds` do próprio dado; o Espião recebe os pacotes pelo canal do
 * `core`, e por isso é o único em `modoPacote: 'pacote'`.
 */
const CONFIG_POR_JOGO: Record<string, Partial<Config>> = {
  'quem-sou-eu': {},
  espiao: { modoPacote: 'pacote', pacoteIds: ['locais-classicos'] },
  'enigmas-sinistros': { pacoteIds: ['enigmas-casos-estranhos'] },
  'dedo-na-cara': { pacoteIds: ['dedo-role'] },
}

const JOGOS_DO_MODO = Object.keys(CONFIG_POR_JOGO)

function nomes(quantos: number): string[] {
  return NOMES.slice(0, quantos)
}

function mesaDe(jogoId: string, quantos = minJogadoresDoJogo(jogoId), amb = ambiente()): MesaLocal {
  const resultado = iniciar(jogoId, nomes(quantos), CONFIG_POR_JOGO[jogoId]!, amb)
  if (!resultado.ok) throw new Error(`mesa não montou: ${resultado.erro}`)
  return resultado.valor
}

function passar(mesa: MesaLocal, comando: ComandoDeJogo, amb = ambiente()): MesaLocal {
  const resultado = enviar(mesa, comando, amb)
  if (!resultado.ok) throw new Error(`comando recusado: ${resultado.erro}`)
  return resultado.valor
}

describe('iniciar', () => {
  it.each(JOGOS_DO_MODO)('%s monta a partida com o mínimo do catálogo (`PJ-31`)', (jogoId) => {
    const minimo = minJogadoresDoJogo(jogoId)

    const resultado = iniciar(jogoId, nomes(minimo), CONFIG_POR_JOGO[jogoId]!, ambiente())

    expect(resultado.ok && resultado.valor.sala.jogo !== null).toBe(true)
  })

  it.each(JOGOS_DO_MODO)(
    '%s recusa abaixo do mínimo com o mesmo erro da sala online (`PJ-31`)',
    (jogoId) => {
      const abaixo = minJogadoresDoJogo(jogoId) - 1

      const resultado = iniciar(jogoId, nomes(abaixo), CONFIG_POR_JOGO[jogoId]!, ambiente())

      expect(resultado).toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })
    },
  )

  it('recusa um jogo que não está no registro compartilhado (`PJ-11`)', () => {
    const resultado = iniciar('jogo-que-nao-existe', nomes(3), {}, ambiente())

    expect(resultado).toEqual({ ok: false, erro: 'JOGO_INVALIDO' })
  })

  it('recusa quando o pacote pedido não existe, sem sair da tela da mesa', () => {
    const resultado = iniciar(
      'espiao',
      nomes(3),
      { modoPacote: 'pacote', pacoteIds: ['pacote-inventado'] },
      ambiente(),
    )

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
  })

  it('guarda os jogadores na ordem em que a mesa digitou — a ordem da roda (`PJ-07`)', () => {
    const mesa = mesaDe('dedo-na-cara', 4)

    expect(mesa.sala.jogadores.map((j) => j.apelido)).toEqual(['Ana', 'Bruno', 'Carla', 'Dedé'])
  })

  it('entrega o aparelho ao primeiro da roda (`PJ-16`)', () => {
    const mesa = mesaDe('dedo-na-cara', 3)

    expect(mesa.aparelhoCom).toBe(mesa.sala.jogadores[0]!.id)
  })

  it('sorteia uma cor por jogador, sem pedir escolha a ninguém (`PJ-10`)', () => {
    const mesa = mesaDe('dedo-na-cara', 4)

    const cores = mesa.sala.jogadores.map((j) => j.cor)
    expect(new Set(cores).size).toBe(4)
  })

  it('fixa as configurações que descrevem coordenação entre aparelhos', () => {
    const mesa = mesaDe('espiao', 3)

    expect({
      ordemTurnos: mesa.sala.config.ordemTurnos,
      modoPergunta: mesa.sala.config.enigmas.modoPergunta,
      visibilidadeVoto: mesa.sala.config.espiao.visibilidadeVoto,
    }).toEqual({ ordemTurnos: 'entrada', modoPergunta: 'voz', visibilidadeVoto: 'oculta' })
  })

  it('ignora quem tentar reabrir a coordenação pela config', () => {
    const resultado = iniciar(
      'espiao',
      nomes(3),
      {
        modoPacote: 'pacote',
        pacoteIds: ['locais-classicos'],
        ordemTurnos: 'sorteada',
        espiao: { ...CONFIG_PADRAO.espiao, visibilidadeVoto: 'tempoReal' },
        enigmas: { ...CONFIG_PADRAO.enigmas, modoPergunta: 'fila' },
      },
      ambiente(),
    )

    expect(
      resultado.ok && {
        ordemTurnos: resultado.valor.sala.config.ordemTurnos,
        modoPergunta: resultado.valor.sala.config.enigmas.modoPergunta,
        visibilidadeVoto: resultado.valor.sala.config.espiao.visibilidadeVoto,
      },
    ).toEqual({ ordemTurnos: 'entrada', modoPergunta: 'voz', visibilidadeVoto: 'oculta' })
  })

  it('mantém a configuração do jogo que a mesa escolheu', () => {
    const mesa = mesaDe('dedo-na-cara', 3)

    expect(mesa.sala.config.pacoteIds).toEqual(['dedo-role'])
  })
})

describe('enviar', () => {
  it('recusa devolvendo a mesa intacta, objeto por objeto (`PJ-13`)', () => {
    const mesa = mesaDe('dedo-na-cara', 3)
    const antes = structuredClone(mesa)

    const recusa = enviar(mesa, { t: 'proximaCarta' }, ambiente())

    expect(recusa).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
    expect(mesa).toEqual(antes)
  })

  it('não trava a partida depois de uma recusa (`PJ-13`)', () => {
    const mesa = mesaDe('dedo-na-cara', 3)
    enviar(mesa, { t: 'proximaCarta' }, ambiente())

    const depois = passar(mesa, { t: 'apontar', alvoId: 'j2' })

    expect(depois.sala.jogo).not.toEqual(mesa.sala.jogo)
  })

  it('recusa comando de jogo antes de haver partida montada', () => {
    const mesa = mesaDe('dedo-na-cara', 3)
    const semPartida: MesaLocal = { ...mesa, sala: { ...mesa.sala, jogo: null } }

    expect(enviar(semPartida, { t: 'proximaCarta' }, ambiente())).toEqual({
      ok: false,
      erro: 'FASE_INVALIDA',
    })
  })

  it('aplica fase seguinte, prazos e eventos do resultado (`PJ-12`)', () => {
    const mesa = mesaDe('dedo-na-cara', 3)

    const encerrada = passar(mesa, { t: 'encerrar' })

    expect({
      fase: encerrada.sala.fase,
      turno: encerrada.sala.prazos.turno,
      eventos: encerrada.eventos.map((e) => e.texto),
    }).toEqual({
      fase: 'encerrada',
      turno: null,
      eventos: ['A partida foi encerrada. Placar final na mesa.'],
    })
  })

  it('define o prazo que o jogo pediu, no instante do despacho (`PJ-12`)', () => {
    let mesa = mesaDe('espiao', 3)
    mesa = passar(mesa, { t: 'marcarPronto', pronto: true }, ambiente())
    mesa = passar({ ...mesa, aparelhoCom: 'j2' }, { t: 'marcarPronto', pronto: true }, ambiente())
    mesa = passar({ ...mesa, aparelhoCom: 'j3' }, { t: 'marcarPronto', pronto: true }, ambiente())

    expect(mesa.sala.prazos.turno).toBe(AGORA + 300_000)
  })

  it('dá o comando de host a quem está com o aparelho, não ao primeiro da roda (`PJ-15`)', () => {
    const mesa = mesaDe('dedo-na-cara', 3)

    const encerrada = enviar({ ...mesa, aparelhoCom: 'j3' }, { t: 'encerrar' }, ambiente())

    expect(encerrada.ok && encerrada.valor.sala.fase).toBe('encerrada')
  })

  it('preserva a volta de passagem em curso ao despachar', () => {
    const mesa = mesaDe('dedo-na-cara', 3)
    const comFila: MesaLocal = {
      ...mesa,
      passagem: { fila: ['j1', 'j2', 'j3'], posicao: 1, revelado: false },
    }

    const depois = passar(comFila, { t: 'apontar', alvoId: 'j2' })

    expect(depois.passagem).toEqual({ fila: ['j1', 'j2', 'j3'], posicao: 1, revelado: false })
  })
})

describe('projetar', () => {
  it('projeta para quem está com o aparelho, e não para outro jogador (`PJ-16`)', () => {
    const mesa = mesaDe('quem-sou-eu', 2)

    const naMaoDoPrimeiro = projetar(mesa)
    const naMaoDoSegundo = projetar({ ...mesa, aparelhoCom: 'j2' })

    expect([naMaoDoPrimeiro.eu.id, naMaoDoSegundo.eu.id]).toEqual(['j1', 'j2'])
  })

  it('troca o segredo de mão junto com o aparelho (`PJ-16`)', () => {
    const mesa = mesaDe('quem-sou-eu', 2)

    const naMaoDoPrimeiro = projetar(mesa)
    const naMaoDoSegundo = projetar({ ...mesa, aparelhoCom: 'j2' })

    expect([naMaoDoPrimeiro.eu.alvo?.id, naMaoDoSegundo.eu.alvo?.id]).toEqual(['j2', 'j1'])
  })

  it('esconde o local exatamente de quem é o espião (`PJ-16`)', () => {
    const mesa = mesaDe('espiao', 3)

    const papeis = mesa.sala.jogadores.map(
      (j) => projetar({ ...mesa, aparelhoCom: j.id }).jogo!.espiao!,
    )

    expect(papeis.map((p) => p.souEspiao)).toEqual(papeis.map((p) => p.local === undefined))
    expect(papeis.filter((p) => p.souEspiao)).toHaveLength(1)
  })
})

describe('uma partida inteira, sem rede (`PJ-15`)', () => {
  it('vai da primeira carta ao placar final sem sair do aparelho', () => {
    const amb = ambiente()
    let mesa = mesaDe('dedo-na-cara', 3, amb)

    const primeiraCarta = projetar(mesa).jogo!.dedo!.carta

    mesa = passar({ ...mesa, aparelhoCom: 'j1' }, { t: 'apontar', alvoId: 'j2' }, amb)
    mesa = passar({ ...mesa, aparelhoCom: 'j2' }, { t: 'apontar', alvoId: 'j3' }, amb)
    mesa = passar({ ...mesa, aparelhoCom: 'j3' }, { t: 'apontar', alvoId: 'j2' }, amb)

    const apuracao = projetar(mesa).jogo!.dedo!
    expect({ fase: apuracao.fase, vencedor: apuracao.vencedor?.id }).toEqual({
      fase: 'apuracao',
      vencedor: 'j2',
    })

    mesa = passar({ ...mesa, aparelhoCom: 'j3' }, { t: 'proximaCarta' }, amb)

    const segunda = projetar(mesa).jogo!.dedo!
    expect({ rodada: segunda.rodada, fase: segunda.fase }).toEqual({ rodada: 2, fase: 'votacao' })
    expect(segunda.carta).not.toBe(primeiraCarta)

    mesa = passar({ ...mesa, aparelhoCom: 'j3' }, { t: 'encerrar' }, amb)

    const fim = projetar(mesa)
    expect(fim.sala.fase).toBe('encerrada')
    expect(fim.jogo!.dedo!.placar[0]).toEqual({ id: 'j2', apelido: 'Bruno', pontos: 1 })
  })
})

/** A rodada do Espião já correndo, com o relógio dos cinco minutos de pé. */
function espiaoEmRodada(amb = ambiente()): MesaLocal {
  let mesa = mesaDe('espiao', 3, amb)
  for (const jogador of mesa.sala.jogadores) {
    mesa = passar({ ...mesa, aparelhoCom: jogador.id }, { t: 'marcarPronto', pronto: true }, amb)
  }
  return mesa
}

const PRAZO_DA_RODADA = AGORA + 300_000

describe('cobrarPrazos', () => {
  it('não mexe na mesa quando não há prazo nenhum ativo (`PJ-14`)', () => {
    const mesa = mesaDe('dedo-na-cara', 3)

    expect(cobrarPrazos(mesa, ambiente(AGORA + 600_000))).toBe(mesa)
  })

  it('não antecipa um prazo que ainda não venceu (`PJ-14`)', () => {
    const mesa = espiaoEmRodada()

    expect(cobrarPrazos(mesa, ambiente(PRAZO_DA_RODADA - 1))).toBe(mesa)
  })

  it('dispara o vencimento quando o relógio alcança o prazo (`PJ-14`)', () => {
    const mesa = espiaoEmRodada()

    const depois = cobrarPrazos(mesa, ambiente(PRAZO_DA_RODADA))

    expect(projetar(depois).jogo!.espiao!.votacaoAberta).toBeDefined()
    expect(depois.sala.prazos.turno).toBe(PRAZO_DA_RODADA + 60_000)
  })

  it('dispara uma vez só: cobrar de novo com o mesmo agora não dispara segunda (`PJ-14`)', () => {
    const mesa = espiaoEmRodada()

    const uma = cobrarPrazos(mesa, ambiente(PRAZO_DA_RODADA))
    const duas = cobrarPrazos(uma, ambiente(PRAZO_DA_RODADA))

    expect(duas).toBe(uma)
  })

  it('dez minutos de tela apagada valem um disparo, não um por segundo (`PJ-14`)', () => {
    const mesa = espiaoEmRodada()

    const depois = cobrarPrazos(mesa, ambiente(PRAZO_DA_RODADA + 600_000))

    // Um disparo por segundo perdido teria fechado a votação final e acabado a
    // partida; ela precisa estar aberta, esperando a mesa votar.
    expect(projetar(depois).jogo!.espiao!.votacaoAberta).toBeDefined()
    expect(depois.sala.fase).toBe('jogo')
  })

  it('limpa o prazo mesmo quando o jogo recusa o aviso, sem travar a partida (`PJ-14`)', () => {
    const rodada = espiaoEmRodada()
    const travada: MesaLocal = {
      ...rodada,
      sala: {
        ...rodada.sala,
        fase: 'encerrada',
        prazos: { ...rodada.sala.prazos, turno: PRAZO_DA_RODADA },
      },
    }

    const depois = cobrarPrazos(travada, ambiente(PRAZO_DA_RODADA))

    expect(depois.sala.prazos.turno).toBeNull()
    expect(depois.sala.jogo).toEqual(travada.sala.jogo)
  })
})
