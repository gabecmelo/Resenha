import { useEffect, useMemo, useState } from 'react'
import { depositoDoNavegador } from '../estado/sessao'
import { type Tema, alternar, guardarTema, lerTema, temaEfetivo } from '../estado/tema'

const CONSULTA_ESCURO = '(prefers-color-scheme: dark)'

export interface PropsDoAlternador {
  className?: string
}

/**
 * Troca entre tema claro e escuro. O rótulo nomeia para onde vai — no claro
 * lê-se "Tema escuro" —, que é como o handoff desenhou.
 *
 * A escolha vira `data-tema` na raiz do documento: os tokens de `index.css` já
 * carregam os dois valores e o atributo decide qual vale.
 */
export function AlternadorDeTema({ className = '' }: PropsDoAlternador) {
  const deposito = useMemo(() => depositoDoNavegador(), [])
  const [escolhido, setEscolhido] = useState<Tema | null>(() => lerTema(deposito))
  const [prefereEscuro, setPrefereEscuro] = useState(
    () => window.matchMedia(CONSULTA_ESCURO).matches,
  )

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_ESCURO)
    const aoTrocar = (evento: MediaQueryListEvent) => setPrefereEscuro(evento.matches)
    consulta.addEventListener('change', aoTrocar)
    return () => consulta.removeEventListener('change', aoTrocar)
  }, [])

  const atual = temaEfetivo(escolhido, prefereEscuro)
  const proximo = alternar(atual)

  useEffect(() => {
    document.documentElement.dataset.tema = atual
  }, [atual])

  return (
    <button
      type="button"
      onClick={() => {
        guardarTema(deposito, proximo)
        setEscolhido(proximo)
      }}
      className={`min-h-11 cursor-pointer px-1 text-apoio font-medium text-texto-2 hover:text-texto ${className}`}
    >
      Tema {proximo}
    </button>
  )
}
