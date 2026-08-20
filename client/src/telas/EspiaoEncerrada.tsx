import { useEffect } from 'react'
import {
  Apurando,
  BarraDeAcao,
  BlocoDeNotas,
  Botao,
  Chat,
  ConviteDeApoio,
  FaixaDeFase,
  MarcadorDeJogador,
  PainelRecolhivel,
  ResultadoDaVotacao,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { tocarAcertou } from '../sons'
import { useBatidaDeSuspense } from '../estado/suspense'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * A revelação de Espião (`ESP-16`) — o local e todos os espiões, visível pra
 * todo mundo, inclusive quem entrou depois de encerrada.
 *
 * O local vem primeiro: é o que a mesa passou a partida inteira protegendo.
 * Depois as fichas de quem estava infiltrado — e aqui o mostarda finalmente
 * entra, porque a informação virou pública e a cor já pode marcar.
 */
export function EspiaoEncerrada({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const espiao = projecao.jogo?.espiao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const aguardando = jogadores.filter((jogador) => jogador.situacao === 'aguardando')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)

  // Quando a partida acabou por uma acusação, esta tela *é* a virada da carta:
  // ela nasce revelada e por isso a batida vale desde a entrada. Encerramento
  // manual do host não tem veredito e também não tem suspense a criar.
  const porVotacao = espiao?.resultadoVotacao !== undefined
  const apurando = useBatidaDeSuspense(porVotacao, { naEntrada: true })

  // A revelação é o clímax da rodada — o mesmo som de acerto de "Quem Sou Eu?".
  useEffect(() => {
    if (!apurando) tocarAcertou()
  }, [apurando])

  if (espiao === undefined) return null

  // `ESP-33`, `ESP-34` — só existe veredito quando a partida acabou por uma
  // acusação. Encerrar na mão não é aposta coletiva: não há o que julgar.
  const veredito = espiao.resultadoVotacao
  const espioesIds = new Set((espiao.espioes ?? []).map((espiaoDaLista) => espiaoDaLista.id))
  const espioesNaMesa = jogadores.filter((jogador) => espioesIds.has(jogador.id))
  const euEraEspiao = espioesIds.has(eu.id)

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          selo={
            apurando
              ? 'apurando'
              : espiao.vencedor === 'mesa'
                ? 'a mesa venceu'
                : espiao.vencedor === 'espioes'
                  ? espioesNaMesa.length === 1
                    ? 'o espião venceu'
                    : 'os espiões venceram'
                  : 'partida encerrada'
          }
          tom={apurando ? 'tinta' : espiao.vencedor === 'mesa' ? 'pronto' : 'tinta'}
        >
          {apurando
            ? 'A votação fechou. Contando os votos…'
            : motivoDaVitoria(espiao, euEraEspiao)}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          {apurando && <Apurando rotulo="votação encerrada" texto="Contando os votos…" />}

          <section hidden={apurando} className="flex flex-col gap-2.5 rounded-papel bg-acento p-5 sm:p-6">
            <span className="font-mono text-rotulo text-acento-contraste/75 uppercase">
              o local era
            </span>
            <span className="font-display text-display text-balance text-acento-contraste">
              {espiao.local}
            </span>
          </section>

          <section hidden={apurando} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-secao text-texto">
                {espioesNaMesa.length === 1 ? 'O espião era' : 'Os espiões eram'}
              </h2>
              {espioesNaMesa.length > 1 && (
                <span className="font-mono text-rotulo text-texto-3 uppercase">
                  {espioesNaMesa.length} infiltrados
                  {sala.config.espiao.espioesSeVeem && ' · e eles se viam'}
                </span>
              )}
            </div>

            <ul className="flex flex-col gap-2">
              {espioesNaMesa.map((jogador) => (
                <li
                  key={jogador.id}
                  className="flex min-h-13 items-center gap-2.5 rounded-botao border-2 border-aviso bg-superficie px-3 py-2.5"
                >
                  <MarcadorDeJogador
                    apelido={jogador.apelido}
                    cor={jogador.cor}
                    tamanho="grande"
                  />
                  <span className="min-w-0 flex-1 truncate font-display text-secao text-texto">
                    {jogador.apelido}
                    {jogador.id === eu.id && (
                      <span className="font-sans text-apoio font-semibold text-texto-3"> · você</span>
                    )}
                  </span>
                  <span className="selo bg-aviso text-aviso-contraste">espião</span>
                </li>
              ))}
            </ul>
          </section>

          {espiao.chuteFeito !== undefined && !apurando && (
            <section className="flex flex-col gap-2 rounded-papel border-2 border-controle-linha bg-superficie p-4">
              <p className="text-rotulo text-texto-3 uppercase">a última cartada</p>
              <p className="text-corpo leading-snug text-texto">
                {espiao.chuteFeito.local === null ? (
                  <>
                    {espiao.chuteFeito.espiao.apelido} foi pego e não disse nada a tempo.
                  </>
                ) : (
                  <>
                    {espiao.chuteFeito.espiao.apelido} chutou{' '}
                    <strong className="font-semibold">“{espiao.chuteFeito.local}”</strong> —{' '}
                    {espiao.chuteFeito.acertou ? 'e acertou.' : 'e errou.'}
                  </>
                )}
              </p>
            </section>
          )}

          {veredito !== undefined && !apurando && (
            <ResultadoDaVotacao resultado={veredito} jogadores={jogadores} euId={eu.id} />
          )}

          {aguardando.length > 0 && <EntramNaProxima jogadores={aguardando} />}

          {/* O pedido de apoio mora aqui: depois do que a partida produziu, antes da ação. */}
          <ConviteDeApoio />

          <div className="flex flex-col gap-3 lg:hidden">
            <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
            <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            </PainelRecolhivel>
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          {/* `NOTA-01` — o bloco continua disponível até a próxima partida limpar tudo. */}
          <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
          <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </PainelRecolhivel>
        </div>
      </div>

      {/* `VIS-04` — "Nova partida" não existe na tela de quem não é host. */}
      <BarraDeAcao>
        {eu.ehHost ? (
          <>
            {/*
              Um botão só: voltar ao lobby *é* começar outra partida. De lá a
              mesa decide se muda as regras, troca de jogo ou só começa de novo.
            */}
            <Botao larguraTotal onClick={() => enviar({ t: 'novaPartida' })}>
              {aguardando.length > 0
                ? `Voltar ao lobby com ${ativos.length + aguardando.length}`
                : 'Voltar ao lobby'}
            </Botao>
            <p className="text-apoio text-texto-3">
              Mesma mesa, ninguém precisa entrar de novo. No lobby você escolhe as regras da
              próxima ou troca de jogo — e as anotações desta partida somem.
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            {host !== undefined && (
              <MarcadorDeJogador apelido={host.apelido} cor={host.cor} tamanho="grande" />
            )}
            <p className="text-apoio leading-snug text-texto-2">
              <strong className="font-semibold text-texto">
                {host?.apelido ?? 'O host'} decide
              </strong>{' '}
              se tem próxima rodada. Fique onde está — se começar outra, você entra automaticamente.
            </p>
          </div>
        )}
      </BarraDeAcao>
    </Shell>
  )
}

/**
 * `ESP-49` — por que a partida acabou assim. A frase é a única coisa que a mesa
 * lê antes de discutir, então ela diz o **motivo**, não só o placar.
 */
function motivoDaVitoria(
  espiao: NonNullable<PropsDaTela['projecao']['jogo']>['espiao'],
  euEraEspiao: boolean,
): string {
  if (espiao === undefined) return 'O local e os espiões caíram.'

  const chute = espiao.chuteFeito
  if (chute !== undefined) {
    if (chute.acertou) return 'Pego, mas acertou o local na última cartada. Os espiões venceram.'
    if (chute.local === null) return 'Pego, e não disse o local a tempo. A mesa venceu.'
    return 'Pego, e errou o local na última cartada. A mesa venceu.'
  }

  const veredito = espiao.resultadoVotacao
  if (veredito?.desfecho === 'mesaPerdeu') {
    return `A mesa expulsou ${veredito.acusado?.apelido ?? 'alguém'}, que não era espião. Os espiões venceram.`
  }
  if (veredito?.desfecho === 'tempoEsgotado') {
    return 'O tempo acabou e a votação final não expulsou ninguém. Os espiões venceram.'
  }

  return euEraEspiao
    ? 'Você era o espião — agora a mesa sabe.'
    : 'A partida foi encerrada. O local e os espiões caíram.'
}

function EntramNaProxima({ jogadores }: { jogadores: PropsDaTela['projecao']['jogadores'] }) {
  return (
    <section className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-linha pt-3.5">
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {jogadores.map((jogador) => (
          <li key={jogador.id} className="flex items-center gap-1.5">
            <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} tamanho="miudo" />
            <span className="text-apoio font-semibold text-texto">{jogador.apelido}</span>
          </li>
        ))}
      </ul>
      <span className="text-apoio text-texto-3">
        {jogadores.length === 1 ? 'chegou no meio — entra' : 'chegaram no meio — entram'} na
        próxima.
      </span>
    </section>
  )
}
