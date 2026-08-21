import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Ambiente,
  CodigoErro,
  Comando,
  JogadorId,
  Projecao,
} from '../../../../shared/protocolo'
import type { ComandoDeJogo } from '../../../../shared/jogos/contrato'
import { type MesaLocal, cobrarPrazos, enviar as despacharNoMotor, projetar } from '../../passaejoga/motor'
import { acabou, avancar, criarPassagem, deQuemE, revelar } from '../../passaejoga/passagem'
import { CartasEncerrada } from '../CartasEncerrada'
import { CartasJogo } from '../CartasJogo'
import { DedoEncerrada } from '../DedoEncerrada'
import { DedoJogo } from '../DedoJogo'
import { Encerrada } from '../Encerrada'
import { EnigmasEncerrada } from '../EnigmasEncerrada'
import { EnigmasJogo } from '../EnigmasJogo'
import { EspiaoAguardando } from '../EspiaoAguardando'
import { EspiaoEncerrada } from '../EspiaoEncerrada'
import { EspiaoJogo } from '../EspiaoJogo'
import { Escrita } from '../Escrita'
import { Jogo } from '../Jogo'
import { BarraDePassar, Passagem } from './Passagem'

/**
 * A partida local em andamento: o que na sala online é o `Sala` do `App`.
 *
 * Ela faz as três coisas que lá são do socket e do Durable Object, e nada além
 * disso:
 *
 * 1. **Despacha.** `enviar` vai ao motor, que chama o mesmo `reduzir` do
 *    servidor. Recusa não derruba a partida: vira frase na tela (`PJ-13`).
 * 2. **Conta o tempo.** Não há alarme no navegador, então o vencimento é
 *    derivado do relógio a cada segundo e a cada volta da aba (`PJ-14`).
 * 3. **Passa o aparelho.** Quando a fase tem segredo por jogador, a volta de
 *    passagem se abre sozinha e a tela do jogo só aparece depois do toque de
 *    quem recebeu (`PJ-17`…`PJ-19`).
 *
 * A escolha de tela é a mesma do `App` — fase, depois `jogoId` (`AD-008`,
 * `AD-014`). Duas tabelas de decisão pro mesmo enum divergiriam na primeira
 * fase nova.
 */
export function Partida({
  mesa,
  aoMudar,
  aoSair,
}: {
  mesa: MesaLocal
  aoMudar(mesa: MesaLocal): void
  aoSair(): void
}) {
  const [recusa, setRecusa] = useState<string | null>(null)
  const projecao = useMemo(() => projetar(mesa), [mesa])

  /*
    A mesa mais recente, fora do ciclo de render.

    Uma tela pode disparar dois comandos no mesmo toque — a Escrita entrega a
    carta e marca pronto de uma vez —, e o segundo tem que sair de cima do
    resultado do primeiro. Com a mesa vinda só das props, os dois sairiam da
    mesma foto e o segundo apagaria o primeiro: na sala online isso não
    acontece porque quem encadeia é o servidor.
  */
  const ultima = useRef(mesa)
  useEffect(() => {
    ultima.current = mesa
  }, [mesa])

  /*
    `PJ-14` — o prazo é derivado, nunca contado. A batida de um segundo só
    serve pra **olhar** o relógio; quem decide o vencimento é a comparação com
    o instante absoluto. Por isso a aba dormir dez minutos e voltar dispara uma
    vez só, e não uma por segundo perdido.
  */
  useEffect(() => {
    const bater = () => {
      const depois = cobrarPrazos(mesa, ambiente())
      if (depois !== mesa) aoMudar(depois)
    }
    const batida = window.setInterval(bater, 1000)
    document.addEventListener('visibilitychange', bater)
    return () => {
      window.clearInterval(batida)
      document.removeEventListener('visibilitychange', bater)
    }
  }, [mesa, aoMudar])

  /*
    A volta abre e fecha com a fase, não com um comando de tela: assim uma
    recusa, um recarregamento ou um prazo vencido no meio do caminho não deixam
    o aparelho preso numa volta que o jogo já encerrou. Como as duas condições
    olham `mesa.passagem`, rodar de novo não faz nada — o efeito é idempotente.
  */
  useEffect(() => {
    const fila = filaDaVolta(projecao)
    if (fila === null) {
      if (mesa.passagem !== null) aoMudar({ ...mesa, passagem: null })
      return
    }
    if (mesa.passagem === null) {
      const nova = criarPassagem(fila)
      aoMudar({ ...mesa, passagem: nova, aparelhoCom: deQuemE(nova) ?? mesa.aparelhoCom })
    }
  }, [projecao, mesa, aoMudar])

  const enviar = (comando: Comando) => {
    if (comando.t === 'sair') {
      aoSair()
      return
    }
    // Sem sala não há chat, convite nem host pra transferir: os comandos do
    // `core` simplesmente não existem aqui, e recusá-los com erro seria
    // inventar um problema que a mesa não tem.
    if (!eDoJogo(comando)) return

    const resultado = despacharNoMotor(ultima.current, comando, ambiente())
    if (!resultado.ok) {
      setRecusa(FRASE_DA_RECUSA[resultado.erro] ?? 'Essa não deu pra fazer agora.')
      return
    }
    setRecusa(null)
    ultima.current = resultado.valor
    aoMudar(resultado.valor)
  }

  const passagem = mesa.passagem
  const emVolta = passagem !== null && !acabou(passagem)
  const deQuem = passagem === null ? null : deQuemE(passagem)

  const abrirOSegredo = () => {
    if (passagem === null) return
    aoMudar({ ...mesa, passagem: revelar(passagem) })
  }

  /*
    `PJ-19` — esconder e passar é **um** despacho: `avancar` já devolve a
    passagem com `revelado` em `false`. Zerar num segundo passo abriria a
    janela de um quadro em que o segredo de quem acabou de esconder aparece pra
    quem está recebendo.
  */
  const esconderEPassar = () => {
    if (passagem === null) return
    const adiante = avancar(passagem)
    aoMudar({
      ...mesa,
      passagem: adiante,
      aparelhoCom: deQuemE(adiante) ?? mesa.aparelhoCom,
    })
  }

  if (emVolta && !passagem.revelado && deQuem !== null) {
    const jogador = projecao.jogadores.find((quem) => quem.id === deQuem)
    if (jogador !== undefined) {
      return (
        <Passagem
          jogoId={mesa.jogoId}
          jogador={jogador}
          posicao={passagem.posicao + 1}
          total={passagem.fila.length}
          instrucao={INSTRUCAO_DA_VOLTA[projecao.sala.fase] ?? 'É a vez dele no aparelho.'}
          aoRevelar={abrirOSegredo}
          aoSair={aoSair}
        />
      )
    }
  }

  return (
    <>
      <TelaDoJogo projecao={projecao} enviar={enviar} aoSair={aoSair} />

      {emVolta && passagem.revelado && (
        <BarraDePassar rotulo="Esconder e passar" aoPassar={esconderEPassar} />
      )}

      {recusa !== null && <Recusa texto={recusa} aoFechar={() => setRecusa(null)} />}
    </>
  )
}

/**
 * A mesma tabela de decisão do `App`: a fase manda, e dentro dela o `jogoId`
 * (`AD-008`, `AD-014`). As telas são as mesmas dos dois modos — o modo local
 * não tem telas paralelas, tem as mesmas telas com o aparelho passando.
 */
function TelaDoJogo({
  projecao,
  enviar,
  aoSair,
}: {
  projecao: Projecao
  enviar(comando: Comando): void
  aoSair(): void
}) {
  switch (projecao.sala.fase) {
    case 'lobby':
    case 'escrita':
      return <Escrita projecao={projecao} enviar={enviar} aoSair={aoSair} />
    case 'jogo':
      if (projecao.sala.jogoId === 'cartas-contra-a-turma') {
        return <CartasJogo projecao={projecao} enviar={enviar} aoSair={aoSair} />
      }
      if (projecao.sala.jogoId === 'dedo-na-cara') {
        return <DedoJogo projecao={projecao} enviar={enviar} aoSair={aoSair} />
      }
      if (projecao.sala.jogoId === 'enigmas-sinistros') {
        return <EnigmasJogo projecao={projecao} enviar={enviar} aoSair={aoSair} />
      }
      if (projecao.sala.jogoId === 'espiao') {
        return projecao.jogo?.espiao?.rodadaIniciada ? (
          <EspiaoJogo projecao={projecao} enviar={enviar} aoSair={aoSair} />
        ) : (
          <EspiaoAguardando projecao={projecao} enviar={enviar} aoSair={aoSair} />
        )
      }
      return <Jogo projecao={projecao} enviar={enviar} aoSair={aoSair} />
    case 'encerrada':
      if (projecao.sala.jogoId === 'cartas-contra-a-turma') {
        return <CartasEncerrada projecao={projecao} enviar={enviar} aoSair={aoSair} />
      }
      if (projecao.sala.jogoId === 'dedo-na-cara') {
        return <DedoEncerrada projecao={projecao} enviar={enviar} aoSair={aoSair} />
      }
      if (projecao.sala.jogoId === 'enigmas-sinistros') {
        return <EnigmasEncerrada projecao={projecao} enviar={enviar} aoSair={aoSair} />
      }
      if (projecao.sala.jogoId === 'espiao') {
        return <EspiaoEncerrada projecao={projecao} enviar={enviar} aoSair={aoSair} />
      }
      return <Encerrada projecao={projecao} enviar={enviar} aoSair={aoSair} />
  }
}

/**
 * Quando a fase tem segredo por jogador, e de quem é a volta (`PJ-21`).
 *
 * A escrita é o caso claro: cada um escreve a carta de alguém sem ninguém ver
 * (`PJ-29`). As fases sem segredo devolvem `null` e o aparelho fica numa tela
 * só, parado na mesa.
 */
function filaDaVolta(projecao: Projecao): JogadorId[] | null {
  if (projecao.sala.fase !== 'escrita') return null
  return projecao.jogadores
    .filter((jogador) => jogador.situacao === 'ativo')
    .map((jogador) => jogador.id)
}

const INSTRUCAO_DA_VOLTA: Partial<Record<Projecao['sala']['fase'], string>> = {
  escrita: 'Ele vai escrever uma carta que ninguém mais pode ver.',
}

/** `PJ-13` — a recusa vira frase e some; a partida segue de pé atrás dela. */
function Recusa({ texto, aoFechar }: { texto: string; aoFechar(): void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <button
        type="button"
        onClick={aoFechar}
        className="w-full max-w-[520px] cursor-pointer rounded-papel border border-risco bg-superficie px-3.5 py-3 text-left text-apoio text-texto shadow-[var(--sombra-botao)]"
      >
        <span aria-hidden="true" className="text-risco">
          ▲{' '}
        </span>
        {texto}
      </button>
    </div>
  )
}

const FRASE_DA_RECUSA: Partial<Record<CodigoErro, string>> = {
  FASE_INVALIDA: 'Isso não vale nesta parte da rodada.',
  COMANDO_INVALIDO: 'Isso não vale agora.',
  JOGADOR_NAO_ENCONTRADO: 'Essa pessoa não está mais na roda.',
  JOGADORES_INSUFICIENTES: 'Esse jogo pede mais gente na roda.',
  PRONTOS_PENDENTES: 'Ainda falta gente ficar pronta.',
  CARTA_INVALIDA: 'Essa carta não serve — veja o tamanho.',
  SEM_AUTORIDADE: 'Isso é de quem está com o aparelho.',
}

/** O que o motor aceita: tudo que não é do `core` (`shared/jogos/contrato.ts`). */
function eDoJogo(comando: Comando): comando is ComandoDeJogo {
  return !DO_CORE.has(comando.t)
}

const DO_CORE = new Set<Comando['t']>([
  'ola',
  'entrar',
  'configurar',
  'iniciar',
  'expulsar',
  'transferirHost',
  'chat',
  'sair',
  'trocarJogo',
])

function ambiente(): Ambiente {
  return { agora: Date.now(), aleatorio: Math.random }
}
