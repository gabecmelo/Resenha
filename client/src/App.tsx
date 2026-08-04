import { useMemo, useState } from 'react'
import { ProvedorDeConexao, useConexao } from './estado/conexao'
import { codigoDaUrl } from './estado/entrada'
import { Encerrada } from './telas/Encerrada'
import { Escrita } from './telas/Escrita'
import { Conectando, ConexaoEncerrada, Reconectando } from './telas/EstadosGlobais'
import { Inicio } from './telas/Inicio'
import { Jogo } from './telas/Jogo'
import { Lobby } from './telas/Lobby'

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
  const { estado, projecao, erro, enviar, sair } = useConexao()

  const deixarSala = () => {
    sair()
    aoDesistir()
  }

  // Já dentro da sala, o estado da conexão vira tela: a mesa que está no ar
  // seria uma foto velha, e a vaga continua guardada (`CONN-03`).
  if (projecao !== null) {
    if (estado === 'expirada') {
      return (
        <ConexaoEncerrada
          codigo={tentativa.codigo}
          erro={erro?.codigo}
          aoVoltar={deixarSala}
        />
      )
    }
    if (estado === 'reconectando') return <Reconectando />
  }

  // Antes da primeira projeção: a conexão em andamento tem tela própria e as
  // recusas de entrada voltam para o Início, onde o formulário está.
  if (projecao === null) {
    if (erro === null && estado !== 'expirada') {
      return <Conectando codigo={tentativa.codigo} />
    }
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

  // A tela exibida deriva da fase que veio na projeção — não existe rota nem
  // estado de navegação próprio (AD-008).
  switch (projecao.sala.fase) {
    case 'lobby':
      return <Lobby projecao={projecao} enviar={enviar} aoSair={deixarSala} />
    case 'escrita':
      return <Escrita projecao={projecao} enviar={enviar} aoSair={deixarSala} />
    case 'jogo':
      return <Jogo projecao={projecao} enviar={enviar} aoSair={deixarSala} />
    case 'encerrada':
      return <Encerrada projecao={projecao} enviar={enviar} aoSair={deixarSala} />
  }
}
