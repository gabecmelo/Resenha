import {
  BarraDeAcao,
  BlocoDeNotas,
  Botao,
  Carta,
  Chat,
  FaixaDeFase,
  MarcadorDeJogador,
  PainelRecolhivel,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * A revelação e o convite para mais uma (`FIM-02`, `FIM-03`, `FIM-04`).
 *
 * Todas as cartas caem ao mesmo tempo. A sua vem primeiro e grande — é a única
 * que você nunca viu — e as dos outros logo abaixo, viram uma grade para a mesa
 * ler em voz alta. Não há vencedor, colocação nem pontuação: o sistema é o
 * tabuleiro, não o juiz (AD-003). A nota final é que **ninguém descobre quem
 * escreveu o quê**.
 */

export function Encerrada({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const aguardando = jogadores.filter((jogador) => jogador.situacao === 'aguardando')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)
  const outros = ativos.filter((jogador) => jogador.id !== eu.id)
  const naGrade = eu.minhaCarta === undefined ? ativos : outros

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase selo="fim da partida" tom="tinta">
          as cartas caíram
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          {eu.minhaCarta === undefined ? <ForaDestaRodada /> : <VoceEra texto={eu.minhaCarta} />}

          <section className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-secao text-texto">
                {eu.minhaCarta === undefined ? 'As cartas da mesa' : 'O resto da mesa'}
              </h2>
              <span className="font-mono text-rotulo text-texto-3 uppercase">leia em voz alta</span>
            </div>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {naGrade.map((jogador) => (
                <li key={jogador.id} className="min-w-0">
                  <Carta
                    apelido={jogador.apelido}
                    cor={jogador.cor}
                    texto={jogador.carta}
                    descobriu={jogador.descobriu}
                    ehHost={jogador.id === sala.hostId}
                    conectado={jogador.conectado}
                  />
                </li>
              ))}
            </ul>
          </section>

          {/* <p className="flex gap-2.5 rounded-papel border border-dashed border-linha p-3.5 text-apoio leading-relaxed text-texto-2">
            <span aria-hidden="true" className="text-[18px] leading-none">
              🤫
            </span>
            <span>
              <strong className="font-semibold text-texto">
                Ninguém sabe quem escreveu o quê.
              </strong>{' '}
              A autoria de cada carta fica em segredo pra sempre — metade da graça é acusar a
              pessoa errada.
            </span>
          </p> */}

          {/* `FIM-03` — quem chegou no meio entra na próxima sem fazer nada. */}
          {aguardando.length > 0 && <EntramNaProxima jogadores={aguardando} />}

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
              se tem próxima partida. Fique onde está — se começar outra, você entra automaticamente.
            </p>
          </div>
        )}
      </BarraDeAcao>
    </Shell>
  )
}

/** `FIM-02` — a única carta que essa pessoa nunca viu. */
function VoceEra({ texto }: { texto: string }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-papel bg-acento p-5 sm:p-6">
      <span className="font-mono text-rotulo text-acento-contraste/75 uppercase">você era</span>
      <span className="font-display text-display text-balance text-acento-contraste">{texto}</span>
      {/* <p className="text-apoio leading-relaxed text-acento-contraste/85">
        Ficou a partida inteira na sua testa — a única carta da mesa que você nunca viu.
      </p> */}
    </section>
  )
}

/** `SALA-10` — quem entrou no meio vê tudo, mas não tinha carta nesta rodada. */
function ForaDestaRodada() {
  return (
    <section className="flex flex-col items-start gap-2 rounded-papel border border-dashed border-linha p-5">
      <span className="selo bg-controle-linha text-fundo">assistindo</span>
      <h2 className="font-display text-titulo text-texto">Você entra na próxima.</h2>
      <p className="text-apoio leading-relaxed text-texto-2">
        Esta rodada foi sorteada antes de você chegar, então não havia carta na sua testa. Na
        próxima partida você entra automaticamente.
      </p>
    </section>
  )
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
        {jogadores.length === 1 ? 'assistiu essa — entra' : 'assistiram essa — entram'} na próxima.
      </span>
    </section>
  )
}
