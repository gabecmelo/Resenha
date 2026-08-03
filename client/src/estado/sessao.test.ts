import { afterEach, describe, expect, it } from 'vitest'
import {
  ATRASO_INICIAL_MS,
  ATRASO_MAXIMO_MS,
  criarBackoff,
  criarSessao,
  depositoDoNavegador,
  depositoEmMemoria,
} from './sessao'

/** Substitui `globalThis.localStorage` e devolve como desfazer. */
function comLocalStorage(descritor: PropertyDescriptor): () => void {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descritor })
  return () => {
    if (anterior === undefined) delete (globalThis as { localStorage?: unknown }).localStorage
    else Object.defineProperty(globalThis, 'localStorage', anterior)
  }
}

let desfazer: (() => void) | null = null

afterEach(() => {
  desfazer?.()
  desfazer = null
})

describe('criarSessao — token por código de sala (CONN-01, CONN-02)', () => {
  it('devolve o token guardado para aquela sala', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardarToken('ABCDE', 'tok-abcde')

    expect(sessao.lerToken('ABCDE')).toBe('tok-abcde')
  })

  it('devolve null para sala sem token guardado', () => {
    const sessao = criarSessao(depositoEmMemoria())

    expect(sessao.lerToken('ABCDE')).toBeNull()
  })

  it('não vaza o token de uma sala para outra', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardarToken('ABCDE', 'tok-abcde')

    expect(sessao.lerToken('FGHJK')).toBeNull()
  })

  it('mantém tokens distintos para salas distintas no mesmo depósito', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardarToken('ABCDE', 'tok-abcde')
    sessao.guardarToken('FGHJK', 'tok-fghjk')

    expect([sessao.lerToken('ABCDE'), sessao.lerToken('FGHJK')]).toEqual(['tok-abcde', 'tok-fghjk'])
  })

  it('substitui o token da sala quando um novo é emitido', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardarToken('ABCDE', 'tok-velho')
    sessao.guardarToken('ABCDE', 'tok-novo')

    expect(sessao.lerToken('ABCDE')).toBe('tok-novo')
  })
})

describe('criarSessao — sair da sala (CONN-06)', () => {
  it('apaga o token da sala de onde o jogador saiu', () => {
    const sessao = criarSessao(depositoEmMemoria())
    sessao.guardarToken('ABCDE', 'tok-abcde')

    sessao.apagarToken('ABCDE')

    expect(sessao.lerToken('ABCDE')).toBeNull()
  })

  it('preserva o token das outras salas ao apagar', () => {
    const sessao = criarSessao(depositoEmMemoria())
    sessao.guardarToken('ABCDE', 'tok-abcde')
    sessao.guardarToken('FGHJK', 'tok-fghjk')

    sessao.apagarToken('ABCDE')

    expect(sessao.lerToken('FGHJK')).toBe('tok-fghjk')
  })
})

describe('depositoDoNavegador — degradação (CONN-01)', () => {
  it('persiste no localStorage quando o navegador permite', () => {
    const real = depositoEmMemoria()
    desfazer = comLocalStorage({ value: real })

    criarSessao(depositoDoNavegador()).guardarToken('ABCDE', 'tok-abcde')

    expect(criarSessao(depositoDoNavegador()).lerToken('ABCDE')).toBe('tok-abcde')
  })

  it('degrada para memória quando o localStorage não existe', () => {
    desfazer = comLocalStorage({ value: undefined })

    const sessao = criarSessao(depositoDoNavegador())
    sessao.guardarToken('ABCDE', 'tok-abcde')

    expect(sessao.lerToken('ABCDE')).toBe('tok-abcde')
  })

  it('degrada para memória quando o acesso ao localStorage lança', () => {
    desfazer = comLocalStorage({
      get() {
        throw new Error('acesso ao armazenamento negado')
      },
    })

    const sessao = criarSessao(depositoDoNavegador())
    sessao.guardarToken('ABCDE', 'tok-abcde')

    expect(sessao.lerToken('ABCDE')).toBe('tok-abcde')
  })

  it('degrada para memória quando o localStorage recusa a escrita', () => {
    desfazer = comLocalStorage({
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('cota excedida')
        },
        removeItem: () => undefined,
      },
    })

    const sessao = criarSessao(depositoDoNavegador())
    sessao.guardarToken('ABCDE', 'tok-abcde')

    expect(sessao.lerToken('ABCDE')).toBe('tok-abcde')
  })
})

describe('criarBackoff — política de reconexão (CONN-02)', () => {
  it('espera o atraso inicial na primeira tentativa', () => {
    expect(criarBackoff().proximo()).toBe(ATRASO_INICIAL_MS)
  })

  it('cresce a cada tentativa seguida', () => {
    const backoff = criarBackoff()

    const atrasos = [backoff.proximo(), backoff.proximo(), backoff.proximo()]

    expect(atrasos).toEqual([ATRASO_INICIAL_MS, ATRASO_INICIAL_MS * 2, ATRASO_INICIAL_MS * 4])
  })

  it('satura no teto e nunca o ultrapassa', () => {
    const backoff = criarBackoff()

    const atrasos = Array.from({ length: 20 }, () => backoff.proximo())

    expect(atrasos.filter((a) => a > ATRASO_MAXIMO_MS)).toEqual([])
    expect(atrasos.at(-1)).toBe(ATRASO_MAXIMO_MS)
  })

  it('volta ao atraso inicial depois de uma reconexão bem-sucedida', () => {
    const backoff = criarBackoff()
    backoff.proximo()
    backoff.proximo()

    backoff.zerar()

    expect(backoff.proximo()).toBe(ATRASO_INICIAL_MS)
  })
})
