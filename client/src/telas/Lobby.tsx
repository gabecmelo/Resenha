import { Fragment, useState } from 'react'
import type { Config, JogadorId, Projecao } from '../../../shared/protocolo'
import { Botao, Chat, FichaDeJogador, Modal, Shell } from '../componentes'
import { linkDeConvite } from '../estado/entrada'
import type { PropsDaTela } from './tela'

/**
 * A sala antes de começar (`SALA-07`…`SALA-09`, `HOST-01`…`HOST-03`,
 * `CFG-01`…`CFG-06`).
 *
 * O código manda na tela: é ele que a pessoa dita em voz alta. Ações de host
 * não existem na tela de quem não é host — nem apagadas, nem escondidas atrás
 * de aviso (`VIS-04`).
 */

/** `HOST-01` */
const MINIMO_PARA_INICIAR = 3
/** `SALA-05` */
const MAXIMO_DE_JOGADORES = 20

export function Lobby({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)
  const faltam = MINIMO_PARA_INICIAR - ativos.length

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
          <Titulo texto="Na sala" contagem={`${jogadores.length}/${MAXIMO_DE_JOGADORES}`} />
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
          <Regras config={sala.config} souHost={eu.ehHost} apelidoDoHost={host?.apelido} enviar={enviar} />
        </section>

        <section className="order-4 flex flex-col gap-3 lg:order-none lg:col-start-3 lg:row-span-3 lg:row-start-1">
          <Titulo texto="Chat" />
          <Chat
            mensagens={projecao.chat}
            jogadores={jogadores}
            aoEnviar={(texto) => enviar({ t: 'chat', texto })}
          />
        </section>

        <section className="order-5 lg:order-none lg:col-start-1 lg:row-start-3">
          {eu.ehHost ? (
            <div className="flex flex-col gap-2">
              <Botao
                larguraTotal
                onClick={() => enviar({ t: 'iniciar' })}
                motivo={
                  faltam > 0
                    ? `Precisa de pelo menos ${MINIMO_PARA_INICIAR} pessoas — ${
                        faltam === 1 ? 'falta 1' : `faltam ${faltam}`
                      }.`
                    : undefined
                }
              >
                {faltam > 0 ? 'Iniciar partida' : `Iniciar com ${ativos.length} pessoas`}
              </Botao>
              {faltam <= 0 && (
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
            {MINIMO_PARA_INICIAR} pessoas.
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
// Regras da partida (`CFG-01`…`CFG-06`)
// ---------------------------------------------------------------------------

const OPCOES_DE_ORDEM = [
  { valor: 'sorteada', rotulo: 'Sorteada' },
  { valor: 'entrada', rotulo: 'Ordem de entrada' },
] as const

const OPCOES_DE_TEMPO = [
  { valor: null, rotulo: 'Sem limite' },
  { valor: 30, rotulo: '30s' },
  { valor: 60, rotulo: '60s' },
  { valor: 90, rotulo: '90s' },
  { valor: 120, rotulo: '2min' },
] as const

function Regras({
  config,
  souHost,
  apelidoDoHost,
  enviar,
}: {
  config: Config
  souHost: boolean
  apelidoDoHost: string | undefined
  enviar: PropsDaTela['enviar']
}) {
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

      {souHost ? (
        <div className="flex flex-col gap-4">
          <Escolha
            rotulo="Ordem dos turnos"
            opcoes={OPCOES_DE_ORDEM}
            atual={config.ordemTurnos}
            aoEscolher={(ordemTurnos) => enviar({ t: 'configurar', config: { ordemTurnos } })}
          />
          <Escolha
            rotulo="Tempo por turno"
            opcoes={OPCOES_DE_TEMPO}
            atual={config.tempoTurnoSeg}
            aoEscolher={(tempoTurnoSeg) => enviar({ t: 'configurar', config: { tempoTurnoSeg } })}
          />
        </div>
      ) : (
        <dl className="flex flex-col">
          <Leitura rotulo="Ordem dos turnos" valor={rotuloDe(OPCOES_DE_ORDEM, config.ordemTurnos)} />
          <Leitura rotulo="Tempo por turno" valor={rotuloDe(OPCOES_DE_TEMPO, config.tempoTurnoSeg)} />
        </dl>
      )}
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
  opcoes,
  atual,
  aoEscolher,
}: {
  rotulo: string
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>
  atual: T
  aoEscolher(valor: T): void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-apoio text-texto-2">{rotulo}</legend>
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
