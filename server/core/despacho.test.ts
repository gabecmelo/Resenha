import { describe, expect, it } from 'vitest'
import {
  type Ambiente,
  CONFIG_PADRAO,
  CORES,
  type Config,
  type EstadoSala,
  type JogadorId,
  MAX_JOGADORES,
  type Projecao,
  type ResultadoReducer,
  type Situacao,
  TEMPO_TURNO_MAX_SEG,
  TEMPO_TURNO_MIN_SEG,
} from '../../shared/protocolo'
import type { PacoteCompleto } from '../../shared/pacotes-dados'
import { quemSouEu } from '../games/quem-sou-eu'
import type { EstadoQuemSouEu } from '../games/quem-sou-eu/regras'
import { type JogoDaSala, NOTAS_MAX_CARACTERES, avisar, buscarPacotes, despachar } from './despacho'
import { reconectar } from './roster'

const AMBIENTE: Ambiente = { agora: 10_000, aleatorio: () => 0 }

function salaEmLobby(quantidade = 3): EstadoSala<EstadoQuemSouEu> {
  const jogadores = Array.from({ length: quantidade }, (_, i) => ({
    id: `j${i + 1}`,
    tokenHash: `hash-${i + 1}`,
    apelido: `Jogador ${i + 1}`,
    cor: CORES[i],
    entrouEm: 1_000 + i,
    conectado: true,
    desconectadoEm: null,
    situacao: 'ativo' as Situacao,
  }))

  return {
    codigo: 'ABCDE',
    fase: 'lobby',
    hostId: 'j1',
    limiteJogadores: MAX_JOGADORES,
    jogadores,
    banidos: [],
    config: { ...CONFIG_PADRAO },
    chat: [],
    jogo: null,
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ultimaAcaoEm: 0,
  }
}

async function salaEmEscrita(quantidade = 3): Promise<EstadoSala<EstadoQuemSouEu>> {
  const sala = salaEmLobby(quantidade)
  await despachar(sala, quemSouEu, 'j1', { t: 'iniciar' }, AMBIENTE)
  return sala
}

async function salaEmJogo(quantidade = 3): Promise<EstadoSala<EstadoQuemSouEu>> {
  const sala = await salaEmEscrita(quantidade)
  for (const jogador of sala.jogadores) {
    await despachar(sala, quemSouEu, jogador.id, { t: 'escreverCarta', texto: 'Chapolin' }, AMBIENTE)
    await despachar(sala, quemSouEu, jogador.id, { t: 'marcarPronto', pronto: true }, AMBIENTE)
  }
  await despachar(sala, quemSouEu, 'j1', { t: 'comecar' }, AMBIENTE)
  return sala
}

/** Módulo de jogo controlado, para provar o que o `core` faz com a resposta. */
interface Marcador {
  marca: string
}

function moduloQueDevolve(resposta: ResultadoReducer<Marcador>): JogoDaSala<Marcador> {
  return {
    iniciarRodada: () => ({ ok: true, valor: { marca: 'inicial' } }),
    reduzir: () => resposta,
    projetar: (): Projecao => {
      throw new Error('projetar não é usado neste teste')
    },
  }
}

function salaComModulo(): EstadoSala<Marcador> {
  const sala = salaEmLobby(3) as unknown as EstadoSala<Marcador>
  sala.fase = 'jogo'
  sala.jogo = { marca: 'inicial' }
  return sala
}

function textosDoChat(sala: EstadoSala<unknown>): string[] {
  return sala.chat.map((m) => m.texto)
}

describe('autoridade de host (`HOST-06`)', () => {
  it('rejeita `iniciar` de quem não é host e deixa a sala intocada', async () => {
    const sala = salaEmLobby()
    const antes = structuredClone(sala)

    const resultado = await despachar(sala, quemSouEu, 'j2', { t: 'iniciar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
    expect(sala).toEqual(antes)
  })

  it('rejeita `configurar` de quem não é host e deixa a configuração intocada', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j2',
      { t: 'configurar', config: { ordemTurnos: 'entrada' } },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
    expect(sala.config).toEqual(CONFIG_PADRAO)
  })

  it('rejeita `expulsar` de quem não é host e mantém o jogador na sala', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j2',
      { t: 'expulsar', jogadorId: 'j3' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
    expect(sala.jogadores.map((j) => j.id)).toEqual(['j1', 'j2', 'j3'])
  })

  it('rejeita `transferirHost` de quem não é host e mantém o host atual', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j2',
      { t: 'transferirHost', jogadorId: 'j2' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
    expect(sala.hostId).toBe('j1')
  })

  it('aceita `iniciar` do host e leva a sala à escrita (`ESCR-01`)', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(sala, quemSouEu, 'j1', { t: 'iniciar' }, AMBIENTE)

    expect(resultado.ok).toBe(true)
    expect(sala.fase).toBe('escrita')
    expect(Object.keys(sala.jogo?.atribuicoes ?? {}).sort()).toEqual(['j1', 'j2', 'j3'])
  })
})

describe('validação de fase', () => {
  it('rejeita `iniciar` fora do lobby', async () => {
    const sala = await salaEmEscrita()

    const resultado = await despachar(sala, quemSouEu, 'j1', { t: 'iniciar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('rejeita `configurar` fora do lobby (`CFG-04`)', async () => {
    const sala = await salaEmJogo()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { tempoTurnoSeg: 30 } },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
    expect(sala.config.tempoTurnoSeg).toBeNull()
  })

  it('rejeita comando de partida no lobby, onde não há partida montada', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(sala, quemSouEu, 'j1', { t: 'passarVez' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })
})

describe('jogador aguardando', () => {
  it('rejeita ação de partida de quem entrou no meio (`SALA-10`)', async () => {
    const sala = await salaEmEscrita()
    sala.jogadores[1].situacao = 'aguardando'
    const antes = structuredClone(sala)

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j2',
      { t: 'escreverCarta', texto: 'Chaves' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'JOGADOR_AGUARDANDO' })
    expect(sala).toEqual(antes)
  })

  it('rejeita `responderDeclaracao` de quem está aguardando (`DESC-03`)', async () => {
    const sala = await salaEmJogo()
    sala.jogadores[1].situacao = 'aguardando'

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j2',
      { t: 'responderDeclaracao', aceita: true },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'JOGADOR_AGUARDANDO' })
  })

  it('aceita mensagem de chat de quem está aguardando (`CHAT-01`)', async () => {
    const sala = await salaEmJogo()
    sala.jogadores[1].situacao = 'aguardando'

    const resultado = await despachar(sala, quemSouEu, 'j2', { t: 'chat', texto: 'boa sorte' }, AMBIENTE)

    expect(resultado.ok).toBe(true)
    expect(sala.chat.at(-1)).toEqual({
      tipo: 'jogador',
      autorId: 'j2',
      apelido: 'Jogador 2',
      cor: CORES[1],
      texto: 'boa sorte',
      em: AMBIENTE.agora,
    })
  })
})

describe('configuração da partida', () => {
  it('aplica as opções escolhidas pelo host no lobby (`CFG-01`, `CFG-03`)', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { ordemTurnos: 'entrada', tempoTurnoSeg: 90 } },
      AMBIENTE,
    )

    expect(resultado.ok).toBe(true)
    expect(sala.config).toEqual({
      ...CONFIG_PADRAO,
      ordemTurnos: 'entrada',
      tempoTurnoSeg: 90,
    })
  })

  it('descarta o campo removido sem alterar a configuração (`AJU-18`, `AJU-21`)', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { aoDescobrir: 'continua' } as Partial<Config> },
      AMBIENTE,
    )

    expect(resultado.ok).toBe(true)
    expect(sala.config).toEqual(CONFIG_PADRAO)
  })

  it('alteração parcial preserva as demais configurações (`CFG-06`)', async () => {
    const sala = salaEmLobby()
    await despachar(sala, quemSouEu, 'j1', { t: 'configurar', config: { tempoTurnoSeg: 60 } }, AMBIENTE)

    await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { ordemTurnos: 'entrada' } },
      AMBIENTE,
    )

    expect(sala.config).toEqual({
      ...CONFIG_PADRAO,
      ordemTurnos: 'entrada',
      tempoTurnoSeg: 60,
    })
  })

  it('recusa tempo de turno abaixo da faixa (`AJU-20`)', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { tempoTurnoSeg: 7 } },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
    expect(sala.config).toEqual(CONFIG_PADRAO)
  })

  it('aceita um tempo de turno fora dos presets, dentro da faixa (`AJU-19`)', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { tempoTurnoSeg: 240 } },
      AMBIENTE,
    )

    expect(resultado.ok).toBe(true)
    expect(sala.config.tempoTurnoSeg).toBe(240)
  })

  it('aceita os dois extremos da faixa (`AJU-19`)', async () => {
    const minima = salaEmLobby()
    const maxima = salaEmLobby()

    await despachar(
      minima,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { tempoTurnoSeg: TEMPO_TURNO_MIN_SEG } },
      AMBIENTE,
    )
    await despachar(
      maxima,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { tempoTurnoSeg: TEMPO_TURNO_MAX_SEG } },
      AMBIENTE,
    )

    expect([minima.config.tempoTurnoSeg, maxima.config.tempoTurnoSeg]).toEqual([10, 3_600])
  })

  it('recusa tempo de turno acima da faixa e mantém a configuração anterior (`AJU-20`)', async () => {
    const sala = salaEmLobby()
    await despachar(sala, quemSouEu, 'j1', { t: 'configurar', config: { tempoTurnoSeg: 90 } }, AMBIENTE)

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { tempoTurnoSeg: TEMPO_TURNO_MAX_SEG + 1 } },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })
    expect(sala.config.tempoTurnoSeg).toBe(90)
  })

  it('mantém "sem limite" como valor válido (`JOGO-08`)', async () => {
    const sala = salaEmLobby()
    await despachar(sala, quemSouEu, 'j1', { t: 'configurar', config: { tempoTurnoSeg: 90 } }, AMBIENTE)

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'configurar', config: { tempoTurnoSeg: null } },
      AMBIENTE,
    )

    expect(resultado.ok).toBe(true)
    expect(sala.config.tempoTurnoSeg).toBeNull()
  })

  it('recusa tempo de turno não inteiro ou não numérico (`AJU-20`)', async () => {
    const recusados = [45.5, Number.NaN, Number.POSITIVE_INFINITY, '60' as unknown as number]

    for (const valor of recusados) {
      const sala = salaEmLobby()

      const resultado = await despachar(
        sala,
        quemSouEu,
        'j1',
        { t: 'configurar', config: { tempoTurnoSeg: valor } },
        AMBIENTE,
      )

      expect({ valor, resultado, config: sala.config }).toEqual({
        valor,
        resultado: { ok: false, erro: 'COMANDO_INVALIDO' },
        config: CONFIG_PADRAO,
      })
    }
  })

  it('a sala nasce com ordem sorteada e sem limite de tempo (`CFG-05`, `AJU-21`)', async () => {
    expect(salaEmLobby().config).toEqual({
      ...CONFIG_PADRAO,
      ordemTurnos: 'sorteada',
      tempoTurnoSeg: null,
    })
  })
})

describe('bloco de notas', () => {
  it('grava a nota do autor no estado do jogo (`NOTA-01`)', async () => {
    const sala = await salaEmJogo()

    const resultado = await despachar(sala, quemSouEu, 'j2', { t: 'notas', texto: 'não é humano' }, AMBIENTE)

    expect(resultado.ok).toBe(true)
    expect(sala.jogo?.notas).toEqual({ j2: 'não é humano' })
  })

  it('aceita exatamente 2.000 caracteres', async () => {
    const sala = await salaEmJogo()
    const texto = 'a'.repeat(NOTAS_MAX_CARACTERES)

    const resultado = await despachar(sala, quemSouEu, 'j2', { t: 'notas', texto }, AMBIENTE)

    expect(resultado.ok).toBe(true)
    expect(sala.jogo?.notas.j2).toHaveLength(2_000)
  })

  it('recusa acima de 2.000 caracteres sem gravar nada', async () => {
    const sala = await salaEmJogo()
    const texto = 'a'.repeat(NOTAS_MAX_CARACTERES + 1)

    const resultado = await despachar(sala, quemSouEu, 'j2', { t: 'notas', texto }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'NOTAS_MUITO_LONGAS' })
    expect(sala.jogo?.notas).toEqual({})
  })

  it('recusa notas no lobby, onde o bloco não é oferecido (`NOTA-01`)', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(sala, quemSouEu, 'j2', { t: 'notas', texto: 'oi' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'FASE_INVALIDA' })
  })

  it('a nota gravada nunca chega à projeção de outro jogador (`NOTA-02`)', async () => {
    const sala = await salaEmJogo()
    await despachar(sala, quemSouEu, 'j2', { t: 'notas', texto: 'segredo de j2' }, AMBIENTE)

    const paraOutro = JSON.stringify(quemSouEu.projetar(sala.jogo, sala, 'j3'))

    expect(paraOutro).not.toContain('segredo de j2')
    expect(quemSouEu.projetar(sala.jogo, sala, 'j2').eu.notas).toBe('segredo de j2')
  })
})

describe('sair da sala (`CONN-06`)', () => {
  it('libera a vaga e devolve o jogador em `removidos`', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(sala, quemSouEu, 'j3', { t: 'sair' }, AMBIENTE)

    expect(resultado).toEqual({ ok: true, valor: { removidos: ['j3'] } })
    expect(sala.jogadores.map((j) => j.id)).toEqual(['j1', 'j2'])
  })

  it('invalida o token daquela sala: ele não devolve mais a vaga', async () => {
    const sala = salaEmLobby()
    await despachar(sala, quemSouEu, 'j3', { t: 'sair' }, AMBIENTE)

    expect(reconectar(sala, 'hash-3')).toEqual({ ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' })
  })

  it('não bane o token: sair não é expulsão (`HOST-02`)', async () => {
    const sala = salaEmLobby()

    await despachar(sala, quemSouEu, 'j3', { t: 'sair' }, AMBIENTE)

    expect(sala.banidos).toEqual([])
  })

  it('passa o comando adiante quando quem sai é o host', async () => {
    const sala = salaEmLobby()

    await despachar(sala, quemSouEu, 'j1', { t: 'sair' }, AMBIENTE)

    expect(sala.hostId).toBe('j2')
  })
})

describe('expulsar (`HOST-02`)', () => {
  it('remove o jogador, bane o token e devolve-o em `removidos`', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(
      sala,
      quemSouEu,
      'j1',
      { t: 'expulsar', jogadorId: 'j3' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: true, valor: { removidos: ['j3'] } })
    expect(sala.jogadores.map((j) => j.id)).toEqual(['j1', 'j2'])
    expect(sala.banidos).toEqual(['hash-3'])
  })

  it('preserva as cartas e sorteia alvos novos quando a saída é na escrita (`ESCR-07`)', async () => {
    const sala = await salaEmEscrita(4)
    await despachar(sala, quemSouEu, 'j2', { t: 'escreverCarta', texto: 'Chaves' }, AMBIENTE)

    await despachar(sala, quemSouEu, 'j1', { t: 'expulsar', jogadorId: 'j4' }, AMBIENTE)

    expect(sala.jogo?.cartas[sala.jogo?.atribuicoes['j2']]).toBe('Chaves')
    expect(Object.keys(sala.jogo?.atribuicoes ?? {}).sort()).toEqual(['j1', 'j2', 'j3'])
  })
})

describe('roteamento ao módulo de jogo', () => {
  it('devolve o erro do jogo sem alterar a sala (`JOGO-06`)', async () => {
    const sala = await salaEmJogo()
    const antes = structuredClone(sala)
    const naoEhDaVezNemHost = sala.jogo?.ordem.find((id) => id !== sala.jogo?.vezDe && id !== 'j1')

    const resultado = await despachar(
      sala,
      quemSouEu,
      naoEhDaVezNemHost as JogadorId,
      { t: 'passarVez' },
      AMBIENTE,
    )

    expect(resultado).toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })
    expect(sala).toEqual(antes)
  })

  it('registra os eventos do jogo como mensagem de sistema (`CHAT-03`)', async () => {
    const sala = salaComModulo()
    const jogo = moduloQueDevolve({
      ok: true,
      estado: { marca: 'nova' },
      eventos: [{ texto: 'É a vez de Jogador 2.' }],
      prazos: {},
    })

    await despachar(sala, jogo, 'j1', { t: 'passarVez' }, AMBIENTE)

    expect(sala.chat).toEqual([
      { tipo: 'sistema', texto: 'É a vez de Jogador 2.', em: AMBIENTE.agora },
    ])
  })

  it('aplica os prazos pedidos pelo jogo sem apagar os demais (AD-010)', async () => {
    const sala = salaComModulo()
    sala.prazos.salaVazia = 5_000
    sala.prazos.salaOciosa = 9_000
    const jogo = moduloQueDevolve({
      ok: true,
      estado: { marca: 'nova' },
      eventos: [],
      prazos: { turno: 3_000 },
    })

    await despachar(sala, jogo, 'j1', { t: 'passarVez' }, AMBIENTE)

    expect(sala.prazos).toEqual({
      turno: 3_000,
      migracaoHost: null,
      salaVazia: 5_000,
      salaOciosa: 9_000,
    })
  })

  it('promove os jogadores aguardando quando o jogo pede (`FIM-03`)', async () => {
    const sala = salaComModulo()
    sala.jogadores[2].situacao = 'aguardando'
    const jogo = moduloQueDevolve({
      ok: true,
      estado: { marca: 'zerada' },
      eventos: [],
      prazos: {},
      faseSeguinte: 'lobby',
      promoverAguardando: true,
    })

    await despachar(sala, jogo, 'j1', { t: 'novaPartida' }, AMBIENTE)

    expect(sala.jogadores.map((j) => j.situacao)).toEqual(['ativo', 'ativo', 'ativo'])
    expect(sala.fase).toBe('lobby')
  })

  it('avisa o jogo do prazo de turno vencido sem contar como ação de jogador (`CONN-08`)', async () => {
    const sala = await salaEmJogo()
    // `JOGO-08` — sem tempo por turno configurado o prazo nunca avança a vez.
    sala.config.tempoTurnoSeg = 30
    sala.ultimaAcaoEm = 1_000
    const vezAntes = sala.jogo?.vezDe

    const resultado = avisar(
      sala,
      quemSouEu,
      { t: 'venceuPrazoTurno' },
      { agora: 20_000, aleatorio: () => 0 },
    )

    expect(resultado.ok).toBe(true)
    expect(sala.ultimaAcaoEm).toBe(1_000)
    expect(sala.jogo?.vezDe).not.toBe(vezAntes)
  })

  it('marca a última ação a cada comando aceito (`CONN-08`)', async () => {
    const sala = salaEmLobby()

    await despachar(sala, quemSouEu, 'j2', { t: 'chat', texto: 'oi' }, AMBIENTE)

    expect(sala.ultimaAcaoEm).toBe(AMBIENTE.agora)
  })

  it('não marca a última ação quando o comando é recusado', async () => {
    const sala = salaEmLobby()

    await despachar(sala, quemSouEu, 'j2', { t: 'iniciar' }, AMBIENTE)

    expect(sala.ultimaAcaoEm).toBe(0)
  })

  it('recusa comando de quem não está na sala', async () => {
    const sala = salaEmLobby()

    const resultado = await despachar(sala, quemSouEu, 'fantasma', { t: 'chat', texto: 'oi' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' })
    expect(textosDoChat(sala)).toEqual([])
  })
})

describe('buscarPacotes (T6, `PKT2-09`, `PKT2-21`)', () => {
  const PACOTE_DO_KV: PacoteCompleto = {
    id: 'filmes',
    emoji: '🎥',
    nome: 'Filmes (do KV)',
    descricao: 'vindo do KV',
    quantidade: 1,
    cartas: [{ texto: 'Matrix', dificuldade: 'facil' }],
  }

  function envComPacotes(
    mapa: Record<string, PacoteCompleto | undefined>,
    opts: { lancaErro?: boolean } = {},
  ): Env {
    return {
      PACOTES_KV: {
        get: async (chave: string) => {
          if (opts.lancaErro) throw new Error('KV indisponível')
          const id = chave.replace('pacote:', '')
          return mapa[id] ?? null
        },
      },
    } as unknown as Env
  }

  it('sem `env`, recusa com `PACOTE_INDISPONIVEL`', async () => {
    const resultado = await buscarPacotes(['filmes'])

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_INDISPONIVEL' })
  })

  it('encontra o pacote no KV e devolve exatamente o que o KV tem', async () => {
    const env = envComPacotes({ filmes: PACOTE_DO_KV })

    const resultado = await buscarPacotes(['filmes'], env)

    expect(resultado).toEqual({ ok: true, valor: [PACOTE_DO_KV] })
  })

  it('cai no fallback estático quando o KV não tem o pacote', async () => {
    const env = envComPacotes({})

    const resultado = await buscarPacotes(['anime'], env)

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor).toHaveLength(1)
      expect(resultado.valor[0].id).toBe('anime')
    }
  })

  it('recusa com `PACOTE_NAO_ENCONTRADO` quando um id não existe em nenhum dos dois', async () => {
    const env = envComPacotes({})

    const resultado = await buscarPacotes(['pacote-inexistente'], env)

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
  })

  it('busca vários ids em paralelo e preserva a ordem pedida (`PKT2-06`)', async () => {
    const env = envComPacotes({ filmes: PACOTE_DO_KV })

    const resultado = await buscarPacotes(['filmes', 'anime'], env)

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.map((p) => p.id)).toEqual(['filmes', 'anime'])
    }
  })

  it('recusa o lote inteiro se qualquer um dos ids faltar, mesmo que outros existam', async () => {
    const env = envComPacotes({ filmes: PACOTE_DO_KV })

    const resultado = await buscarPacotes(['filmes', 'pacote-inexistente'], env)

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
  })

  it('recusa com `PACOTE_INDISPONIVEL` quando o KV falha', async () => {
    const env = envComPacotes({}, { lancaErro: true })

    const resultado = await buscarPacotes(['filmes'], env)

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_INDISPONIVEL' })
  })
})

describe('`iniciar` com pacotes (T6, `PKT2-09`)', () => {
  function moduloQueCapturaPacotes(): {
    modulo: JogoDaSala<Marcador>
    chamadas: unknown[]
  } {
    const chamadas: unknown[] = []
    const modulo = {
      iniciarRodada: (_ctx: unknown, _ambiente: unknown, pacotes: unknown) => {
        chamadas.push(pacotes)
        return { ok: true, valor: { marca: 'inicial' } }
      },
      reduzir: () => {
        throw new Error('não usado neste teste')
      },
      projetar: (): Projecao => {
        throw new Error('não usado neste teste')
      },
    } as unknown as JogoDaSala<Marcador>
    return { modulo, chamadas }
  }

  it('recusa iniciar com `pacoteIds` vazio, mesmo motivo de hoje (`PKT2-09`)', async () => {
    const sala = salaEmLobby() as unknown as EstadoSala<Marcador>
    sala.config = { ...sala.config, modoPacote: 'pacote', pacoteIds: [] }
    const { modulo } = moduloQueCapturaPacotes()

    const resultado = await despachar(sala, modulo, 'j1', { t: 'iniciar' }, AMBIENTE)

    expect(resultado).toEqual({ ok: false, erro: 'PACOTE_NAO_ENCONTRADO' })
    expect(sala.fase).toBe('lobby')
  })

  it('passa o array de pacotes buscados para `jogo.iniciarRodada`', async () => {
    const sala = salaEmLobby() as unknown as EstadoSala<Marcador>
    sala.config = { ...sala.config, modoPacote: 'pacote', pacoteIds: ['filmes', 'anime'] }
    const { modulo, chamadas } = moduloQueCapturaPacotes()
    const env = {
      PACOTES_KV: { get: async () => null },
    } as unknown as Env

    const resultado = await despachar(sala, modulo, 'j1', { t: 'iniciar' }, AMBIENTE, env)

    expect(resultado.ok).toBe(true)
    expect(chamadas).toHaveLength(1)
    const pacotesRecebidos = chamadas[0] as PacoteCompleto[]
    expect(pacotesRecebidos.map((p) => p.id)).toEqual(['filmes', 'anime'])
  })
})

describe('nova partida (`FIM-04`)', () => {
  it('preserva jogadores, apelidos, cores, chat e configurações ao voltar ao lobby', async () => {
    const sala = salaEmLobby()
    await despachar(
      sala,
      quemSouEu,
      'j1',
      {
        t: 'configurar',
        config: { ordemTurnos: 'entrada', tempoTurnoSeg: 90 },
      },
      AMBIENTE,
    )
    await despachar(sala, quemSouEu, 'j1', { t: 'iniciar' }, AMBIENTE)
    for (const jogador of sala.jogadores) {
      await despachar(sala, quemSouEu, jogador.id, { t: 'escreverCarta', texto: 'Chapolin' }, AMBIENTE)
      await despachar(sala, quemSouEu, jogador.id, { t: 'marcarPronto', pronto: true }, AMBIENTE)
    }
    await despachar(sala, quemSouEu, 'j1', { t: 'comecar' }, AMBIENTE)
    await despachar(sala, quemSouEu, 'j2', { t: 'chat', texto: 'boa partida' }, AMBIENTE)
    await despachar(sala, quemSouEu, 'j1', { t: 'encerrar' }, AMBIENTE)
    const jogadoresAntes = structuredClone(sala.jogadores)
    const chatAntes = structuredClone(sala.chat)
    const configAntes = structuredClone(sala.config)
    // Controle: sem histórico anterior, preservar o chat seria trivialmente verdade.
    expect(textosDoChat(sala)).toContain('boa partida')

    const resultado = await despachar(sala, quemSouEu, 'j1', { t: 'novaPartida' }, AMBIENTE)

    expect(resultado.ok).toBe(true)
    expect(sala.fase).toBe('lobby')
    expect(sala.chat.slice(0, chatAntes.length)).toEqual(chatAntes)
    expect(sala.jogadores).toEqual(jogadoresAntes)
    expect(sala.config).toEqual(configAntes)
  })
})
