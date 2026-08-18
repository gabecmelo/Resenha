import { useEffect, useState } from 'react'
import { ativarSom, somEstaAtivo } from '../sons'

export function SomToggle() {
  const [ativo, setAtivo] = useState(somEstaAtivo())

  useEffect(() => {
    // Sincronizar estado inicial caso a inicialização global aconteça depois
    const verificar = setInterval(() => {
      const atual = somEstaAtivo()
      if (atual !== ativo) {
        setAtivo(atual)
      }
    }, 1000)
    return () => clearInterval(verificar)
  }, [ativo])

  return (
    <button
      type="button"
      aria-label={ativo ? 'Desativar sons' : 'Ativar sons'}
      onClick={() => {
        const novo = !ativo
        ativarSom(novo)
        setAtivo(novo)
      }}
      className={`flex h-11 w-9 flex-none cursor-pointer items-center justify-center rounded-chip text-[17px] hover:text-texto ${ativo ? 'text-acento' : 'text-texto-3'}`}
    >
      <span aria-hidden="true" className={ativo ? '' : 'line-through decoration-2'}>
        ♪
      </span>
    </button>
  )
}
