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
      className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-controle text-[18px] text-texto-2 hover:bg-superficie-2 hover:text-texto focus:bg-superficie-2 focus:outline-none"
    >
      {ativo ? '🔊' : '🔇'}
    </button>
  )
}
