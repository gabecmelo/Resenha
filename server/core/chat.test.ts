import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  MAX_JOGADORES,
  type Cor,
  type EstadoSala,
  type Jogador,
} from '../../shared/protocolo'
import {
  CHAT_MAX_CARACTERES,
  CHAT_MAX_MENSAGENS,
  CHAT_MAX_POR_JANELA,
  enviar,
  registrarSistema,
} from './chat'

function jogador(id: string, apelido = id.toUpperCase(), cor: Cor = 'vermelho'): Jogador {
  return {
    id,
    tokenHash: `hash-${id}`,
    apelido,
    cor,
    entrouEm: 1_000,
    conectado: true,
    desconectadoEm: null,
    situacao: 'ativo',
  }
}

const ana = jogador('ana', 'Ana', 'turquesa')
const bia = jogador('bia', 'Bia', 'magenta')

function sala(): EstadoSala {
  return {
    codigo: 'ABCDE',
    fase: 'jogo',
    hostId: 'ana',
    jogoId: 'quem-sou-eu',
    limiteJogadores: MAX_JOGADORES,
    jogadores: [{ ...ana }, { ...bia }],
    banidos: [],
    config: { ...CONFIG_PADRAO },
    chat: [],
    jogo: null,
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ultimaAcaoEm: 0,
  }
}

describe('enviar — tamanho da mensagem (CHAT-01)', () => {
  it('aceita mensagem de exatamente 300 caracteres', () => {
    const estado = sala()

    const resultado = enviar(estado, ana,'x'.repeat(CHAT_MAX_CARACTERES), 1_000)

    expect(resultado).toEqual({ ok: true, valor: undefined })
    expect(estado.chat).toHaveLength(1)
  })

  it('recusa mensagem com mais de 300 caracteres', () => {
    const estado = sala()

    const resultado = enviar(estado, ana,'x'.repeat(CHAT_MAX_CARACTERES + 1), 1_000)

    expect(resultado).toEqual({ ok: false, erro: 'CHAT_MUITO_LONGO' })
  })

  it('recusa mensagem vazia', () => {
    const estado = sala()

    const resultado = enviar(estado, ana,'', 1_000)

    expect(resultado).toEqual({ ok: false, erro: 'CHAT_VAZIO' })
    expect(estado.chat).toHaveLength(0)
  })

  it('recusa mensagem formada apenas por espaços', () => {
    const estado = sala()

    const resultado = enviar(estado, ana,'    \n  ', 1_000)

    expect(resultado).toEqual({ ok: false, erro: 'CHAT_VAZIO' })
    expect(estado.chat).toHaveLength(0)
  })

  it('registra a mensagem sem os espaços das pontas', () => {
    const estado = sala()

    enviar(estado, ana,'  oi gente  ', 1_000)

    expect(estado.chat[0]).toMatchObject({ texto: 'oi gente' })
  })

  it('mensagem recusada por ser vazia não consome o limite de taxa', () => {
    const estado = sala()

    for (let i = 0; i < 10; i += 1) enviar(estado, ana,'   ', 1_000)
    const resultado = enviar(estado, ana,'valendo', 1_000)

    expect(resultado.ok).toBe(true)
  })

  it('não registra no chat a mensagem recusada por tamanho', () => {
    const estado = sala()

    enviar(estado, ana,'x'.repeat(CHAT_MAX_CARACTERES + 1), 1_000)

    expect(estado.chat).toEqual([])
  })

  it('registra a mensagem com o autor e o horário do envio', () => {
    const estado = sala()

    enviar(estado, ana, 'oi gente', 1_234)

    expect(estado.chat[0]).toEqual({
      tipo: 'jogador',
      autorId: 'ana',
      apelido: 'Ana',
      cor: 'turquesa',
      texto: 'oi gente',
      em: 1_234,
    })
  })
})

describe('autor gravado na mensagem (AJU-15, AJU-16, AJU-17)', () => {
  it('grava o apelido e a cor do autor no momento do envio (AJU-15)', () => {
    const estado = sala()

    enviar(estado, bia, 'cheguei', 1_000)

    expect(estado.chat[0]).toMatchObject({ autorId: 'bia', apelido: 'Bia', cor: 'magenta' })
  })

  it('preserva o apelido e a cor depois de o autor sair da sala (AJU-16)', () => {
    const estado = sala()
    enviar(estado, bia, 'já vou nessa', 1_000)

    estado.jogadores = estado.jogadores.filter((j) => j.id !== 'bia')

    expect(estado.chat[0]).toMatchObject({ apelido: 'Bia', cor: 'magenta' })
  })

  it('não altera a mensagem quando o autor desconecta, é promovido ou muda de cor (AJU-17)', () => {
    const estado = sala()
    enviar(estado, bia, 'boa sorte', 1_000)
    const registrada = structuredClone(estado.chat[0])

    const autor = estado.jogadores.find((j) => j.id === 'bia')
    if (autor === undefined) throw new Error('autor sumiu da sala')
    autor.conectado = false
    autor.apelido = 'Beatriz'
    autor.cor = 'grafite'
    estado.hostId = 'bia'

    expect(estado.chat[0]).toEqual(registrada)
  })

  it('grava a cor de cada autor separadamente, sem contaminar as demais mensagens', () => {
    const estado = sala()

    enviar(estado, ana, 'oi', 1_000)
    enviar(estado, bia, 'oi', 1_001)

    expect(estado.chat.map((m) => (m.tipo === 'jogador' ? m.cor : null))).toEqual([
      'turquesa',
      'magenta',
    ])
  })
})

describe('enviar — limite de taxa (CHAT-02)', () => {
  it('aceita 5 mensagens dentro da janela de 5 segundos', () => {
    const estado = sala()

    for (let i = 0; i < CHAT_MAX_POR_JANELA; i += 1) enviar(estado, ana,`m${i}`, 1_000 + i)

    expect(estado.chat).toHaveLength(5)
  })

  it('descarta a sexta mensagem dentro da janela', () => {
    const estado = sala()
    for (let i = 0; i < CHAT_MAX_POR_JANELA; i += 1) enviar(estado, ana,`m${i}`, 1_000 + i)

    const resultado = enviar(estado, ana,'excedente', 1_006)

    expect(resultado).toEqual({ ok: false, erro: 'CHAT_LIMITE_DE_TAXA' })
  })

  it('a mensagem descartada não chega ao chat da sala', () => {
    const estado = sala()
    for (let i = 0; i < CHAT_MAX_POR_JANELA; i += 1) enviar(estado, ana,`m${i}`, 1_000 + i)

    enviar(estado, ana,'excedente', 1_006)

    expect(estado.chat.map((m) => m.texto)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4'])
  })

  it('libera o jogador passados os 5 segundos', () => {
    const estado = sala()
    for (let i = 0; i < CHAT_MAX_POR_JANELA; i += 1) enviar(estado, ana,`m${i}`, 1_000)

    const resultado = enviar(estado, ana,'de novo', 6_000)

    expect(resultado).toEqual({ ok: true, valor: undefined })
    expect(estado.chat).toHaveLength(6)
  })

  it('conta o limite por jogador, sem afetar os demais', () => {
    const estado = sala()
    for (let i = 0; i < CHAT_MAX_POR_JANELA; i += 1) enviar(estado, ana,`m${i}`, 1_000)

    const resultado = enviar(estado, bia,'oi', 1_001)

    expect(resultado).toEqual({ ok: true, valor: undefined })
  })
})

describe('registrarSistema (CHAT-03)', () => {
  it('marca a mensagem como de sistema', () => {
    const estado = sala()

    registrarSistema(estado, 'a partida começou', 2_000)

    expect(estado.chat[0]).toEqual({ tipo: 'sistema', texto: 'a partida começou', em: 2_000 })
  })

  it('não consome o limite de taxa de nenhum jogador', () => {
    const estado = sala()
    for (let i = 0; i < 10; i += 1) registrarSistema(estado, `evento ${i}`, 1_000)

    const resultado = enviar(estado, ana,'oi', 1_001)

    expect(resultado).toEqual({ ok: true, valor: undefined })
  })

  it('não é bloqueada pelo limite de taxa do jogador', () => {
    const estado = sala()
    for (let i = 0; i < CHAT_MAX_POR_JANELA; i += 1) enviar(estado, ana,`m${i}`, 1_000)

    registrarSistema(estado, 'evento', 1_001)

    expect(estado.chat).toHaveLength(6)
  })
})

describe('retenção do histórico (CHAT-05)', () => {
  it('mantém no máximo 200 mensagens', () => {
    const estado = sala()
    for (let i = 0; i < 250; i += 1) registrarSistema(estado, `m${i}`, 1_000 + i)

    expect(estado.chat).toHaveLength(CHAT_MAX_MENSAGENS)
  })

  it('descarta as mensagens mais antigas ao ultrapassar o limite', () => {
    const estado = sala()
    for (let i = 0; i < 201; i += 1) registrarSistema(estado, `m${i}`, 1_000 + i)

    expect([estado.chat[0]?.texto, estado.chat[199]?.texto]).toEqual(['m1', 'm200'])
  })
})
