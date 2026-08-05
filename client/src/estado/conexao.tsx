import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CodigoErro, Comando, Mensagem, Projecao } from '../../../shared/protocolo'
import { criarBackoff, criarSessao, deveReconectarAoAparecer, tokenFoiRecusado } from './sessao'

/**
 * Socket único da aplicação (`CONN-01`, `CONN-03`).
 *
 * Este arquivo é a fronteira inteira entre o React e o servidor: ele abre a
 * conexão, reenvia a credencial ao reconectar, guarda a projeção mais recente e
 * despacha comandos. **Nenhuma regra de jogo mora aqui** (AD-008) — quem decide
 * de quem é a vez, quem pode agir e o que aparece é o servidor; o cliente só
 * carrega a `Projecao` que recebeu até os componentes.
 */

export type EstadoConexao =
  | 'conectando'
  | 'conectado'
  /** Socket caiu; nova tentativa agendada com backoff. */
  | 'reconectando'
  /** A conexão acabou e não será retomada — o motivo está em `erro`. */
  | 'expirada'

export interface ErroDeSala {
  codigo: CodigoErro
  mensagem: string
}

export interface Conexao {
  estado: EstadoConexao
  /** `null` até a primeira projeção chegar. */
  projecao: Projecao | null
  /** Última recusa recebida do servidor, ou `null`. */
  erro: ErroDeSala | null
  enviar(comando: Comando): void
  /** `CONN-06` — sai de vez: invalida o token daquela sala e não reconecta. */
  sair(): void
}

/**
 * Recusas em que insistir não adianta: a sala não existe, acabou, está cheia ou
 * o jogador foi removido. As demais (apelido inválido ou em uso) deixam o socket
 * aberto de propósito, para o jogador tentar outro apelido.
 */
const ERROS_TERMINAIS: readonly CodigoErro[] = [
  'SALA_NAO_ENCONTRADA',
  'SALA_EXPIRADA',
  'SALA_CHEIA',
  'CODIGO_INVALIDO',
  'TOKEN_BANIDO',
]

const ContextoDeConexao = createContext<Conexao | null>(null)

export interface PropsDoProvedor {
  /** Código da sala, já normalizado. */
  codigo: string
  /** Apelido usado na primeira entrada; ignorado quando já há token guardado. */
  apelido: string
  children: ReactNode
}

export function ProvedorDeConexao({ codigo, apelido, children }: PropsDoProvedor) {
  const [estado, setEstado] = useState<EstadoConexao>('conectando')
  const [projecao, setProjecao] = useState<Projecao | null>(null)
  const [erro, setErro] = useState<ErroDeSala | null>(null)

  const sessao = useMemo(() => criarSessao(), [])
  const socketRef = useRef<WebSocket | null>(null)
  // Trocar de apelido depois de `APELIDO_EM_USO` não pode reabrir o socket.
  const apelidoRef = useRef(apelido)
  // Ponto único de "acabou": lido pelo `close` para não reagendar.
  const encerradoRef = useRef(false)

  useEffect(() => {
    apelidoRef.current = apelido
  }, [apelido])

  useEffect(() => {
    const backoff = criarBackoff()
    let ativo = true
    let tentativa: ReturnType<typeof setTimeout> | undefined
    encerradoRef.current = false

    const conectar = () => {
      const socket = new WebSocket(enderecoDaSala(codigo, sessao.ler(codigo)?.token ?? null))
      socketRef.current = socket

      socket.addEventListener('open', () => {
        const token = sessao.ler(codigo)?.token ?? null
        // `CONN-02` — com token o servidor devolve a mesma vaga; sem token, a
        // conexão é uma entrada nova.
        socket.send(
          JSON.stringify(
            token === null
              ? ({ t: 'entrar', apelido: apelidoRef.current } satisfies Comando)
              : ({ t: 'ola', token } satisfies Comando),
          ),
        )
      })

      socket.addEventListener('message', (evento: MessageEvent<unknown>) => {
        const mensagem = interpretar(evento.data)
        if (mensagem === null) return

        if (mensagem.t === 'projecao') {
          setProjecao(mensagem.dados)
          return
        }
        if (mensagem.t === 'entrou') {
          // `CONN-01` — o token é a credencial; guardá-lo é o que torna a
          // reconexão possível. `AJU-03` — o apelido vai junto, para a
          // reentrada ter nome a exibir antes da primeira projeção.
          sessao.guardar(codigo, { token: mensagem.token, apelido: apelidoRef.current })
          backoff.zerar()
          setErro(null)
          setEstado('conectado')
          return
        }

        setErro({ codigo: mensagem.codigo, mensagem: mensagem.mensagem })
        // `AJU-04` — a credencial guardada não vale mais: insistir com ela dá no
        // mesmo, e continuar tentando entraria de novo como jogador novo, sem
        // ninguém pedir. Descartá-la e parar é o que devolve a tela de entrada
        // com o motivo.
        const recusouToken = tokenFoiRecusado(mensagem.codigo)
        if (recusouToken) sessao.apagar(codigo)
        if (recusouToken || ERROS_TERMINAIS.includes(mensagem.codigo)) {
          encerradoRef.current = true
          setEstado('expirada')
        }
      })

      socket.addEventListener('close', () => {
        // O `close` chega depois do fato: quando ele roda, a referência já pode
        // apontar para um socket novo. Só quem ainda é o socket em uso pode
        // limpá-la — do contrário um socket velho fechando deixaria a aplicação
        // sem canal, e todo comando seria descartado em silêncio.
        if (socketRef.current === socket) socketRef.current = null
        if (!ativo || encerradoRef.current) return
        setEstado('reconectando')
        tentativa = setTimeout(conectar, backoff.proximo())
      })
    }

    // `AJU-02` — a tela apagou, o navegador suspendeu a aba e o socket morreu.
    // Ao voltar, esperar o backoff é esperar à toa: a pessoa está olhando.
    const aoVoltarAVista = () => {
      if (!ativo || encerradoRef.current) return
      if (!deveReconectarAoAparecer(!document.hidden, socketRef.current !== null)) return
      clearTimeout(tentativa)
      backoff.zerar()
      conectar()
    }

    conectar()
    document.addEventListener('visibilitychange', aoVoltarAVista)

    return () => {
      ativo = false
      document.removeEventListener('visibilitychange', aoVoltarAVista)
      clearTimeout(tentativa)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [codigo, sessao])

  // Comando enviado com o socket fora do ar é descartado: o servidor é
  // autoritativo e a projeção que chega na reconexão é a verdade (AD-008).
  const enviar = useCallback((comando: Comando) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(comando))
  }, [])

  const sair = useCallback(() => {
    enviar({ t: 'sair' })
    sessao.apagar(codigo)
    encerradoRef.current = true
    socketRef.current?.close()
  }, [codigo, enviar, sessao])

  const valor = useMemo<Conexao>(
    () => ({ estado, projecao, erro, enviar, sair }),
    [estado, projecao, erro, enviar, sair],
  )

  return <ContextoDeConexao.Provider value={valor}>{children}</ContextoDeConexao.Provider>
}

export function useConexao(): Conexao {
  const conexao = useContext(ContextoDeConexao)
  if (conexao === null) throw new Error('useConexao exige <ProvedorDeConexao> acima na árvore')
  return conexao
}

/** A projeção mais recente do servidor — `null` antes da primeira chegar. */
export function useProjecao(): Projecao | null {
  return useConexao().projecao
}

function enderecoDaSala(codigo: string, token: string | null): string {
  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = new URL(
    `${protocolo}//${window.location.host}/api/salas/${encodeURIComponent(codigo)}/ws`,
  )
  // O handshake já barra token banido, antes de aceitar o socket (`CONN-04`).
  if (token !== null) url.searchParams.set('token', token)
  return url.toString()
}

/** Quadro que não é uma `Mensagem` do protocolo é descartado sem derrubar nada. */
function interpretar(dados: unknown): Mensagem | null {
  if (typeof dados !== 'string') return null
  try {
    const bruto: unknown = JSON.parse(dados)
    if (typeof bruto !== 'object' || bruto === null) return null
    const { t } = bruto as { t?: unknown }
    if (t !== 'projecao' && t !== 'entrou' && t !== 'erro') return null
    return bruto as Mensagem
  } catch {
    return null
  }
}
