import type { Fase } from '../../shared/protocolo'

/**
 * O funil da mesa, em quatro eventos.
 *
 * Existe porque o app troca de endereço com `replaceState` (`AJU-33`) e o
 * Web Analytics só conta pageview novo em `pushState`: entrar numa sala a
 * partir da home não gera contagem nenhuma. O caminho "abriu → criou → alguém
 * entrou → começou → terminou" é invisível de fora, e continuaria invisível
 * num pico de mil visitas.
 *
 * **O que este módulo deliberadamente não sabe:** quem é a pessoa. Não há
 * apelido, id de jogador, token, IP nem código de sala em evento nenhum
 * (`FUN-05`). A sala aparece como o id opaco do Durable Object, que não serve
 * pra entrar em sala alguma — dá pra contar salas distintas e nada além disso.
 * Sem identificar pessoa não há o que consentir, e o produto continua sem
 * banner.
 *
 * O `jogoId` atravessa como string opaca: o `core` continua sem conhecer jogo
 * concreto (`AD-002`).
 */
export type EventoDeFunil =
  | { t: 'sala_criada'; jogoId: string }
  /** `ordem` é a posição na chegada — 1 é quem criou a sala. O número que
   *  importa é quantas salas chegam ao 2: uma sala de uma pessoa é curiosidade,
   *  uma de duas é mesa. */
  | { t: 'jogador_entrou'; jogoId: string; ordem: number }
  | { t: 'partida_iniciada'; jogoId: string; jogadores: number }
  | { t: 'partida_encerrada'; jogoId: string; jogadores: number }

/**
 * O que a mudança de fase conta (`FUN-03`, `FUN-04`).
 *
 * Ler a transição em vez de interceptar o comando é o que mantém isto genérico:
 * `comecar` e `encerrar` são nomes que os jogos podem trocar, mas a fase é do
 * protocolo. E, ao olhar só o antes e o depois, nenhuma regra precisa avisar
 * nada — o instrumento não encosta no jogo.
 */
export function eventoDaTransicao(
  antes: Fase,
  depois: Fase,
  sala: { jogoId: string; jogadores: readonly unknown[] },
): EventoDeFunil | null {
  if (antes === depois) return null

  if (antes === 'lobby' && (depois === 'escrita' || depois === 'jogo')) {
    return { t: 'partida_iniciada', jogoId: sala.jogoId, jogadores: sala.jogadores.length }
  }
  if (depois === 'encerrada') {
    return { t: 'partida_encerrada', jogoId: sala.jogoId, jogadores: sala.jogadores.length }
  }
  // `escrita` → `jogo` é o meio de uma partida que já foi contada ao começar, e
  // voltar pro lobby é "jogar de novo", não uma partida nova.
  return null
}

/**
 * O ponto como o Analytics Engine o guarda.
 *
 * O formato é rígido — `blob1..20`, `double1..20`, `index1` — e a consulta SQL
 * fala nesses nomes, então a ordem aqui **é** o esquema. Mudar posição depois
 * de haver dado gravado mistura duas coisas na mesma coluna; o certo é usar uma
 * posição nova.
 *
 * - `blob1` tipo do evento · `blob2` jogo
 * - `double1` sempre 1, pra `SUM` contar · `double2` a quantidade do evento
 * - `index1` a sala
 */
export function pontoDoFunil(evento: EventoDeFunil, salaId: string): AnalyticsEngineDataPoint {
  return {
    blobs: [evento.t, evento.jogoId],
    doubles: [1, quantidadeDe(evento)],
    indexes: [salaId],
  }
}

/** Zero onde o evento não tem quantidade: `double2` precisa existir sempre, ou
 *  a coluna passa a significar coisas diferentes conforme a linha. */
function quantidadeDe(evento: EventoDeFunil): number {
  if (evento.t === 'jogador_entrou') return evento.ordem
  if (evento.t === 'partida_iniciada' || evento.t === 'partida_encerrada') return evento.jogadores
  return 0
}

/**
 * Escreve, e nunca atrapalha (`FUN-06`, `FUN-07`).
 *
 * `writeDataPoint` devolve `void` e não lança — não há `await` a dar aqui, e
 * não deve haver: telemetria que atrasa um comando de jogo custa mais do que
 * vale. O `try` cobre o resto (binding presente mas quebrado); o `FUNIL?`
 * cobre a ausência, que é o caso de quem clona o repo, do teste e de qualquer
 * ambiente sem o dataset.
 */
export function registrar(
  env: { FUNIL?: AnalyticsEngineDataset },
  evento: EventoDeFunil,
  salaId: string,
): void {
  if (env.FUNIL === undefined) return
  try {
    env.FUNIL.writeDataPoint(pontoDoFunil(evento, salaId))
  } catch {
    // Medir é acessório; jogar não é.
  }
}
