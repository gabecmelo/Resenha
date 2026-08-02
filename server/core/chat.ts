import type { EstadoSala, JogadorId, MensagemChat, Resultado } from '../../shared/protocolo'

/** `CHAT-01` */
export const CHAT_MAX_CARACTERES = 300
/** `CHAT-05` */
export const CHAT_MAX_MENSAGENS = 200
/** `CHAT-02` — no máximo 5 mensagens por jogador a cada 5 segundos. */
export const CHAT_JANELA_MS = 5_000
export const CHAT_MAX_POR_JANELA = 5

/**
 * `CHAT-01`, `CHAT-02`. A recusa é devolvida ao chamador, que a entrega apenas
 * ao socket autor — mensagem descartada não chega a mais ninguém.
 */
export function enviar(
  estado: EstadoSala,
  autorId: JogadorId,
  texto: string,
  agora: number,
): Resultado {
  if (texto.length > CHAT_MAX_CARACTERES) return { ok: false, erro: 'CHAT_MUITO_LONGO' }

  const conteudo = texto.trim()
  if (conteudo.length === 0) return { ok: false, erro: 'CHAT_VAZIO' }

  const naJanela = estado.chat.filter(
    (m) => m.tipo === 'jogador' && m.autorId === autorId && m.em > agora - CHAT_JANELA_MS,
  ).length
  if (naJanela >= CHAT_MAX_POR_JANELA) return { ok: false, erro: 'CHAT_LIMITE_DE_TAXA' }

  acrescentar(estado, { tipo: 'jogador', autorId, texto: conteudo, em: agora })
  return { ok: true, valor: undefined }
}

/** `CHAT-03` — anúncio da própria sala; não pertence a nenhum jogador. */
export function registrarSistema(estado: EstadoSala, texto: string, agora: number): void {
  acrescentar(estado, { tipo: 'sistema', texto, em: agora })
}

/** `CHAT-05` — o histórico é um ring buffer: as mais antigas saem. */
function acrescentar(estado: EstadoSala, mensagem: MensagemChat): void {
  estado.chat.push(mensagem)
  if (estado.chat.length > CHAT_MAX_MENSAGENS) {
    estado.chat.splice(0, estado.chat.length - CHAT_MAX_MENSAGENS)
  }
}
