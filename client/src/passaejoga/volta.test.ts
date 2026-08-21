import { describe, expect, it } from 'vitest'
import type { Ambiente, Config, JogadorId, Projecao } from '../../../shared/protocolo'
import type { ComandoDeJogo } from '../../../shared/jogos/contrato'
import { type MesaLocal, enviar, iniciar, projetar } from './motor'
import { ativos, donoDoAparelho, voltaDaFase } from './volta'

const AGORA = 1_700_000_000_000

const NOMES = ['Ana', 'Bruno', 'Carla', 'Dedé', 'Elis', 'Fábio']

/** Mesmo gerador determinístico do `motor.test.ts`: nada de `Math.random` aqui. */
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

const CONFIG_POR_JOGO: Record<string, Partial<Config>> = {
  'quem-sou-eu': {},
  espiao: { modoPacote: 'pacote', pacoteIds: ['locais-classicos'] },
  'enigmas-sinistros': { pacoteIds: ['enigmas-casos-estranhos'] },
  'dedo-na-cara': { pacoteIds: ['dedo-role'] },
}

function mesaDe(jogoId: string, quantos: number, amb = ambiente()): MesaLocal {
  const resultado = iniciar(jogoId, NOMES.slice(0, quantos), CONFIG_POR_JOGO[jogoId]!, amb)
  if (!resultado.ok) throw new Error(`mesa não montou: ${resultado.erro}`)
  return resultado.valor
}

function passar(mesa: MesaLocal, comando: ComandoDeJogo, amb = ambiente()): MesaLocal {
  const resultado = enviar(mesa, comando, amb)
  if (!resultado.ok) throw new Error(`comando recusado: ${resultado.erro}`)
  return resultado.valor
}

/** A projeção como a `Partida` a vê: pra quem está com o aparelho agora. */
function veja(mesa: MesaLocal): Projecao {
  return projetar(mesa)
}

/** Cada um marca pronto na volta de revelação, e a rodada do Espião começa. */
function espiaoEmRodada(quantos: number, amb = ambiente()): MesaLocal {
  let mesa = mesaDe('espiao', quantos, amb)
  for (const jogador of mesa.sala.jogadores) {
    mesa = passar({ ...mesa, aparelhoCom: jogador.id }, { t: 'marcarPronto', pronto: true }, amb)
  }
  return mesa
}

function quemSouEuEmJogo(quantos: number, amb = ambiente()): MesaLocal {
  let mesa = mesaDe('quem-sou-eu', quantos, amb)
  for (const jogador of mesa.sala.jogadores) {
    mesa = passar(
      { ...mesa, aparelhoCom: jogador.id },
      { t: 'escreverCarta', texto: `carta de ${jogador.apelido}` },
      amb,
    )
    mesa = passar({ ...mesa, aparelhoCom: jogador.id }, { t: 'marcarPronto', pronto: true }, amb)
  }
  return passar({ ...mesa, aparelhoCom: 'j1' }, { t: 'comecar' }, amb)
}

describe('ativos', () => {
  it('devolve a roda na ordem em que a mesa digitou os nomes (`PJ-07`)', () => {
    const mesa = mesaDe('dedo-na-cara', 4)

    expect(ativos(veja(mesa))).toEqual(mesa.sala.jogadores.map((jogador) => jogador.id))
  })
})

describe('voltaDaFase — quando o aparelho circula', () => {
  it('abre a volta de escrita pela roda inteira, escondendo a cada passagem (`PJ-29`)', () => {
    const mesa = mesaDe('quem-sou-eu', 4)

    const volta = voltaDaFase(veja(mesa), mesa.aparelhoCom)

    expect(volta).toEqual({
      fila: ['j1', 'j2', 'j3', 'j4'],
      instrucao: 'Uma carta que ninguém mais pode ver.',
      escondeAoPassar: true,
    })
  })

  it('abre a volta de revelação do Espião marcando pronto ao esconder (`PJ-25`)', () => {
    const mesa = mesaDe('espiao', 4)

    const volta = voltaDaFase(veja(mesa), mesa.aparelhoCom)

    expect(volta).toEqual({
      fila: ['j1', 'j2', 'j3', 'j4'],
      instrucao: 'O papel desta rodada — o local, ou ser o espião.',
      escondeAoPassar: true,
      comandoAoEsconder: { t: 'marcarPronto', pronto: true },
    })
  })

  it('fecha a volta do Espião assim que a rodada começa: o aparelho fica na mesa (`PJ-27`)', () => {
    const mesa = espiaoEmRodada(4)

    expect(veja(mesa).jogo?.espiao?.rodadaIniciada).toBe(true)
    expect(voltaDaFase(veja(mesa), mesa.aparelhoCom)).toBeNull()
  })

  it('faz a votação do Espião circular um voto de cada vez, sem ninguém ver o anterior (`PJ-28`)', () => {
    const emRodada = espiaoEmRodada(4)
    const mesa = passar(emRodada, { t: 'abrirVotacao' })

    const volta = voltaDaFase(veja(mesa), mesa.aparelhoCom)

    expect(volta).toEqual({
      fila: ['j1', 'j2', 'j3', 'j4'],
      instrucao: 'Um voto que mais ninguém vê.',
      escondeAoPassar: true,
    })
  })

  it('entrega o aparelho só ao próximo narrador dos Enigmas, e ele fica com quem recebeu (`PJ-24`)', () => {
    const mesa = mesaDe('enigmas-sinistros', 4)
    const narrador = veja(mesa).jogo?.enigmas?.narrador.id

    const volta = voltaDaFase(veja(mesa), 'quem-nao-narra' as JogadorId)

    expect(volta).toEqual({
      fila: [narrador],
      instrucao: 'Quem receber narra este enigma — a solução é só de quem narra.',
      escondeAoPassar: false,
    })
  })

  it('não abre volta nenhuma quando o aparelho já está com quem narra (`PJ-23`)', () => {
    const mesa = mesaDe('enigmas-sinistros', 4)
    const narrador = veja(mesa).jogo!.enigmas!.narrador.id

    expect(voltaDaFase(veja(mesa), narrador)).toBeNull()
  })

  it('deixa o Dedo na Cara numa tela só, sem passagem obrigatória (`PJ-21`)', () => {
    const mesa = mesaDe('dedo-na-cara', 4)

    expect(voltaDaFase(veja(mesa), mesa.aparelhoCom)).toBeNull()
  })
})

describe('donoDoAparelho', () => {
  it('passa a vez do Dedo na Cara pra quem ainda não apontou (`PJ-22`)', () => {
    const mesa = mesaDe('dedo-na-cara', 4)

    const depoisDoPrimeiro = passar(mesa, { t: 'apontar', alvoId: 'j2' })

    expect(donoDoAparelho(veja(depoisDoPrimeiro), 'j1')).toBe('j2')
  })

  it('não move o aparelho enquanto o Dedo não abre a votação', () => {
    const mesa = mesaDe('quem-sou-eu', 4)

    expect(donoDoAparelho(veja(mesa), 'j1')).toBe('j1')
  })

  it('tira o aparelho de quem está na vez no Quem Sou Eu — a carta é dela (`PJ-30`)', () => {
    const mesa = quemSouEuEmJogo(4)
    const vezDe = veja(mesa).jogo!.vezDe!

    expect(donoDoAparelho(veja(mesa), vezDe)).not.toBe(vezDe)
  })

  it('entrega o aparelho ao vizinho seguinte da roda, não a um qualquer (`PJ-30`)', () => {
    const mesa = quemSouEuEmJogo(4)
    const roda = ativos(veja(mesa))
    const vezDe = veja(mesa).jogo!.vezDe!

    const vizinho = roda[(roda.indexOf(vezDe) + 1) % roda.length]
    expect(donoDoAparelho(veja(mesa), vezDe)).toBe(vizinho)
  })

  it('deixa o aparelho parado com quem não está na vez (`PJ-30`)', () => {
    const mesa = quemSouEuEmJogo(4)
    const roda = ativos(veja(mesa))
    const vezDe = veja(mesa).jogo!.vezDe!
    const outro = roda.find((id) => id !== vezDe)!

    expect(donoDoAparelho(veja({ ...mesa, aparelhoCom: outro }), outro)).toBe(outro)
  })
})
