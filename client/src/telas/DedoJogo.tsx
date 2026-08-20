import { useEffect, useRef, useState } from 'react'
import type { Cor, JogadorId, Projecao, ProjecaoDedo } from '../../../shared/protocolo'
import {
  BarraDeAcao,
  Botao,
  Chat,
  FaixaDeFase,
  MarcadorDeJogador,
  Modal,
  PainelRecolhivel,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { tocarAcertou, tocarClique, tocarSuaVez } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * A tela do Dedo na Cara (`DEDO-03`…`DEDO-17`).
 *
 * Duas telas em uma, e a virada entre elas é o jogo inteiro: enquanto a votação
 * está aberta, a carta em cima e a mesa embaixo pra apontar; quando o último
 * dedo entra, os mesmos nomes viram a contagem.
 *
 * A regra de desenho: **a lista de gente não muda de lugar entre as duas
 * fases**. Ela vira contagem no mesmo ponto da tela em que era escolha, porque
 * é isso que a mesa está olhando quando os dedos abrem. Trocar o bloco de lugar
 * na apuração faria todo mundo procurar de novo o próprio nome justo no
 * instante da revelação.
 *
 * Nada aqui decide quem levou a carta nem esconde dedo nenhum: numa sala
 * secreta o alvo dos outros nem chega na projeção (`AD-008`, `DEDO-08`).
 */
export function DedoJogo({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const dedo = projecao.jogo?.dedo
  const [menuDeHost, setMenuDeHost] = useState(false)
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)

  // Carta nova na mesa é o instante em que todo mundo olha pro celular.
  const rodada = dedo?.rodada ?? 0
  useEffect(() => {
    if (rodada > 0) tocarSuaVez()
  }, [rodada])

  // Os dedos abrindo é a batida da rodada — vale pra quem levou e pra quem não.
  const apurando = dedo?.fase === 'apuracao'
  const apurandoRef = useRef(false)
  useEffect(() => {
    if (apurando && !apurandoRef.current) tocarAcertou()
    apurandoRef.current = apurando
  }, [apurando])

  if (dedo === undefined) return null

  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const souEspectador = eu.situacao !== 'ativo'
  const faltam = Math.max(0, dedo.quantosDevemVotar - dedo.quantosVotaram)

  const apontar = (alvoId: JogadorId) => {
    tocarClique()
    enviar({ t: 'apontar', alvoId })
  }

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          selo={
            apurando ? (dedo.empatou ? 'empate' : 'na cara dele') : `carta ${dedo.rodada}`
          }
          tom={apurando ? (dedo.empatou ? 'tinta' : 'pronto') : 'esmalte'}
        >
          {apurando
            ? dedo.empatou
              ? 'A mesa se dividiu. Esta carta não foi de ninguém.'
              : dedo.vencedor?.id === eu.id
                ? `Foi você, com ${contarDedos(dedo.vencedor.votos)}. Boa sorte se explicando.`
                : `${dedo.vencedor?.apelido} levou a carta com ${contarDedos(dedo.vencedor?.votos ?? 0)}.`
            : souEspectador
              ? 'Você entrou no meio — assista esta e entra na próxima partida.'
              : dedo.meuVoto === null
                ? 'Aponte pra alguém. A contagem fecha quando o último apontar.'
                : faltam === 0
                  ? 'Todos apontaram. Contando os dedos…'
                  : `Seu dedo está de pé. ${faltam === 1 ? 'Falta 1' : `Faltam ${faltam}`}.`}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          <CartaDaMesa texto={dedo.carta} rodada={dedo.rodada} />

          <AMesa
            dedo={dedo}
            ativos={ativos}
            euId={eu.id}
            podeApontar={!apurando && !souEspectador}
            aoApontar={apontar}
          />

          <div className="flex flex-col gap-4 lg:hidden">
            <Placar dedo={dedo} euId={eu.id} jogadores={jogadores} />
            <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            </PainelRecolhivel>
          </div>
        </div>

        <div className="hidden flex-col gap-4 lg:flex">
          <Placar dedo={dedo} euId={eu.id} jogadores={jogadores} />
          <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </PainelRecolhivel>
        </div>
      </div>

      <BarraDeAcao>
        <div className="flex items-center gap-2">
          {/*
            `DEDO-15` — virar a carta é de qualquer um que esteja jogando, e não
            só do host: não há narrador aqui, e a mesa inteira parada esperando
            uma pessoa clicar mata o ritmo de uma rodada de quinze segundos.
          */}
          {apurando ? (
            <div className="min-w-0 flex-1">
              <Botao
                larguraTotal
                motivo={souEspectador ? 'Você entra na próxima partida.' : undefined}
                motivoOculto
                onClick={() => enviar({ t: 'proximaCarta' })}
              >
                Próxima carta
              </Botao>
            </div>
          ) : (
            <p className="min-w-0 flex-1 text-apoio leading-snug text-texto-2">
              {souEspectador ? (
                <>
                  <strong className="font-semibold text-texto">Você está de fora.</strong> A mesa
                  está apontando.
                </>
              ) : dedo.votacao === 'secreta' ? (
                <>
                  <strong className="font-semibold text-texto">Dedo escondido.</strong> Ninguém vê
                  pra quem você apontou até todo mundo apontar.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-texto">Dedo à vista.</strong> Cada um vê o
                  dedo do outro na hora — dá pra mudar até fechar.
                </>
              )}
            </p>
          )}
          {/* `VIS-04` — na tela de quem não é host esse ⋯ não aparece. */}
          {eu.ehHost && <BotaoDeMenu aoAbrir={() => setMenuDeHost(true)} />}
        </div>
      </BarraDeAcao>

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

      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="O placar como está agora vira o placar final. Não dá pra voltar pra esta carta."
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

function contarDedos(quantos: number): string {
  return `${quantos} ${quantos === 1 ? 'dedo' : 'dedos'}`
}

/** `DEDO-03` — a carta é da mesa inteira, e é o maior texto da tela. */
function CartaDaMesa({ texto, rodada }: { texto: string; rodada: number }) {
  return (
    <section className="rounded-papel border border-linha bg-superficie-2 p-4 shadow-[var(--sombra-botao)] sm:p-5">
      <p className="text-rotulo text-texto-3 uppercase">carta {rodada}</p>
      {/* A interrogação é da tela: no dado a carta é só a frase (`DEDO-20`). */}
      <p className="mt-2 font-display text-secao leading-snug text-texto">{texto}?</p>
    </section>
  )
}

/**
 * A mesa — o mesmo bloco nas duas fases (`DEDO-05`, `DEDO-11`).
 *
 * Na votação cada linha é um botão; na apuração as mesmas linhas mostram
 * quantos dedos cada um levou. O nome de cada pessoa não sai do lugar.
 */
function AMesa({
  dedo,
  ativos,
  euId,
  podeApontar,
  aoApontar,
}: {
  dedo: ProjecaoDedo
  ativos: Projecao['jogadores']
  euId: JogadorId
  podeApontar: boolean
  aoApontar(alvoId: JogadorId): void
}) {
  const apurando = dedo.fase === 'apuracao'
  const contagem = new Map<JogadorId, string[]>()
  for (const voto of dedo.votos) {
    if (voto.alvo === undefined) continue
    contagem.set(voto.alvo.id, [...(contagem.get(voto.alvo.id) ?? []), voto.eleitor.apelido])
  }

  const jaApontaram = dedo.votos.map((voto) => voto.eleitor.id)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-secao text-texto">
          {apurando ? 'Os dedos' : 'Quem aqui?'}
        </h2>
        <span className="font-mono text-rotulo text-texto-3 uppercase">
          {apurando
            ? dedo.empatou
              ? 'empate — ninguém pontuou'
              : 'contagem fechada'
            : `${dedo.quantosVotaram} de ${dedo.quantosDevemVotar} apontaram`}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {ativos.map((jogador) => {
          const meuDedoNele = dedo.meuVoto === jogador.id
          const quem = contagem.get(jogador.id) ?? []
          const levou = apurando && dedo.vencedor?.id === jogador.id
          const conteudo = (
            <>
              <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} tamanho="grande" />
              <span className="min-w-0 flex-1 truncate text-apoio font-semibold text-texto">
                {jogador.apelido}
                {jogador.id === euId && <span className="text-texto-3"> · você</span>}
                {/* Quem já apontou aparece mesmo na sala secreta: o que fica escondido é o alvo. */}
                {!apurando && jaApontaram.includes(jogador.id) && (
                  <span className="text-texto-3"> · já apontou</span>
                )}
                {quem.length > 0 && (
                  <span className="block truncate text-compacto-apoio font-normal text-texto-3">
                    {quem.join(', ')}
                  </span>
                )}
              </span>
              {meuDedoNele && !apurando && (
                <span className="flex-none font-mono text-compacto-apoio tracking-[0.1em] text-acento uppercase">
                  seu dedo
                </span>
              )}
              {quem.length > 0 && (
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-pilula font-mono text-compacto ${
                    levou ? 'bg-acento text-acento-contraste' : 'bg-controle-linha text-fundo'
                  }`}
                >
                  {quem.length}
                </span>
              )}
            </>
          )

          if (!podeApontar) {
            return (
              <li
                key={jogador.id}
                className={`flex min-h-12 items-center gap-2.5 rounded-botao px-3 py-2 ${
                  levou ? 'border-2 border-pronto bg-superficie-2' : 'border border-linha'
                } ${jogador.conectado ? '' : 'opacity-55'}`}
              >
                {conteudo}
              </li>
            )
          }

          return (
            <li key={jogador.id}>
              <button
                type="button"
                onClick={() => aoApontar(jogador.id)}
                // `DEDO-06` — sem auto-voto, o próprio nome nem é clicável.
                disabled={jogador.id === euId && !dedo.autoVoto}
                aria-pressed={meuDedoNele}
                className={`flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-botao px-3 py-2 text-left disabled:cursor-default disabled:opacity-55 ${
                  meuDedoNele
                    ? 'border-2 border-controle-linha bg-superficie shadow-chip'
                    : 'border border-linha'
                } ${jogador.conectado ? '' : 'opacity-55'}`}
              >
                {conteudo}
              </button>
            </li>
          )
        })}
      </ul>

      {!apurando && (
        <p className="text-apoio leading-snug text-texto-3">
          Trocar o dedo de lugar é permitido até a contagem fechar. Leva a carta quem tiver{' '}
          <strong className="font-semibold text-texto">mais dedos que qualquer outro</strong> —
          empatou no topo, ninguém pontua.
        </p>
      )}
    </section>
  )
}

/** `DEDO-16` — o placar da partida, sempre à vista (`AD-015`). */
function Placar({
  dedo,
  euId,
  jogadores,
}: {
  dedo: ProjecaoDedo
  euId: JogadorId
  jogadores: { id: string; cor: Cor }[]
}) {
  return (
    <section className="rounded-papel border border-linha bg-superficie p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-rotulo text-texto-3 uppercase">placar</p>
        {dedo.metaDePontos !== null && (
          <p className="text-rotulo text-texto-3 uppercase">meta {dedo.metaDePontos}</p>
        )}
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {dedo.placar.map((linha) => (
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
