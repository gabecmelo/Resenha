import { useEffect, useRef, useState } from 'react'
import type { Cor, ProjecaoEnigmas, RespostaDoNarrador } from '../../../shared/protocolo'
import { LIMITE_DECLARACAO, LIMITE_PERGUNTA } from '../../../shared/protocolo'
import {
  BarraDeAcao,
  Botao,
  CampoDeTexto,
  Chat,
  FaixaDeFase,
  MarcadorDeJogador,
  Modal,
  PainelRecolhivel,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { tocarAcertou, tocarClique, tocarSuaVez, tocarVezOutro } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * A tela do enigma (`ENIG-04`…`ENIG-20`).
 *
 * O objeto da mesa é um só: a cena, que fica no alto o tempo todo. Embaixo dela
 * muda o que cada um tem em mãos — a fila de perguntas de quem pergunta, os
 * três botões de quem narra, a solução quando ela cai.
 *
 * A regra que manda no desenho: **a solução ocupa o mesmo lugar em todas as
 * telas**, revelada ou não. Na tela do narrador ela está escrita desde o começo,
 * carimbada como dele; na da mesa, o mesmo bloco fica fechado. Se a solução
 * aparecesse num canto diferente pra quem sabe, a posição do olho já entregaria
 * quem é o narrador antes de ele falar.
 *
 * Nada aqui decide quem narra, quem pode ler a solução ou se a declaração
 * acertou: tudo isso chega pronto na projeção (`AD-008`).
 */
export function EnigmasJogo({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const enigmas = projecao.jogo?.enigmas
  const [menuDeHost, setMenuDeHost] = useState(false)
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false)
  const [declarando, setDeclarando] = useState(false)
  const [rascunhoDeclaracao, setRascunhoDeclaracao] = useState('')
  const [rascunhoPergunta, setRascunhoPergunta] = useState('')

  // Enigma novo na tela é o instante em que todo mundo olha pro celular.
  const rodada = enigmas?.rodada ?? 0
  useEffect(() => {
    if (rodada > 0) tocarSuaVez()
  }, [rodada])

  // Uma declaração entrando puxa a mesa: alguém acha que desatou.
  const temDeclaracao = enigmas?.declaracaoPendente !== undefined
  const tinhaDeclaracaoRef = useRef(false)
  useEffect(() => {
    if (temDeclaracao && !tinhaDeclaracaoRef.current) tocarVezOutro()
    tinhaDeclaracaoRef.current = temDeclaracao
  }, [temDeclaracao])

  const revelou = enigmas?.fase === 'revelacao'
  const revelouRef = useRef(false)
  useEffect(() => {
    if (revelou && !revelouRef.current) tocarAcertou()
    revelouRef.current = revelou
  }, [revelou])

  // Cada resposta do narrador é uma batida da mesa.
  const respondidas = enigmas?.perguntas.filter((p) => p.resposta !== null).length ?? 0
  const respondidasRef = useRef(0)
  useEffect(() => {
    if (respondidas > respondidasRef.current && respondidasRef.current > 0) tocarClique()
    respondidasRef.current = respondidas
  }, [respondidas])

  if (enigmas === undefined) return null

  const pendente = enigmas.declaracaoPendente

  const perguntar = () => {
    const limpo = rascunhoPergunta.trim()
    if (limpo.length === 0) return
    enviar({ t: 'perguntarEnigma', texto: limpo })
    setRascunhoPergunta('')
  }

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          selo={
            revelou
              ? enigmas.desatou === undefined
                ? 'entregue'
                : 'desatado'
              : pendente !== undefined
                ? 'julgando'
                : `enigma ${enigmas.rodada}`
          }
          tom={revelou ? 'pronto' : pendente !== undefined ? 'mostarda' : 'esmalte'}
        >
          {revelou
            ? enigmas.desatou === undefined
              ? 'Ninguém desatou. A solução está na mesa.'
              : `${enigmas.desatou.apelido} desatou o enigma.`
            : pendente !== undefined
              ? enigmas.souNarrador
                ? `${pendente.autor.apelido} declarou. Só você lê o que veio.`
                : `${pendente.autor.apelido} acha que desatou. ${enigmas.narrador.apelido} está lendo.`
              : enigmas.souNarrador
                ? 'Você narra este. Só sim, não e não importa.'
                : `${enigmas.narrador.apelido} está com a solução na mão.`}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          <Cena texto={enigmas.cena} narrador={enigmas.narrador.apelido} souNarrador={enigmas.souNarrador} />

          <Solucao enigmas={enigmas} />

          {enigmas.souNarrador ? (
            <MesaDoNarrador
              enigmas={enigmas}
              aoResponder={(perguntaId, resposta) =>
                enviar({ t: 'responderPergunta', perguntaId, resposta })
              }
              aoJulgar={(acertou) => enviar({ t: 'julgarDeclaracao', acertou })}
            />
          ) : (
            <MesaDeQuemPergunta
              enigmas={enigmas}
              rascunho={rascunhoPergunta}
              aoMudarRascunho={setRascunhoPergunta}
              aoPerguntar={perguntar}
            />
          )}

          <Historico enigmas={enigmas} />

          <Placar enigmas={enigmas} euId={eu.id} jogadores={jogadores} />

          <div className="flex flex-col gap-3 lg:hidden">
            <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            </PainelRecolhivel>
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </PainelRecolhivel>
        </div>
      </div>

      <BarraDeAcao>
        <div className="flex items-center gap-2">
          {revelou ? (
            enigmas.souNarrador ? (
              <div className="min-w-0 flex-1">
                <Botao larguraTotal onClick={() => enviar({ t: 'proximoEnigma' })}>
                  Próximo enigma
                </Botao>
              </div>
            ) : (
              <p className="min-w-0 flex-1 text-apoio leading-snug text-texto-2">
                <strong className="font-semibold text-texto">Leiam a solução.</strong>{' '}
                {enigmas.narrador.apelido} vira o próximo quando a mesa parar de reclamar.
              </p>
            )
          ) : enigmas.souNarrador ? (
            <div className="min-w-0 flex-1">
              {/* `ENIG-18` — entregar é do narrador e fecha o enigma sem ponto. */}
              <Botao
                larguraTotal
                variante="secundario"
                motivo={
                  pendente === undefined
                    ? undefined
                    : 'Tem uma declaração esperando o seu veredito.'
                }
                motivoOculto
                onClick={() => setConfirmandoEntrega(true)}
              >
                Entregar a solução
              </Botao>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              {/* `ENIG-14` — declarar é o único jeito de pontuar. */}
              <Botao
                larguraTotal
                motivo={
                  pendente === undefined
                    ? undefined
                    : enigmas.souEuQueDeclarei
                      ? 'Sua declaração está com o narrador.'
                      : `${pendente.autor.apelido} declarou primeiro. Espere o veredito.`
                }
                motivoOculto
                onClick={() => setDeclarando(true)}
              >
                Acho que sei
              </Botao>
            </div>
          )}
          {/* `VIS-04` — na tela de quem não é host esse ⋯ não aparece. */}
          {eu.ehHost && <BotaoDeMenu aoAbrir={() => setMenuDeHost(true)} />}
        </div>
      </BarraDeAcao>

      {/* `ENIG-14` — o que se escreve aqui só o narrador lê. */}
      {declarando && (
        <Modal
          titulo="Como foi que aconteceu?"
          descricao="Só o narrador lê o que você escrever. Se errar, ninguém é eliminado — a mesa continua."
          rotuloConfirmar="Mandar minha versão"
          rotuloCancelar="Pensar mais"
          folha
          aoConfirmar={() => {
            const limpo = rascunhoDeclaracao.trim()
            if (limpo.length > 0) {
              enviar({ t: 'declararSolucao', texto: limpo })
              setDeclarando(false)
              setRascunhoDeclaracao('')
            }
          }}
          aoCancelar={() => {
            setDeclarando(false)
            setRascunhoDeclaracao('')
          }}
        >
          <p className="border-y border-dashed border-linha py-3 text-apoio leading-snug text-texto-2">
            {enigmas.cena}
          </p>
          <CampoDeTexto
            rotulo="sua versão"
            valor={rascunhoDeclaracao}
            aoMudar={setRascunhoDeclaracao}
            limite={LIMITE_DECLARACAO}
            autoFoco
            placeholder="conte a história inteira, não só o final"
            dica="O narrador vai comparar com a solução que está na mão dele."
          />
        </Modal>
      )}

      {/* `ENIG-18` — entregar não tem volta e ninguém pontua. */}
      {confirmandoEntrega && (
        <Modal
          titulo="Entregar a solução?"
          descricao="A mesa lê a resposta e o enigma acaba sem ponto pra ninguém. Não dá pra voltar."
          rotuloConfirmar="Entregar mesmo assim"
          rotuloCancelar="Deixar tentarem"
          aoConfirmar={() => {
            enviar({ t: 'entregarSolucao' })
            setConfirmandoEntrega(false)
          }}
          aoCancelar={() => setConfirmandoEntrega(false)}
        />
      )}

      {menuDeHost && (
        <Modal
          titulo="Ações do host"
          rotuloCancelar="Fechar"
          folha
          aoCancelar={() => setMenuDeHost(false)}
        >
          <Botao
            larguraTotal
            variante="destrutivo"
            onClick={() => {
              setMenuDeHost(false)
              setConfirmandoEncerrar(true)
            }}
          >
            Encerrar a partida
          </Botao>
        </Modal>
      )}

      {/* `ENIG-22` — encerrar é do host e não tem volta. */}
      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="O placar como está agora vira o placar final. Não dá pra voltar pra este enigma."
          rotuloConfirmar="Encerrar e mostrar o placar"
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

/** A cena — o único papel que toda a mesa lê igual, do começo ao fim. */
function Cena({
  texto,
  narrador,
  souNarrador,
}: {
  texto: string
  narrador: string
  souNarrador: boolean
}) {
  return (
    <section className="rounded-papel border border-linha bg-superficie-2 p-4 shadow-[var(--sombra-botao)] sm:p-5">
      <p className="text-rotulo text-texto-3 uppercase">
        {souNarrador ? 'você narra este' : `${narrador} narra este`}
      </p>
      <p className="mt-2 text-titulo leading-snug font-semibold text-texto">{texto}</p>
    </section>
  )
}

/**
 * `ENIG-05` — a solução ocupa o mesmo lugar em todas as telas. Fechada, ela é
 * um bloco pontilhado; aberta, o texto. Ninguém descobre quem narra pela
 * diagramação.
 */
function Solucao({ enigmas }: { enigmas: ProjecaoEnigmas }) {
  if (enigmas.solucao === undefined) {
    return (
      <section className="rounded-papel border border-dashed border-linha p-4">
        <p className="text-rotulo text-texto-3 uppercase">a solução</p>
        <p className="mt-2 text-apoio leading-snug text-texto-3">
          Está na mão de {enigmas.narrador.apelido}. Cai quando alguém desatar — ou quando o
          narrador entregar.
        </p>
      </section>
    )
  }

  const aberta = enigmas.fase === 'revelacao'
  return (
    <section
      className={`rounded-papel border-2 p-4 ${
        aberta ? 'border-pronto bg-superficie-2' : 'border-controle-linha bg-superficie'
      }`}
    >
      <p className="text-rotulo text-texto-3 uppercase">
        {aberta ? 'a solução' : 'a solução — só você lê'}
      </p>
      <p className="mt-2 text-corpo leading-snug text-texto">{enigmas.solucao}</p>
    </section>
  )
}

/** `ENIG-09`, `ENIG-15` — a mesa do narrador: responder e julgar. */
function MesaDoNarrador({
  enigmas,
  aoResponder,
  aoJulgar,
}: {
  enigmas: ProjecaoEnigmas
  aoResponder(perguntaId: number | null, resposta: RespostaDoNarrador): void
  aoJulgar(acertou: boolean): void
}) {
  const pendente = enigmas.declaracaoPendente
  if (enigmas.fase === 'revelacao') return null

  // `ENIG-15` — o veredito vem antes de tudo: a mesa inteira está parada nele.
  if (pendente !== undefined) {
    return (
      <section className="flex flex-col gap-3 rounded-papel border-2 border-controle-linha bg-superficie p-4">
        <div>
          <p className="text-rotulo text-texto-3 uppercase">
            {pendente.autor.apelido} declarou
          </p>
          <p className="mt-2 text-corpo leading-snug text-texto">{pendente.texto}</p>
        </div>
        <p className="text-apoio leading-snug text-texto-3">
          Não precisa ser palavra por palavra. Se a história bate, é ponto.
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Botao larguraTotal onClick={() => aoJulgar(true)}>
              Acertou
            </Botao>
          </div>
          <div className="min-w-0 flex-1">
            <Botao larguraTotal variante="secundario" onClick={() => aoJulgar(false)}>
              Não é essa
            </Botao>
          </div>
        </div>
      </section>
    )
  }

  const naFila = enigmas.perguntas.filter((p) => p.resposta === null)

  // `ENIG-33` — em voz alta não há fila: os três botões marcam a batida.
  if (enigmas.modoPergunta === 'voz') {
    return (
      <section className="flex flex-col gap-3">
        <p className="text-rotulo text-texto-3 uppercase">responda em voz alta</p>
        <TresBotoes aoResponder={(resposta) => aoResponder(null, resposta)} />
        <p className="text-apoio leading-snug text-texto-3">
          A mesa pergunta falando. Cada toque aqui entra no histórico pra todo mundo ver o ritmo do
          enigma.
        </p>
      </section>
    )
  }

  if (naFila.length === 0) {
    return (
      <section className="rounded-papel border border-dashed border-linha p-4">
        <p className="text-rotulo text-texto-3 uppercase">fila vazia</p>
        <p className="mt-2 text-apoio leading-snug text-texto-2">
          Ninguém perguntou ainda. Aproveite pra reler a solução — você vai precisar dela pra julgar.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-rotulo text-texto-3 uppercase">
        na fila ({naFila.length})
      </p>
      {naFila.map((pergunta) => (
        <div
          key={pergunta.id}
          className="flex flex-col gap-3 rounded-papel border border-controle-linha bg-superficie p-4"
        >
          <div>
            <p className="text-rotulo text-texto-3 uppercase">{pergunta.autor.apelido} pergunta</p>
            <p className="mt-1 text-corpo leading-snug text-texto">{pergunta.texto}</p>
          </div>
          <TresBotoes aoResponder={(resposta) => aoResponder(pergunta.id, resposta)} />
        </div>
      ))}
    </section>
  )
}

/** `ENIG-09` — sim, não e não importa. Não existe uma quarta resposta. */
function TresBotoes({ aoResponder }: { aoResponder(resposta: RespostaDoNarrador): void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Botao larguraTotal onClick={() => aoResponder('sim')}>
        Sim
      </Botao>
      <Botao larguraTotal variante="secundario" onClick={() => aoResponder('nao')}>
        Não
      </Botao>
      <Botao larguraTotal variante="secundario" onClick={() => aoResponder('naoImporta')}>
        Não importa
      </Botao>
    </div>
  )
}

/** `ENIG-08` — quem pergunta: um campo, uma pergunta por vez. */
function MesaDeQuemPergunta({
  enigmas,
  rascunho,
  aoMudarRascunho,
  aoPerguntar,
}: {
  enigmas: ProjecaoEnigmas
  rascunho: string
  aoMudarRascunho(texto: string): void
  aoPerguntar(): void
}) {
  if (enigmas.fase === 'revelacao') return null

  if (enigmas.modoPergunta === 'voz') {
    return (
      <section className="rounded-papel border border-dashed border-linha p-4">
        <p className="text-rotulo text-texto-3 uppercase">pergunte em voz alta</p>
        <p className="mt-2 text-apoio leading-snug text-texto-2">
          Esta sala joga falando. Faça a pergunta pra {enigmas.narrador.apelido} e acompanhe a
          resposta aqui embaixo.
        </p>
      </section>
    )
  }

  if (enigmas.minhaPerguntaNaFila) {
    return (
      <section className="rounded-papel border border-dashed border-linha p-4">
        <p className="text-rotulo text-texto-3 uppercase">sua pergunta está na fila</p>
        <p className="mt-2 text-apoio leading-snug text-texto-2">
          Uma por vez: assim que {enigmas.narrador.apelido} responder, o campo volta.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <CampoDeTexto
        rotulo="sua pergunta"
        valor={rascunho}
        aoMudar={aoMudarRascunho}
        limite={LIMITE_PERGUNTA}
        placeholder="algo que se responda com sim ou não"
        dica={`${enigmas.narrador.apelido} só pode responder sim, não ou não importa.`}
      />
      <Botao
        larguraTotal
        motivo={rascunho.trim().length === 0 ? 'Escreva a pergunta primeiro.' : undefined}
        motivoOculto
        onClick={aoPerguntar}
      >
        Mandar pro narrador
      </Botao>
    </section>
  )
}

/**
 * `ENIG-10`, `ENIG-17` — o que já foi perguntado e o que já foi tentado, na
 * ordem. É o que impede a mesa de repetir a mesma pergunta três vezes.
 */
function Historico({ enigmas }: { enigmas: ProjecaoEnigmas }) {
  const respondidas = enigmas.perguntas.filter((p) => p.resposta !== null)
  if (respondidas.length === 0 && enigmas.tentativas.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <p className="text-rotulo text-texto-3 uppercase">o que já se sabe</p>
      <ul className="flex flex-col gap-2">
        {respondidas.map((pergunta) => (
          <li
            key={pergunta.id}
            className="flex items-baseline gap-2 rounded-papel border border-linha bg-superficie px-3.5 py-2.5"
          >
            <span className="min-w-0 flex-1 text-apoio leading-snug text-texto">
              {pergunta.texto === '' ? (
                <span className="text-texto-3">pergunta feita em voz alta</span>
              ) : (
                <>
                  {pergunta.texto}{' '}
                  <span className="text-texto-3">— {pergunta.autor.apelido}</span>
                </>
              )}
            </span>
            <span aria-hidden="true" className="flex-none border-b border-dotted border-linha w-6" />
            <strong
              className={`flex-none font-semibold text-apoio ${
                pergunta.resposta === 'sim' ? 'text-pronto' : 'text-texto-2'
              }`}
            >
              {rotuloDaResposta(pergunta.resposta)}
            </strong>
          </li>
        ))}
        {enigmas.tentativas.map((tentativa, indice) => (
          <li
            key={`tentativa-${indice}`}
            className="rounded-papel border border-dashed border-linha px-3.5 py-2.5"
          >
            <p className="text-rotulo text-texto-3 uppercase">
              {tentativa.autor.apelido} tentou — {tentativa.acertou ? 'era essa' : 'não era essa'}
            </p>
            <p className="mt-1 text-apoio leading-snug text-texto-2">{tentativa.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function rotuloDaResposta(resposta: RespostaDoNarrador | null): string {
  if (resposta === 'sim') return 'SIM'
  if (resposta === 'nao') return 'NÃO'
  if (resposta === 'naoImporta') return 'NÃO IMPORTA'
  return '—'
}

/** `ENIG-24` — o placar da partida, sempre à vista (`AD-015`). */
function Placar({
  enigmas,
  euId,
  jogadores,
}: {
  enigmas: ProjecaoEnigmas
  euId: string
  jogadores: { id: string; cor: Cor }[]
}) {
  return (
    <section className="rounded-papel border border-linha bg-superficie p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-rotulo text-texto-3 uppercase">placar</p>
        {enigmas.metaDePontos !== null && (
          <p className="text-rotulo text-texto-3 uppercase">meta {enigmas.metaDePontos}</p>
        )}
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {enigmas.placar.map((linha) => (
          <li key={linha.id} className="flex items-center gap-2">
            <MarcadorDeJogador
              apelido={linha.apelido}
              cor={jogadores.find((j) => j.id === linha.id)?.cor ?? 'grafite'}
            />
            <span
              className={`min-w-0 flex-1 truncate text-apoio ${
                linha.id === euId ? 'font-semibold text-texto' : 'text-texto-2'
              }`}
            >
              {linha.apelido}
              {linha.id === euId && ' (você)'}
              {linha.id === enigmas.narrador.id && (
                <span className="text-texto-3"> · narra</span>
              )}
            </span>
            <span aria-hidden="true" className="flex-1 border-b border-dotted border-linha" />
            <span className="font-mono text-apoio text-texto tabular-nums">{linha.pontos}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BotaoDeMenu({ aoAbrir }: { aoAbrir(): void }) {
  return (
    <button
      type="button"
      aria-label="Ações do host"
      onClick={aoAbrir}
      className="flex h-13 w-13 flex-none cursor-pointer items-center justify-center rounded-botao border border-controle-linha text-[18px] leading-none text-texto"
    >
      <span aria-hidden="true">⋯</span>
    </button>
  )
}
