import {
  BadgePacote,
  BlocoDeNotas,
  Botao,
  Chat,
  FichaDeJogador,
  MarcadorDeJogador,
  Shell,
} from '../componentes'
import type { PropsDaTela } from './tela'

/**
 * A revelação de Espião (`ESP-16`) — o local e todos os espiões, visível pra
 * todo mundo, inclusive quem entrou depois de encerrada.
 */
export function EspiaoEncerrada({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const espiao = projecao.jogo?.espiao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const aguardando = jogadores.filter((jogador) => jogador.situacao === 'aguardando')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)

  if (espiao === undefined) return null

  const espioesIds = new Set((espiao.espioes ?? []).map((espiaoDaLista) => espiaoDaLista.id))
  const espioesNaMesa = jogadores.filter((jogador) => espioesIds.has(jogador.id))

  return (
    <Shell
      codigo={sala.codigo}
      legenda={`Partida encerrada · ${ativos.length} na mesa`}
      aoSair={aoSair}
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
        <section className="flex flex-col gap-6">
          {sala.pacotesSelecionados && sala.pacotesSelecionados.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {sala.pacotesSelecionados.map((pacote) => (
                <BadgePacote key={pacote.id} pacote={pacote} />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-carta bg-acento p-6">
            <span className="font-mono text-[11px] tracking-[0.12em] text-acento-contraste/75 uppercase">
              o local era
            </span>
            <span className="text-display text-balance text-acento-contraste">{espiao.local}</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
              {espioesNaMesa.length === 1 ? 'o espião era' : 'os espiões eram'}
            </h2>
            <ul className="flex flex-col">
              {espioesNaMesa.map((jogador) => (
                <FichaDeJogador
                  key={jogador.id}
                  apelido={jogador.apelido}
                  cor={jogador.cor}
                  ehVoce={jogador.id === eu.id}
                  ehHost={jogador.id === sala.hostId}
                  conectado={jogador.conectado}
                />
              ))}
            </ul>
          </div>

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
                A mesma mesa, local novo. Ninguém precisa reentrar — e as anotações desta partida
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
