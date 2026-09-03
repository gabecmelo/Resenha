import { describe, expect, it } from 'vitest'
import type { Ambiente, Config, JogadorId, Projecao } from '../../../shared/protocolo'
import type { ComandoDeJogo } from '../../../shared/jogos/contrato'
import { type MesaLocal, enviar, iniciar, projetar } from './motor'
import { acaoDaVolta, aparelhoParaMostrar, ativos, voltaDaFase } from './volta'

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

/** A mesa acusa o espião de verdade — o desfecho que abre o chute do local. */
function espiaoAcusado(quantos: number, amb = ambiente()): MesaLocal {
  let mesa = espiaoEmRodada(quantos, amb)
  const espiaoId = mesa.sala.jogadores.find(
    (jogador) => projetar({ ...mesa, aparelhoCom: jogador.id }).jogo?.espiao?.souEspiao === true,
  )!.id

  mesa = passar(mesa, { t: 'abrirVotacao' }, amb)
  for (const jogador of mesa.sala.jogadores) {
    mesa = passar({ ...mesa, aparelhoCom: jogador.id }, { t: 'votar', alvoId: espiaoId }, amb)
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
      mostraAoAgir: true,
      comandoAoEsconder: { t: 'marcarPronto', pronto: true },
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

  it('não abre volta de votação nenhuma — a mesa já votou em voz alta (`PJ2-11`)', () => {
    const emRodada = espiaoEmRodada(4)
    const mesa = passar(emRodada, { t: 'abrirVotacao' })

    expect(voltaDaFase(veja(mesa), mesa.aparelhoCom)).toBeNull()
  })

  it('entrega o aparelho só ao espião pego, e ele fica com quem recebeu (`PJ2-13`)', () => {
    const mesa = espiaoAcusado(4)
    const chute = veja(mesa).jogo!.espiao!.chuteDoEspiao!

    const volta = voltaDaFase(veja(mesa), 'quem-nao-chuta' as JogadorId)

    expect(volta).toEqual({
      fila: [chute.espiao.id],
      instrucao: 'A mesa acertou. O espião ainda pode salvar a rodada chutando o local.',
      escondeAoPassar: false,
    })
  })

  it('não reabre a volta quando o aparelho já está com quem chuta', () => {
    const mesa = espiaoAcusado(4)
    const chute = veja(mesa).jogo!.espiao!.chuteDoEspiao!

    expect(voltaDaFase(veja(mesa), chute.espiao.id)).toBeNull()
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

describe('aparelhoParaMostrar — abrir a carta de quem está com o celular (`QSE-04`)', () => {
  it('não move nada pra ver a carta de outra pessoa — ela já está na projeção', () => {
    const mesa = quemSouEuEmJogo(4)
    const outro = ativos(veja(mesa)).find((id) => id !== mesa.aparelhoCom)!

    expect(aparelhoParaMostrar(veja(mesa), mesa.aparelhoCom, outro)).toBeNull()
  })

  it('entrega o aparelho ao vizinho seguinte pra abrir a carta de quem o segura', () => {
    const mesa = quemSouEuEmJogo(4)
    const roda = ativos(veja(mesa))
    const portador = mesa.aparelhoCom

    const vizinho = roda[(roda.indexOf(portador) + 1) % roda.length]
    expect(aparelhoParaMostrar(veja(mesa), portador, portador)).toBe(vizinho)
  })

  it('depois de mover, a carta do antigo portador existe na projeção', () => {
    const mesa = quemSouEuEmJogo(4)
    const portador = mesa.aparelhoCom

    const antes = veja(mesa).jogadores.find((jogador) => jogador.id === portador)!
    expect(antes.carta).toBeUndefined()

    const proximo = aparelhoParaMostrar(veja(mesa), portador, portador)!
    const depois = veja({ ...mesa, aparelhoCom: proximo }).jogadores.find(
      (jogador) => jogador.id === portador,
    )!
    expect(depois.carta).toBeDefined()
  })

  it('não tem pra quem passar numa roda de um', () => {
    const mesa = quemSouEuEmJogo(2)
    const so = { ...mesa, sala: { ...mesa.sala, jogadores: mesa.sala.jogadores.slice(0, 1) } }

    expect(aparelhoParaMostrar(veja(so), so.aparelhoCom, so.aparelhoCom)).toBeNull()
  })
})

describe('acaoDaVolta — o que o rodapé oferece (`PJ2-09`, `PJ2-10`)', () => {
  const revelacaoDoEspiao = (mesa: MesaLocal) => voltaDaFase(veja(mesa), mesa.aparelhoCom)

  it('não oferece passar a ninguém na última pessoa da roda (`PJ2-09`)', () => {
    const volta = revelacaoDoEspiao(mesaDe('espiao', 4))

    expect(acaoDaVolta(volta, 3, 4)).toEqual({ rotulo: 'Esconder' })
  })

  it('oferece esconder e passar enquanto ainda há vizinho', () => {
    const volta = revelacaoDoEspiao(mesaDe('espiao', 4))

    expect([0, 1, 2].map((posicao) => acaoDaVolta(volta, posicao, 4)?.rotulo)).toEqual([
      'Esconder e passar',
      'Esconder e passar',
      'Esconder e passar',
    ])
  })

  it('cala quando a volta tem tela própria pro gesto (`PJ2-10`)', () => {
    const escrita = voltaDaFase(veja(mesaDe('quem-sou-eu', 4)), 'j1')

    expect(acaoDaVolta(escrita, 0, 4)).toBeNull()
  })

  it('cala na entrega que não volta — os Enigmas', () => {
    const entrega = voltaDaFase(veja(mesaDe('enigmas-sinistros', 4)), 'quem-nao-narra' as JogadorId)

    expect(acaoDaVolta(entrega, 0, 1)).toBeNull()
  })

  it('cala quando não há volta nenhuma', () => {
    expect(acaoDaVolta(null, 0, 4)).toBeNull()
  })
})
