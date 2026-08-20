import { useEffect, useMemo, useState } from 'react'
import { depositoDoNavegador } from '../estado/sessao'
import { type Tema, alternar, guardarTema, lerTema, temaEfetivo } from '../estado/tema'

const CONSULTA_ESCURO = '(prefers-color-scheme: dark)'

/**
 * Troca entre tema claro e escuro.
 *
 * `AJU-28` — é um ícone, não um texto: o cabeçalho é estreito e "Tema escuro"
 * empurrava o código da sala para fora em 360px. O desenho mostra para onde a
 * troca leva — lua no claro, sol no escuro — e o rótulo acessível diz o mesmo em
 * palavras, que é o que o leitor de tela anuncia.
 *
 * A escolha vira `data-tema` na raiz do documento: os tokens de `index.css` já
 * carregam os dois valores e o atributo decide qual vale.
 */
export function AlternadorDeTema() {
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
      aria-label={`Tema ${proximo}`}
      title={`Tema ${proximo}`}
      onClick={() => {
        guardarTema(deposito, proximo)
        setEscolhido(proximo)
      }}
      className="flex h-11 w-9 flex-none cursor-pointer items-center justify-center rounded-chip text-texto-3 hover:text-texto"
    >
      {proximo === 'escuro' ? <Lua /> : <Sol />}
    </button>
  )
}

const TRACO = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function Lua() {
  return (
    <svg {...TRACO}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

function Sol() {
  return (
    <svg {...TRACO}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
