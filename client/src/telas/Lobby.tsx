import { Fragment, useState } from 'react'
import {
  MIN_JOGADORES,
  type Config,
  type Dificuldade,
  type JogadorId,
  type Projecao,
  type PacoteResumo,
  TEMPO_TURNO_MAX_SEG,
  TEMPO_TURNO_MIN_SEG,
} from '../../../shared/protocolo'
import { Botao, Chat, FichaDeJogador, Modal, Shell } from '../componentes'
import { linkDeConvite, motivoParaIniciar } from '../estado/entrada'
import { montarPoolDeCartas } from '../../../shared/pacotes'
import { PACOTES } from '../../../shared/pacotes-dados'
import {
  PRESETS_DE_TEMPO,
  ehTempoPersonalizado,
  rotuloDoTempo,
  tempoDigitado,
} from '../estado/turno'
import type { PropsDaTela } from './tela'

/**
 * A sala antes de começar (`SALA-07`…`SALA-09`, `HOST-01`…`HOST-03`,
 * `CFG-01`…`CFG-06`).
 *
 * O código manda na tela: é ele que a pessoa dita em voz alta. Ações de host
 * não existem na tela de quem não é host — nem apagadas, nem escondidas atrás
 * de aviso (`VIS-04`).
 */

export function Lobby({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)
  // `AJU-34` — o mínimo vem do contrato, não de um número escrito nesta tela.
  let motivoDeEspera = motivoParaIniciar(ativos.length)
  if (motivoDeEspera === undefined) {
    if (sala.config.modoPacote === 'pacote' && sala.config.pacoteIds.length === 0) {
      motivoDeEspera = 'Escolha ao menos um pacote para iniciar.'
    } else if (sala.config.modoPacote === 'personalizado') {
      motivoDeEspera = 'Pacotes personalizados não estão disponíveis ainda.'
    }
  }

  return (
    <Shell
      codigo={sala.codigo}
      legenda={`${ativos.length} ${ativos.length === 1 ? 'pessoa' : 'pessoas'} · Quem Sou Eu?`}
      aoSair={aoSair}
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
        <section className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          <Convite codigo={sala.codigo} sozinho={jogadores.length === 1} />
        </section>

        <section className="order-2 flex flex-col gap-3 lg:order-none lg:col-start-2 lg:row-span-3 lg:row-start-1">
          {/* `AJU-39` — a lotação é a desta sala, escolhida por quem a criou. */}
          <Titulo texto="Na sala" contagem={`${jogadores.length}/${sala.limiteJogadores}`} />
          <ul className="flex flex-col">
            {jogadores.map((jogador) => (
              <LinhaDeJogador
                key={jogador.id}
                jogador={jogador}
                euId={eu.id}
                hostId={sala.hostId}
                souHost={eu.ehHost}
                enviar={enviar}
              />
            ))}
          </ul>
          {jogadores.length === 1 && (
            <p className="px-2 py-3 text-apoio text-texto-2">
              Quem entrar aparece aqui na hora.
            </p>
          )}
        </section>

        <section className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
          <Regras config={sala.config} pacotesDisponiveis={sala.pacotesDisponiveis} souHost={eu.ehHost} apelidoDoHost={host?.apelido} enviar={enviar} />
        </section>

        <section className="order-4 flex flex-col gap-3 lg:order-none lg:col-start-3 lg:row-span-3 lg:row-start-1">
          <Titulo texto="Chat" />
          <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
        </section>

        <section className="order-5 lg:order-none lg:col-start-1 lg:row-start-3">
          {eu.ehHost ? (
            <div className="flex flex-col gap-2">
              <Botao
                larguraTotal
                onClick={() => enviar({ t: 'iniciar' })}
                motivo={motivoDeEspera}
              >
                {motivoDeEspera !== undefined
                  ? 'Iniciar partida'
                  : `Iniciar com ${ativos.length} pessoas`}
              </Botao>
              {motivoDeEspera === undefined && (
                <p className="text-apoio text-texto-2">
                  Cada um vai escrever a carta de outra pessoa.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[15px] text-texto-2">
              Esperando {host?.apelido ?? 'quem comanda a sala'} começar.
            </p>
          )}
        </section>
      </div>
    </Shell>
  )
}

function Titulo({ texto, contagem }: { texto: string; contagem?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">{texto}</h2>
      {contagem !== undefined && (
        <span className="font-mono text-[11px] text-texto-3">{contagem}</span>
      )}
    </div>
  )
}

/** `SALA-08` — o código em destaque e o link a um toque. */
function Convite({ codigo, sozinho }: { codigo: string; sozinho: boolean }) {
  const [copiado, setCopiado] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {sozinho && (
        <div className="flex flex-col gap-1.5">
          <h2 className="text-titulo text-texto">Chame a galera</h2>
          <p className="text-[15px] leading-relaxed text-texto-2">
            Mande o link no grupo ou dite as cinco letras em voz alta. A partida começa com{' '}
            {MIN_JOGADORES} pessoas.
          </p>
        </div>
      )}

      <div className="flex flex-col items-start gap-2 rounded-bloco border border-linha bg-superficie px-4 py-4">
        <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
          código da sala
        </span>
        <span className="font-mono text-display tracking-[0.16em] text-texto">{codigo}</span>
      </div>

      <Botao
        larguraTotal
        variante="secundario"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(linkDeConvite(window.location.origin, codigo))
            .then(() => {
              setCopiado(true)
              setTimeout(() => setCopiado(false), 2000)
            })
            .catch(() => setCopiado(false))
        }}
      >
        {copiado ? 'Link copiado' : 'Copiar link do convite'}
      </Botao>
    </div>
  )
}

function LinhaDeJogador({
  jogador,
  euId,
  hostId,
  souHost,
  enviar,
}: {
  jogador: Projecao['jogadores'][number]
  euId: JogadorId
  hostId: JogadorId
  souHost: boolean
  enviar: PropsDaTela['enviar']
}) {
  const [aberto, setAberto] = useState(false)
  const [confirmandoExpulsao, setConfirmandoExpulsao] = useState(false)
  // `VIS-04` — sobre si mesmo o host não tem ação nenhuma.
  const temAcoes = souHost && jogador.id !== euId

  return (
    <Fragment>
      <FichaDeJogador
        apelido={jogador.apelido}
        cor={jogador.cor}
        ehVoce={jogador.id === euId}
        ehHost={jogador.id === hostId}
        conectado={jogador.conectado}
        acoes={
          temAcoes ? (
            <button
              type="button"
              aria-expanded={aberto}
              aria-label={`Ações sobre ${jogador.apelido}`}
              onClick={() => setAberto((estava) => !estava)}
              className="min-h-11 shrink-0 cursor-pointer px-2 text-[18px] leading-none text-texto-3 hover:text-texto"
            >
              ···
            </button>
          ) : undefined
        }
      />

      {temAcoes && aberto && (
        <li className="flex flex-col gap-1 rounded-painel bg-superficie-2 px-2 py-2">
          <button
            type="button"
            onClick={() => {
              enviar({ t: 'transferirHost', jogadorId: jogador.id })
              setAberto(false)
            }}
            className="min-h-11 cursor-pointer px-2 text-left text-[15px] font-medium text-texto"
          >
            Passar o comando para {jogador.apelido}
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoExpulsao(true)}
            className="min-h-11 cursor-pointer px-2 text-left text-[15px] font-medium text-risco"
          >
            Expulsar da sala
          </button>
        </li>
      )}

      {confirmandoExpulsao && (
        <Modal
          titulo={`Expulsar ${jogador.apelido}?`}
          descricao={`${jogador.apelido} sai da sala agora e não consegue voltar por este código. Não tem como desfazer.`}
          rotuloConfirmar={`Expulsar ${jogador.apelido}`}
          destrutivo
          aoConfirmar={() => {
            enviar({ t: 'expulsar', jogadorId: jogador.id })
            setConfirmandoExpulsao(false)
            setAberto(false)
          }}
          aoCancelar={() => setConfirmandoExpulsao(false)}
        />
      )}
    </Fragment>
  )
}

// ---------------------------------------------------------------------------
// Componentes Auxiliares
// ---------------------------------------------------------------------------

function DicaBotao({ aberta, aoAlternar }: { aberta: boolean; aoAlternar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      title="Mostrar dica"
      className={`flex items-center justify-center w-[14px] h-[14px] rounded-full border text-[9px] font-bold cursor-pointer transition-all ${
        aberta
          ? 'border-acento text-acento opacity-100'
          : 'border-texto-3 text-texto-3 opacity-70 hover:opacity-100'
      }`}
    >
      ?
    </button>
  )
}

// ---------------------------------------------------------------------------
// Regras da partida (`CFG-01`…`CFG-06`)
// ---------------------------------------------------------------------------

const OPCOES_DE_ORDEM = [
  { valor: 'sorteada', rotulo: 'Sorteada' },
  { valor: 'entrada', rotulo: 'Ordem de entrada' },
] as const

const OPCOES_DE_MODO = [
  { valor: 'livre', rotulo: 'Livre' },
  { valor: 'pacote', rotulo: 'Pacotes' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
] as const

const OPCOES_DE_DISTRIBUICAO = [
  { valor: 'aleatoria', rotulo: 'Aleatória' },
  { valor: 'escolha', rotulo: 'Escolher pro colega' },
] as const

const OPCOES_DE_DIFICULDADE: ReadonlyArray<{ valor: Dificuldade; rotulo: string }> = [
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'dificil', rotulo: 'Difícil' },
]

function Regras({
  config,
  pacotesDisponiveis,
  souHost,
  apelidoDoHost,
  enviar,
}: {
  config: Config
  pacotesDisponiveis: PacoteResumo[] | undefined
  souHost: boolean
  apelidoDoHost: string | undefined
  enviar: PropsDaTela['enviar']
}) {
  const [modalPacotesAberto, setModalPacotesAberto] = useState(false)
  const [modoTempo, setModoTempo] = useState<'preset' | 'personalizado'>(
    ehTempoPersonalizado(config.tempoTurnoSeg) ? 'personalizado' : 'preset'
  )
  const [dicaPacoteAberta, setDicaPacoteAberta] = useState(false)
  const [pacoteExpandido, setPacoteExpandido] = useState<string | null>(null)
  const [verPacoteAberto, setVerPacoteAberto] = useState(false)

  const pacotesSelecionados = pacotesDisponiveis?.filter((p) => config.pacoteIds.includes(p.id)) ?? []
  // `PKT2-11` — pool combinado computado localmente (sem round-trip), a
  // mesma função pura usada pelo servidor para sortear (AD-012).
  const poolAtual = montarPoolDeCartas(
    PACOTES.filter((p) => config.pacoteIds.includes(p.id)),
    config.dificuldades,
  )

  const opcoesDeTempo = [
    ...PRESETS_DE_TEMPO.map(p => ({ valor: p.valor === null ? 'sem-limite' : String(p.valor), rotulo: p.rotulo })),
    { valor: 'personalizado', rotulo: 'Personalizado' }
  ]
  const tempoAtualVal = ehTempoPersonalizado(config.tempoTurnoSeg) || modoTempo === 'personalizado'
    ? 'personalizado'
    : (config.tempoTurnoSeg === null ? 'sem-limite' : String(config.tempoTurnoSeg));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Titulo texto={souHost ? 'Regras da partida' : 'Regras desta partida'} />
        {!souHost && (
          <p className="text-miudo text-texto-3">
            Quem escolhe é {apelidoDoHost ?? 'quem comanda a sala'}, que criou a sala.
          </p>
        )}
      </div>

      {/* `PKT2-11`, `PKT2-12` — some quando não há pacote nenhum selecionado. */}
      {config.modoPacote === 'pacote' && config.pacoteIds.length > 0 && (
        <Botao variante="secundario" onClick={() => setVerPacoteAberto(true)}>
          Ver pacote ({poolAtual.length} cartas)
        </Botao>
      )}

      {verPacoteAberto && (
        <Modal
          titulo="Cartas possíveis"
          descricao={`${poolAtual.length} cartas no pool combinado — nunca mostra quem tem qual carta.`}
          largura="larga"
          aoCancelar={() => setVerPacoteAberto(false)}
        >
          <ul className="grid max-h-[60vh] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
            {poolAtual.map((texto) => (
              <li
                key={texto}
                className="rounded-controle bg-superficie-2 px-2.5 py-1.5 text-miudo text-texto-2"
              >
                {texto}
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {souHost ? (
        <div className="flex flex-col gap-4">
          <Escolha
            rotulo="Modo de jogo"
            dica="Livre: cada um escreve o que quiser. Pacotes: temas pré-definidos do jogo."
            opcoes={OPCOES_DE_MODO}
            atual={config.modoPacote}
            aoEscolher={(modoPacote) => {
              if (modoPacote === 'livre') {
                enviar({ t: 'configurar', config: { modoPacote, pacoteIds: [], modoDistribuicao: 'aleatoria' } })
              } else {
                enviar({ t: 'configurar', config: { modoPacote } })
              }
            }}
          />

          {config.modoPacote === 'pacote' && (
            <div className="flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-apoio text-texto-2 flex items-center gap-2">
                  Pacote
                  <DicaBotao aberta={dicaPacoteAberta} aoAlternar={() => setDicaPacoteAberta(!dicaPacoteAberta)} />
                </legend>
                {dicaPacoteAberta && (
                  <p className="text-xs text-texto-3 mb-1 -mt-1 leading-snug">O tema de cartas selecionado para todos os jogadores.</p>
                )}
                {pacotesSelecionados.length > 0 ? (
                  <div className="flex items-center justify-between rounded-bloco border border-linha bg-superficie px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-texto leading-snug">
                        {pacotesSelecionados.map((p) => `${p.emoji} ${p.nome}`).join(', ')}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.1em] text-texto-3 uppercase">
                        {pacotesSelecionados.length === 1 ? '1 pacote' : `${pacotesSelecionados.length} pacotes`}
                      </span>
                    </div>
                    <Botao variante="secundario" onClick={() => setModalPacotesAberto(true)}>Mudar...</Botao>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-bloco border border-dashed border-linha-suave bg-superficie px-4 py-3">
                    <span className="text-[15px] text-texto-2">Nenhum pacote selecionado</span>
                    <Botao variante="secundario" onClick={() => setModalPacotesAberto(true)}>Selecionar...</Botao>
                  </div>
                )}
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-apoio text-texto-2">Dificuldade</legend>
                <div className="flex flex-wrap gap-2">
                  {OPCOES_DE_DIFICULDADE.map((opcao) => {
                    const marcado = config.dificuldades.includes(opcao.valor)
                    const ehUltimaAtiva = marcado && config.dificuldades.length === 1
                    return (
                      <Botao
                        key={opcao.valor}
                        variante={marcado ? 'primario' : 'secundario'}
                        motivo={ehUltimaAtiva ? 'Pelo menos um nível precisa estar marcado' : undefined}
                        selecaoTravada={ehUltimaAtiva}
                        onClick={() => {
                          const dificuldades = marcado
                            ? config.dificuldades.filter((d) => d !== opcao.valor)
                            : [...config.dificuldades, opcao.valor]
                          enviar({ t: 'configurar', config: { dificuldades } })
                        }}
                      >
                        {opcao.rotulo}
                      </Botao>
                    )
                  })}
                </div>
              </fieldset>

              {config.pacoteIds.length > 0 && (
                <Escolha
                  rotulo="Distribuição"
                  dica="Aleatória: o jogo sorteia a carta. Escolher: você recebe 5 opções do pacote e escolhe uma delas para seu colega."
                  opcoes={OPCOES_DE_DISTRIBUICAO}
                  atual={config.modoDistribuicao}
                  aoEscolher={(modoDistribuicao) => enviar({ t: 'configurar', config: { modoDistribuicao } })}
                />
              )}

              {modalPacotesAberto && (
                <Modal
                  titulo="Escolha um ou mais pacotes"
                  descricao="Marque os temas das cartas para esta partida."
                  largura="larga"
                  rotuloConfirmar="Confirmar"
                  aoConfirmar={() => setModalPacotesAberto(false)}
                  aoCancelar={() => setModalPacotesAberto(false)}
                >
                  <div className="pacote-grid">
                    {pacotesDisponiveis?.map((pacote) => {
                      const marcado = config.pacoteIds.includes(pacote.id)
                      const expandido = pacoteExpandido === pacote.id
                      // `PKT2-10` — filtra pelas dificuldades já marcadas, mesmo
                      // para um pacote ainda não selecionado.
                      const cartasFiltradas =
                        PACOTES.find((p) => p.id === pacote.id)
                          ?.cartas.filter((c) => config.dificuldades.includes(c.dificuldade))
                          .map((c) => c.texto) ?? []
                      return (
                        // `role="button"` (não `<button>`) para poder aninhar o
                        // botão "Ver cartas" sem invalidar o HTML.
                        <div
                          key={pacote.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={marcado}
                          onClick={() => {
                            const pacoteIds = marcado
                              ? config.pacoteIds.filter((id) => id !== pacote.id)
                              : [...config.pacoteIds, pacote.id]
                            enviar({ t: 'configurar', config: { pacoteIds } })
                          }}
                          onKeyDown={(evento) => {
                            if (evento.key !== 'Enter' && evento.key !== ' ') return
                            evento.preventDefault()
                            const pacoteIds = marcado
                              ? config.pacoteIds.filter((id) => id !== pacote.id)
                              : [...config.pacoteIds, pacote.id]
                            enviar({ t: 'configurar', config: { pacoteIds } })
                          }}
                          className="pacote-card text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{pacote.emoji}</span>
                            <h3 className="font-semibold text-texto">{pacote.nome}</h3>
                          </div>
                          <p className="line-clamp-2 text-miudo text-texto-2">{pacote.descricao}</p>
                          <span className="mt-1 font-mono text-[10px] tracking-[0.1em] text-texto-3 uppercase">
                            {pacote.quantidade} cartas
                          </span>
                          <button
                            type="button"
                            onClick={(evento) => {
                              evento.stopPropagation()
                              setPacoteExpandido(expandido ? null : pacote.id)
                            }}
                            className="mt-1 flex min-h-11 w-full cursor-pointer items-center gap-1 self-start text-apoio font-medium text-acento hover:underline"
                          >
                            <span aria-hidden="true" className={`inline-block transition-transform ${expandido ? 'rotate-90' : ''}`}>
                              ▸
                            </span>
                            {expandido ? 'Ocultar cartas' : 'Ver cartas'}
                          </button>
                          {expandido && (
                            <ul
                              onClick={(evento) => evento.stopPropagation()}
                              className="mt-1 max-h-32 w-full overflow-y-auto rounded-controle bg-superficie-2 p-2 text-miudo text-texto-2"
                            >
                              {cartasFiltradas.map((texto) => (
                                <li key={texto}>{texto}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Modal>
              )}
            </div>
          )}

          {config.modoPacote === 'personalizado' && (
            <div className="pacote-fantasma">
              <span className="text-3xl text-texto-3 opacity-50">🔒</span>
              <span className="font-semibold text-texto-3">Crie seu pacote — Em breve</span>
            </div>
          )}

          <Escolha
            rotulo="Ordem dos turnos"
            dica="Ordem de entrada: quem entrou primeiro na sala joga primeiro."
            opcoes={OPCOES_DE_ORDEM}
            atual={config.ordemTurnos}
            aoEscolher={(ordemTurnos) => enviar({ t: 'configurar', config: { ordemTurnos } })}
          />
          <div className="flex flex-col gap-3">
            <Escolha
              rotulo="Tempo por turno"
              dica="Tempo máximo que um jogador tem para adivinhar a carta na sua vez."
              opcoes={opcoesDeTempo}
              atual={tempoAtualVal}
              aoEscolher={(val) => {
                if (val === 'personalizado') {
                  setModoTempo('personalizado')
                } else {
                  setModoTempo('preset')
                  enviar({ t: 'configurar', config: { tempoTurnoSeg: val === 'sem-limite' ? null : Number(val) } })
                }
              }}
            />
            {(modoTempo === 'personalizado' || ehTempoPersonalizado(config.tempoTurnoSeg)) && (
              <TempoPersonalizado
                atual={config.tempoTurnoSeg}
                aoEscolher={(tempoTurnoSeg) => enviar({ t: 'configurar', config: { tempoTurnoSeg } })}
              />
            )}
          </div>
        </div>
      ) : (
        <dl className="flex flex-col">
          <Leitura rotulo="Modo de jogo" valor={rotuloDe(OPCOES_DE_MODO, config.modoPacote)} />
          {config.modoPacote === 'pacote' && pacotesDisponiveis && (
            <>
              <Leitura
                rotulo="Pacote"
                valor={
                  config.pacoteIds.length > 0
                    ? pacotesDisponiveis
                        .filter((p) => config.pacoteIds.includes(p.id))
                        .map((p) => p.nome)
                        .join(', ')
                    : 'Nenhum pacote selecionado'
                }
              />
              <Leitura
                rotulo="Dificuldade"
                valor={OPCOES_DE_DIFICULDADE.filter((o) => config.dificuldades.includes(o.valor))
                  .map((o) => o.rotulo)
                  .join(', ')}
              />
              {config.pacoteIds.length > 0 && (<Leitura rotulo="Distribuição" valor={rotuloDe(OPCOES_DE_DISTRIBUICAO, config.modoDistribuicao)} />)}
            </>
          )}
          <Leitura rotulo="Ordem dos turnos" valor={rotuloDe(OPCOES_DE_ORDEM, config.ordemTurnos)} />
          <Leitura rotulo="Tempo por turno" valor={rotuloDoTempo(config.tempoTurnoSeg)} />
        </dl>
      )}
    </div>
  )
}

/**
 * `AJU-19`, `AJU-20` — qualquer duração entre 10s e 60min, além dos presets.
 *
 * A faixa vem do contrato, não de um número escrito aqui. O campo trava no
 * tamanho e o botão diz por que não dá para aplicar — o servidor continua
 * recusando o que não deveria passar (`CFG-04`).
 */
function TempoPersonalizado({
  atual,
  aoEscolher,
}: {
  atual: number | null
  aoEscolher(tempoTurnoSeg: number): void
}) {
  const emVigor = ehTempoPersonalizado(atual)
  const [texto, setTexto] = useState(emVigor ? String(atual) : '')
  const [atualAnterior, setAtualAnterior] = useState(atual)

  // O tempo em vigor pode mudar por outra aba do host: o campo acompanha.
  if (atual !== atualAnterior) {
    setAtualAnterior(atual)
    setTexto(ehTempoPersonalizado(atual) ? String(atual) : '')
  }

  const segundos = tempoDigitado(texto)
  const aplicar = () => {
    if (segundos !== null) aoEscolher(segundos)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="tempo-personalizado" className="text-apoio text-texto-2">
        Outro tempo, em segundos
      </label>
      <div className="flex items-start gap-2">
        <input
          id="tempo-personalizado"
          type="text"
          inputMode="numeric"
          value={texto}
          maxLength={String(TEMPO_TURNO_MAX_SEG).length}
          placeholder="240"
          aria-invalid={texto !== '' && segundos === null}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') aplicar()
          }}
          className={`h-11 w-24 rounded-controle border bg-superficie px-3 text-corpo placeholder:text-texto-apagado focus:outline-none ${
            emVigor && segundos === atual
              ? 'border-acento font-semibold text-acento'
              : texto !== '' && segundos === null
                ? 'border-risco text-texto'
                : 'border-controle-linha text-texto focus:border-acento'
          }`}
        />
        <Botao
          variante="secundario"
          onClick={aplicar}
          motivo={
            segundos === null
              ? `De ${TEMPO_TURNO_MIN_SEG} segundos a ${TEMPO_TURNO_MAX_SEG / 60} minutos.`
              : segundos === atual
                ? 'Este já é o tempo em vigor.'
                : undefined
          }
        >
          Aplicar
        </Botao>
      </div>
      <span className="text-[12px] text-texto-3">
        {emVigor
          ? `Em vigor: ${rotuloDoTempo(atual)}.`
          : `De ${TEMPO_TURNO_MIN_SEG}s a ${TEMPO_TURNO_MAX_SEG / 60}min.`}
      </span>
    </div>
  )
}

function rotuloDe<T>(opcoes: ReadonlyArray<{ valor: T; rotulo: string }>, atual: T): string {
  return opcoes.find((opcao) => opcao.valor === atual)?.rotulo ?? '—'
}

/** `CFG-04` — fora do lobby, e para quem não é host, as regras só se leem. */
function Leitura({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-linha-suave py-3">
      <dt className="text-apoio text-texto-2">{rotulo}</dt>
      <dd className="text-apoio font-medium text-texto">{valor}</dd>
    </div>
  )
}

function Escolha<T>({
  rotulo,
  dica,
  opcoes,
  atual,
  aoEscolher,
}: {
  rotulo: string
  dica?: string
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>
  atual: T
  aoEscolher(valor: T): void
}) {
  const [dicaAberta, setDicaAberta] = useState(false)

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-apoio text-texto-2 flex items-center gap-2">
        {rotulo}
        {dica && (
          <DicaBotao aberta={dicaAberta} aoAlternar={() => setDicaAberta(!dicaAberta)} />
        )}
      </legend>
      {dicaAberta && dica && (
        <p className="text-xs text-texto-3 mb-1 -mt-1 leading-snug">{dica}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const escolhida = opcao.valor === atual
          return (
            <button
              key={opcao.rotulo}
              type="button"
              aria-pressed={escolhida}
              onClick={() => aoEscolher(opcao.valor)}
              className={`min-h-11 cursor-pointer rounded-controle border px-3.5 text-apoio transition-colors ${
                escolhida
                  ? 'border-acento bg-acento-suave font-semibold text-acento'
                  : 'border-controle-linha font-medium text-texto-2 hover:bg-superficie-2'
              }`}
            >
              {opcao.rotulo}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
