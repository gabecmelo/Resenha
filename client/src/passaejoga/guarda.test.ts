import { describe, expect, it } from 'vitest'
import type { Ambiente } from '../../../shared/protocolo'
import { type Deposito, depositoEmMemoria } from '../estado/sessao'
import { type MesaLocal, VERSAO_DA_MESA, enviar, iniciar } from './motor'
import { CHAVE_DA_MESA, descartar, guardar, ler } from './guarda'

const AGORA = 1_700_000_000_000

function ambiente(): Ambiente {
  let semente = 7
  return {
    agora: AGORA,
    aleatorio: () => {
      semente = (semente * 16807) % 2147483647
      return semente / 2147483647
    },
  }
}

function mesaDeDedo(): MesaLocal {
  const resultado = iniciar('dedo-na-cara', ['Ana', 'Bruno', 'Carla'], { pacoteIds: ['dedo-role'] }, ambiente())
  if (!resultado.ok) throw new Error(`mesa não montou: ${resultado.erro}`)
  return resultado.valor
}

/** Um depósito que se recusa a funcionar — modo privado, cota estourada. */
function depositoQueLanca(): Deposito {
  return {
    getItem: () => {
      throw new Error('acesso negado ao localStorage')
    },
    setItem: () => {
      throw new Error('acesso negado ao localStorage')
    },
    removeItem: () => {
      throw new Error('acesso negado ao localStorage')
    },
  }
}

describe('ida e volta', () => {
  it('reabre a partida no mesmo ponto (`PJ-32`)', () => {
    const deposito = depositoEmMemoria()
    const mesa = mesaDeDedo()

    guardar(mesa, deposito)

    expect(ler(deposito)).toEqual(mesa)
  })

  it('preserva o que a partida já andou (`PJ-32`)', () => {
    const deposito = depositoEmMemoria()
    const inicial = mesaDeDedo()
    const jogada = enviar(inicial, { t: 'apontar', alvoId: 'j2' }, ambiente())
    if (!jogada.ok) throw new Error('comando recusado')

    guardar(jogada.valor, deposito)

    expect(ler(deposito)?.sala.jogo).toEqual(jogada.valor.sala.jogo)
  })

  it('preserva o pronto retido, senão a rodada nunca começaria (`PJ-26`)', () => {
    const deposito = depositoEmMemoria()
    const mesa: MesaLocal = {
      ...mesaDeDedo(),
      prontoRetido: { comando: { t: 'marcarPronto', pronto: true }, autorId: 'j3' },
    }

    guardar(mesa, deposito)

    expect(ler(deposito)?.prontoRetido).toEqual({
      comando: { t: 'marcarPronto', pronto: true },
      autorId: 'j3',
    })
  })

  it('devolve null quando nunca se guardou nada', () => {
    expect(ler(depositoEmMemoria())).toBeNull()
  })

  it('descartar apaga a partida guardada (`PJ-35`)', () => {
    const deposito = depositoEmMemoria()
    guardar(mesaDeDedo(), deposito)

    descartar(deposito)

    expect(ler(deposito)).toBeNull()
  })
})

describe('o segredo à vista (`PJ-20`)', () => {
  const comSegredoARevelado: MesaLocal = {
    ...mesaDeDedo(),
    passagem: { fila: ['j1', 'j2', 'j3'], posicao: 1, revelado: true },
  }

  it('reabre no anúncio da passagem, nunca no conteúdo revelado', () => {
    const deposito = depositoEmMemoria()

    guardar(comSegredoARevelado, deposito)

    expect(ler(deposito)?.passagem).toEqual({ fila: ['j1', 'j2', 'j3'], posicao: 1, revelado: false })
  })

  it('não escreve `revelado` no depósito, em quadro nenhum', () => {
    const deposito = depositoEmMemoria()

    guardar(comSegredoARevelado, deposito)

    expect(deposito.getItem(CHAVE_DA_MESA)).not.toContain('revelado')
  })

  it('mantém a passagem nula das fases sem segredo (`PJ-21`)', () => {
    const deposito = depositoEmMemoria()

    guardar(mesaDeDedo(), deposito)

    expect(ler(deposito)?.passagem).toBeNull()
  })
})

describe('o que não vira partida', () => {
  it('descarta em silêncio uma mesa de outra versão', () => {
    const deposito = depositoEmMemoria()
    guardar({ ...mesaDeDedo(), versao: VERSAO_DA_MESA + 1 }, deposito)

    expect(ler(deposito)).toBeNull()
  })

  it('devolve null com JSON quebrado, sem lançar', () => {
    const deposito = depositoEmMemoria()
    deposito.setItem(CHAVE_DA_MESA, '{ isto não é json')

    expect(() => ler(deposito)).not.toThrow()
    expect(ler(deposito)).toBeNull()
  })

  it('devolve null quando o guardado não é sequer um objeto', () => {
    const deposito = depositoEmMemoria()
    deposito.setItem(CHAVE_DA_MESA, '"uma string qualquer"')

    expect(ler(deposito)).toBeNull()
  })

  it('devolve null quando o jogo saiu do registro compartilhado', () => {
    const deposito = depositoEmMemoria()
    guardar({ ...mesaDeDedo(), jogoId: 'jogo-que-nao-existe-mais' }, deposito)

    expect(ler(deposito)).toBeNull()
  })

  it('devolve null quando a mesa guardada não tem jogadores', () => {
    const deposito = depositoEmMemoria()
    const mesa = mesaDeDedo()
    guardar({ ...mesa, sala: { ...mesa.sala, jogadores: [] } }, deposito)

    expect(ler(deposito)).toBeNull()
  })

  it('devolve null quando o depósito lança ao ser lido, sem lançar junto', () => {
    expect(() => ler(depositoQueLanca())).not.toThrow()
    expect(ler(depositoQueLanca())).toBeNull()
  })

  it('não lança quando o depósito recusa a escrita', () => {
    expect(() => guardar(mesaDeDedo(), depositoQueLanca())).not.toThrow()
  })

  it('não lança quando o depósito recusa o descarte', () => {
    expect(() => descartar(depositoQueLanca())).not.toThrow()
  })
})
