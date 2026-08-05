/**
 * Sessão do jogador no navegador: guarda do token por sala e política de
 * reconexão.
 *
 * `CONN-01` — o token é a única credencial do jogador (AD-006), emitido pelo
 * servidor e persistido aqui. `CONN-02` — é ele que devolve a mesma vaga na
 * reconexão.
 *
 * O código da sala entra como chave literal: quem chama já normalizou. Duas
 * salas distintas nunca compartilham sessão.
 */

import type { CodigoErro } from '../../../shared/protocolo'

/** Prefixo das chaves no depósito — isola o app de outras coisas no domínio. */
export const PREFIXO_SESSAO = 'resenha.sessao.'

/** Subconjunto de `Storage` que a sessão usa. Existe para poder degradar. */
export interface Deposito {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

/** O que fica guardado de uma sala. */
export interface SessaoDaSala {
  /** A credencial (AD-006). */
  token: string
  /**
   * `AJU-03` — o apelido daquela sala anda junto do token: sem ele a reentrada
   * automática não teria nome a exibir antes da primeira projeção chegar.
   */
  apelido: string
}

export interface Sessao {
  /** Sessão guardada para essa sala, ou `null` quando não há. */
  ler(codigo: string): SessaoDaSala | null
  guardar(codigo: string, sessao: SessaoDaSala): void
  /** `CONN-06` — sair apaga a sessão daquela sala, e só dela. */
  apagar(codigo: string): void
}

/** Depósito volátil: vale pela aba, some ao fechar. */
export function depositoEmMemoria(): Deposito {
  const dados = new Map<string, string>()
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => void dados.set(chave, valor),
    removeItem: (chave) => void dados.delete(chave),
  }
}

/**
 * `localStorage` quando o navegador permite; memória quando não. Navegador em
 * modo privado ou com armazenamento bloqueado lança ao acessar a propriedade ou
 * ao escrever — a sonda descobre isso uma vez, na criação, em vez de deixar o
 * app quebrar no meio de uma partida.
 */
export function depositoDoNavegador(): Deposito {
  try {
    const alvo = globalThis.localStorage
    const sonda = `${PREFIXO_SESSAO}sonda`
    alvo.setItem(sonda, '1')
    alvo.removeItem(sonda)
    return alvo
  } catch {
    return depositoEmMemoria()
  }
}

export function criarSessao(deposito: Deposito = depositoDoNavegador()): Sessao {
  const chave = (codigo: string) => `${PREFIXO_SESSAO}${codigo}`
  return {
    ler: (codigo) => interpretarSessao(deposito.getItem(chave(codigo))),
    guardar: (codigo, sessao) => deposito.setItem(chave(codigo), JSON.stringify(sessao)),
    apagar: (codigo) => deposito.removeItem(chave(codigo)),
  }
}

/** Valor de outro formato — de uma versão anterior ou corrompido — não é sessão. */
function interpretarSessao(guardado: string | null): SessaoDaSala | null {
  if (guardado === null) return null
  try {
    const bruto: unknown = JSON.parse(guardado)
    if (typeof bruto !== 'object' || bruto === null) return null
    const { token, apelido } = bruto as { token?: unknown; apelido?: unknown }
    if (typeof token !== 'string' || typeof apelido !== 'string') return null
    return { token, apelido }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Reentrada automática
// ---------------------------------------------------------------------------

/**
 * `AJU-01` — a sala em que se entra sozinho, ou `null` quando não há.
 *
 * As duas condições valem juntas: o código precisa vir na URL (o link de convite
 * sempre o carrega) **e** precisa existir sessão guardada para **aquele** código.
 * Token de outra sala nunca serve, e entrar sozinho a partir da raiz do site
 * seria surpreendente.
 */
export function reentradaAutomatica(
  codigoDaUrl: string,
  sessao: Sessao,
): { codigo: string; apelido: string } | null {
  if (codigoDaUrl === '') return null
  const guardada = sessao.ler(codigoDaUrl)
  return guardada === null ? null : { codigo: codigoDaUrl, apelido: guardada.apelido }
}

/**
 * `AJU-04` — recusas em que o token guardado deixou de valer: a vaga foi
 * liberada, a sala acabou ou o jogador foi removido. Insistir com a mesma
 * credencial dá no mesmo, então ela é descartada e a tela de entrada volta.
 *
 * Apelido inválido ou em uso não entra na lista: são recusas de quem está
 * entrando pela primeira vez, quando não há token nenhum a descartar.
 */
const RECUSAS_DE_TOKEN: readonly CodigoErro[] = [
  'TOKEN_BANIDO',
  'JOGADOR_NAO_ENCONTRADO',
  'SALA_NAO_ENCONTRADA',
  'SALA_EXPIRADA',
  'SALA_CHEIA',
]

export function tokenFoiRecusado(codigo: CodigoErro): boolean {
  return RECUSAS_DE_TOKEN.includes(codigo)
}

/**
 * `AJU-02` — a aba voltou a ficar visível.
 *
 * O navegador móvel suspende a aba em segundo plano e o socket morre com a tela
 * apagada; esperar o backoff nesse momento é esperar à toa. Com o socket ainda
 * de pé não há nada a fazer — reconectar por cima derrubaria a conexão boa.
 */
export function deveReconectarAoAparecer(visivel: boolean, temSocket: boolean): boolean {
  return visivel && !temSocket
}

// ---------------------------------------------------------------------------
// Política de reconexão
// ---------------------------------------------------------------------------

/** Primeira espera. Curta: a maioria das quedas é um soluço de rede. */
export const ATRASO_INICIAL_MS = 500

/** Teto da espera. Acima disso a reconexão parece abandono. */
export const ATRASO_MAXIMO_MS = 15_000

export const FATOR_BACKOFF = 2

export interface Backoff {
  /** Espera até a próxima tentativa, em ms. Cresce a cada chamada, até o teto. */
  proximo(): number
  /** `CONN-02` — reconectou: a próxima queda recomeça do atraso inicial. */
  zerar(): void
}

/**
 * Backoff exponencial com teto, sem jitter: a sala tem no máximo 20 clientes,
 * e o servidor é um Durable Object por sala — não há rebanho a dispersar.
 */
export function criarBackoff(): Backoff {
  let tentativas = 0
  return {
    proximo() {
      const atraso = Math.min(ATRASO_INICIAL_MS * FATOR_BACKOFF ** tentativas, ATRASO_MAXIMO_MS)
      tentativas += 1
      return atraso
    },
    zerar() {
      tentativas = 0
    },
  }
}
