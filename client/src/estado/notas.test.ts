import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ESPERA_PARA_ENVIAR_MS,
  chegouDoServidor,
  criarEnvioAdiado,
  digitou,
  rascunhoDoServidor,
} from './notas'

describe('digitou — a tecla vale na hora (AJU-22, AJU-23)', () => {
  it('mostra o texto digitado sem esperar o servidor', () => {
    expect(digitou('não é ator').texto).toBe('não é ator')
  })

  it('entrega o texto exatamente como veio, sem descartar caractere', () => {
    const digitado = 'não é ator, está vivo — e canta\nsegunda linha'

    expect(digitou(digitado).texto).toBe(digitado)
  })

  it('marca o campo em edição', () => {
    expect(digitou('a').emEdicao).toBe(true)
  })
})

describe('chegouDoServidor — projeção não atropela quem digita (AJU-25)', () => {
  it('preserva o texto local enquanto o campo está em edição', () => {
    const rascunho = digitou('não é ato')

    expect(chegouDoServidor(rascunho, 'nota antiga do servidor').texto).toBe('não é ato')
  })

  it('mantém o campo em edição quando a projeção diverge', () => {
    const rascunho = digitou('não é ato')

    expect(chegouDoServidor(rascunho, 'nota antiga do servidor').emEdicao).toBe(true)
  })

  it('aceita a projeção quando o campo não está em edição — o caso da reconexão', () => {
    const rascunho = rascunhoDoServidor('')

    expect(chegouDoServidor(rascunho, 'nota guardada')).toEqual({
      texto: 'nota guardada',
      emEdicao: false,
    })
  })

  it('encerra a edição quando o servidor confirma o que foi digitado', () => {
    const rascunho = digitou('não é ator')

    expect(chegouDoServidor(rascunho, 'não é ator')).toEqual({
      texto: 'não é ator',
      emEdicao: false,
    })
  })

  it('devolve o mesmo rascunho quando nada muda', () => {
    const rascunho = rascunhoDoServidor('nota guardada')

    expect(chegouDoServidor(rascunho, 'nota guardada')).toBe(rascunho)
  })

  it('devolve o mesmo rascunho quando a projeção é ignorada por edição', () => {
    const rascunho = digitou('digitando')

    expect(chegouDoServidor(rascunho, 'outra coisa')).toBe(rascunho)
  })
})

describe('criarEnvioAdiado — um envio por pausa (AJU-24)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('não envia nada antes da pausa terminar', () => {
    vi.useFakeTimers()
    const enviado: string[] = []
    const envio = criarEnvioAdiado()

    envio.agendar('n', (texto) => enviado.push(texto))
    vi.advanceTimersByTime(ESPERA_PARA_ENVIAR_MS - 1)

    expect(enviado).toEqual([])
  })

  it('envia uma vez só depois da pausa, com o texto mais recente', () => {
    vi.useFakeTimers()
    const enviado: string[] = []
    const envio = criarEnvioAdiado()

    for (const texto of ['n', 'nã', 'não']) {
      envio.agendar(texto, (enviadoAgora) => enviado.push(enviadoAgora))
      vi.advanceTimersByTime(10)
    }
    vi.advanceTimersByTime(ESPERA_PARA_ENVIAR_MS)

    expect(enviado).toEqual(['não'])
  })

  it('envia de novo quando o jogador volta a digitar depois da pausa', () => {
    vi.useFakeTimers()
    const enviado: string[] = []
    const anotar = (texto: string) => enviado.push(texto)
    const envio = criarEnvioAdiado()

    envio.agendar('primeira', anotar)
    vi.advanceTimersByTime(ESPERA_PARA_ENVIAR_MS)
    envio.agendar('segunda', anotar)
    vi.advanceTimersByTime(ESPERA_PARA_ENVIAR_MS)

    expect(enviado).toEqual(['primeira', 'segunda'])
  })

  it('liberar manda na hora o que ainda estava pendente', () => {
    vi.useFakeTimers()
    const enviado: string[] = []
    const anotar = (texto: string) => enviado.push(texto)
    const envio = criarEnvioAdiado()

    envio.agendar('não é ator', anotar)
    envio.liberar(anotar)

    expect(enviado).toEqual(['não é ator'])
  })

  it('não repete o envio depois de liberar', () => {
    vi.useFakeTimers()
    const enviado: string[] = []
    const anotar = (texto: string) => enviado.push(texto)
    const envio = criarEnvioAdiado()

    envio.agendar('não é ator', anotar)
    envio.liberar(anotar)
    vi.advanceTimersByTime(ESPERA_PARA_ENVIAR_MS * 2)

    expect(enviado).toEqual(['não é ator'])
  })

  it('liberar sem nada pendente não envia nada', () => {
    vi.useFakeTimers()
    const enviado: string[] = []
    const envio = criarEnvioAdiado()

    envio.liberar((texto) => enviado.push(texto))

    expect(enviado).toEqual([])
  })
})
