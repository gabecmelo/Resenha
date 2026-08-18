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
 * **Cor, inicial, apelido e glifo, os quatro sempre.** A cor nunca é o único
 * sinal: cada estado leva um glifo e a palavra escrita, para quem não distingue
 * matiz e para tela lavada de sol. Só um rótulo de situação aparece por vez, e
 * a ordem abaixo é a de urgência para quem está lendo a lista.
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
      className={`flex min-h-12 items-center gap-2.5 px-2 py-2.5 ${
        ehAVezDele
          ? 'rounded-botao border border-acento bg-acento-suave'
          : 'linha-valor'
      } ${!conectado ? 'opacity-55' : ''}`}
    >
      <MarcadorDeJogador apelido={apelido} cor={cor} tamanho="grande" />
      <span
        className={`min-w-0 flex-1 truncate text-corpo ${
          ehVoce || ehAVezDele ? 'font-semibold' : 'font-medium'
        } ${descobriu ? 'text-texto-2' : 'text-texto'}`}
      >
        {apelido}
        {ehVoce && <span className="text-miudo font-semibold text-texto-3"> · você</span>}
      </span>
      {ehHost && (
        <span className="flex-none font-mono text-compacto-apoio text-texto-3 whitespace-nowrap">
          <span aria-hidden="true">★</span> comanda
        </span>
      )}
      {situacao !== null && (
        <span
          className={`flex-none font-mono text-compacto-apoio whitespace-nowrap ${situacao.cor}`}
        >
          <span aria-hidden="true">{situacao.glifo}</span> {situacao.texto}
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
}): { glifo: string; texto: string; cor: string } | null {
  if (ehAVezDele) return { glifo: '◆', texto: 'é a vez', cor: 'text-acento' }
  if (!conectado) return { glifo: '○', texto: 'caiu', cor: 'text-texto-3' }
  if (descobriu) return { glifo: '✓', texto: 'achou', cor: 'text-pronto' }
  if (pronto) return { glifo: '✓', texto: 'pronto', cor: 'text-pronto' }
  return null
}
