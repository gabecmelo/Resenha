import type { ReactNode } from 'react'
import type { Cor } from '../../../shared/protocolo'
import { MarcadorDeJogador } from './MarcadorDeJogador'

export interface PropsDaFicha {
  apelido: string
  cor: Cor
  ehVoce?: boolean
  ehHost?: boolean
  conectado?: boolean
  descobriu?: boolean
  pronto?: boolean
  ehAVezDele?: boolean
  /** Entra vazio para quem não é host — ação de host não existe na tela dele (`VIS-04`). */
  acoes?: ReactNode
}

/**
 * Uma linha da lista de jogadores.
 *
 * O estado vem de texto e opacidade — nunca de um ícone colorido solto. Só um
 * rótulo de situação aparece por vez; a ordem abaixo é a de urgência para quem
 * está lendo a lista.
 */
export function FichaDeJogador({
  apelido,
  cor,
  ehVoce = false,
  ehHost = false,
  conectado = true,
  descobriu = false,
  pronto = false,
  ehAVezDele = false,
  acoes,
}: PropsDaFicha) {
  const situacao = rotuloDeSituacao({ ehAVezDele, conectado, descobriu, pronto })

  return (
    <li
      className={`flex items-center gap-3 border-t border-linha-suave px-2 py-3 ${
        ehAVezDele ? 'rounded-painel bg-acento-suave' : ''
      } ${!conectado ? 'opacity-55' : ''}`}
    >
      <MarcadorDeJogador apelido={apelido} cor={cor} tamanho="grande" />
      <span
        className={`min-w-0 flex-1 truncate text-corpo ${
          ehVoce || ehAVezDele ? 'font-semibold' : 'font-medium'
        } ${descobriu ? 'text-texto-2 line-through decoration-linha' : 'text-texto'}`}
      >
        {apelido}
        {ehVoce && <span className="text-miudo font-medium text-acento"> · você</span>}
      </span>
      {ehHost && (
        <span className="shrink-0 rounded-pilula bg-superficie-2 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-texto-2 uppercase">
          host
        </span>
      )}
      {situacao !== null && (
        <span
          className={`shrink-0 text-miudo ${
            situacao.destacado ? 'font-semibold text-acento' : 'text-texto-2'
          }`}
        >
          {situacao.texto}
        </span>
      )}
      {acoes}
    </li>
  )
}

function rotuloDeSituacao({
  ehAVezDele,
  conectado,
  descobriu,
  pronto,
}: {
  ehAVezDele: boolean
  conectado: boolean
  descobriu: boolean
  pronto: boolean
}): { texto: string; destacado: boolean } | null {
  if (ehAVezDele) return { texto: 'é a vez', destacado: true }
  if (!conectado) return { texto: 'desconectado', destacado: false }
  if (descobriu) return { texto: 'já descobriu', destacado: false }
  if (pronto) return { texto: 'pronto', destacado: true }
  return null
}
