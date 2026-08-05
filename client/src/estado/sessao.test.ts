import { afterEach, describe, expect, it } from 'vitest'
import {
  ATRASO_INICIAL_MS,
  ATRASO_MAXIMO_MS,
  criarBackoff,
  criarSessao,
  depositoDoNavegador,
  depositoEmMemoria,
  deveReconectarAoAparecer,
  reentradaAutomatica,
  tokenFoiRecusado,
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

describe('criarSessao — sessão por código de sala (CONN-01, CONN-02)', () => {
  it('devolve o token guardado para aquela sala', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(sessao.ler('ABCDE')?.token).toBe('tok-abcde')
  })

  it('devolve null para sala sem sessão guardada', () => {
    const sessao = criarSessao(depositoEmMemoria())

    expect(sessao.ler('ABCDE')).toBeNull()
  })

  it('não vaza a sessão de uma sala para outra', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(sessao.ler('FGHJK')).toBeNull()
  })

  it('mantém sessões distintas para salas distintas no mesmo depósito', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })
    sessao.guardar('FGHJK', { token: 'tok-fghjk', apelido: 'Bia' })

    expect([sessao.ler('ABCDE'), sessao.ler('FGHJK')]).toEqual([
      { token: 'tok-abcde', apelido: 'Ana' },
      { token: 'tok-fghjk', apelido: 'Bia' },
    ])
  })

  it('substitui a sessão da sala quando um novo token é emitido', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardar('ABCDE', { token: 'tok-velho', apelido: 'Ana' })
    sessao.guardar('ABCDE', { token: 'tok-novo', apelido: 'Ana' })

    expect(sessao.ler('ABCDE')?.token).toBe('tok-novo')
  })
})

describe('criarSessao — apelido junto do token (AJU-03)', () => {
  it('guarda o apelido daquela sala e o devolve na leitura', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(sessao.ler('ABCDE')?.apelido).toBe('Ana')
  })

  it('guarda um apelido por sala, sem misturar salas', () => {
    const sessao = criarSessao(depositoEmMemoria())

    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })
    sessao.guardar('FGHJK', { token: 'tok-fghjk', apelido: 'Bia' })

    expect([sessao.ler('ABCDE')?.apelido, sessao.ler('FGHJK')?.apelido]).toEqual(['Ana', 'Bia'])
  })

  it('sobrevive à ida e volta pelo depósito, que só guarda texto', () => {
    const deposito = depositoEmMemoria()
    criarSessao(deposito).guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana Maria' })

    expect(criarSessao(deposito).ler('ABCDE')).toEqual({
      token: 'tok-abcde',
      apelido: 'Ana Maria',
    })
  })

  it('ignora valor guardado em outro formato, em vez de quebrar a entrada', () => {
    const deposito = depositoEmMemoria()
    deposito.setItem('resenha.sessao.ABCDE', 'tok-de-uma-versao-anterior')

    expect(criarSessao(deposito).ler('ABCDE')).toBeNull()
  })
})

describe('criarSessao — sair da sala (CONN-06)', () => {
  it('apaga a sessão da sala de onde o jogador saiu', () => {
    const sessao = criarSessao(depositoEmMemoria())
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    sessao.apagar('ABCDE')

    expect(sessao.ler('ABCDE')).toBeNull()
  })

  it('preserva a sessão das outras salas ao apagar', () => {
    const sessao = criarSessao(depositoEmMemoria())
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })
    sessao.guardar('FGHJK', { token: 'tok-fghjk', apelido: 'Bia' })

    sessao.apagar('ABCDE')

    expect(sessao.ler('FGHJK')?.token).toBe('tok-fghjk')
  })
})

describe('depositoDoNavegador — degradação (CONN-01)', () => {
  it('persiste no localStorage quando o navegador permite', () => {
    const real = depositoEmMemoria()
    desfazer = comLocalStorage({ value: real })

    criarSessao(depositoDoNavegador()).guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(criarSessao(depositoDoNavegador()).ler('ABCDE')?.token).toBe('tok-abcde')
  })

  it('degrada para memória quando o localStorage não existe', () => {
    desfazer = comLocalStorage({ value: undefined })

    const sessao = criarSessao(depositoDoNavegador())
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(sessao.ler('ABCDE')?.token).toBe('tok-abcde')
  })

  it('degrada para memória quando o acesso ao localStorage lança', () => {
    desfazer = comLocalStorage({
      get() {
        throw new Error('acesso ao armazenamento negado')
      },
    })

    const sessao = criarSessao(depositoDoNavegador())
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(sessao.ler('ABCDE')?.token).toBe('tok-abcde')
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
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(sessao.ler('ABCDE')?.token).toBe('tok-abcde')
  })
})

describe('reentradaAutomatica — voltar para a sala sozinho (AJU-01)', () => {
  it('devolve a sala quando o código está na URL e há sessão para aquele código', () => {
    const sessao = criarSessao(depositoEmMemoria())
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(reentradaAutomatica('ABCDE', sessao)).toEqual({ codigo: 'ABCDE', apelido: 'Ana' })
  })

  it('não entra sozinho sem código na URL, mesmo com sessão guardada', () => {
    const sessao = criarSessao(depositoEmMemoria())
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(reentradaAutomatica('', sessao)).toBeNull()
  })

  it('não usa o token de outra sala', () => {
    const sessao = criarSessao(depositoEmMemoria())
    sessao.guardar('ABCDE', { token: 'tok-abcde', apelido: 'Ana' })

    expect(reentradaAutomatica('FGHJK', sessao)).toBeNull()
  })

  it('não entra sozinho quando não há sessão guardada', () => {
    expect(reentradaAutomatica('ABCDE', criarSessao(depositoEmMemoria()))).toBeNull()
  })
})

describe('tokenFoiRecusado — a credencial guardada não vale mais (AJU-04)', () => {
  it('é verdadeiro quando o jogador foi expulso', () => {
    expect(tokenFoiRecusado('TOKEN_BANIDO')).toBe(true)
  })

  it('é verdadeiro quando a vaga foi liberada', () => {
    expect(tokenFoiRecusado('JOGADOR_NAO_ENCONTRADO')).toBe(true)
  })

  it('é verdadeiro quando a sala acabou', () => {
    expect(tokenFoiRecusado('SALA_EXPIRADA')).toBe(true)
    expect(tokenFoiRecusado('SALA_NAO_ENCONTRADA')).toBe(true)
  })

  it('é verdadeiro quando a sala encheu e não há mais vaga guardada', () => {
    expect(tokenFoiRecusado('SALA_CHEIA')).toBe(true)
  })

  it('é falso nas recusas de quem está entrando pela primeira vez', () => {
    expect(tokenFoiRecusado('APELIDO_INVALIDO')).toBe(false)
    expect(tokenFoiRecusado('APELIDO_EM_USO')).toBe(false)
  })

  it('é falso numa recusa de comando, que não tem a ver com a credencial', () => {
    expect(tokenFoiRecusado('CHAT_LIMITE_DE_TAXA')).toBe(false)
    expect(tokenFoiRecusado('FASE_INVALIDA')).toBe(false)
  })
})

describe('deveReconectarAoAparecer — a aba voltou do segundo plano (AJU-02)', () => {
  it('reconecta na hora quando a aba fica visível sem socket', () => {
    expect(deveReconectarAoAparecer(true, false)).toBe(true)
  })

  it('não reconecta com o socket ainda de pé — nada de conexão redundante', () => {
    expect(deveReconectarAoAparecer(true, true)).toBe(false)
  })

  it('não reconecta enquanto a aba está escondida', () => {
    expect(deveReconectarAoAparecer(false, false)).toBe(false)
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
