import { Fragment, useEffect, useState } from 'react'
import {
  MESA_GRANDE_ESPIAO,
  type Config,
  type Dificuldade,
  type JogadorId,
  type Projecao,
  type PacoteResumo,
  TEMPO_TURNO_MAX_SEG,
  TEMPO_TURNO_MIN_SEG,
} from '../../../shared/protocolo'
import { minJogadoresDoJogo, nomeDoJogo } from '../../../shared/jogos-catalogo'
import {
  Botao,
  Chat,
  FaixaDeFase,
  FichaDeJogador,
  Modal,
  SeletorDeJogos,
  Shell,
} from '../componentes'
import { linkDeConvite, motivoParaIniciar } from '../estado/entrada'
import { montarPoolDeCartas } from '../../../shared/pacotes'
import { PACOTES } from '../../../shared/pacotes-dados'
import { LOCAIS } from '../../../shared/locais-dados'
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
  // `AJU-34`, `AD-014` — o mínimo vem do catálogo do jogo ativo, não de um
  // número escrito nesta tela nem da constante única do produto.
  const minimoDoJogo = minJogadoresDoJogo(sala.jogoId)
  let motivoDeEspera = motivoParaIniciar(ativos.length, minimoDoJogo)
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
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase>{`${ativos.length} ${ativos.length === 1 ? 'pessoa' : 'pessoas'} na sala`}</FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
        <section className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          <Convite
            codigo={sala.codigo}
            sozinho={jogadores.length === 1}
            minimoDoJogo={minimoDoJogo}
          />
        </section>

        <section className="order-2 flex flex-col gap-3 lg:order-none lg:col-start-2 lg:row-span-4 lg:row-start-1">
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
          <JogoDaSala jogoId={sala.jogoId} souHost={eu.ehHost} enviar={enviar} />
        </section>

        <section className="order-4 lg:order-none lg:col-start-1 lg:row-start-3">
          {sala.jogoId === 'quem-sou-eu' && (
            <Regras config={sala.config} pacotesDisponiveis={sala.pacotesDisponiveis} souHost={eu.ehHost} apelidoDoHost={host?.apelido} enviar={enviar} />
          )}
          {sala.jogoId === 'espiao' && (
            <RegrasEspiao config={sala.config} pacotesDisponiveis={sala.pacotesDisponiveis} souHost={eu.ehHost} apelidoDoHost={host?.apelido} enviar={enviar} />
          )}
        </section>

        <section className="order-5 flex flex-col gap-3 lg:order-none lg:col-start-3 lg:row-span-4 lg:row-start-1">
          <Titulo texto="Chat" />
          <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
        </section>

        <section className="order-6 lg:order-none lg:col-start-1 lg:row-start-4">
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
                  {sala.jogoId === 'espiao'
                    ? 'Um local é sorteado pra mesa, menos pro espião.'
                    : 'Cada um vai escrever a carta de outra pessoa.'}
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
function Convite({
  codigo,
  sozinho,
  minimoDoJogo,
}: {
  codigo: string
  sozinho: boolean
  minimoDoJogo: number
}) {
  const [copiado, setCopiado] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {sozinho && (
        <div className="flex flex-col gap-1.5">
          <h2 className="text-titulo text-texto">Chame a galera</h2>
          <p className="text-[15px] leading-relaxed text-texto-2">
            Mande o link no grupo ou dite as cinco letras em voz alta. A partida começa com{' '}
            {minimoDoJogo} pessoas.
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

/**
 * `HUB-06`…`HUB-12` — host troca de jogo sem sair do lobby; não-host só vê o
 * nome do jogo atual, sem controle nenhum (`VIS-04`).
 */
function JogoDaSala({
  jogoId,
  souHost,
  enviar,
}: {
  jogoId: string
  souHost: boolean
  enviar: PropsDaTela['enviar']
}) {
  const [modalAberto, setModalAberto] = useState(false)
  // Rascunho local: só vira comando de verdade em "Confirmar"; "Cancelar"
  // descarta sem tocar na sala — mesmo padrão de `pacoteIdsRascunho`.
  const [jogoIdRascunho, setJogoIdRascunho] = useState(jogoId)
  const nome = nomeDoJogo(jogoId)

  const abrirModal = () => {
    setJogoIdRascunho(jogoId)
    setModalAberto(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <Titulo texto="Jogo" />
      {souHost ? (
        <div className="flex items-center justify-between rounded-bloco border border-linha bg-superficie px-4 py-3">
          <span className="font-semibold text-texto">{nome}</span>
          <Botao variante="secundario" onClick={abrirModal}>
            Mudar jogo
          </Botao>
        </div>
      ) : (
        <p className="text-[15px] text-texto-2">{nome}</p>
      )}

      {modalAberto && (
        <Modal
          titulo="Escolha o jogo"
          descricao="Trocar de jogo reseta as regras da partida para o padrão do jogo novo."
          largura="larga"
          rotuloConfirmar="Confirmar"
          aoConfirmar={() => {
            enviar({ t: 'trocarJogo', jogoId: jogoIdRascunho })
            setModalAberto(false)
          }}
          aoCancelar={() => setModalAberto(false)}
        >
          <SeletorDeJogos jogoIdSelecionado={jogoIdRascunho} aoSelecionar={setJogoIdRascunho} />
        </Modal>
      )}
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
  // Rascunho local do modal de seleção — só vira config de verdade em
  // "Confirmar" (`enviar`); "Cancelar" descarta sem afetar a sala.
  const [pacoteIdsRascunho, setPacoteIdsRascunho] = useState<string[]>(config.pacoteIds)
  const [pacoteParaVerCartas, setPacoteParaVerCartas] = useState<PacoteResumo | null>(null)
  const [verPacoteAberto, setVerPacoteAberto] = useState(false)

  const abrirModalDePacotes = () => {
    setPacoteIdsRascunho(config.pacoteIds)
    setModalPacotesAberto(true)
  }

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
                    <Botao variante="secundario" onClick={() => abrirModalDePacotes()}>Mudar...</Botao>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-bloco border border-dashed border-linha-suave bg-superficie px-4 py-3">
                    <span className="text-[15px] text-texto-2">Nenhum pacote selecionado</span>
                    <Botao variante="secundario" onClick={() => abrirModalDePacotes()}>Selecionar...</Botao>
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
                        motivoOculto={ehUltimaAtiva}
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
                {config.dificuldades.length === 1 && (
                  <p className="text-apoio text-texto-2">Pelo menos um nível precisa estar marcado</p>
                )}
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
                  aoConfirmar={() => {
                    enviar({ t: 'configurar', config: { pacoteIds: pacoteIdsRascunho } })
                    setModalPacotesAberto(false)
                  }}
                  aoCancelar={() => setModalPacotesAberto(false)}
                >
                  <div className="pacote-grid">
                    {pacotesDisponiveis?.map((pacote) => {
                      const marcado = pacoteIdsRascunho.includes(pacote.id)
                      const alternar = () => {
                        setPacoteIdsRascunho((atual) =>
                          atual.includes(pacote.id)
                            ? atual.filter((id) => id !== pacote.id)
                            : [...atual, pacote.id]
                        )
                      }
                      return (
                        // `role="button"` (não `<button>`) para poder aninhar o
                        // botão "Ver cartas" sem invalidar o HTML.
                        <div
                          key={pacote.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={marcado}
                          onClick={alternar}
                          onKeyDown={(evento) => {
                            if (evento.key !== 'Enter' && evento.key !== ' ') return
                            evento.preventDefault()
                            alternar()
                          }}
                          className="pacote-card text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{pacote.emoji}</span>
                            <h3 className="font-semibold text-texto">{pacote.nome}</h3>
                          </div>
                          <p className="text-miudo text-texto-2">{pacote.descricao}</p>
                          <span className="mt-1 font-mono text-[10px] tracking-[0.1em] text-texto-3 uppercase">
                            {pacote.quantidade} cartas
                          </span>
                          <button
                            type="button"
                            onClick={(evento) => {
                              evento.stopPropagation()
                              setPacoteParaVerCartas(pacote)
                            }}
                            className="mt-1 flex min-h-11 w-full cursor-pointer items-center gap-1 self-start text-apoio font-medium text-acento hover:underline"
                          >
                            <span aria-hidden="true">▸</span>
                            Ver cartas
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </Modal>
              )}

              {pacoteParaVerCartas && (
                <Modal
                  titulo={pacoteParaVerCartas.nome}
                  descricao={`${pacoteParaVerCartas.quantidade} cartas, separadas por dificuldade.`}
                  largura="larga"
                  aoCancelar={() => setPacoteParaVerCartas(null)}
                >
                  <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
                    {OPCOES_DE_DIFICULDADE.map((opcao) => {
                      const cartas =
                        PACOTES.find((p) => p.id === pacoteParaVerCartas.id)
                          ?.cartas.filter((c) => c.dificuldade === opcao.valor)
                          .map((c) => c.texto) ?? []
                      return (
                        <div key={opcao.valor} className="flex flex-col gap-1.5">
                          <h3 className="text-apoio font-semibold text-texto-2">
                            {opcao.rotulo} ({cartas.length})
                          </h3>
                          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                            {cartas.map((texto) => (
                              <li
                                key={texto}
                                className="rounded-controle bg-superficie-2 px-2.5 py-1.5 text-miudo text-texto-2"
                              >
                                {texto}
                              </li>
                            ))}
                          </ul>
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

// ---------------------------------------------------------------------------
// Regras da partida de Espião (`AD-014`, `ESP-01`…`ESP-03`, `ESP-17`…`ESP-19`, `ESP-22`)
// ---------------------------------------------------------------------------

const OPCOES_NUM_ESPIOES: ReadonlyArray<{ valor: number | 'auto'; rotulo: string }> = [
  { valor: 'auto' as const, rotulo: 'Auto' },
  ...[1, 2, 3, 4, 5].map((n) => ({ valor: n, rotulo: String(n) })),
]

const OPCOES_SIM_NAO = [
  { valor: true, rotulo: 'Sim' },
  { valor: false, rotulo: 'Não' },
] as const

const OPCOES_VISIBILIDADE_VOTO = [
  { valor: 'oculta', rotulo: 'Oculta até fechar' },
  { valor: 'tempoReal', rotulo: 'Tempo real' },
] as const

const PRESETS_DE_TEMPO_RODADA: ReadonlyArray<{ valor: number | null; rotulo: string }> = [
  { valor: null, rotulo: 'Sem limite' },
  { valor: 180, rotulo: '3min' },
  { valor: 300, rotulo: '5min' },
  { valor: 600, rotulo: '10min' },
]

/** Mesmo raciocínio de `ehTempoPersonalizado` (`estado/turno.ts`), pro tempo de rodada. */
function ehTempoRodadaPersonalizado(tempoRodadaSeg: number | null): boolean {
  return tempoRodadaSeg !== null && !PRESETS_DE_TEMPO_RODADA.some((o) => o.valor === tempoRodadaSeg)
}

function RegrasEspiao({
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
  const [modalLocaisAberto, setModalLocaisAberto] = useState(false)
  const [modoTempoRodada, setModoTempoRodada] = useState<'preset' | 'personalizado'>(
    ehTempoRodadaPersonalizado(config.espiao.tempoRodadaSeg) ? 'personalizado' : 'preset'
  )
  // Rascunho local: só vira comando de verdade em "Confirmar" — mesmo padrão
  // de `pacoteIdsRascunho` usado pros pacotes de cartas.
  const [pacoteIdsRascunho, setPacoteIdsRascunho] = useState<string[]>(config.pacoteIds)
  const [pacoteParaVerLocais, setPacoteParaVerLocais] = useState<PacoteResumo | null>(null)
  const [verLocaisAberto, setVerLocaisAberto] = useState(false)

  const abrirModalDeLocais = () => {
    setPacoteIdsRascunho(config.pacoteIds)
    setModalLocaisAberto(true)
  }

  // Espião sempre opera em modo pacote (não existe "escrita livre" de local,
  // `AD-014`); sem isso o servidor nunca anexa `pacotesDisponiveis` à
  // projeção do lobby (`sala-do.ts::confirmar`), e a seleção não tem o que
  // listar.
  useEffect(() => {
    if (souHost && config.modoPacote !== 'pacote') {
      enviar({ t: 'configurar', config: { modoPacote: 'pacote' } })
    }
  }, [souHost, config.modoPacote, enviar])

  const pacotesSelecionados = pacotesDisponiveis?.filter((p) => config.pacoteIds.includes(p.id)) ?? []
  const poolAtual = montarPoolDeCartas(
    LOCAIS.filter((p) => config.pacoteIds.includes(p.id)),
    config.dificuldades,
  )

  const opcoesDeTempoRodada = [
    ...PRESETS_DE_TEMPO_RODADA.map((p) => ({
      valor: p.valor === null ? 'sem-limite' : String(p.valor),
      rotulo: p.rotulo,
    })),
    { valor: 'personalizado', rotulo: 'Personalizado' },
  ]
  const tempoRodadaAtualVal =
    ehTempoRodadaPersonalizado(config.espiao.tempoRodadaSeg) || modoTempoRodada === 'personalizado'
      ? 'personalizado'
      : config.espiao.tempoRodadaSeg === null
        ? 'sem-limite'
        : String(config.espiao.tempoRodadaSeg)

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

      {config.pacoteIds.length > 0 && (
        <Botao variante="secundario" onClick={() => setVerLocaisAberto(true)}>
          Ver locais ({poolAtual.length})
        </Botao>
      )}

      {verLocaisAberto && (
        <Modal
          titulo="Locais possíveis"
          descricao={`${poolAtual.length} locais no pool combinado — nunca mostra qual saiu.`}
          largura="larga"
          aoCancelar={() => setVerLocaisAberto(false)}
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
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-apoio text-texto-2">Pacote de locais</legend>
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
                <Botao variante="secundario" onClick={abrirModalDeLocais}>Mudar...</Botao>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-bloco border border-dashed border-linha-suave bg-superficie px-4 py-3">
                <span className="text-[15px] text-texto-2">Nenhum pacote selecionado</span>
                <Botao variante="secundario" onClick={abrirModalDeLocais}>Selecionar...</Botao>
              </div>
            )}
          </fieldset>

          {modalLocaisAberto && (
            <Modal
              titulo="Escolha um ou mais pacotes de locais"
              descricao="Marque os temas de locais para esta partida."
              largura="larga"
              rotuloConfirmar="Confirmar"
              aoConfirmar={() => {
                enviar({ t: 'configurar', config: { modoPacote: 'pacote', pacoteIds: pacoteIdsRascunho } })
                setModalLocaisAberto(false)
              }}
              aoCancelar={() => setModalLocaisAberto(false)}
            >
              <div className="pacote-grid">
                {pacotesDisponiveis?.map((pacote) => {
                  const marcado = pacoteIdsRascunho.includes(pacote.id)
                  const alternar = () => {
                    setPacoteIdsRascunho((atual) =>
                      atual.includes(pacote.id)
                        ? atual.filter((id) => id !== pacote.id)
                        : [...atual, pacote.id]
                    )
                  }
                  return (
                    <div
                      key={pacote.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={marcado}
                      onClick={alternar}
                      onKeyDown={(evento) => {
                        if (evento.key !== 'Enter' && evento.key !== ' ') return
                        evento.preventDefault()
                        alternar()
                      }}
                      className="pacote-card text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{pacote.emoji}</span>
                        <h3 className="font-semibold text-texto">{pacote.nome}</h3>
                      </div>
                      <p className="text-miudo text-texto-2">{pacote.descricao}</p>
                      <span className="mt-1 font-mono text-[10px] tracking-[0.1em] text-texto-3 uppercase">
                        {pacote.quantidade} locais
                      </span>
                      <button
                        type="button"
                        onClick={(evento) => {
                          evento.stopPropagation()
                          setPacoteParaVerLocais(pacote)
                        }}
                        className="mt-1 flex min-h-11 w-full cursor-pointer items-center gap-1 self-start text-apoio font-medium text-acento hover:underline"
                      >
                        <span aria-hidden="true">▸</span>
                        Ver locais
                      </button>
                    </div>
                  )
                })}
              </div>
            </Modal>
          )}

          {pacoteParaVerLocais && (
            <Modal
              titulo={pacoteParaVerLocais.nome}
              descricao={`${pacoteParaVerLocais.quantidade} locais.`}
              largura="larga"
              aoCancelar={() => setPacoteParaVerLocais(null)}
            >
              <ul className="grid max-h-[60vh] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                {(LOCAIS.find((p) => p.id === pacoteParaVerLocais.id)?.cartas.map((c) => c.texto) ?? []).map(
                  (texto) => (
                    <li
                      key={texto}
                      className="rounded-controle bg-superficie-2 px-2.5 py-1.5 text-miudo text-texto-2"
                    >
                      {texto}
                    </li>
                  ),
                )}
              </ul>
            </Modal>
          )}

          <Escolha
            rotulo="Nº de espiões"
            dica={`Auto usa 1 espião até ${MESA_GRANDE_ESPIAO - 1} jogadores e 2 a partir de ${MESA_GRANDE_ESPIAO}. Precisa sobrar ao menos 2 jogadores não-espiões pra rodada começar.`}
            opcoes={OPCOES_NUM_ESPIOES}
            atual={config.espiao.numEspioes}
            aoEscolher={(numEspioes) =>
              enviar({ t: 'configurar', config: { espiao: { ...config.espiao, numEspioes } } })
            }
          />

          <Escolha
            rotulo="Espiões se veem"
            dica="Com 2+ espiões, decide se eles sabem uns dos outros."
            opcoes={OPCOES_SIM_NAO}
            atual={config.espiao.espioesSeVeem}
            aoEscolher={(espioesSeVeem) =>
              enviar({ t: 'configurar', config: { espiao: { ...config.espiao, espioesSeVeem } } })
            }
          />

          <Escolha
            rotulo="Visibilidade do voto"
            dica="Tempo real mostra a contagem enquanto a votação está aberta; oculta só revela ao fechar."
            opcoes={OPCOES_VISIBILIDADE_VOTO}
            atual={config.espiao.visibilidadeVoto}
            aoEscolher={(visibilidadeVoto) =>
              enviar({ t: 'configurar', config: { espiao: { ...config.espiao, visibilidadeVoto } } })
            }
          />

          <div className="flex flex-col gap-3">
            <Escolha
              rotulo="Tempo de rodada"
              dica="Tempo até a votação abrir automaticamente."
              opcoes={opcoesDeTempoRodada}
              atual={tempoRodadaAtualVal}
              aoEscolher={(val) => {
                if (val === 'personalizado') {
                  setModoTempoRodada('personalizado')
                } else {
                  setModoTempoRodada('preset')
                  enviar({
                    t: 'configurar',
                    config: {
                      espiao: {
                        ...config.espiao,
                        tempoRodadaSeg: val === 'sem-limite' ? null : Number(val),
                      },
                    },
                  })
                }
              }}
            />
            {(modoTempoRodada === 'personalizado' || ehTempoRodadaPersonalizado(config.espiao.tempoRodadaSeg)) && (
              <TempoPersonalizado
                atual={config.espiao.tempoRodadaSeg}
                aoEscolher={(tempoRodadaSeg) =>
                  enviar({ t: 'configurar', config: { espiao: { ...config.espiao, tempoRodadaSeg } } })
                }
              />
            )}
          </div>
        </div>
      ) : (
        <dl className="flex flex-col">
          <Leitura
            rotulo="Pacote de locais"
            valor={
              pacotesSelecionados.length > 0
                ? pacotesSelecionados.map((p) => p.nome).join(', ')
                : 'Nenhum pacote selecionado'
            }
          />
          <Leitura rotulo="Nº de espiões" valor={rotuloDe(OPCOES_NUM_ESPIOES, config.espiao.numEspioes)} />
          <Leitura rotulo="Espiões se veem" valor={config.espiao.espioesSeVeem ? 'Sim' : 'Não'} />
          <Leitura
            rotulo="Visibilidade do voto"
            valor={rotuloDe(OPCOES_VISIBILIDADE_VOTO, config.espiao.visibilidadeVoto)}
          />
          <Leitura rotulo="Tempo de rodada" valor={rotuloDoTempo(config.espiao.tempoRodadaSeg)} />
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
