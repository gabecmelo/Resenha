import { type RefObject, useEffect, useRef, useState } from 'react'
import type { JogadorId, Projecao } from '../../../shared/protocolo'
import {
  Apurando,
  BarraDeAcao,
  BlocoDeNotas,
  Botao,
  Carta,
  Chat,
  FaixaDeFase,
  MarcadorDeJogador,
  Modal,
  PainelRecolhivel,
  RelogioDaFaixa,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { estaAcabando, formatarTempo } from '../estado/relogio'
import { useRestante } from '../estado/contagem'
import { useBatidaDeSuspense } from '../estado/suspense'
import { tocarSuaVez, tocarVezOutro, tocarAcertou, tocarTempoAcabando, tocarTickContagem } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * O tabuleiro (`JOGO-01`, `JOGO-03`…`JOGO-11`, `DESC-01`…`DESC-07`).
 *
 * A mesa é a tela: as testas de todo mundo em papel, e a sua virada no meio
 * delas. A carta selada tem **a mesma altura, a mesma borda e a mesma sombra**
 * das outras — é um lugar guardado, não um buraco, e a tela diz isso em
 * palavras.
 *
 * Nada aqui decide de quem é a vez, quem confirma ou quem pode agir: tudo isso
 * chega pronto na projeção (AD-008). O que a tela calcula por conta própria é só
 * o que falta do relógio, a partir do instante absoluto que veio no payload.
 */

/** Acima disto a mesa vira lista enxuta — é o caso de 20 em 360px (`VIS-02`). */
const MESA_CHEIA = 8

type Ficha = Projecao['jogadores'][number]

export function Jogo({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const jogo = projecao.jogo
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const daVez = jogadores.find((jogador) => jogador.id === jogo?.vezDe)
  const declarante = jogadores.find(
    (jogador) => jogador.id === jogo?.declaracaoPendente?.jogadorId,
  )
  const minhaFicha = jogadores.find((jogador) => jogador.id === eu.id)
  const ehMinhaVez = jogo?.vezDe === eu.id
  const compacta = ativos.length > MESA_CHEIA
  // `AJU-12` — quem está no rodízio vem na projeção; a tela não recalcula regra
  // nenhuma (AD-008). Sobrando um, não há para quem passar a vez.
  const sozinhoNoRodizio = jogo !== undefined && jogo.ordem.length === 1

  const minhaLinha = useRef<HTMLLIElement>(null)
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)
  const [menuDeHost, setMenuDeHost] = useState(false)

  // `DESC-05` — a negativa não vira estado na projeção: o servidor descarta a
  // declaração e segue. O que a tela sabe é a transição entre duas projeções —
  // havia uma declaração minha pendente, agora não há e eu não descobri.
  const declaracaoAtual = jogo?.declaracaoPendente?.jogadorId ?? null
  const [declaracaoAnterior, setDeclaracaoAnterior] = useState(declaracaoAtual)
  const [negada, setNegada] = useState(false)
  if (declaracaoAtual !== declaracaoAnterior) {
    setDeclaracaoAnterior(declaracaoAtual)
    setNegada(declaracaoAtual === null && declaracaoAnterior === eu.id && !minhaFicha?.descobriu)
  }

  // `DESC-04` — a revelação é um momento, não um bloco permanente: depois de
  // ler, a pessoa volta pra mesa e continua respondendo os outros.
  const [reveladaFechada, setReveladaFechada] = useState(false)

  // A carta não vira no mesmo instante em que a outra pessoa aperta "acertou":
  // a batida é o que transforma o clique dela num momento da mesa.
  const minhaCartaCaiu = eu.minhaCarta !== undefined
  const revelandoMinhaCarta = useBatidaDeSuspense(minhaCartaCaiu)

  const restante = useRestante(jogo?.prazoTurno ?? null, sala.config.tempoTurnoSeg)
  const acabando = ehMinhaVez && estaAcabando(restante)

  const vezAnteriorRef = useRef<string | null>(null)
  useEffect(() => {
    if (!jogo) return
    const vezAnterior = vezAnteriorRef.current
    if (jogo.vezDe !== vezAnterior) {
      if (jogo.vezDe === eu.id) {
        tocarSuaVez()
      } else if (jogo.vezDe !== null && vezAnterior !== null) {
        tocarVezOutro()
      }
      vezAnteriorRef.current = jogo.vezDe
    }
  }, [jogo?.vezDe, eu.id])

  const descobriramLenAnteriorRef = useRef<number>(jogadores.filter((j) => j.descobriu).length)
  useEffect(() => {
    if (!jogo) return
    const anterior = descobriramLenAnteriorRef.current
    const atual = jogadores.filter((j) => j.descobriu).length
    if (atual > anterior) {
      tocarAcertou()
    }
    descobriramLenAnteriorRef.current = atual
  }, [jogadores])

  // `JOGO-07` — o aviso sonoro do fim do turno é só de quem está na vez.
  const segundos = restante === null ? null : Math.ceil(restante / 1000)
  const ultimoSegundoTocado = useRef<number | null>(null)
  useEffect(() => {
    if (!ehMinhaVez || segundos === null) {
      ultimoSegundoTocado.current = null
      return
    }
    if (segundos === 10 && ultimoSegundoTocado.current !== 10) {
      tocarTempoAcabando()
      ultimoSegundoTocado.current = 10
    } else if (segundos <= 5 && segundos > 0 && ultimoSegundoTocado.current !== segundos) {
      tocarTickContagem()
      ultimoSegundoTocado.current = segundos
    }
  }, [ehMinhaVez, segundos])

  const souDeclarante = declaracaoAtual === eu.id
  const jaDescobri = minhaFicha?.descobriu === true

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          {...faixaDaVez({
            espectador: eu.situacao !== 'ativo',
            souDeclarante,
            souConfirmador: eu.souConfirmador && declarante !== undefined,
            apelidoDeclarante: declarante?.apelido,
            ehMinhaVez,
            acabando,
            daVez,
          })}
          relogio={
            eu.situacao === 'ativo' ? (
              <RelogioDaFaixa
                texto={restante === null ? null : formatarTempo(restante)}
                acabando={acabando}
              />
            ) : undefined
          }
        />
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          {eu.situacao !== 'ativo' && <Espectador />}

          {/* `DESC-04` — a partir da confirmação a carta existe no payload dele. */}
          {minhaCartaCaiu && revelandoMinhaCarta && (
            <Apurando rotulo="a mesa confirmou" texto="Virando a sua carta…" />
          )}

          {eu.minhaCarta !== undefined && !revelandoMinhaCarta && !reveladaFechada && (
            <VoceEra
              texto={eu.minhaCarta}
              faltam={ativos.filter((jogador) => !jogador.descobriu).length}
              aoVoltar={() => setReveladaFechada(true)}
            />
          )}

          {negada && <DeclaracaoNegada aoVoltar={() => setNegada(false)} />}

          {declarante !== undefined && eu.souConfirmador && !souDeclarante && (
            <DecisaoDoConfirmador
              declarante={declarante}
              aoResponder={(aceita) => enviar({ t: 'responderDeclaracao', aceita })}
            />
          )}

          {souDeclarante && <AguardandoConfirmacao />}

          <Mesa
            jogadores={ativos}
            euId={eu.id}
            hostId={sala.hostId}
            vezDe={jogo?.vezDe ?? null}
            compacta={compacta}
            declaracaoAtual={declaracaoAtual}
            // A mesa esmaece enquanto uma declaração está aberta: é uma por vez,
            // e a atenção pertence a ela.
            esmaecida={declarante !== undefined && !eu.souConfirmador && !souDeclarante}
            refDaMinha={minhaLinha}
            aoIrParaMinha={() =>
              minhaLinha.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
          />

          <div className="flex flex-col gap-3 lg:hidden">
            <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
            <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            </PainelRecolhivel>
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          {/* `NOTA-01`, `NOTA-02` — só o dono vê; a projeção nunca traz as de outro. */}
          <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
          <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </PainelRecolhivel>
        </div>
      </div>

      {eu.situacao === 'ativo' && (
        <BarraDeAcao>
          <p className="text-apoio leading-snug text-texto-3">
            {orientacao({
              jaDescobri,
              souDeclarante,
              apelidoDeclarante: souDeclarante ? undefined : declarante?.apelido,
              ehMinhaVez,
              semRelogio: sala.config.tempoTurnoSeg === null,
              sozinhoNoRodizio,
            })}
          </p>

          <div className="flex items-center gap-2">
            {!jaDescobri && (
              <div className="min-w-0 flex-1">
                <Botao
                  larguraTotal
                  onClick={() => enviar({ t: 'declararDescobri' })}
                  // `DESC-10` — uma declaração por vez; dizer isso é melhor que
                  // deixar o toque cair no vazio.
                  motivo={
                    souDeclarante
                      ? 'Sua declaração está na mesa — espere a resposta.'
                      : declarante !== undefined
                        ? `${declarante.apelido} declarou primeiro — é uma por vez, espera abrir.`
                        : undefined
                  }
                >
                  Descobri!
                </Botao>
              </div>
            )}

            {/* `JOGO-04` — passar a vez é de quem está na vez. */}
            {ehMinhaVez && !sozinhoNoRodizio && (
              <div className="min-w-0 flex-1">
                <Botao
                  larguraTotal
                  variante="secundario"
                  onClick={() => enviar({ t: 'passarVez' })}
                >
                  Passei a vez
                </Botao>
              </div>
            )}

            {/* `VIS-04` — na tela de quem não é host esse ⋯ não aparece. */}
            {eu.ehHost && (
              <button
                type="button"
                aria-label="Ações do host"
                onClick={() => setMenuDeHost(true)}
                className="flex h-13 w-13 flex-none cursor-pointer items-center justify-center rounded-botao border border-controle-linha text-[18px] leading-none text-texto"
              >
                <span aria-hidden="true">⋯</span>
              </button>
            )}
          </div>
        </BarraDeAcao>
      )}

      {menuDeHost && (
        <Modal
          folha
          titulo="Ações do host"
          descricao="Só você vê estas ações."
          rotuloCancelar="Fechar"
          aoCancelar={() => setMenuDeHost(false)}
        >
          <div className="flex flex-col gap-2.5">
            {daVez !== undefined && !ehMinhaVez && !sozinhoNoRodizio && (
              <Botao
                larguraTotal
                variante="secundario"
                onClick={() => {
                  enviar({ t: 'pularVez' })
                  setMenuDeHost(false)
                }}
              >
                Pular a vez de {daVez.apelido}
              </Botao>
            )}
            <Botao
              larguraTotal
              variante="destrutivo"
              onClick={() => {
                setMenuDeHost(false)
                setConfirmandoEncerrar(true)
              }}
            >
              Encerrar partida
            </Botao>
          </div>
        </Modal>
      )}

      {/* `HOST-07` — encerrar revela a carta de todo mundo; confirma antes. */}
      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="Isso revela a carta de todo mundo na hora, inclusive de quem ainda não descobriu."
          rotuloConfirmar="Encerrar e revelar tudo"
          rotuloCancelar="Continuar jogando"
          destrutivo
          aoConfirmar={() => {
            enviar({ t: 'encerrar' })
            setConfirmandoEncerrar(false)
          }}
          aoCancelar={() => setConfirmandoEncerrar(false)}
        />
      )}
    </Shell>
  )
}

/**
 * A faixa responde "o que eu faço agora?" (`VIS-03`) — e durante uma declaração
 * ela troca de assunto: o que importa naquele instante é a declaração, não a vez.
 */
function faixaDaVez({
  espectador,
  souDeclarante,
  souConfirmador,
  apelidoDeclarante,
  ehMinhaVez,
  acabando,
  daVez,
}: {
  espectador: boolean
  souDeclarante: boolean
  souConfirmador: boolean
  apelidoDeclarante: string | undefined
  ehMinhaVez: boolean
  acabando: boolean
  daVez: Ficha | undefined
}) {
  if (espectador) {
    return { selo: 'assistindo', tom: 'tinta' as const, children: 'Você entra na próxima.' }
  }
  if (souDeclarante) {
    return {
      selo: 'você declarou',
      tom: 'mostarda' as const,
      children: 'Sua declaração está na mesa — espere a resposta.',
    }
  }
  if (souConfirmador && apelidoDeclarante !== undefined) {
    return {
      selo: 'confere pra mesa',
      tom: 'mostarda' as const,
      children: `${apelidoDeclarante} declarou. Compare o palpite com a carta e responda.`,
    }
  }
  if (apelidoDeclarante !== undefined) {
    return {
      selo: 'declaração aberta',
      tom: 'mostarda' as const,
      children: `${apelidoDeclarante} declarou. A mesa está conferindo — você não precisa fazer nada.`,
    }
  }
  if (ehMinhaVez) {
    return {
      selo: 'sua vez',
      tom: acabando ? ('mostarda' as const) : ('esmalte' as const),
      children: (
        <>
          Pergunte algo de <strong className="font-semibold">sim ou não</strong> em voz alta.
        </>
      ),
    }
  }
  if (daVez === undefined) {
    return { selo: 'mesa parada', tom: 'tinta' as const, children: 'Ninguém está na vez agora.' }
  }
  return {
    marcador: <MarcadorDeJogador apelido={daVez.apelido} cor={daVez.cor} tamanho="grande" />,
    children: daVez.conectado
      ? `Vez de ${daVez.apelido} — responda o que ${daVez.apelido} perguntar.`
      : `${daVez.apelido} caiu, mas a vez continua sendo dela.`,
  }
}

/** A linha de orientação da barra — cinco situações, uma frase cada. */
function orientacao({
  jaDescobri,
  souDeclarante,
  apelidoDeclarante,
  ehMinhaVez,
  semRelogio,
  sozinhoNoRodizio,
}: {
  jaDescobri: boolean
  souDeclarante: boolean
  apelidoDeclarante: string | undefined
  ehMinhaVez: boolean
  semRelogio: boolean
  sozinhoNoRodizio: boolean
}): string {
  if (jaDescobri) {
    return 'Você já descobriu. Fique na mesa e responda as perguntas dos outros — sem entregar nada.'
  }
  if (souDeclarante) return 'Sua declaração está na mesa — espere a resposta.'
  if (apelidoDeclarante !== undefined) {
    return `${apelidoDeclarante} declarou primeiro — é uma por vez, espera abrir.`
  }
  if (sozinhoNoRodizio && ehMinhaVez) {
    return 'Você é o último sem descobrir. A vez é sua até declarar, sem relógio e sem passar.'
  }
  if (ehMinhaVez) {
    return semRelogio
      ? 'Sem relógio: a vez só passa quando você passar.'
      : 'Fale o palpite em voz alta antes de apertar Descobri!.'
  }
  return 'Não é sua vez. Mas se for da regra da mesa, você pode declarar quando quiser.'
}

/** `JOGO-01` — as testas de todo mundo, e a sua no meio delas. */
function Mesa({
  jogadores,
  euId,
  hostId,
  vezDe,
  compacta,
  declaracaoAtual,
  esmaecida,
  refDaMinha,
  aoIrParaMinha,
}: {
  jogadores: Ficha[]
  euId: JogadorId
  hostId: JogadorId
  vezDe: JogadorId | null
  compacta: boolean
  declaracaoAtual: JogadorId | null
  esmaecida: boolean
  refDaMinha: RefObject<HTMLLIElement | null>
  aoIrParaMinha(): void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-rotulo text-texto-3 uppercase">
          mesa · {jogadores.length} cartas
        </h2>
        {/* `VIS-02` — com a mesa cheia, achar a própria carta não pode ser rolar no escuro. */}
        {compacta && (
          <button
            type="button"
            onClick={aoIrParaMinha}
            className="ml-auto min-h-9 cursor-pointer rounded-chip border border-controle-linha px-2.5 text-miudo font-semibold text-texto"
          >
            ir para a minha ↓
          </button>
        )}
      </div>

      <ul
        className={`grid transition-opacity duration-200 ${esmaecida ? 'opacity-45' : ''} ${
          compacta
            ? 'grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5'
            : 'grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4'
        }`}
      >
        {jogadores.map((jogador) => {
          const souEu = jogador.id === euId
          return (
            <li
              key={jogador.id}
              ref={souEu ? refDaMinha : undefined}
              className={`min-w-0 ${jogador.id === declaracaoAtual ? 'animacao-flash' : ''}`}
            >
              <Carta
                apelido={jogador.apelido}
                cor={jogador.cor}
                ehVoce={souEu}
                texto={jogador.carta}
                descobriu={jogador.descobriu}
                ehHost={jogador.id === hostId}
                ehAVezDele={jogador.id === vezDe}
                conectado={jogador.conectado}
                compacta={compacta}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// As três visões de uma declaração pendente (`DESC-01`…`DESC-05`)
// ---------------------------------------------------------------------------

/** Quem declarou: a carta continua selada até alguém responder. */
function AguardandoConfirmacao() {
  return (
    <section className="flex flex-col items-start gap-2 rounded-papel border-2 border-aviso p-4">
      <span className="selo bg-aviso text-aviso-contraste">aguardando confirmação</span>
      <p className="text-apoio leading-relaxed text-texto-2">
        Alguém da mesa está conferindo se você acertou. Sua carta{' '}
        <strong className="font-semibold text-texto">continua selada</strong> até a resposta — e se
        errou, nada acontece: você continua na sua vez.
      </p>
    </section>
  )
}

/** `DESC-02`, `DESC-03` — quem decide vê a carta e as duas saídas. */
function DecisaoDoConfirmador({
  declarante,
  aoResponder,
}: {
  declarante: Ficha
  aoResponder(aceita: boolean): void
}) {
  return (
    <section className="flex flex-col gap-3 rounded-papel border-2 border-controle-linha bg-superficie p-4 shadow-botao">
      <span className="selo bg-aviso text-aviso-contraste">confere pra mesa</span>
      <h2 className="font-display text-secao text-texto">{declarante.apelido} acertou?</h2>
      <p className="text-apoio leading-relaxed text-texto-2">
        O palpite foi falado em voz alta. Compare com a carta:
      </p>

      <div className="flex flex-col gap-1.5 rounded-botao border border-dashed border-linha p-3.5">
        <span className="flex items-center gap-2">
          <MarcadorDeJogador apelido={declarante.apelido} cor={declarante.cor} tamanho="medio" />
          <span className="font-mono text-rotulo text-texto-3 uppercase">
            a carta de {declarante.apelido} é
          </span>
        </span>
        <span className="font-display text-titulo text-balance text-texto">{declarante.carta}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <Botao larguraTotal onClick={() => aoResponder(true)}>
          Acertou!
        </Botao>
        <Botao larguraTotal variante="secundario" onClick={() => aoResponder(false)}>
          Não é essa
        </Botao>
      </div>

      <p className="text-apoio text-texto-3">
        Se você negar, {declarante.apelido} não perde a vez nem leva castigo — só continua jogando.
      </p>
    </section>
  )
}

/** `DESC-05` — negar não custa nada a quem declarou, e a tela precisa dizer isso. */
function DeclaracaoNegada({ aoVoltar }: { aoVoltar(): void }) {
  return (
    <section className="flex flex-col items-start gap-2.5 rounded-papel border-2 border-controle-linha bg-superficie p-4">
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="font-display text-secao text-texto-3">
          ≠
        </span>
        <h2 className="font-display text-secao text-texto">Não era essa.</h2>
      </span>
      <p className="text-apoio leading-relaxed text-texto-2">
        Continua tudo igual: <strong className="font-semibold text-texto">a vez ainda é sua</strong>
        , sua carta segue selada e você pode declarar de novo na hora que quiser.
      </p>
      <ul className="flex flex-col gap-1 border-t border-dashed border-linha pt-2.5">
        <li className="font-mono text-rotulo text-texto-3 uppercase">o que não aconteceu</li>
        {['você não perdeu a vez', 'não existe limite de tentativas', 'ninguém ganhou nada'].map(
          (item) => (
            <li key={item} className="flex gap-2 text-apoio text-texto-3">
              <span aria-hidden="true">·</span>
              <span>{item}</span>
            </li>
          ),
        )}
      </ul>
      <Botao variante="secundario" onClick={aoVoltar}>
        Voltar pra mesa
      </Botao>
    </section>
  )
}

/** `DESC-04` — a carta que estava na sua testa a partida inteira. */
function VoceEra({
  texto,
  faltam,
  aoVoltar,
}: {
  texto: string
  faltam: number
  aoVoltar(): void
}) {
  return (
    <section className="flex flex-col items-start gap-2.5 rounded-papel bg-acento p-5">
      <span className="selo bg-acento-contraste text-acento">a mesa confirmou</span>
      <span className="font-mono text-rotulo text-acento-contraste/75 uppercase">você era</span>
      <span className="font-display text-display text-balance text-acento-contraste">{texto}</span>
      {/* <p className="text-apoio leading-relaxed text-acento-contraste/85">
        Ficou a partida inteira na sua testa. Quem escreveu isso segue em segredo — e você continua
        na mesa, respondendo os outros.
      </p> */}
      <Botao variante="secundario" onClick={aoVoltar} className="border-acento-contraste text-acento-contraste">
        Voltar pra mesa
      </Botao>
      {faltam > 0 && (
        <span className="font-mono text-rotulo text-acento-contraste/75 uppercase">
          {faltam} ainda {faltam === 1 ? 'está descobrindo' : 'estão descobrindo'}
        </span>
      )}
    </section>
  )
}

/** `SALA-10` — entrou depois do sorteio: assiste esta e joga a próxima. */
function Espectador() {
  return (
    <section className="flex flex-col items-start gap-2 rounded-papel border border-dashed border-linha p-5">
      <span className="selo bg-controle-linha text-fundo">assistindo</span>
      <h2 className="font-display text-titulo text-texto">Você entra na próxima.</h2>
      <p className="text-apoio leading-relaxed text-texto-2">
        Você vê a mesa inteira, inclusive as cartas — então vale segurar a língua. Pode zoar na
        resenha; quando esta partida acabar você entra automaticamente.
      </p>
    </section>
  )
}
