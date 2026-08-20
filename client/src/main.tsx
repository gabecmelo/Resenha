import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { SeloDeBeta } from './componentes/SeloDeBeta'
import './index.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('elemento #root não encontrado')

createRoot(raiz).render(
  <StrictMode>
    <App />
    {/* Fora da árvore de telas de propósito: o selo é do ambiente, não da tela. */}
    <SeloDeBeta />
  </StrictMode>,
)
