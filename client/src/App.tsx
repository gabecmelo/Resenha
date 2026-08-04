import { useMemo, useState } from 'react'
import { ProvedorDeConexao, useConexao } from './estado/conexao'
import { codigoDaUrl } from './estado/entrada'
import { Inicio } from './telas/Inicio'

/**
 * A raiz do app.
 *
 * Não existe roteador nem estado de navegação próprio: enquanto não há sala, a
 * tela é o Início; a partir da primeira projeção quem manda é `sala.fase`
 * (AD-008). Cada tentativa de entrar remonta o provedor, então "Entrar" sempre
 * significa uma conexão nova, com o apelido que está no campo agora.
 */

interface Tentativa {
  codigo: string
  apelido: string
  /** Muda a cada tentativa e força o provedor a reconectar do zero. */
  numero: number
}

export function App() {
  const codigoDoLink = useMemo(() => codigoDaUrl(window.location.pathname), [])
  const [tentativa, setTentativa] = useState<Tentativa | null>(null)

  const entrar = (codigo: string, apelido: string) => {
    setTentativa((anterior) => ({ codigo, apelido, numero: (anterior?.numero ?? 0) + 1 }))
  }

  if (tentativa === null) {
    return (
      <Inicio
        codigoInicial={codigoDoLink}
        apelidoInicial=""
        erro={null}
        conectando={false}
        aoDesistir={() => undefined}
        aoEntrar={entrar}
      />
    )
  }

  return (
    <ProvedorDeConexao
      key={`${tentativa.codigo}:${tentativa.numero}`}
      codigo={tentativa.codigo}
      apelido={tentativa.apelido}
    >
      <Sala tentativa={tentativa} aoDesistir={() => setTentativa(null)} aoEntrar={entrar} />
    </ProvedorDeConexao>
  )
}

function Sala({
  tentativa,
  aoDesistir,
  aoEntrar,
}: {
  tentativa: Tentativa
  aoDesistir(): void
  aoEntrar(codigo: string, apelido: string): void
}) {
  const { estado, projecao, erro } = useConexao()

  // Enquanto não chegou projeção, quem está no ar é o Início: é lá que a
  // conexão em andamento e as recusas de entrada aparecem.
  if (projecao === null) {
    return (
      <Inicio
        codigoInicial={tentativa.codigo}
        apelidoInicial={tentativa.apelido}
        erro={erro}
        conectando={estado === 'conectando' || estado === 'reconectando'}
        aoDesistir={aoDesistir}
        aoEntrar={aoEntrar}
      />
    )
  }

  return null
}
