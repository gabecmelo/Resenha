import { type RefObject, useRef, useState } from 'react'
import type { JogadorId, Projecao } from '../../../shared/protocolo'
import {
  BlocoDeNotas,
  Botao,
  Carta,
  Chat,
  IndicadorDeVez,
  MarcadorDeJogador,
  Modal,
  Shell,
} from '../componentes'
import type { PropsDaTela } from './tela'

/**
 * O tabuleiro (`JOGO-01`, `JOGO-03`…`JOGO-11`, `DESC-01`…`DESC-07`).
 *
 * A mesa é a tela: a lista de cartas ocupa tudo e o resto é barra. A sua carta
 * fica no lugar de sempre, entre as outras, selada — o produto inteiro existe
 * para desenhar exatamente isso.
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

  // `DESC-05` — a negativa não vira estado na projeção: o servidor descarta a
  // declaração e segue. O que a tela sabe é a transição entre duas projeções —
  // havia uma declaração minha pendente, agora não há e eu não descobri.
  const declaracaoAtual = jogo?.declaracaoPendente?.jogadorId ?? null
  const [declaracaoAnterior, setDeclaracaoAnterior] = useState(declaracaoAtual)
  const [negada, setNegada] = useState(false)
  if (declaracaoAtual !== declaracaoAnterior) {
    setDeclaracaoAnterior(declaracaoAtual)
    setNegada(
      declaracaoAtual === null &&
        declaracaoAnterior === eu.id &&
        minhaFicha?.descobriu !== true,
    )
  }

  const souDeclarante = declaracaoAtual === eu.id

  return (
    <Shell
      codigo={sala.codigo}
      legenda={`Partida em andamento · ${ativos.length} na mesa`}
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-6">
        {eu.situacao === 'ativo' ? (
          <IndicadorDeVez
            ehSuaVez={ehMinhaVez}
            apelido={daVez?.apelido}
            cor={daVez?.cor}
            conectado={daVez?.conectado ?? true}
            prazoTurno={jogo?.prazoTurno ?? null}
            duracaoSeg={sala.config.tempoTurnoSeg}
          />
        ) : (
          <p className="-mx-4 -mt-5 border-b border-linha bg-superficie-2 px-4 py-3.5 font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase sm:mx-0 sm:mt-0 sm:rounded-painel sm:border-b-0">
            partida em andamento
          </p>
        )}

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
          <section className="flex flex-col gap-5">
            {eu.situacao !== 'ativo' && <Espectador />}

            {declarante !== undefined &&
              (souDeclarante ? (
                <AguardandoConfirmacao />
              ) : eu.souConfirmador ? (
                <DecisaoDoConfirmador
                  declarante={declarante}
                  aoResponder={(aceita) => enviar({ t: 'responderDeclaracao', aceita })}
                />
              ) : (
                <AnuncioDeDeclaracao apelido={declarante.apelido} />
              ))}

            {negada && <DeclaracaoNegada />}

            {/* `DESC-04` — a partir da confirmação a carta existe no payload dele. */}
            {eu.minhaCarta !== undefined && <VoceEra texto={eu.minhaCarta} />}

            <Mesa
              jogadores={ativos}
              euId={eu.id}
              hostId={sala.hostId}
              vezDe={jogo?.vezDe ?? null}
              compacta={compacta}
              refDaMinha={minhaLinha}
              aoIrParaMinha={() =>
                minhaLinha.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }
            />

            {eu.situacao === 'ativo' && (
              <Acoes
                jaDescobriu={minhaFicha?.descobriu === true}
                souDeclarante={souDeclarante}
                apelidoDeQuemDeclarou={souDeclarante ? undefined : declarante?.apelido}
                ehMinhaVez={ehMinhaVez}
                semRelogio={sala.config.tempoTurnoSeg === null}
                sozinhoNoRodizio={sozinhoNoRodizio}
                souHost={eu.ehHost}
                apelidoDaVez={daVez?.apelido}
                enviar={enviar}
                aoEncerrar={() => setConfirmandoEncerrar(true)}
              />
            )}
          </section>

          <section className="flex flex-col gap-5">
            {/* `NOTA-01`, `NOTA-02` — só o dono vê; a projeção nunca traz as de outro. */}
            <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
            <ChatDaMesa
              mensagens={projecao.chat}
              aoEnviar={(texto) => enviar({ t: 'chat', texto })}
            />
          </section>
        </div>
      </div>

      {/* `HOST-07` — encerrar revela a carta de todo mundo; confirma antes. */}
      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="As cartas de todo mundo são reveladas e a mesa volta para o lobby. Quem ainda não descobriu vai ver a sua."
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

/** `JOGO-01` — as testas de todo mundo, e a sua no meio delas. */
function Mesa({
  jogadores,
  euId,
  hostId,
  vezDe,
  compacta,
  refDaMinha,
  aoIrParaMinha,
}: {
  jogadores: Ficha[]
  euId: JogadorId
  hostId: JogadorId
  vezDe: JogadorId | null
  compacta: boolean
  refDaMinha: RefObject<HTMLLIElement | null>
  aoIrParaMinha(): void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
          {jogadores.length} na mesa
        </h2>
        {/* `VIS-02` — com a mesa cheia, achar a própria carta não pode ser rolar no escuro. */}
        {compacta && (
          <button
            type="button"
            onClick={aoIrParaMinha}
            className="ml-auto min-h-8 cursor-pointer rounded-pilula border border-acento bg-acento-suave px-3 text-[12px] font-medium text-acento"
          >
            Ir para a minha
          </button>
        )}
      </div>

      <ul
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
          compacta ? 'gap-1.5' : 'gap-2.5'
        }`}
      >
        {jogadores.map((jogador) => {
          const souEu = jogador.id === euId
          return (
            <li key={jogador.id} ref={souEu ? refDaMinha : undefined} className="min-w-0">
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

/**
 * `JOGO-04`, `JOGO-05`, `DESC-01`, `FIM-01` — o que dá para fazer agora.
 *
 * `AJU-12` — restando um no rodízio, passar e pular a vez somem: passar a vez
 * para si mesmo é operação sem efeito, e o servidor já ignora o avanço.
 */
function Acoes({
  jaDescobriu,
  souDeclarante,
  apelidoDeQuemDeclarou,
  ehMinhaVez,
  semRelogio,
  sozinhoNoRodizio,
  souHost,
  apelidoDaVez,
  enviar,
  aoEncerrar,
}: {
  jaDescobriu: boolean
  souDeclarante: boolean
  apelidoDeQuemDeclarou: string | undefined
  ehMinhaVez: boolean
  semRelogio: boolean
  sozinhoNoRodizio: boolean
  souHost: boolean
  apelidoDaVez: string | undefined
  enviar: PropsDaTela['enviar']
  aoEncerrar(): void
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-linha pt-5">
      {!jaDescobriu &&
        (souDeclarante ? (
          <Botao larguraTotal motivo="Só quem confirma pode responder à sua declaração.">
            Declaração enviada · aguardando
          </Botao>
        ) : (
          <Botao
            larguraTotal
            onClick={() => enviar({ t: 'declararDescobri' })}
            // `DESC-10` — uma declaração por vez; dizer isso é melhor que
            // deixar o toque cair no vazio.
            motivo={
              apelidoDeQuemDeclarou === undefined
                ? undefined
                : `${apelidoDeQuemDeclarou} declarou primeiro. Assim que responderem, é sua vez de declarar.`
            }
          >
            Descobri!
          </Botao>
        ))}

      {/* `JOGO-04` — passar a vez é de quem está na vez. */}
      {ehMinhaVez && !sozinhoNoRodizio && (
        <Botao larguraTotal variante="secundario" onClick={() => enviar({ t: 'passarVez' })}>
          Passei a vez
        </Botao>
      )}

      <p className="text-[12px] leading-snug text-texto-3">
        {jaDescobriu
          ? 'Você já descobriu. Fique na mesa e responda as perguntas dos outros — sem entregar nada.'
          : sozinhoNoRodizio && ehMinhaVez
            ? 'Você é o último sem descobrir. A vez é sua até declarar, sem relógio e sem passar.'
            : ehMinhaVez
              ? semRelogio
                ? 'Sem relógio, a vez só passa quando você passar.'
                : 'Fale o palpite em voz alta antes de clicar em Descobri!.'
              : 'Responda em voz alta quando a pergunta vier. Declarar não depende da sua vez.'}
      </p>

      {/* `VIS-04` — ação de host não existe na tela de quem não é host. */}
      {souHost && (
        <div className="mt-1 flex flex-col gap-2.5 border-t border-linha pt-4">
          {apelidoDaVez !== undefined && !ehMinhaVez && !sozinhoNoRodizio && (
            <Botao larguraTotal variante="secundario" onClick={() => enviar({ t: 'pularVez' })}>
              Pular a vez de {apelidoDaVez}
            </Botao>
          )}
          <Botao larguraTotal variante="destrutivo" onClick={aoEncerrar}>
            Encerrar partida
          </Botao>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// As três visões de uma declaração pendente (`DESC-01`…`DESC-05`)
// ---------------------------------------------------------------------------

/** Quem declarou: a carta continua selada até alguém responder. */
function AguardandoConfirmacao() {
  return (
    <div className="flex flex-col gap-1.5 rounded-bloco border border-aviso-linha bg-aviso-suave p-4">
      <span className="animacao-pulso font-mono text-[11px] tracking-[0.12em] text-aviso uppercase">
        aguardando confirmação
      </span>
      <p className="text-[15px] leading-relaxed text-texto-2">
        Você declarou que descobriu. Alguém da mesa vai confirmar ou negar — sua carta continua
        selada até lá.
      </p>
    </div>
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
    <div className="flex flex-col gap-3 rounded-bloco border-2 border-aviso bg-superficie p-4">
      <span className="flex items-center gap-2.5">
        <MarcadorDeJogador
          apelido={declarante.apelido}
          cor={declarante.cor}
          tamanho="grande"
        />
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-[10px] tracking-[0.1em] text-aviso uppercase">
            declarou que descobriu
          </span>
          <span className="truncate text-[19px] font-semibold tracking-[-0.02em] text-texto">
            {declarante.apelido}
          </span>
        </span>
      </span>

      <p className="text-apoio leading-relaxed text-texto-2">
        O palpite foi falado em voz alta. A carta de {declarante.apelido} é{' '}
        <strong className="font-semibold text-texto">{declarante.carta}</strong>. Acertou?
      </p>

      <div className="flex flex-wrap gap-2.5">
        <Botao onClick={() => aoResponder(true)}>Confirmar</Botao>
        <Botao variante="destrutivo" onClick={() => aoResponder(false)}>
          Negar
        </Botao>
      </div>
    </div>
  )
}

/** `DESC-01` — os demais só recebem o anúncio; não decidem nada. */
function AnuncioDeDeclaracao({ apelido }: { apelido: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-painel border border-aviso-linha bg-aviso-suave px-3.5 py-3">
      <span aria-hidden="true" className="animacao-pulso h-2 w-2 flex-none rounded-pilula bg-aviso" />
      <p className="text-apoio leading-snug text-texto-2">
        <strong className="font-semibold text-texto">{apelido}</strong> declarou que descobriu. A
        mesa está conferindo.
      </p>
    </div>
  )
}

/** `DESC-05` — negar não custa nada a quem declarou, e a tela precisa dizer isso. */
function DeclaracaoNegada() {
  return (
    <div className="flex flex-col gap-1.5 rounded-bloco border border-risco-linha bg-risco-suave p-4">
      <span className="font-mono text-[11px] tracking-[0.12em] text-risco uppercase">
        não era essa
      </span>
      <p className="text-[15px] leading-relaxed text-texto-2">
        Negaram seu palpite. Nada mudou: você não perdeu a vez nem ganhou penalidade. Pergunte mais
        e declare de novo quando quiser.
      </p>
    </div>
  )
}

/** `DESC-04` — a carta que estava na sua testa a partida inteira. */
function VoceEra({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-bloco bg-acento p-5">
      <span className="font-mono text-[11px] tracking-[0.12em] text-acento-contraste/75 uppercase">
        você era
      </span>
      <span className="text-titulo text-balance text-acento-contraste">{texto}</span>
      <p className="text-apoio leading-relaxed text-acento-contraste/80">
        Fique na mesa e ajude os outros — sem entregar nada.
      </p>
    </div>
  )
}

/** `SALA-10` — entrou depois do sorteio: assiste esta e joga a próxima. */
function Espectador() {
  return (
    <div className="flex flex-col gap-2 rounded-bloco border border-linha bg-superficie p-5">
      <h2 className="text-titulo text-texto">Você entra na próxima</h2>
      <p className="text-[15px] leading-relaxed text-texto-2">
        Ninguém escreveu uma carta para você nesta rodada. Assista, converse no chat — quando esta
        partida acabar você entra automaticamente.
      </p>
    </div>
  )
}

/**
 * `CHAT-01`, `CHAT-04` — o chat é apoio, não canal principal. No celular ele
 * começa recolhido para não disputar espaço com a mesa; a partir de `lg` ele
 * mora na coluna lateral e fica sempre aberto.
 */
function ChatDaMesa({
  mensagens,
  aoEnviar,
}: {
  mensagens: Projecao['chat']
  aoEnviar(texto: string): void
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((estava) => !estava)}
        className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-painel bg-superficie-2 px-3.5 py-3 text-left lg:hidden"
      >
        <span className="font-mono text-[11px] tracking-[0.1em] text-texto-3 uppercase">
          chat{mensagens.length > 0 && ` · ${mensagens.length}`}
        </span>
        <span className="text-miudo font-medium text-acento">{aberto ? 'recolher' : 'abrir'}</span>
      </button>

      <h2 className="hidden font-mono text-[11px] tracking-[0.1em] text-texto-3 uppercase lg:block">
        chat
      </h2>

      <div className={aberto ? 'block' : 'hidden lg:block'}>
        <Chat mensagens={mensagens} aoEnviar={aoEnviar} />
      </div>
    </div>
  )
}
