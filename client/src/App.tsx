import { useMemo, useState, useEffect } from 'react'
import { ProvedorDeConexao, useConexao } from './estado/conexao'
import { caminhoDaSala, codigoDaUrl } from './estado/entrada'
import { criarSessao, reentradaAutomatica } from './estado/sessao'
import { CartasEncerrada } from './telas/CartasEncerrada'
import { CartasJogo } from './telas/CartasJogo'
import { Encerrada } from './telas/Encerrada'
import { EspiaoAguardando } from './telas/EspiaoAguardando'
import { EspiaoEncerrada } from './telas/EspiaoEncerrada'
import { EspiaoJogo } from './telas/EspiaoJogo'
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
 *
 * `AJU-01` — quando o código está na URL e existe sessão guardada para aquela
 * sala, a primeira tentativa já nasce pronta: o formulário nunca chega a
 * aparecer.
 *
 * `AJU-33` — e o código só está na URL para todo mundo porque entrar numa sala,
 * por qualquer caminho, escreve o endereço dela aqui.
 */

interface Tentativa {
  codigo: string
  apelido: string
  /** Muda a cada tentativa e força o provedor a reconectar do zero. */
  numero: number
}

import { inicializarAudio } from './sons';
export function App() {
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
 * `AJU-33` — troca o endereço exibido sem recarregar a página: o socket, a
 * projeção e o estado do React seguem intactos. É `replaceState` de propósito —
 * o app não tem histórico de navegação para o botão "voltar" percorrer.
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
  //
  // `AD-014` — nas fases `jogo`/`encerrada`, Espião tem suas próprias telas: o
  // segundo eixo de decisão é `sala.jogoId`. Dentro de `jogo`, Espião ainda se
  // divide entre "aguardando prontos" e a rodada, conforme
  // `jogo.espiao.rodadaIniciada` — sub-estados que vivem dentro do próprio
  // `EstadoEspiao`, não como fases novas no enum compartilhado.
  switch (projecao.sala.fase) {
    case 'lobby':
      return <Lobby projecao={projecao} enviar={enviar} aoSair={deixarSala} />
    case 'escrita':
      return <Escrita projecao={projecao} enviar={enviar} aoSair={deixarSala} />
    case 'jogo':
      if (projecao.sala.jogoId === 'cartas-contra-a-turma') {
        return <CartasJogo projecao={projecao} enviar={enviar} aoSair={deixarSala} />
      }
      if (projecao.sala.jogoId === 'espiao') {
        return projecao.jogo?.espiao?.rodadaIniciada ? (
          <EspiaoJogo projecao={projecao} enviar={enviar} aoSair={deixarSala} />
        ) : (
          <EspiaoAguardando projecao={projecao} enviar={enviar} aoSair={deixarSala} />
        )
      }
      return <Jogo projecao={projecao} enviar={enviar} aoSair={deixarSala} />
    case 'encerrada':
      if (projecao.sala.jogoId === 'cartas-contra-a-turma') {
        return <CartasEncerrada projecao={projecao} enviar={enviar} aoSair={deixarSala} />
      }
      if (projecao.sala.jogoId === 'espiao') {
        return <EspiaoEncerrada projecao={projecao} enviar={enviar} aoSair={deixarSala} />
      }
      return <Encerrada projecao={projecao} enviar={enviar} aoSair={deixarSala} />
  }
}

