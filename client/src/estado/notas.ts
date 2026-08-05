/**
 * Digitação do bloco de notas (`NOTA-01`, `AJU-22`…`AJU-25`).
 *
 * O campo é do jogador, não do servidor: cada tecla vale na hora e o envio sai
 * depois da pausa. Esperar a ida e volta do servidor a cada tecla é o que fazia
 * o campo comer letras e jogar o cursor para o fim.
 *
 * Aqui só vive a decisão — o que a tela mostra e quando o servidor pode
 * sobrescrever. Quem guarda a nota é o servidor (AD-008).
 */

/** Pausa que caracteriza "parou de digitar" (`AJU-24`). */
export const ESPERA_PARA_ENVIAR_MS = 400

export interface Rascunho {
  /** O que a tela mostra agora. */
  texto: string
  /**
   * `AJU-25` — há digitação local que o servidor ainda não confirmou. Enquanto
   * houver, projeção nenhuma sobrescreve o campo.
   */
  emEdicao: boolean
}

/** O ponto de partida: o que veio do servidor, sem nada digitado por cima. */
export function rascunhoDoServidor(texto: string): Rascunho {
  return { texto, emEdicao: false }
}

/** `AJU-22`, `AJU-23` — a tecla vale imediatamente, exatamente como veio. */
export function digitou(texto: string): Rascunho {
  return { texto, emEdicao: true }
}

/**
 * `AJU-25` — chegou uma projeção.
 *
 * Enquanto o campo está em edição o texto local vence: sobrescrevê-lo é o
 * defeito que esta rodada corrige. Quando o servidor confirma o que foi
 * digitado, a edição se encerra. Fora de edição a projeção é a verdade — é
 * assim que uma reconexão devolve as notas guardadas.
 *
 * Devolve o **mesmo** rascunho quando nada muda: quem chama compara por
 * identidade para não re-renderizar à toa.
 */
export function chegouDoServidor(rascunho: Rascunho, doServidor: string): Rascunho {
  if (doServidor === rascunho.texto) {
    return rascunho.emEdicao ? { texto: rascunho.texto, emEdicao: false } : rascunho
  }
  if (rascunho.emEdicao) return rascunho
  return { texto: doServidor, emEdicao: false }
}

/** Quem leva o texto ao servidor. Entra a cada chamada, e não na criação, para
 * que o componente não precise guardar a função entre renderizações. */
export type Envio = (texto: string) => void

export interface EnvioAdiado {
  /** `AJU-24` — registra o que foi digitado; o envio sai depois da pausa. */
  agendar(texto: string, enviar: Envio): void
  /** Manda agora o que estiver pendente. Sem nada pendente, não manda nada. */
  liberar(enviar: Envio): void
}

/**
 * `AJU-24` — um envio por pausa, não um por tecla. Cada tecla adia o envio
 * anterior; o que sai é sempre o texto mais recente.
 */
export function criarEnvioAdiado(espera: number = ESPERA_PARA_ENVIAR_MS): EnvioAdiado {
  let agendamento: ReturnType<typeof setTimeout> | null = null
  let pendente: string | null = null

  const mandar = (enviar: Envio) => {
    if (agendamento !== null) clearTimeout(agendamento)
    agendamento = null
    if (pendente === null) return
    const texto = pendente
    pendente = null
    enviar(texto)
  }

  return {
    agendar(texto, enviar) {
      pendente = texto
      if (agendamento !== null) clearTimeout(agendamento)
      agendamento = setTimeout(() => mandar(enviar), espera)
    },
    liberar: mandar,
  }
}
