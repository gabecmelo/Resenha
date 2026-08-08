import { useMemo, useState } from 'react'
import { ProvedorDeConexao, useConexao } from './estado/conexao'
import { caminhoDaSala, codigoDaUrl } from './estado/entrada'
import { criarSessao, reentradaAutomatica } from './estado/sessao'
import { Encerrada } from './telas/Encerrada'
import { Escrita } from './telas/Escrita'
import { Conectando, ConexaoEncerrada, Reconectando } from './telas/EstadosGlobais'
import { Inicio } from './telas/Inicio'
import { Jogo } from './telas/Jogo'
import { Lobby } from './telas/Lobby'

/**
 * A raiz do app.
 *
 * NÃ£o existe roteador nem estado de navegaÃ§Ã£o prÃ³prio: enquanto nÃ£o hÃ¡ sala, a
 * tela Ã© o InÃ­cio; a partir da primeira projeÃ§Ã£o quem manda Ã© `sala.fase`
 * (AD-008). Cada tentativa de entrar remonta o provedor, entÃ£o "Entrar" sempre
 * significa uma conexÃ£o nova, com o apelido que estÃ¡ no campo agora.
 *
 * `AJU-01` â€” quando o cÃ³digo estÃ¡ na URL e existe sessÃ£o guardada para aquela
 * sala, a primeira tentativa jÃ¡ nasce pronta: o formulÃ¡rio nunca chega a
 * aparecer.
 *
 * `AJU-33` â€” e o cÃ³digo sÃ³ estÃ¡ na URL para todo mundo porque entrar numa sala,
 * por qualquer caminho, escreve o endereÃ§o dela aqui.
 */

interface Tentativa {
  codigo: string
  apelido: string
  /** Muda a cada tentativa e forÃ§a o provedor a reconectar do zero. */
  numero: number
}

export import { inicializarAudio, ativarSom, somEstaAtivo } from './sons';
function App() {
  useEffect(() => { const handleFirstClick = () => { inicializarAudio(); document.removeEventListener('click', handleFirstClick); }; document.addEventListener('click', handleFirstClick); return () => document.removeEventListener('click', handleFirstClick); }, []);
  const codigoDoLink = useMemo(() => codigoDaUrl(window.location.pathname), [])
  const [tentativa, setTentativa] = useState<Tentativa | null>(() => {
    const volta = reentradaAutomatica(codigoDoLink, criarSessao())
    return volta === null ? null : { ...volta, numero: 0 }
  })

  const entrar = (codigo: string, apelido: string) => {
    irPara(caminhoDaSala(codigo))
    setTentativa((anterior) => ({ codigo, apelido, numero: (anterior?.numero ?? 0) + 1 }))
  }

  const desistir = () => {
    irPara(caminhoDaSala(null))
    setTentativa(null)
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
      <Sala tentativa={tentativa} aoDesistir={desistir} aoEntrar={entrar} />
    </ProvedorDeConexao>
  )
}

/**
 * `AJU-33` â€” troca o endereÃ§o exibido sem recarregar a pÃ¡gina: o socket, a
 * projeÃ§Ã£o e o estado do React seguem intactos. Ã‰ `replaceState` de propÃ³sito â€”
 * o app nÃ£o tem histÃ³rico de navegaÃ§Ã£o para o botÃ£o "voltar" percorrer.
 */
function irPara(caminho: string) {
  if (window.location.pathname !== caminho) window.history.replaceState(null, '', caminho)
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

  // JÃ¡ dentro da sala, o estado da conexÃ£o vira tela: a mesa que estÃ¡ no ar
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

  // Antes da primeira projeÃ§Ã£o: a conexÃ£o em andamento tem tela prÃ³pria e as
  // recusas de entrada voltam para o InÃ­cio, onde o formulÃ¡rio estÃ¡.
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

  // A tela exibida deriva da fase que veio na projeÃ§Ã£o â€” nÃ£o existe rota nem
  // estado de navegaÃ§Ã£o prÃ³prio (AD-008).
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

