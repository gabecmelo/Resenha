/**
 * Sessão do jogador no navegador: guarda do token por sala e política de
 * reconexão.
 *
 * `CONN-01` — o token é a única credencial do jogador (AD-006), emitido pelo
 * servidor e persistido aqui. `CONN-02` — é ele que devolve a mesma vaga na
 * reconexão.
 *
 * O código da sala entra como chave literal: quem chama já normalizou. Duas
 * salas distintas nunca compartilham token.
 */

/** Prefixo das chaves no depósito — isola o app de outras coisas no domínio. */
export const PREFIXO_TOKEN = 'resenha.token.'

/** Subconjunto de `Storage` que a sessão usa. Existe para poder degradar. */
export interface Deposito {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

export interface Sessao {
  /** Token guardado para essa sala, ou `null` quando não há. */
  lerToken(codigo: string): string | null
  guardarToken(codigo: string, token: string): void
  /** `CONN-06` — sair apaga o token daquela sala, e só dela. */
  apagarToken(codigo: string): void
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
    const sonda = `${PREFIXO_TOKEN}sonda`
    alvo.setItem(sonda, '1')
    alvo.removeItem(sonda)
    return alvo
  } catch {
    return depositoEmMemoria()
  }
}

export function criarSessao(deposito: Deposito = depositoDoNavegador()): Sessao {
  const chave = (codigo: string) => `${PREFIXO_TOKEN}${codigo}`
  return {
    lerToken: (codigo) => deposito.getItem(chave(codigo)),
    guardarToken: (codigo, token) => deposito.setItem(chave(codigo), token),
    apagarToken: (codigo) => deposito.removeItem(chave(codigo)),
  }
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
