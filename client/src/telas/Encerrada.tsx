import { BlocoDeNotas, Botao, Carta, Chat, MarcadorDeJogador, Shell } from '../componentes'
import type { PropsDaTela } from './tela'

/**
 * A revelação e o convite para mais uma (`FIM-02`, `FIM-03`, `FIM-04`).
 *
 * Todas as cartas caem ao mesmo tempo. A sua vem primeiro e grande — é a única
 * que você nunca viu — e as dos outros logo abaixo, para a mesa ler em voz alta.
 * Não há vencedor, colocação nem pontuação: o sistema é o tabuleiro, não o juiz
 * (AD-003).
 */

export function Encerrada({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const aguardando = jogadores.filter((jogador) => jogador.situacao === 'aguardando')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)
  const outros = ativos.filter((jogador) => jogador.id !== eu.id)

  return (
    <Shell
      codigo={sala.codigo}
      legenda={`Partida encerrada · ${ativos.length} na mesa`}
      aoSair={aoSair}
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
        <section className="flex flex-col gap-6">
          {eu.minhaCarta === undefined ? (
            <ForaDestaRodada />
          ) : (
            <VoceEra texto={eu.minhaCarta} />
          )}

          <div className="flex flex-col gap-2.5">
            <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
              {eu.minhaCarta === undefined ? 'as cartas da mesa' : 'e o resto da mesa'}
            </h2>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {(eu.minhaCarta === undefined ? ativos : outros).map((jogador) => (
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
            <p className="text-miudo text-texto-3">
              Quem escreveu cada carta fica em segredo — a graça é ninguém saber de quem foi a
              ideia.
            </p>
          </div>

          {/* `FIM-03` — quem chegou no meio entra na próxima sem fazer nada. */}
          {aguardando.length > 0 && <EntramNaProxima jogadores={aguardando} />}

          {/* `VIS-04` — "Nova partida" não existe na tela de quem não é host. */}
          {eu.ehHost ? (
            <div className="flex flex-col gap-2 border-t border-linha pt-5">
              <Botao larguraTotal onClick={() => enviar({ t: 'novaPartida' })}>
                {aguardando.length > 0
                  ? `Nova partida com ${ativos.length + aguardando.length}`
                  : 'Nova partida'}
              </Botao>
              <p className="text-apoio text-texto-2">
                A mesma mesa, cartas novas. Ninguém precisa reentrar — e as anotações desta partida
                somem.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 border-t border-linha pt-5">
              <h2 className="text-secao text-texto">
                {host?.apelido ?? 'Quem comanda a sala'} decide se tem próxima
              </h2>
              <p className="text-[15px] leading-relaxed text-texto-2">
                Fique onde está. Se começar outra, você entra sozinho.
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-5">
          {/* `NOTA-01` — o bloco continua disponível até a próxima partida limpar tudo. */}
          <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-[11px] tracking-[0.1em] text-texto-3 uppercase">chat</h2>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </div>
        </section>
      </div>
    </Shell>
  )
}

/** `FIM-02` — a única carta que essa pessoa nunca viu. */
function VoceEra({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-carta bg-acento p-6">
      <span className="font-mono text-[11px] tracking-[0.12em] text-acento-contraste/75 uppercase">
        as cartas caíram · você era
      </span>
      <span className="text-display text-balance text-acento-contraste">{texto}</span>
      <p className="text-[15px] leading-relaxed text-acento-contraste/80">
        Estava na sua testa a partida inteira. Leia em voz alta antes de rolar.
      </p>
    </div>
  )
}

/** `SALA-10` — quem entrou no meio vê tudo, mas não tinha carta nesta rodada. */
function ForaDestaRodada() {
  return (
    <div className="flex flex-col gap-2 rounded-bloco border border-linha bg-superficie p-5">
      <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
        as cartas caíram
      </span>
      <h2 className="text-titulo text-texto">Você entra na próxima</h2>
      <p className="text-[15px] leading-relaxed text-texto-2">
        Esta rodada foi sorteada antes de você chegar, então não havia carta na sua testa. Na
        próxima partida você entra automaticamente.
      </p>
    </div>
  )
}

function EntramNaProxima({ jogadores }: { jogadores: PropsDaTela['projecao']['jogadores'] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
        entram na próxima · {jogadores.length}
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {jogadores.map((jogador) => (
          <li key={jogador.id} className="flex items-center gap-2">
            <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} tamanho="miudo" />
            <span className="text-apoio text-texto-2">{jogador.apelido}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
