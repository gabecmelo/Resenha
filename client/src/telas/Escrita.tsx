import { useState } from 'react'
import {
  BlocoDeNotas,
  Botao,
  CampoDeTexto,
  Chat,
  MarcadorDeJogador,
  Shell,
} from '../componentes'
import type { PropsDaTela } from './tela'

/**
 * Cada um escreve a carta de uma pessoa sorteada (`ESCR-02`…`ESCR-06`,
 * `ESCR-09`, `ESCR-10`).
 *
 * O alvo é o maior elemento da tela e o nome dele se repete no rótulo do campo
 * e no botão: escrever para a pessoa errada é o erro fácil aqui, e ele não tem
 * volta depois que a partida começa. O progresso é só contagem — nunca mostra
 * conteúdo de carta nenhuma (`ESCR-04`).
 */

/** `ESCR-03` */
const CARTA_MAX = 60

export function Escrita({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const prontos = projecao.jogo?.prontos ?? 0
  const total = projecao.jogo?.total ?? 0
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const aguardando = jogadores.filter((jogador) => jogador.situacao === 'aguardando')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)
  const todosProntos = total > 0 && prontos === total

  const alvoId = eu.alvo?.id ?? ''
  const [rascunho, setRascunho] = useState(eu.cartaQueEscrevi ?? '')
  const [alvoAnterior, setAlvoAnterior] = useState(alvoId)
  const [redistribuido, setRedistribuido] = useState(false)

  // `ESCR-07` — o sorteio foi refeito: o alvo trocou e a carta escrita se foi.
  // O servidor não marca a redistribuição na projeção; o que se vê aqui é a
  // troca de alvo entre duas projeções, e nada além disso.
  if (alvoId !== alvoAnterior) {
    setAlvoAnterior(alvoId)
    setRascunho(eu.cartaQueEscrevi ?? '')
    setRedistribuido(alvoAnterior !== '' && alvoId !== '')
  }

  const excedeu = rascunho.trim().length > CARTA_MAX
  const vazio = rascunho.trim().length === 0

  const marcarPronto = () => {
    enviar({ t: 'escreverCarta', texto: rascunho })
    enviar({ t: 'marcarPronto', pronto: true })
  }

  return (
    <Shell
      codigo={sala.codigo}
      legenda={`Escrevendo as cartas · ${prontos} de ${total} prontos`}
      aoSair={aoSair}
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)_minmax(0,300px)] lg:items-start lg:gap-8">
        <section className="order-1 flex flex-col gap-6 lg:order-none lg:col-start-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
              {eu.situacao === 'aguardando'
                ? 'você está de fora desta partida'
                : eu.pronto
                  ? 'você está pronto'
                  : 'escrevendo as cartas'}
            </span>
            <span className="text-apoio font-medium text-texto-2">
              {prontos} de {total} prontos
            </span>
          </div>

          {eu.situacao === 'aguardando' ? (
            <Espectador apelidoDoHost={host?.apelido} />
          ) : (
            <>
              {redistribuido && (
                <div className="flex flex-col gap-2 rounded-bloco border border-risco-linha bg-risco-suave p-4">
                  <span className="font-mono text-[11px] tracking-[0.12em] text-risco uppercase">
                    sorteio refeito
                  </span>
                  <h2 className="text-secao text-texto">Sua carta mudou de dono</h2>
                  <p className="text-[15px] leading-relaxed text-texto-2">
                    Alguém saiu da partida. O que você já tinha escrito foi apagado, todo mundo
                    recebeu um alvo novo e precisa escrever outra vez — inclusive você. Confira o
                    nome antes de escrever.
                  </p>
                </div>
              )}

              {eu.alvo === undefined ? (
                <p className="text-[15px] text-texto-2">
                  Ainda não há alvo para você nesta rodada.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3 rounded-bloco border border-linha bg-superficie p-5">
                    <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
                      {eu.pronto ? 'carta entregue para' : 'você escreve a carta de'}
                    </span>
                    <span className="flex items-center gap-3">
                      <MarcadorDeJogador
                        apelido={eu.alvo.apelido}
                        cor={corDe(jogadores, eu.alvo.id)}
                        tamanho="grande"
                      />
                      <span className="min-w-0 truncate text-display text-texto">
                        {eu.alvo.apelido}
                      </span>
                    </span>
                    <p className="text-[15px] leading-relaxed text-texto-2">
                      {eu.alvo.apelido} vai passar a partida tentando adivinhar o que você digitar
                      aqui, e nunca vê o que está escrito. Só você escreve para {eu.alvo.apelido}.
                    </p>
                  </div>

                  {eu.opcoesPacote ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
                          {eu.pronto
                            ? `A carta de ${eu.alvo.apelido} · trancada`
                            : `A carta de ${eu.alvo.apelido}`}
                        </span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {eu.opcoesPacote.map((opcao) => (
                            <button
                              key={opcao}
                              type="button"
                              aria-pressed={rascunho === opcao}
                              disabled={eu.pronto}
                              onClick={() => setRascunho(opcao)}
                              className={`opcao-carta ${eu.pronto ? 'cursor-default opacity-60' : ''}`}
                            >
                              <span className="text-carta font-medium text-texto">{opcao}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {!eu.pronto && (
                        <div className="flex items-center justify-center pt-2">
                          <Botao
                            variante="secundario"
                            onClick={() => enviar({ t: 'sortearOutras' })}
                            motivo={eu.jaSorteouOutras ? 'Você já sorteou outras uma vez.' : undefined}
                          >
                            Sortear outras opções
                          </Botao>
                        </div>
                      )}
                    </div>
                  ) : (
                    <CampoDeTexto
                      rotulo={
                        eu.pronto
                          ? `A carta de ${eu.alvo.apelido} · trancada`
                          : `A carta de ${eu.alvo.apelido}`
                      }
                      valor={rascunho}
                      aoMudar={setRascunho}
                      placeholder="Um nome…"
                      dica={
                        eu.pronto
                          ? `${eu.alvo.apelido} não vê nada disso — só sabe que a carta já existe.`
                          : 'Personagem, pessoa real, filme, livro, série ou música.'
                      }
                      limite={CARTA_MAX}
                      travado={eu.pronto}
                      aoTeclarEnter={() => {
                        if (!eu.pronto && !vazio && !excedeu) marcarPronto()
                      }}
                    />
                  )}

                  {eu.pronto ? (
                    <div className="flex flex-col gap-2">
                      <Botao
                        larguraTotal
                        variante="secundario"
                        onClick={() => enviar({ t: 'marcarPronto', pronto: false })}
                      >
                        Desmarcar e editar
                      </Botao>
                      <p className="text-apoio text-texto-2">
                        Dá para mudar de ideia até a partida começar.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Botao
                        larguraTotal
                        onClick={marcarPronto}
                        motivo={
                          vazio
                            ? `Escreva a carta de ${eu.alvo.apelido} para marcar pronto.`
                            : excedeu
                              ? `A carta precisa caber em ${CARTA_MAX} caracteres.`
                              : undefined
                        }
                      >
                        Pronto
                      </Botao>
                      {!vazio && !excedeu && (
                        <p className="text-apoio text-texto-2">
                          Marcar pronto tranca a carta, mas você pode desmarcar enquanto a partida
                          não começa.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <AcoesDaFase
            souHost={eu.ehHost}
            apelidoDoHost={host?.apelido}
            todosProntos={todosProntos}
            temAguardando={aguardando.length > 0}
            apelidosAguardando={aguardando.map((jogador) => jogador.apelido)}
            enviar={enviar}
          />
        </section>

        <section className="order-2 flex flex-col gap-5 lg:order-none lg:col-start-2">
          <Progresso
            titulo="Ainda escrevendo"
            jogadores={ativos.filter((jogador) => !jogador.pronto)}
            euId={eu.id}
          />
          <Progresso
            titulo="Prontos"
            jogadores={ativos.filter((jogador) => jogador.pronto)}
            euId={eu.id}
          />
          <p className="text-miudo text-texto-3">
            A contagem não mostra carta nenhuma — só quem já terminou.
          </p>
        </section>

        <section className="order-3 flex flex-col gap-5 lg:order-none lg:col-start-3">
          {/* `NOTA-01` — o bloco já existe na escrita. */}
          <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">chat</h2>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </div>
        </section>
      </div>
    </Shell>
  )
}

function corDe(jogadores: PropsDaTela['projecao']['jogadores'], id: string) {
  return jogadores.find((jogador) => jogador.id === id)?.cor ?? 'grafite'
}

/** `ESCR-06`, `ESCR-09`, `ESCR-10` — o que só o host resolve, e o que os outros esperam. */
function AcoesDaFase({
  souHost,
  apelidoDoHost,
  todosProntos,
  temAguardando,
  apelidosAguardando,
  enviar,
}: {
  souHost: boolean
  apelidoDoHost: string | undefined
  todosProntos: boolean
  temAguardando: boolean
  apelidosAguardando: string[]
  enviar: PropsDaTela['enviar']
}) {
  // `VIS-04` — quem não é host não vê ação de host, nem apagada.
  if (!souHost) {
    return todosProntos ? (
      <div className="flex flex-col gap-1.5 border-t border-linha pt-5">
        <h2 className="text-secao text-texto">
          Esperando {apelidoDoHost ?? 'quem comanda a sala'} começar
        </h2>
        <p className="text-[15px] leading-relaxed text-texto-2">
          Todas as cartas estão escritas. Enquanto a partida não começa, você ainda pode trocar a
          sua.
        </p>
      </div>
    ) : null
  }

  return (
    <div className="flex flex-col gap-4 border-t border-linha pt-5">
      {temAguardando && (
        <div className="flex flex-col gap-2 rounded-bloco border border-linha bg-superficie-2 p-4">
          <h3 className="text-[15px] font-semibold text-texto">
            {listar(apelidosAguardando)} {apelidosAguardando.length === 1 ? 'está' : 'estão'} de
            fora desta partida
          </h3>
          <p className="text-apoio leading-relaxed text-texto-2">
            Chegou depois do sorteio, então não tem carta nem alvo. Para incluir agora, use
            "Cancelar e voltar ao lobby": o sorteio é refeito e todo mundo escreve de novo — as
            cartas já escritas se perdem.
          </p>
        </div>
      )}

      <Botao
        larguraTotal
        onClick={() => enviar({ t: 'comecar' })}
        motivo={todosProntos ? undefined : 'Falta gente marcar PRONTO. Não existe forçar início.'}
      >
        Começar a partida
      </Botao>

      <Botao larguraTotal variante="destrutivo" onClick={() => enviar({ t: 'cancelar' })}>
        Cancelar e voltar ao lobby
      </Botao>
      <p className="text-apoio text-texto-2">
        Cancelar apaga as cartas escritas e devolve todo mundo ao lobby.
      </p>
    </div>
  )
}

/** `SALA-10` — entrou depois do sorteio: assiste esta e joga a próxima. */
function Espectador({ apelidoDoHost }: { apelidoDoHost: string | undefined }) {
  return (
    <div className="flex flex-col gap-2 rounded-bloco border border-linha bg-superficie p-5">
      <h2 className="text-titulo text-texto">Você entra na próxima</h2>
      <p className="text-[15px] leading-relaxed text-texto-2">
        As cartas desta rodada foram sorteadas antes de você chegar. Ninguém escreve para você
        agora, e você não escreve para ninguém.
      </p>
      <p className="text-apoio text-texto-3">
        {apelidoDoHost ?? 'Quem comanda a sala'} pode voltar ao lobby para incluir você nesta.
      </p>
    </div>
  )
}

/** `ESCR-04` — quem já terminou, sem nenhum conteúdo de carta. */
function Progresso({
  titulo,
  jogadores,
  euId,
}: {
  titulo: string
  jogadores: PropsDaTela['projecao']['jogadores']
  euId: string
}) {
  if (jogadores.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
        {titulo} · {jogadores.length}
      </h2>
      <ul className="flex flex-wrap gap-x-3 gap-y-2">
        {jogadores.map((jogador) => (
          <li key={jogador.id} className="flex items-center gap-2">
            <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} tamanho="miudo" />
            <span className="text-apoio text-texto-2">
              {jogador.apelido}
              {jogador.id === euId && ' · você'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function listar(apelidos: string[]): string {
  if (apelidos.length <= 1) return apelidos[0] ?? 'Alguém'
  return `${apelidos.slice(0, -1).join(', ')} e ${apelidos[apelidos.length - 1]}`
}
