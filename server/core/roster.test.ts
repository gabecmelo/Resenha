import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  MAX_JOGADORES,
  MIN_JOGADORES,
  type EstadoSala,
  type Fase,
  type Jogador,
} from '../../shared/protocolo'
import {
  APELIDO_MAX,
  APELIDO_MIN,
  corLivre,
  entrar,
  expulsar,
  limiteDeEntrada,
  migrarHost,
  reconectar,
  transferirHost,
} from './roster'

function sala(fase: Fase = 'lobby', limiteJogadores = MAX_JOGADORES): EstadoSala {
  return {
    codigo: 'ABCDE',
    fase,
    hostId: '',
    limiteJogadores,
    jogadores: [],
    banidos: [],
    config: { ...CONFIG_PADRAO },
    chat: [],
    jogo: null,
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ultimaAcaoEm: 0,
  }
}

let sequencia = 0
function entrarOk(estado: EstadoSala, apelido: string, agora = 1_000): Jogador {
  sequencia += 1
  const resultado = entrar(
    estado,
    { id: `j${sequencia}`, apelido, tokenHash: `hash-${sequencia}` },
    agora,
  )
  if (!resultado.ok) throw new Error(`entrada inesperadamente recusada: ${resultado.erro}`)
  return resultado.valor
}

describe('entrar — validação de apelido (SALA-03)', () => {
  it('recusa apelido com menos de 2 caracteres', () => {
    const estado = sala()
    const resultado = entrar(estado, { id: 'j1', apelido: 'A', tokenHash: 'h1' }, 1_000)

    expect(resultado).toEqual({ ok: false, erro: 'APELIDO_INVALIDO' })
  })

  it('recusa apelido com mais de 16 caracteres', () => {
    const estado = sala()
    const resultado = entrar(
      estado,
      { id: 'j1', apelido: 'A'.repeat(APELIDO_MAX + 1), tokenHash: 'h1' },
      1_000,
    )

    expect(resultado).toEqual({ ok: false, erro: 'APELIDO_INVALIDO' })
  })

  it('aceita apelido no limite inferior de 2 caracteres', () => {
    const estado = sala()
    const jogador = entrarOk(estado, 'A'.repeat(APELIDO_MIN))

    expect(jogador.apelido).toBe('AA')
  })

  it('aceita apelido no limite superior de 16 caracteres', () => {
    const estado = sala()
    const jogador = entrarOk(estado, 'A'.repeat(APELIDO_MAX))

    expect(jogador.apelido).toBe('A'.repeat(16))
  })

  it('recusa apelido formado apenas por espaços', () => {
    const estado = sala()
    const resultado = entrar(estado, { id: 'j1', apelido: '     ', tokenHash: 'h1' }, 1_000)

    expect(resultado).toEqual({ ok: false, erro: 'APELIDO_INVALIDO' })
  })

  it('guarda o apelido sem os espaços das pontas', () => {
    const estado = sala()
    const jogador = entrarOk(estado, '  Ana  ')

    expect(jogador.apelido).toBe('Ana')
  })

  it('não adiciona jogador quando a entrada é recusada', () => {
    const estado = sala()
    entrar(estado, { id: 'j1', apelido: 'A', tokenHash: 'h1' }, 1_000)

    expect(estado.jogadores).toEqual([])
  })
})

describe('entrar — apelido repetido (SALA-04)', () => {
  it('recusa apelido já usado por um jogador presente', () => {
    const estado = sala()
    entrarOk(estado, 'Ana')

    const resultado = entrar(estado, { id: 'j9', apelido: 'Ana', tokenHash: 'h9' }, 2_000)

    expect(resultado).toEqual({ ok: false, erro: 'APELIDO_EM_USO' })
  })

  it('recusa apelido repetido com caixa diferente', () => {
    const estado = sala()
    entrarOk(estado, 'Ana')

    const resultado = entrar(estado, { id: 'j99', apelido: 'ana', tokenHash: 'h99' }, 2_000)

    expect(resultado).toEqual({ ok: false, erro: 'APELIDO_EM_USO' })
    expect(estado.jogadores).toHaveLength(1)
  })

  it('recusa apelido repetido com caixa diferente em letra acentuada', () => {
    const estado = sala()
    entrarOk(estado, 'ÂNGELA')

    const resultado = entrar(estado, { id: 'j99', apelido: 'ângela', tokenHash: 'h99' }, 2_000)

    expect(resultado).toEqual({ ok: false, erro: 'APELIDO_EM_USO' })
  })

  it('recusa apelido repetido que difere apenas por espaços nas pontas', () => {
    const estado = sala()
    entrarOk(estado, 'Ana')

    const resultado = entrar(estado, { id: 'j99', apelido: '  Ana  ', tokenHash: 'h99' }, 2_000)

    expect(resultado).toEqual({ ok: false, erro: 'APELIDO_EM_USO' })
  })

  it('aceita apelidos que diferem por acento, e não só por caixa', () => {
    const estado = sala()
    entrarOk(estado, 'Ana')

    const resultado = entrar(estado, { id: 'j99', apelido: 'Anã', tokenHash: 'h99' }, 2_000)

    expect(resultado.ok).toBe(true)
    expect(estado.jogadores).toHaveLength(2)
  })
})

describe('entrar — lotação da sala (SALA-05)', () => {
  it('aceita o vigésimo jogador', () => {
    const estado = sala()
    for (let i = 0; i < MAX_JOGADORES; i += 1) entrarOk(estado, `Jogador${i}`)

    expect(estado.jogadores).toHaveLength(20)
  })

  it('recusa o vigésimo primeiro jogador', () => {
    const estado = sala()
    for (let i = 0; i < MAX_JOGADORES; i += 1) entrarOk(estado, `Jogador${i}`)

    const resultado = entrar(estado, { id: 'x', apelido: 'Extra', tokenHash: 'hx' }, 3_000)

    expect(resultado).toEqual({ ok: false, erro: 'SALA_CHEIA' })
    expect(estado.jogadores).toHaveLength(20)
  })
})

describe('entrar — lotação escolhida na criação (AJU-37)', () => {
  it('aceita o último jogador que cabe no limite da sala', () => {
    const estado = sala('lobby', 3)
    entrarOk(estado, 'Ana')
    entrarOk(estado, 'Bia')

    const terceiro = entrar(estado, { id: 'j3', apelido: 'Caio', tokenHash: 'h3' }, 3_000)

    expect(terceiro.ok).toBe(true)
    expect(estado.jogadores).toHaveLength(3)
  })

  it('recusa quem chega depois do limite da sala, abaixo do teto do produto', () => {
    const estado = sala('lobby', 3)
    entrarOk(estado, 'Ana')
    entrarOk(estado, 'Bia')
    entrarOk(estado, 'Caio')

    const quarto = entrar(estado, { id: 'j4', apelido: 'Duda', tokenHash: 'h4' }, 4_000)

    expect(quarto).toEqual({ ok: false, erro: 'SALA_CHEIA' })
    expect(estado.jogadores).toHaveLength(3)
  })

  it('recusa o terceiro numa sala criada para dois', () => {
    const estado = sala('lobby', MIN_JOGADORES)
    entrarOk(estado, 'Ana')
    entrarOk(estado, 'Bia')

    expect(entrar(estado, { id: 'j3', apelido: 'Caio', tokenHash: 'h3' }, 3_000)).toEqual({
      ok: false,
      erro: 'SALA_CHEIA',
    })
  })
})

describe('limiteDeEntrada — limite pedido na criação (AJU-35, AJU-36, AJU-38)', () => {
  it('aplica o padrão de 20 quando nenhum limite é pedido', () => {
    expect(limiteDeEntrada(undefined)).toEqual({ ok: true, valor: 20 })
  })

  it('aplica o padrão quando o campo vem nulo', () => {
    expect(limiteDeEntrada(null)).toEqual({ ok: true, valor: MAX_JOGADORES })
  })

  it('aceita o mínimo da partida', () => {
    expect(limiteDeEntrada(MIN_JOGADORES)).toEqual({ ok: true, valor: 2 })
  })

  it('aceita o teto do produto', () => {
    expect(limiteDeEntrada(MAX_JOGADORES)).toEqual({ ok: true, valor: 20 })
  })

  it('aceita um valor no meio da faixa', () => {
    expect(limiteDeEntrada(6)).toEqual({ ok: true, valor: 6 })
  })

  it('recusa limite abaixo do mínimo da partida', () => {
    expect(limiteDeEntrada(MIN_JOGADORES - 1)).toEqual({ ok: false, erro: 'LIMITE_INVALIDO' })
  })

  it('recusa limite acima do teto do produto', () => {
    expect(limiteDeEntrada(MAX_JOGADORES + 1)).toEqual({ ok: false, erro: 'LIMITE_INVALIDO' })
  })

  it('recusa limite não inteiro', () => {
    expect(limiteDeEntrada(4.5)).toEqual({ ok: false, erro: 'LIMITE_INVALIDO' })
  })

  it('recusa limite que não é número', () => {
    expect(limiteDeEntrada('6')).toEqual({ ok: false, erro: 'LIMITE_INVALIDO' })
  })

  it('recusa NaN', () => {
    expect(limiteDeEntrada(Number.NaN)).toEqual({ ok: false, erro: 'LIMITE_INVALIDO' })
  })
})

describe('entrar — cor única (SALA-07)', () => {
  it('atribui uma cor distinta a cada um dos 20 jogadores', () => {
    const estado = sala()
    for (let i = 0; i < MAX_JOGADORES; i += 1) entrarOk(estado, `Jogador${i}`)

    const cores = estado.jogadores.map((j) => j.cor)

    expect(new Set(cores).size).toBe(MAX_JOGADORES)
  })

  it('reaproveita a cor liberada por quem saiu da sala', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    entrarOk(estado, 'Bia')
    expulsar(estado, ana.id)

    expect(corLivre(estado)).toBe(ana.cor)
  })
})

describe('entrar — situação por fase (SALA-09, SALA-10)', () => {
  it('marca como ativo quem entra no lobby', () => {
    const estado = sala('lobby')

    expect(entrarOk(estado, 'Ana').situacao).toBe('ativo')
  })

  it('marca como aguardando quem entra durante a escrita', () => {
    const estado = sala('escrita')

    expect(entrarOk(estado, 'Ana').situacao).toBe('aguardando')
  })

  it('marca como aguardando quem entra durante o jogo', () => {
    const estado = sala('jogo')

    expect(entrarOk(estado, 'Ana').situacao).toBe('aguardando')
  })

  it('marca como aguardando quem entra com a partida encerrada', () => {
    const estado = sala('encerrada')

    expect(entrarOk(estado, 'Ana').situacao).toBe('aguardando')
  })
})

describe('entrar — token banido (CONN-04, HOST-02)', () => {
  it('recusa entrada de token expulso da sala', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    expulsar(estado, ana.id)

    const resultado = entrar(
      estado,
      { id: 'novo', apelido: 'Ana', tokenHash: ana.tokenHash },
      4_000,
    )

    expect(resultado).toEqual({ ok: false, erro: 'TOKEN_BANIDO' })
    expect(estado.jogadores).toHaveLength(0)
  })
})

describe('reconectar (CONN-02, CONN-04)', () => {
  it('devolve a mesma vaga, com apelido, cor e situação preservados', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    ana.conectado = false
    ana.desconectadoEm = 5_000

    const resultado = reconectar(estado, ana.tokenHash)

    expect(resultado).toEqual({
      ok: true,
      valor: expect.objectContaining({
        id: ana.id,
        apelido: 'Ana',
        cor: ana.cor,
        situacao: 'ativo',
      }),
    })
  })

  it('marca o jogador como conectado de novo', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    ana.conectado = false
    ana.desconectadoEm = 5_000

    reconectar(estado, ana.tokenHash)

    expect({ conectado: ana.conectado, desconectadoEm: ana.desconectadoEm }).toEqual({
      conectado: true,
      desconectadoEm: null,
    })
  })

  it('recusa token de jogador expulso', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    entrarOk(estado, 'Bia')
    expulsar(estado, ana.id)

    expect(reconectar(estado, ana.tokenHash)).toEqual({ ok: false, erro: 'TOKEN_BANIDO' })
  })

  it('recusa token desconhecido', () => {
    const estado = sala()
    entrarOk(estado, 'Ana')

    expect(reconectar(estado, 'hash-de-ninguem')).toEqual({
      ok: false,
      erro: 'JOGADOR_NAO_ENCONTRADO',
    })
  })
})

describe('expulsar (HOST-02)', () => {
  it('remove o jogador da sala imediatamente', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    entrarOk(estado, 'Bia')

    expulsar(estado, ana.id)

    expect(estado.jogadores.map((j) => j.apelido)).toEqual(['Bia'])
  })

  it('registra o hash do token na lista de banidos', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')

    expulsar(estado, ana.id)

    expect(estado.banidos).toEqual([ana.tokenHash])
  })

  it('recusa id inexistente sem alterar o roster', () => {
    const estado = sala()
    entrarOk(estado, 'Ana')

    const resultado = expulsar(estado, 'nao-existe')

    expect(resultado).toEqual({ ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' })
    expect(estado.jogadores).toHaveLength(1)
  })
})

describe('transferirHost (HOST-03)', () => {
  it('torna o alvo host da sala', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    const bia = entrarOk(estado, 'Bia')
    estado.hostId = ana.id

    transferirHost(estado, bia.id)

    expect(estado.hostId).toBe(bia.id)
  })

  it('recusa id inexistente e mantém o host atual', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana')
    estado.hostId = ana.id

    const resultado = transferirHost(estado, 'nao-existe')

    expect(resultado).toEqual({ ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' })
    expect(estado.hostId).toBe(ana.id)
  })
})

describe('migrarHost (HOST-04, HOST-05)', () => {
  it('escolhe o jogador conectado há mais tempo', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana', 1_000)
    const bia = entrarOk(estado, 'Bia', 2_000)
    entrarOk(estado, 'Caio', 3_000)
    estado.hostId = ana.id

    const novoHost = migrarHost(estado)

    expect(novoHost).toBe(bia.id)
    expect(estado.hostId).toBe(bia.id)
  })

  it('ignora jogadores desconectados na escolha', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana', 1_000)
    const bia = entrarOk(estado, 'Bia', 2_000)
    const caio = entrarOk(estado, 'Caio', 3_000)
    estado.hostId = ana.id
    bia.conectado = false

    expect(migrarHost(estado)).toBe(caio.id)
  })

  it('devolve null quando não há outro jogador conectado', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana', 1_000)
    const bia = entrarOk(estado, 'Bia', 2_000)
    estado.hostId = ana.id
    bia.conectado = false

    expect(migrarHost(estado)).toBeNull()
    expect(estado.hostId).toBe(ana.id)
  })

  it('mantém o ex-host como jogador comum quando ele reconecta', () => {
    const estado = sala()
    const ana = entrarOk(estado, 'Ana', 1_000)
    const bia = entrarOk(estado, 'Bia', 2_000)
    estado.hostId = ana.id
    ana.conectado = false
    migrarHost(estado)

    reconectar(estado, ana.tokenHash)

    expect(estado.hostId).toBe(bia.id)
  })
})
