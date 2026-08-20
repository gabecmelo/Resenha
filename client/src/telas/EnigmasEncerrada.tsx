import { useEffect } from 'react'
import {
  BarraDeAcao,
  Botao,
  Chat,
  ConviteDeApoio,
  FaixaDeFase,
  MarcadorDeJogador,
  PainelRecolhivel,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { tocarAcertou } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * O placar final (`ENIG-25`, `ENIG-26`) — visível pra todo mundo, inclusive pra
 * quem entrou depois de encerrada.
 *
 * O campeão vem primeiro e grande: é a única coisa que a mesa vai lembrar
 * amanhã. O placar completo vem logo abaixo, porque o segundo lugar também tem
 * o que reclamar. Empate no topo não é desempatado — dois campeões é uma
 * resposta melhor que um critério inventado (`ENIG-26`).
 */
export function EnigmasEncerrada({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const enigmas = projecao.jogo?.enigmas
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const aguardando = jogadores.filter((jogador) => jogador.situacao === 'aguardando')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)

  useEffect(() => {
    tocarAcertou()
  }, [])

  if (enigmas === undefined) return null

  const campeoes = enigmas.campeoes ?? []
  const souCampeao = campeoes.some((campeao) => campeao.id === eu.id)

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          selo={campeoes.length > 1 ? 'empate no topo' : 'fim de partida'}
          tom={campeoes.length === 0 ? 'tinta' : 'pronto'}
        >
          {campeoes.length === 0
            ? 'A partida acabou sem ninguém desatar nada.'
            : souCampeao
              ? 'Você desatou mais que todo mundo. Levou a partida.'
              : `${listar(campeoes.map((campeao) => campeao.apelido))} ${
                  campeoes.length > 1 ? 'levaram' : 'levou'
                } a partida.`}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          {campeoes.length > 0 && (
            <section className="rounded-papel border border-pronto bg-superficie-2 p-4 shadow-[var(--sombra-botao)] sm:p-5">
              <p className="text-rotulo text-texto-3 uppercase">
                {campeoes.length > 1 ? 'campeões' : 'campeão'}
              </p>
              <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {campeoes.map((campeao) => (
                  <li key={campeao.id} className="flex items-center gap-2">
                    <MarcadorDeJogador
                      apelido={campeao.apelido}
                      cor={jogadores.find((j) => j.id === campeao.id)?.cor ?? 'grafite'}
                      tamanho="grande"
                    />
                    <span className="text-titulo leading-snug font-semibold text-texto">
                      {campeao.apelido}
                    </span>
                    <span className="font-mono text-apoio text-texto-2 tabular-nums">
                      {campeao.pontos} {campeao.pontos === 1 ? 'ponto' : 'pontos'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-papel border border-linha bg-superficie p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-rotulo text-texto-3 uppercase">placar final</p>
              <p className="text-rotulo text-texto-3 uppercase">
                {enigmas.rodada} {enigmas.rodada === 1 ? 'enigma' : 'enigmas'}
              </p>
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
                      linha.id === eu.id ? 'font-semibold text-texto' : 'text-texto-2'
                    }`}
                  >
                    {linha.apelido}
                    {linha.id === eu.id && ' (você)'}
                  </span>
                  <span aria-hidden="true" className="flex-1 border-b border-dotted border-linha" />
                  <span className="font-mono text-apoio text-texto tabular-nums">{linha.pontos}</span>
                </li>
              ))}
            </ul>
            {aguardando.length > 0 && (
              <p className="mt-3 border-t border-dashed border-linha pt-3 text-apoio text-texto-3">
                {listar(aguardando.map((jogador) => jogador.apelido))}{' '}
                {aguardando.length === 1 ? 'chegou' : 'chegaram'} no meio — {aguardando.length === 1 ? 'entra' : 'entram'} na próxima.
              </p>
            )}
          </section>

          {/* O pedido de apoio mora aqui: depois do que a partida produziu, antes da ação. */}
          <ConviteDeApoio />

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

      {/* `VIS-04` — "Nova partida" não existe na tela de quem não é host. */}
      <BarraDeAcao>
        {eu.ehHost ? (
          <>
            <Botao larguraTotal onClick={() => enviar({ t: 'novaPartida' })}>
              {aguardando.length > 0
                ? `Voltar ao lobby com ${ativos.length + aguardando.length}`
                : 'Voltar ao lobby'}
            </Botao>
            <p className="text-apoio text-texto-3">
              Mesma mesa, ninguém precisa entrar de novo. O placar zera na próxima — este aqui
              acabou de virar história.
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            {host !== undefined && (
              <MarcadorDeJogador apelido={host.apelido} cor={host.cor} tamanho="grande" />
            )}
            <p className="text-apoio leading-snug text-texto-2">
              <strong className="font-semibold text-texto">{host?.apelido ?? 'O host'} decide</strong>{' '}
              se tem próxima. Fique onde está — se começar outra, você entra automaticamente.
            </p>
          </div>
        )}
      </BarraDeAcao>
    </Shell>
  )
}

function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}
