import { useEffect, useRef, useState } from 'react'
import type { Cor, ProjecaoCartas } from '../../../shared/protocolo'
import { LIMITE_CARTA_BRANCA } from '../../../shared/protocolo'
import {
  Apurando,
  BarraDeAcao,
  Botao,
  CampoDeTexto,
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
import { tocarAcertou, tocarSuaVez, tocarTempoAcabando, tocarVezOutro } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * A tela da rodada de Cartas Contra a Turma (`CCT-04`…`CCT-14`).
 *
 * As três fases da rodada moram na mesma tela porque são a mesma rodada: a
 * pergunta fica no lugar dela o tempo todo, e o que muda embaixo é o que a mesa
 * tem em mãos — a sua mão, a pilha anônima, a carta que ganhou.
 *
 * A regra que manda no desenho: **toda carta de resposta tem a mesma
 * silhueta**. A da mão, a da pilha e a vencedora são o mesmo papel; muda o
 * texto e, na vencedora, o carimbo. Se desse pra adivinhar de quem é a carta
 * pelo formato dela, o jogo vazava.
 *
 * Nada aqui decide quem é juiz, o que entra na pilha ou quem ganhou: tudo isso
 * chega pronto na projeção (`AD-008`).
 */
export function CartasJogo({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const cartas = projecao.jogo?.cartas
  const [menuDeHost, setMenuDeHost] = useState(false)
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)
  const [escrevendo, setEscrevendo] = useState(false)
  const [rascunho, setRascunho] = useState('')

  // A rodada nova chegando na tela é o instante em que todo mundo olha pro
  // celular — o mesmo papel que "sua vez" tem nos outros jogos.
  const rodada = cartas?.rodada ?? 0
  useEffect(() => {
    if (rodada > 0) tocarSuaVez()
  }, [rodada])

  // A pilha fechar puxa a mesa de volta: quem já tinha jogado precisa perceber
  // que agora é hora de olhar as respostas.
  const emJulgamento = cartas?.fase === 'julgamento'
  const eraJulgamentoRef = useRef(false)
  useEffect(() => {
    if (emJulgamento && !eraJulgamentoRef.current) tocarVezOutro()
    eraJulgamentoRef.current = emJulgamento
  }, [emJulgamento])

  // A mesa não vira a carta no mesmo instante em que o juiz clica: uma batida
  // curta separa o "escolheu" do "foi o fulano".
  const temVencedora = cartas?.vencedora !== undefined
  const apurando = useBatidaDeSuspense(temVencedora)
  const revelado = temVencedora && !apurando

  const tinhaVencedoraRef = useRef(false)
  useEffect(() => {
    if (revelado && !tinhaVencedoraRef.current) tocarAcertou()
    tinhaVencedoraRef.current = revelado
  }, [revelado])

  const restante = useRestante(cartas?.prazoEscolha ?? null, sala.config.cartas.tempoEscolhaSeg)
  const acabando = cartas?.fase === 'escolha' && estaAcabando(restante)

  const avisouRef = useRef(false)
  useEffect(() => {
    if (acabando && !avisouRef.current) tocarTempoAcabando()
    avisouRef.current = acabando
  }, [acabando])

  if (cartas === undefined) return null

  const jaJoguei = cartas.minhaJogada !== undefined
  const brancaPronta = cartas.brancaVoltaEm === 0

  const jogar = (texto: string, daBranca: boolean) => {
    enviar({ t: 'jogarCarta', texto, daBranca })
    setEscrevendo(false)
    setRascunho('')
  }

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          selo={
            cartas.fase === 'revelacao'
              ? apurando
                ? 'apurando'
                : 'ganhou'
              : cartas.fase === 'julgamento'
                ? 'julgando'
                : acabando
                  ? 'último minuto'
                  : `rodada ${cartas.rodada}`
          }
          tom={
            cartas.fase === 'revelacao'
              ? 'pronto'
              : cartas.fase === 'julgamento' || acabando
                ? 'mostarda'
                : 'esmalte'
          }
          relogio={
            cartas.fase === 'escolha' ? (
              <RelogioDaFaixa
                texto={restante === null ? null : formatarTempo(restante)}
                acabando={acabando}
              />
            ) : undefined
          }
        >
          {cartas.fase === 'revelacao'
            ? apurando
              ? 'O juiz decidiu. Virando a carta…'
              : `${cartas.vencedora?.autor.apelido} levou a rodada.`
            : cartas.fase === 'julgamento'
              ? cartas.souJuiz
                ? 'A pilha é sua. Escolha a que fez a mesa rir.'
                : `${cartas.juiz.apelido} está lendo as respostas.`
              : cartas.souJuiz
                ? 'Você julga esta rodada — não joga carta.'
                : jaJoguei
                  ? 'Sua carta está na mesa. Esperando o resto.'
                  : 'Escolha a pior resposta possível.'}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          <CartaPergunta texto={cartas.pergunta} juiz={cartas.juiz.apelido} souJuiz={cartas.souJuiz} />

          {cartas.fase === 'escolha' ? (
            <FaseDeEscolha
              cartas={cartas}
              jaJoguei={jaJoguei}
              brancaPronta={brancaPronta}
              aoJogar={(texto) => jogar(texto, false)}
              aoEscrever={() => setEscrevendo(true)}
            />
          ) : apurando ? (
            <Apurando rotulo="o juiz decidiu" texto="Virando a carta…" />
          ) : (
            <Pilha
              cartas={cartas}
              aoEscolher={(indice) => enviar({ t: 'escolherVencedora', indice })}
            />
          )}

          <Placar cartas={cartas} euId={eu.id} jogadores={jogadores} />

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
          <p className="min-w-0 flex-1 text-apoio leading-snug text-texto-2">
            {cartas.fase === 'revelacao' ? (
              apurando ? (
                <>Ninguém mexe até todo mundo ver a mesma carta.</>
              ) : (
                <>
                  <strong className="font-semibold text-texto">
                    {cartas.vencedora?.autor.apelido} marcou o ponto.
                  </strong>{' '}
                  A próxima rodada começa em instantes.
                </>
              )
            ) : cartas.fase === 'julgamento' ? (
              cartas.souJuiz ? (
                <>Toque na carta que você escolher. Ninguém sabe de quem é — nem você.</>
              ) : (
                <>
                  As respostas estão embaralhadas e sem dono.{' '}
                  <span className="text-texto-3">Nem tente adivinhar pela ordem.</span>
                </>
              )
            ) : cartas.souJuiz ? (
              <>
                <strong className="font-semibold text-texto">
                  {cartas.quantosJogaram} de {cartas.totalEsperado} já jogaram.
                </strong>{' '}
                {cartas.faltam.length > 0 && `Falta ${listar(cartas.faltam.map((j) => j.apelido))}.`}
              </>
            ) : jaJoguei ? (
              <>
                Você jogou. {cartas.quantosJogaram} de {cartas.totalEsperado} na mesa.
              </>
            ) : (
              <>
                Toque numa carta da sua mão pra jogar.{' '}
                <span className="text-texto-3">
                  {brancaPronta
                    ? 'Ou escreva a sua.'
                    : `Sua carta em branco volta em ${cartas.brancaVoltaEm} ${
                        cartas.brancaVoltaEm === 1 ? 'rodada' : 'rodadas'
                      }.`}
                </span>
              </>
            )}
          </p>
          {/* `VIS-04` — na tela de quem não é host esse ⋯ não aparece. */}
          {eu.ehHost && <BotaoDeMenu aoAbrir={() => setMenuDeHost(true)} />}
        </div>
      </BarraDeAcao>

      {/* `CCT-20` — a carta em branco é uma folha em branco de verdade. */}
      {escrevendo && (
        <Modal
          titulo="Escreva a sua"
          descricao="Ela entra na pilha igual às outras — embaralhada e sem o seu nome."
          rotuloConfirmar="Jogar essa"
          rotuloCancelar="Deixar pra depois"
          folha
          aoConfirmar={() => {
            // O campo vazio não vira comando: o botão fica, mas não faz nada
            // até haver texto — quem recusa de verdade continua sendo o
            // servidor (`CCT-21`).
            if (rascunho.trim().length > 0) jogar(rascunho, true)
          }}
          aoCancelar={() => {
            setEscrevendo(false)
            setRascunho('')
          }}
        >
          <p className="border-y border-dashed border-linha py-3 text-apoio leading-snug text-texto-2">
            {cartas.pergunta}
          </p>
          <CampoDeTexto
            rotulo="sua resposta"
            valor={rascunho}
            aoMudar={setRascunho}
            limite={LIMITE_CARTA_BRANCA}
            autoFoco
            placeholder="a pior coisa que você conseguir pensar"
            dica="Depois de gastar, ela volta daqui a 5 rodadas."
          />
        </Modal>
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

      {/* `CCT-16` — encerrar é do host e não tem volta: o placar de agora vira o final. */}
      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="O placar como está agora vira o placar final. Não dá pra voltar pra esta rodada."
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

/** A frase da rodada — o único papel da mesa que todo mundo lê igual. */
function CartaPergunta({
  texto,
  juiz,
  souJuiz,
}: {
  texto: string
  juiz: string
  souJuiz: boolean
}) {
  return (
    <section className="rounded-papel border border-linha bg-superficie-2 p-4 shadow-[var(--sombra-botao)] sm:p-5">
      <p className="text-rotulo text-texto-3 uppercase">
        {souJuiz ? 'você julga esta' : `${juiz} julga esta`}
      </p>
      <p className="mt-2 text-titulo leading-snug font-semibold text-texto">{texto}</p>
    </section>
  )
}

/** `CCT-04`, `CCT-05` — a mão, ou o lugar dela quando não há o que jogar. */
function FaseDeEscolha({
  cartas,
  jaJoguei,
  brancaPronta,
  aoJogar,
  aoEscrever,
}: {
  cartas: ProjecaoCartas
  jaJoguei: boolean
  brancaPronta: boolean
  aoJogar(texto: string): void
  aoEscrever(): void
}) {
  if (cartas.souJuiz) {
    return (
      <Aviso
        rotulo="sem mão nesta rodada"
        texto="Você lê as respostas quando todo mundo jogar. Aproveite pra pensar num critério — ele vai ser questionado."
      />
    )
  }

  if (jaJoguei) {
    return (
      <section className="flex flex-col gap-3">
        <p className="text-rotulo text-texto-3 uppercase">sua carta na mesa</p>
        <CartaResposta texto={cartas.minhaJogada ?? ''} marcada />
        <p className="text-apoio leading-snug text-texto-3">
          Ela já está embaralhada com as outras. Nem o juiz sabe que é sua.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-rotulo text-texto-3 uppercase">sua mão</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {(cartas.mao ?? []).map((texto) => (
          <CartaResposta key={texto} texto={texto} aoEscolher={() => aoJogar(texto)} />
        ))}
      </div>
      {/* `CCT-25` — desabilitado sempre diz por quê; aqui o próprio rótulo diz. */}
      <Botao
        larguraTotal
        variante="secundario"
        motivo={brancaPronta ? undefined : 'Sua carta em branco ainda está recarregando.'}
        motivoOculto
        onClick={aoEscrever}
      >
        {brancaPronta
          ? '✎ escrever a minha'
          : `✎ volta em ${cartas.brancaVoltaEm} ${cartas.brancaVoltaEm === 1 ? 'rodada' : 'rodadas'}`}
      </Botao>
    </section>
  )
}

/** `CCT-08` — a pilha: embaralhada, sem dono, e só o juiz toca. */
function Pilha({
  cartas,
  aoEscolher,
}: {
  cartas: ProjecaoCartas
  aoEscolher(indice: number): void
}) {
  const vencedora = cartas.vencedora
  return (
    <section className="flex flex-col gap-3">
      <p className="text-rotulo text-texto-3 uppercase">
        {vencedora === undefined ? 'respostas da mesa' : 'a que ganhou'}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {(cartas.pilha ?? []).map((texto, indice) => {
          const ganhou = vencedora?.indice === indice
          if (vencedora !== undefined && !ganhou) return null
          return (
            <CartaResposta
              key={`${indice}-${texto}`}
              texto={texto}
              marcada={ganhou}
              autor={ganhou ? vencedora.autor.apelido : undefined}
              aoEscolher={
                vencedora === undefined && cartas.souJuiz ? () => aoEscolher(indice) : undefined
              }
            />
          )
        })}
      </div>
    </section>
  )
}

/**
 * Uma carta de resposta. Mesma silhueta sempre — é o que garante que a pilha
 * não entregue nada pela forma.
 */
function CartaResposta({
  texto,
  marcada = false,
  autor,
  aoEscolher,
}: {
  texto: string
  marcada?: boolean
  autor?: string | undefined
  aoEscolher?: (() => void) | undefined
}) {
  const corpo = (
    <>
      <p className="text-corpo leading-snug text-texto">{texto}</p>
      {autor !== undefined && (
        <p className="mt-2 text-rotulo text-texto-3 uppercase">✦ {autor}</p>
      )}
    </>
  )

  const base = `rounded-papel border p-3.5 text-left ${
    marcada ? 'border-pronto bg-superficie-2' : 'border-linha bg-superficie'
  }`

  if (aoEscolher === undefined) {
    return <div className={base}>{corpo}</div>
  }

  return (
    <button
      type="button"
      onClick={aoEscolher}
      className={`${base} cursor-pointer shadow-[var(--sombra-botao)] transition-transform hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
    >
      {corpo}
    </button>
  )
}

/** `CCT-26` — o placar da partida, sempre à vista (`AD-015`). */
function Placar({
  cartas,
  euId,
  jogadores,
}: {
  cartas: ProjecaoCartas
  euId: string
  jogadores: { id: string; cor: Cor }[]
}) {
  return (
    <section className="rounded-papel border border-linha bg-superficie p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-rotulo text-texto-3 uppercase">placar</p>
        {cartas.metaDePontos !== null && (
          <p className="text-rotulo text-texto-3 uppercase">meta {cartas.metaDePontos}</p>
        )}
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {cartas.placar.map((linha) => (
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
            </span>
            <span aria-hidden="true" className="flex-1 border-b border-dotted border-linha" />
            <span className="font-mono text-apoio text-texto tabular-nums">{linha.pontos}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Aviso({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <section className="rounded-papel border border-dashed border-linha p-4">
      <p className="text-rotulo text-texto-3 uppercase">{rotulo}</p>
      <p className="mt-2 text-apoio leading-snug text-texto-2">{texto}</p>
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

function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}
