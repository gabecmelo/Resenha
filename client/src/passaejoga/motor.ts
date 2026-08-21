/**
 * O motor local do Passa e Joga: a mesma partida, rodando no navegador.
 *
 * Ele **não** é um segundo jogo. `iniciarRodada`, `reduzir` e `projetar` vêm do
 * mesmo registro que a sala online usa (`AD-017`), e aplicar o resultado é a
 * `aplicar()` compartilhada. O que não atravessa é a sala: não há host, chat,
 * roster nem reconexão — num aparelho só nenhum dos quatro existe, e por isso
 * este despachante é próprio em vez de reusar `despachar()`.
 *
 * Tudo aqui é puro: recebe mesa, devolve mesa. Quem guarda, quem desenha e quem
 * conta o relógio são outros.
 */

import type {
  Ambiente,
  Config,
  ContextoDeSala,
  EstadoSala,
  EventoDeJogo,
  Jogador,
  JogadorId,
  Projecao,
  Resultado,
} from '../../../shared/protocolo'
import { CONFIG_PADRAO, CORES } from '../../../shared/protocolo'
import type { PacoteCompleto } from '../../../shared/pacotes-dados'
import { PACOTES } from '../../../shared/pacotes-dados'
import { LOCAIS } from '../../../shared/locais-dados'
import type { ComandoDeJogo, EntradaDoJogo, JogoDaSala } from '../../../shared/jogos/contrato'
import { REGISTRO_DE_JOGOS } from '../../../shared/jogos/registro'
import { aplicar } from '../../../shared/jogos/aplicar'
import { TIPOS_DE_PRAZO, definir, vencidos } from '../../../shared/jogos/prazos'
import type { Passagem } from './passagem'

/**
 * Formato da mesa guardada. Mudou de número, a mesa antiga é descartada em
 * silêncio — uma partida perdida é ruim, um app que não abre é pior.
 */
export const VERSAO_DA_MESA = 1

export interface MesaLocal {
  versao: number
  jogoId: string
  /**
   * A sala que os jogos exigem. `sala.jogadores` está **na ordem da roda**
   * (`PJ-07`): é a mesma ordem em que a mesa digitou os nomes, e é a ordem em
   * que o aparelho circula.
   */
  sala: EstadoSala
  /** De quem é o aparelho agora. Decide para quem projetar (`PJ-16`). */
  aparelhoCom: JogadorId
  /** A volta de segredo em curso, ou `null` na fase que não tem (`PJ-21`). */
  passagem: Passagem | null
  /** Os anúncios do último despacho. Sem chat, é o que a tela tem pra dizer. */
  eventos: EventoDeJogo[]
}

/**
 * Monta a mesa e começa a partida.
 *
 * `nomes` vem na ordem da roda e já validado por quem chamou — aqui só se cobra
 * o que o jogo cobra, pelo mesmo `iniciarRodada` da sala online (`PJ-31`).
 */
export function iniciar(
  jogoId: string,
  nomes: string[],
  config: Partial<Config>,
  ambiente: Ambiente,
): Resultado<MesaLocal> {
  const jogo = REGISTRO_DE_JOGOS[jogoId]
  if (jogo === undefined) return { ok: false, erro: 'JOGO_INVALIDO' }

  const sala = montarSala(jogoId, nomes, configLocal(config), ambiente)

  const pacotes = pacotesDe(sala.config)
  if (!pacotes.ok) return { ok: false, erro: pacotes.erro }

  const ctx = contextoDe(sala, sala.jogadores[0]!.id)
  const rodada = jogo.iniciarRodada(ctx, ambiente, pacotes.valor)
  if (!rodada.ok) return { ok: false, erro: rodada.erro }

  sala.jogo = rodada.valor
  sala.fase = rodada.faseSeguinte ?? 'escrita'
  if (rodada.prazos !== undefined) {
    for (const tipo of TIPOS_DE_PRAZO) {
      const quando = rodada.prazos[tipo]
      if (quando !== undefined) definir(sala, tipo, quando)
    }
  }

  return {
    ok: true,
    valor: {
      versao: VERSAO_DA_MESA,
      jogoId,
      sala,
      aparelhoCom: sala.jogadores[0]!.id,
      passagem: null,
      eventos: rodada.eventos ?? [],
    },
  }
}

/**
 * Despacha um comando pelo `reduzir` do jogo e aplica o que ele descreveu.
 *
 * Recusa devolve a mesa **intacta** mais o código de erro (`PJ-13`): `reduzir` é
 * puro, e a sala só é copiada depois de o jogo ter dito sim.
 */
export function enviar(
  mesa: MesaLocal,
  comando: ComandoDeJogo,
  ambiente: Ambiente,
): Resultado<MesaLocal> {
  return despachar(mesa, comando, ambiente)
}

/**
 * O vencimento derivado do relógio (`PJ-14`).
 *
 * Na sala online quem acorda o jogo é o alarme do Durable Object; no navegador
 * não há alarme, e **contar** o tempo seria contar errado: uma aba em segundo
 * plano não recebe temporizador confiável. Por isso o vencimento é derivado —
 * compara-se o instante absoluto do prazo com o relógio de agora. Quem chama é
 * a batida de um segundo e o `visibilitychange`.
 *
 * **Nenhum `setTimeout` mora neste módulo**, de nenhuma duração: se um dia
 * aparecer um aqui, o prazo volta a ser contado em vez de derivado, e dez
 * minutos de tela apagada passam a valer menos que dez minutos.
 *
 * O prazo é limpo **antes** de o aviso ser despachado, como o `alarm()` do
 * `core` faz: é o que faz um salto de dez minutos disparar uma vez só, e não
 * uma vez por segundo perdido — e o que impede um aviso recusado de voltar a
 * vencer na batida seguinte.
 *
 * Recebe o `Ambiente` inteiro, e não só `agora`, porque o aviso passa pelo
 * mesmo `reduzir` dos comandos, e ele exige a aleatoriedade injetada.
 */
export function cobrarPrazos(mesa: MesaLocal, ambiente: Ambiente): MesaLocal {
  if (!vencidos(mesa.sala, ambiente.agora).includes('turno')) return mesa

  const sala = structuredClone(mesa.sala)
  definir(sala, 'turno', null)
  const semPrazo: MesaLocal = { ...mesa, sala }

  const resultado = despachar(semPrazo, { t: 'venceuPrazoTurno' }, ambiente)
  return resultado.ok ? resultado.valor : semPrazo
}

function despachar(
  mesa: MesaLocal,
  comando: EntradaDoJogo,
  ambiente: Ambiente,
): Resultado<MesaLocal> {
  const jogo = jogoDaMesa(mesa)
  if (jogo === null) return { ok: false, erro: 'JOGO_INVALIDO' }
  // Sem partida montada não há comando de jogo que faça sentido.
  if (mesa.sala.jogo === null) return { ok: false, erro: 'FASE_INVALIDA' }

  const ctx = contextoDe(mesa.sala, mesa.aparelhoCom)
  const resultado = jogo.reduzir(mesa.sala.jogo, ctx, comando, ambiente)
  if (!resultado.ok) return { ok: false, erro: resultado.erro }

  const sala = structuredClone(mesa.sala)
  const eventos = aplicar(sala, resultado)
  return { ok: true, valor: { ...mesa, sala, eventos } }
}

/**
 * A projeção de quem está com o aparelho, e só dela (`PJ-16`).
 *
 * É a mesma `projetar` do servidor (`AD-008`): o segredo do jogador ao lado
 * nunca chega a existir nesta tela, em vez de existir e ficar escondido.
 */
export function projetar(mesa: MesaLocal): Projecao {
  const jogo = jogoDaMesa(mesa)
  if (jogo === null) throw new Error(`jogo fora do registro: ${mesa.jogoId}`)
  return jogo.projetar(mesa.sala.jogo, mesa.sala, mesa.aparelhoCom)
}

// ---------------------------------------------------------------------------
// Montagem da mesa
// ---------------------------------------------------------------------------

function jogoDaMesa(mesa: MesaLocal): JogoDaSala<unknown> | null {
  return REGISTRO_DE_JOGOS[mesa.jogoId] ?? null
}

/**
 * O contexto que o jogo recebe. `hostId` é **quem está com o aparelho**, e não
 * `sala.hostId`: num aparelho só não há host, e os comandos que na sala online
 * exigiriam autoridade (`encerrar`, `novaPartida`, `proximaCarta`) são da mesa
 * — que é justamente quem segura o celular. Ler `sala.hostId` aqui deixaria só
 * o primeiro da roda encerrar a partida.
 */
function contextoDe(sala: EstadoSala, autorId: JogadorId): ContextoDeSala {
  return {
    fase: sala.fase,
    hostId: autorId,
    config: sala.config,
    jogadores: sala.jogadores,
    prazoTurno: sala.prazos.turno,
    autorId,
  }
}

/**
 * As configurações que descrevem coordenação entre aparelhos não existem aqui,
 * e por isso são fixadas em vez de oferecidas: a ordem de turnos é a ordem da
 * roda, a fila de perguntas dos Enigmas pressupõe aparelhos separados, e voto
 * "em tempo real" num aparelho só entregaria o voto de quem votou antes.
 */
function configLocal(parcial: Partial<Config>): Config {
  return {
    ...CONFIG_PADRAO,
    ...parcial,
    ordemTurnos: 'entrada',
    espiao: { ...CONFIG_PADRAO.espiao, ...parcial.espiao, visibilidadeVoto: 'oculta' },
    enigmas: { ...CONFIG_PADRAO.enigmas, ...parcial.enigmas, modoPergunta: 'voz' },
    cartas: { ...CONFIG_PADRAO.cartas, ...parcial.cartas },
    dedo: { ...CONFIG_PADRAO.dedo, ...parcial.dedo },
  }
}

/**
 * `EstadoSala` é reusado inteiro — `projetar` o exige. Os campos que o modo não
 * tem são preenchidos de forma honesta e imutável: sem código, sem banidos, sem
 * chat. O `hostId` é o primeiro da roda porque o contrato exige um; comandos de
 * host aqui são de quem está com o aparelho, que é a mesa.
 */
function montarSala(
  jogoId: string,
  nomes: string[],
  config: Config,
  ambiente: Ambiente,
): EstadoSala {
  const jogadores = montarJogadores(nomes, ambiente)
  return {
    codigo: '',
    fase: 'lobby',
    hostId: jogadores[0]!.id,
    jogoId,
    limiteJogadores: jogadores.length,
    jogadores,
    banidos: [],
    config,
    chat: [],
    jogo: null,
    prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null },
    ultimaAcaoEm: ambiente.agora,
  }
}

/** `PJ-10` — a cor é sorteada; ninguém escolhe. É ficha na tela, não crachá. */
function montarJogadores(nomes: string[], ambiente: Ambiente): Jogador[] {
  const cores = embaralhar(CORES, ambiente.aleatorio)
  return nomes.map((nome, i) => ({
    id: `j${i + 1}`,
    tokenHash: '',
    apelido: nome,
    cor: cores[i % cores.length]!,
    entrouEm: ambiente.agora,
    conectado: true,
    desconectadoEm: null,
    situacao: 'ativo',
  }))
}

/** Fisher-Yates com a aleatoriedade injetada, como nos jogos. */
function embaralhar<T>(itens: readonly T[], aleatorio: () => number): T[] {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
  }
  return copia
}

/**
 * Os pacotes saem do dado que já vive em `shared/` (`AD-012`), não de rede:
 * é o que faz uma partida inteira caber num aparelho sem sinal (`PJ-15`).
 */
function pacotesDe(config: Config): Resultado<PacoteCompleto[] | undefined> {
  if (config.modoPacote !== 'pacote') return { ok: true, valor: undefined }
  if (config.pacoteIds.length === 0) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }

  const pacotes: PacoteCompleto[] = []
  for (const id of config.pacoteIds) {
    const pacote = [...PACOTES, ...LOCAIS].find((p) => p.id === id)
    if (pacote === undefined) return { ok: false, erro: 'PACOTE_NAO_ENCONTRADO' }
    pacotes.push(pacote)
  }
  return { ok: true, valor: pacotes }
}
