import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Ambiente,
  CodigoErro,
  Comando,
  JogadorId,
  Projecao,
} from '../../../../shared/protocolo'
import type { ComandoDeJogo } from '../../../../shared/jogos/contrato'
import {
  type MesaLocal,
  cobrarPrazos,
  comecarRodada,
  enviar as despacharNoMotor,
  projetar,
} from '../../passaejoga/motor'
import { acabou, avancar, criarPassagem, deQuemE, revelar } from '../../passaejoga/passagem'
import { CartasEncerrada } from '../CartasEncerrada'
import { CartasJogo } from '../CartasJogo'
import { DedoEncerrada } from '../DedoEncerrada'
import { DedoJogo } from '../DedoJogo'
import { Encerrada } from '../Encerrada'
import { EnigmasEncerrada } from '../EnigmasEncerrada'
import { EnigmasJogo } from '../EnigmasJogo'
import { EspiaoEncerrada } from '../EspiaoEncerrada'
import { EspiaoJogo } from '../EspiaoJogo'
import { Escrita } from '../Escrita'
import { Jogo } from '../Jogo'
import { EspiaoPapel, EspiaoTodosProntos } from './EspiaoVolta'
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
  const volta = voltaDaFase(projecao, mesa.aparelhoCom)

  useEffect(() => {
    if (volta === null) {
      if (mesa.passagem !== null) aoMudar({ ...mesa, passagem: null })
      return
    }
    // O aparelho **não** troca de mão ao abrir a volta, só ao revelar: entre
    // um anúncio e o toque de quem recebeu, quem projeta ainda é quem estava
    // com o celular — e o anúncio não mostra nada de ninguém.
    if (mesa.passagem === null) aoMudar({ ...mesa, passagem: criarPassagem(volta.fila) })
  }, [volta, mesa, aoMudar])

  /*
    Fora das voltas de segredo o aparelho fica na mesa, mas ainda é de alguém:
    é `aparelhoCom` que decide de quem é o comando (`PJ-16`). Quando o jogo
    espera um gesto de cada um — o dedo do Dedo na Cara —, quem "está com o
    aparelho" é o próximo que ainda não fez o seu.
  */
  useEffect(() => {
    if (mesa.passagem !== null) return
    const dono = donoDoAparelho(projecao, mesa.aparelhoCom)
    if (dono !== mesa.aparelhoCom) aoMudar({ ...mesa, aparelhoCom: dono })
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

  /**
   * Um comando de outra pessoa que não a que está segurando o celular.
   *
   * Existe por causa do Enigmas em voz alta (`PJ-23`): quem desatou contou a
   * versão dele **falando**, e o aparelho estava — e continua — na mão de quem
   * narra. O gesto é de quem falou; o toque é de quem ouviu. Registrar em nome
   * do narrador seria mentir pro placar.
   *
   * O aparelho não muda de dono por causa disso: ele volta pra mesma mão.
   */
  const enviarComo = (autorId: JogadorId, comando: Comando) => {
    if (!eDoJogo(comando)) return
    const antes = ultima.current
    const resultado = despacharNoMotor({ ...antes, aparelhoCom: autorId }, comando, ambiente())
    if (!resultado.ok) {
      setRecusa(FRASE_DA_RECUSA[resultado.erro] ?? 'Essa não deu pra fazer agora.')
      return
    }
    setRecusa(null)
    ultima.current = { ...resultado.valor, aparelhoCom: antes.aparelhoCom }
    aoMudar(ultima.current)
  }

  const passagem = mesa.passagem
  const emVolta = passagem !== null && !acabou(passagem)
  const deQuem = passagem === null ? null : deQuemE(passagem)

  /*
    O toque de quem recebeu: o aparelho passa a ser dele **e** o conteúdo
    aparece, no mesmo despacho.

    Quando a volta não tem o que esconder — a entrega do aparelho ao próximo
    narrador dos Enigmas (`PJ-24`) —, o mesmo toque já encerra a volta: ele fica
    com o celular até o fim do enigma, e uma barra de "esconder e passar" ali
    seria um caminho que não leva a lugar nenhum.
  */
  const abrirOSegredo = () => {
    if (passagem === null) return
    const dono = deQuemE(passagem) ?? mesa.aparelhoCom
    const aberta = volta?.escondeAoPassar === false ? avancar(passagem) : revelar(passagem)
    aoMudar({ ...mesa, passagem: aberta, aparelhoCom: dono })
  }

  /*
    `PJ-19` — esconder e passar é **um** despacho: `avancar` já devolve a
    passagem com `revelado` em `false`. Zerar num segundo passo abriria a
    janela de um quadro em que o segredo de quem acabou de esconder aparece pra
    quem está recebendo.
  */
  const esconderEPassar = () => {
    if (passagem === null) return

    let base = ultima.current
    const comando = volta?.comandoAoEsconder
    if (comando !== undefined) {
      const resultado = despacharNoMotor(base, comando, ambiente())
      // Recusa aqui não trava a volta: o aparelho tem que andar de qualquer
      // jeito, e um pronto repetido não muda nada na rodada.
      if (resultado.ok) base = resultado.valor
    }

    ultima.current = { ...base, passagem: avancar(passagem) }
    aoMudar(ultima.current)
  }

  /*
    `PJ-26` — o único gatilho do relógio. O último pronto ficou retido no motor
    justamente pra que a rodada não começasse com o aparelho ainda circulando;
    aqui a mesa já se reuniu e alguém toca.
  */
  const comecar = () => {
    const resultado = comecarRodada(ultima.current, ambiente())
    if (!resultado.ok) {
      setRecusa(FRASE_DA_RECUSA[resultado.erro] ?? 'Essa não deu pra fazer agora.')
      return
    }
    setRecusa(null)
    ultima.current = resultado.valor
    aoMudar(resultado.valor)
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
          instrucao={volta?.instrucao ?? 'É a vez de quem recebe o aparelho.'}
          aoRevelar={abrirOSegredo}
          aoSair={aoSair}
        />
      )
    }
  }

  return (
    <>
      <TelaDoJogo
        projecao={projecao}
        enviar={enviar}
        enviarComo={enviarComo}
        aoSair={aoSair}
        prontosRetidos={mesa.prontoRetido !== null}
        aoComecarRodada={comecar}
      />

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
  enviarComo,
  aoSair,
  prontosRetidos,
  aoComecarRodada,
}: {
  projecao: Projecao
  enviar(comando: Comando): void
  enviarComo(autorId: JogadorId, comando: Comando): void
  aoSair(): void
  prontosRetidos: boolean
  aoComecarRodada(): void
}) {
  const props = { projecao, enviar, enviarComo, aoSair, modo: 'local' as const }

  switch (projecao.sala.fase) {
    case 'lobby':
    case 'escrita':
      return <Escrita {...props} />
    case 'jogo':
      if (projecao.sala.jogoId === 'cartas-contra-a-turma') {
        return <CartasJogo {...props} />
      }
      if (projecao.sala.jogoId === 'dedo-na-cara') {
        return <DedoJogo {...props} />
      }
      if (projecao.sala.jogoId === 'enigmas-sinistros') {
        return <EnigmasJogo {...props} />
      }
      if (projecao.sala.jogoId === 'espiao') {
        if (projecao.jogo?.espiao?.rodadaIniciada === true) return <EspiaoJogo {...props} />
        /*
          `PJ-25`, `PJ-26` — antes da rodada o modo local não tem espera: tem a
          volta. Ou alguém está com o papel aberto na mão, ou o aparelho já deu
          a volta inteira e falta só a mesa mandar começar. `EspiaoAguardando`,
          que é a tela de esperar os outros marcarem no próprio celular, não
          descreve nenhum dos dois.
        */
        return prontosRetidos ? (
          <EspiaoTodosProntos projecao={projecao} aoComecar={aoComecarRodada} aoSair={aoSair} />
        ) : (
          <EspiaoPapel projecao={projecao} aoSair={aoSair} />
        )
      }
      return <Jogo {...props} />
    case 'encerrada':
      if (projecao.sala.jogoId === 'cartas-contra-a-turma') {
        return <CartasEncerrada {...props} />
      }
      if (projecao.sala.jogoId === 'dedo-na-cara') {
        return <DedoEncerrada {...props} />
      }
      if (projecao.sala.jogoId === 'enigmas-sinistros') {
        return <EnigmasEncerrada {...props} />
      }
      if (projecao.sala.jogoId === 'espiao') {
        return <EspiaoEncerrada {...props} />
      }
      return <Encerrada {...props} />
  }
}

/** Uma volta do aparelho: por quem ele passa, o que se diz, e se ele volta. */
interface VoltaDoAparelho {
  /** Na ordem da roda (`PJ-07`). */
  fila: JogadorId[]
  /**
   * O que vem depois do toque. Nunca o segredo em si — e sempre impessoal: um
   * nome não diz o gênero de ninguém, e "ele vai ver" erra metade da mesa.
   */
  instrucao: string
  /**
   * `false` quando o aparelho **fica** com quem o recebeu — a entrega ao
   * próximo narrador dos Enigmas. Aí a volta acaba no toque, sem "esconder e
   * passar": o enigma inteiro é dele.
   */
  escondeAoPassar: boolean
  /**
   * O que sai em nome de quem está escondendo, **antes** de o aparelho andar.
   *
   * É a volta de revelação do Espião (`PJ-25`): esconder o papel é o mesmo
   * gesto que dizer "vi o meu". A ordem importa — o motor só retém o último
   * pronto enquanto a volta ainda não acabou, e é essa retenção que impede o
   * relógio de começar com o celular na mão de alguém (`PJ-26`).
   */
  comandoAoEsconder?: ComandoDeJogo
}

/**
 * Quando o aparelho precisa circular, e por quem (`PJ-21`).
 *
 * As fases sem segredo devolvem `null` e o aparelho fica numa tela só, parado
 * na mesa — é o caso do Dedo na Cara inteiro e dos Enigmas depois da cena
 * aberta.
 */
function voltaDaFase(projecao: Projecao, aparelhoCom: JogadorId): VoltaDoAparelho | null {
  // `PJ-29` — cada um escreve a carta de alguém sem ninguém ver.
  if (projecao.sala.fase === 'escrita') {
    return {
      fila: ativos(projecao),
      instrucao: 'Uma carta que ninguém mais pode ver.',
      escondeAoPassar: true,
    }
  }

  /*
    `PJ-25` — a volta de revelação: cada um lê o próprio papel antes de a
    rodada existir. Esconder o papel é o mesmo gesto que marcar pronto, e por
    isso o comando viaja junto da volta em vez de virar mais um botão.
  */
  const espiao = projecao.jogo?.espiao
  if (espiao !== undefined && !espiao.rodadaIniciada) {
    return {
      fila: ativos(projecao),
      instrucao: 'O papel desta rodada — o local, ou ser o espião.',
      escondeAoPassar: true,
      comandoAoEsconder: { t: 'marcarPronto', pronto: true },
    }
  }

  /*
    `PJ-28` — a votação também é segredo, e num aparelho só o "voto oculto" da
    sala é literalmente a tela de passagem: um de cada vez, e o próximo não vê
    o que o anterior marcou.
  */
  const votacao = espiao?.votacaoAberta
  if (votacao !== undefined && votacao.quantosVotaram < votacao.total) {
    return {
      fila: ativos(projecao),
      instrucao: 'Um voto que mais ninguém vê.',
      escondeAoPassar: true,
    }
  }

  /*
    `PJ-24` — o narrador mudou e o aparelho ainda está na mão do anterior. A
    entrega vem **antes** de a solução nova aparecer: sem ela, o enigma
    seguinte nasceria aberto na tela de quem acabou de narrar.
  */
  const enigmas = projecao.jogo?.enigmas
  if (enigmas !== undefined && enigmas.narrador.id !== aparelhoCom) {
    return {
      fila: [enigmas.narrador.id],
      instrucao: 'Quem receber narra este enigma — a solução é só de quem narra.',
      escondeAoPassar: false,
    }
  }

  return null
}

/** A roda, na ordem em que a mesa digitou os nomes (`PJ-07`). */
function ativos(projecao: Projecao): JogadorId[] {
  return projecao.jogadores
    .filter((jogador) => jogador.situacao === 'ativo')
    .map((jogador) => jogador.id)
}

/**
 * De quem é o aparelho quando ele está parado na mesa (`PJ-22`).
 *
 * O Dedo na Cara é o caso que precisa disso: o aparelho não circula, mas cada
 * um aponta o seu dedo tocando na mesma tela. Quem está "com o aparelho" é o
 * próximo que ainda não apontou — sem isso, o primeiro toque seria o único que
 * conta e a contagem nunca fecharia.
 *
 * Nada aqui escolhe alvo nenhum (`AD-003`): só diz de quem é o próximo toque.
 */
function donoDoAparelho(projecao: Projecao, atual: JogadorId): JogadorId {
  /*
    `PJ-30` — no "Quem Sou Eu?" o aparelho **não** pode ficar com quem está na
    vez. A carta de alguém é escondida exatamente de quem a carrega, então a
    projeção de quem está jogando a vez esconderia justo a carta que a mesa
    precisa ler. O celular fica com o vizinho e é virado pra fora: é o mesmo
    gesto do jogo de papel na testa.
  */
  if (projecao.sala.jogoId === 'quem-sou-eu' && projecao.sala.fase === 'jogo') {
    const vezDe = projecao.jogo?.vezDe
    if (vezDe !== undefined && vezDe !== null && atual === vezDe) {
      const roda = ativos(projecao)
      const depois = roda[(roda.indexOf(vezDe) + 1) % roda.length]
      if (depois !== undefined) return depois
    }
    return atual
  }

  const dedo = projecao.jogo?.dedo
  if (dedo === undefined || dedo.fase !== 'votacao') return atual

  const jaApontaram = new Set(dedo.votos.map((voto) => voto.eleitor.id))
  const proximo = projecao.jogadores.find(
    (jogador) => jogador.situacao === 'ativo' && !jaApontaram.has(jogador.id),
  )
  return proximo?.id ?? atual
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
