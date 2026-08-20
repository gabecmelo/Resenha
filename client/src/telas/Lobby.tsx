import { Fragment, useEffect, useState, type ReactNode } from 'react'
import {
  MESA_GRANDE_ESPIAO,
  RODADAS_POR_REROLL,
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
  BarraDeAcao,
  Botao,
  Chat,
  FolhaDeEscolha,
  LinhaDeRegra,
  MarcadorDeJogador,
  Modal,
  SeletorDeJogos,
  Shell,
} from '../componentes'
import { linkDeConvite, motivoParaIniciar } from '../estado/entrada'
import { PRESETS_DE_TEMPO, paraCampoDeTempo, rotuloDoTempo, tempoDigitado } from '../estado/turno'
import type { PropsDaTela } from './tela'

/**
 * A sala antes de começar (`SALA-07`…`SALA-09`, `HOST-01`…`HOST-03`,
 * `CFG-01`…`CFG-06`).
 *
 * O código manda na tela: é ele que a pessoa dita em voz alta, então é o maior
 * elemento daqui. As regras vêm como linhas de talão — rótulo, pontilhado,
 * valor — e a barra fixa no rodapé responde à única pergunta que importa neste
 * momento: *já dá pra começar?*
 *
 * Ações de host não existem na tela de quem não é host — nem apagadas, nem
 * escondidas atrás de aviso (`VIS-04`).
 */
export function Lobby({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)
  const [aba, setAba] = useState<'regras' | 'resenha'>('regras')

  // `AJU-34`, `AD-014` — o mínimo vem do catálogo do jogo ativo, não de um
  // número escrito nesta tela nem da constante única do produto.
  const minimoDoJogo = minJogadoresDoJogo(sala.jogoId)
  const pendencias = pendenciasParaIniciar(ativos.length, minimoDoJogo, sala.config, sala.jogoId)

  const acao = (
    <AcaoDeIniciar
      souHost={eu.ehHost}
      apelidoDoHost={host?.apelido}
      ativos={ativos.length}
      pendencias={pendencias}
      resumo={resumoDaPartida(sala, ativos.length)}
      enviar={enviar}
    />
  )

  return (
    <Shell titulo={nomeDoJogo(sala.jogoId)} codigo={sala.codigo} aoSair={aoSair}>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <ConviteEMesa
            codigo={sala.codigo}
            limite={sala.limiteJogadores}
            jogadores={jogadores}
            euId={eu.id}
            hostId={sala.hostId}
            souHost={eu.ehHost}
            minimoDoJogo={minimoDoJogo}
            enviar={enviar}
          />
          {/*
            No desktop a barra mora aqui, ao pé da coluna da esquerda.
            `lg:contents` em vez de `lg:block` porque a barra é `sticky`: uma
            caixa que a envolve com a altura exata dela não deixa folga nenhuma
            pra deslizar, e o `sticky` vira enfeite. Sem caixa, quem manda é a
            coluna inteira, e aí ela gruda no rodapé quando a janela é baixa.
          */}
          <div className="hidden lg:contents">{acao}</div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-papel border border-linha bg-superficie">
          <div className="flex border-b border-linha">
            <Aba atual={aba} valor="regras" aoEscolher={setAba}>
              Regras
            </Aba>
            <Aba atual={aba} valor="resenha" aoEscolher={setAba} contagem={projecao.chat.length}>
              Resenha
            </Aba>
          </div>

          <div className="p-3.5">
            {aba === 'regras' ? (
              <div className="flex flex-col">
                <JogoDaSala jogoId={sala.jogoId} souHost={eu.ehHost} enviar={enviar} />
                {!eu.ehHost && (
                  <p className="pt-3 text-apoio text-texto-3">
                    Quem escolhe é {host?.apelido ?? 'o host'}, que criou a sala.
                  </p>
                )}
                {sala.jogoId === 'cartas-contra-a-turma' ? (
                  <RegrasCartas
                    config={sala.config}
                    pacotesDisponiveis={sala.pacotesDisponiveis}
                    souHost={eu.ehHost}
                    enviar={enviar}
                  />
                ) : sala.jogoId === 'enigmas-sinistros' ? (
                  <RegrasEnigmas
                    config={sala.config}
                    pacotesDisponiveis={sala.pacotesDisponiveis}
                    souHost={eu.ehHost}
                    enviar={enviar}
                  />
                ) : sala.jogoId === 'espiao' ? (
                  <RegrasEspiao
                    config={sala.config}
                    pacotesDisponiveis={sala.pacotesDisponiveis}
                    souHost={eu.ehHost}
                    enviar={enviar}
                  />
                ) : (
                  <Regras
                    config={sala.config}
                    pacotesDisponiveis={sala.pacotesDisponiveis}
                    souHost={eu.ehHost}
                    enviar={enviar}
                  />
                )}
              </div>
            ) : (
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden">{acao}</div>
    </Shell>
  )
}

/**
 * Tudo que trava o começo, não só o primeiro impedimento. A barra lista os dois
 * quando são dois — descobrir que falta gente, resolver, e só então descobrir
 * que falta pacote é o jeito mais fácil de irritar quem está organizando.
 */
function pendenciasParaIniciar(
  ativos: number,
  minimo: number,
  config: Config,
  jogoId: string,
): string[] {
  const lista: string[] = []
  const gente = motivoParaIniciar(ativos, minimo)
  if (gente !== undefined) lista.push(gente)
  // `CCT-34` — Cartas Contra a Turma só existe com pacote; não passa por
  // `modoPacote`, que é vocabulário de "Quem Sou Eu?".
  if (jogoId === 'cartas-contra-a-turma' && config.pacoteIds.length === 0) {
    lista.push('Escolha ao menos um pacote de cartas.')
  }
  // `ENIG-32` — mesma história do Cartas: o jogo não existe sem enigma.
  if (jogoId === 'enigmas-sinistros' && config.pacoteIds.length === 0) {
    lista.push('Escolha ao menos um pacote de enigmas.')
  }
  if (config.modoPacote === 'pacote' && config.pacoteIds.length === 0) {
    lista.push('Escolha ao menos um pacote.')
  }
  if (config.modoPacote === 'personalizado') {
    lista.push('Pacotes personalizados não estão disponíveis ainda.')
  }
  return lista
}

/** A linha de resumo da barra: o que a partida vai ser, em dados. */
function resumoDaPartida(sala: Projecao['sala'], ativos: number): string {
  const partes = [`${ativos} na mesa`]
  const pacotes = sala.config.pacoteIds.length
  if (pacotes > 0) partes.push(`${pacotes} ${pacotes === 1 ? 'pacote' : 'pacotes'}`)
  if (sala.jogoId === 'espiao') {
    const numero = sala.config.espiao.numEspioes
    partes.push(numero === 'auto' ? 'espiões no automático' : `${numero} na cara de espião`)
  }
  return partes.join(' · ')
}

function Aba({
  atual,
  valor,
  contagem,
  aoEscolher,
  children,
}: {
  atual: string
  valor: 'regras' | 'resenha'
  contagem?: number
  aoEscolher(valor: 'regras' | 'resenha'): void
  children: ReactNode
}) {
  const ativa = atual === valor
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={() => aoEscolher(valor)}
      className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 text-corpo font-semibold ${
        ativa ? 'bg-controle-linha text-fundo' : 'text-texto-3 hover:text-texto'
      }`}
    >
      {children}
      {contagem !== undefined && contagem > 0 && (
        <span className="font-mono text-compacto">{contagem}</span>
      )}
    </button>
  )
}

/**
 * `SALA-08` — o código em destaque e a mesa logo abaixo, no mesmo papel: são a
 * mesma pergunta ("quem já está aqui, e como chamo o resto?").
 */
function ConviteEMesa({
  codigo,
  limite,
  jogadores,
  euId,
  hostId,
  souHost,
  minimoDoJogo,
  enviar,
}: {
  codigo: string
  limite: number
  jogadores: Projecao['jogadores']
  euId: JogadorId
  hostId: JogadorId
  souHost: boolean
  minimoDoJogo: number
  enviar: PropsDaTela['enviar']
}) {
  const [copiado, setCopiado] = useState(false)

  return (
    <section className="overflow-hidden rounded-papel border-2 border-controle-linha bg-superficie shadow-botao">
      <div className="flex flex-col gap-2.5 border-b border-dashed border-linha p-4">
        <h2 className="font-mono text-rotulo text-texto-3 uppercase">
          o código da sala é:
        </h2>
        <span className="font-display text-codigo text-texto">{codigo}</span>
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
          {copiado ? '✓ Link copiado' : '⧉ Copiar link do convite'}
        </Botao>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-rotulo text-texto-3 uppercase">na mesa</h2>
          {/* `AJU-39` — a lotação é a desta sala, escolhida por quem a criou. */}
          <span className="font-mono text-dado text-texto">
            {jogadores.length}
            <span className="text-texto-3">/{limite}</span>
          </span>
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {jogadores.map((jogador) => (
            <FichaNaMesa
              key={jogador.id}
              jogador={jogador}
              euId={euId}
              hostId={hostId}
              souHost={souHost}
              enviar={enviar}
            />
          ))}
        </ul>

        <p className="text-apoio text-texto-3">
          {jogadores.length === 1
            ? `Quem entrar aparece aqui na hora. A partida começa com ${minimoDoJogo}.`
            : souHost
              ? 'Toque numa ficha pra passar o comando ou tirar da mesa.'
              : 'Quem entrar aparece aqui na hora.'}
        </p>
      </div>
    </section>
  )
}

/** A ficha vira o próprio botão de ação do host — não há menu escondido. */
function FichaNaMesa({
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

  const etiqueta = [
    jogador.id === euId ? 'você' : null,
    jogador.id === hostId ? '★ host' : null,
    jogador.conectado ? null : '○ caiu',
    jogador.situacao === 'aguardando' ? 'entra na próxima' : null,
  ]
    .filter((parte) => parte !== null)
    .join(' · ')

  const miolo = (
    <>
      <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} tamanho="grande" />
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="truncate text-apoio font-semibold text-texto">{jogador.apelido}</span>
        {etiqueta !== '' && (
          <span className="truncate font-mono text-compacto-apoio tracking-[0.06em] text-texto-3">
            {etiqueta}
          </span>
        )}
      </span>
    </>
  )

  const forma = `flex min-h-12 w-full items-center gap-2 rounded-botao border border-linha bg-fundo px-2.5 py-2 ${
    jogador.conectado ? '' : 'opacity-55'
  }`

  return (
    <Fragment>
      <li>
        {temAcoes ? (
          <button
            type="button"
            aria-label={`Ações sobre ${jogador.apelido}`}
            onClick={() => setAberto(true)}
            className={`cursor-pointer ${forma}`}
          >
            {miolo}
          </button>
        ) : (
          <div className={forma}>{miolo}</div>
        )}
      </li>

      {aberto && (
        <Modal
          folha
          titulo={jogador.apelido}
          descricao="O que você quer fazer com essa pessoa?"
          rotuloCancelar="Fechar"
          aoCancelar={() => setAberto(false)}
        >
          <div className="flex flex-col gap-2.5">
            <Botao
              larguraTotal
              variante="secundario"
              onClick={() => {
                enviar({ t: 'transferirHost', jogadorId: jogador.id })
                setAberto(false)
              }}
            >
              Passar o comando
            </Botao>
            <Botao
              larguraTotal
              variante="destrutivo"
              onClick={() => {
                setConfirmandoExpulsao(true)
                setAberto(false)
              }}
            >
              Tirar da mesa
            </Botao>
          </div>
        </Modal>
      )}

      {confirmandoExpulsao && (
        <Modal
          titulo={`Tirar ${jogador.apelido} da mesa?`}
          descricao={`${jogador.apelido} sai da sala agora (ele consegue voltar por este código).`}
          rotuloConfirmar={`Tirar ${jogador.apelido}`}
          destrutivo
          aoConfirmar={() => {
            enviar({ t: 'expulsar', jogadorId: jogador.id })
            setConfirmandoExpulsao(false)
          }}
          aoCancelar={() => setConfirmandoExpulsao(false)}
        />
      )}
    </Fragment>
  )
}

/**
 * A barra que responde "já dá pra começar?". Quando não dá, ela lista **todas**
 * as pendências de uma vez.
 */
function AcaoDeIniciar({
  souHost,
  apelidoDoHost,
  ativos,
  pendencias,
  resumo,
  enviar,
}: {
  souHost: boolean
  apelidoDoHost: string | undefined
  ativos: number
  pendencias: string[]
  resumo: string
  enviar: PropsDaTela['enviar']
}) {
  if (!souHost) {
    return (
      <BarraDeAcao>
        <div className="flex items-center gap-2.5">
          <span className="selo bg-aviso text-aviso-contraste">esperando</span>
          <span className="text-apoio text-texto-2">
            {apelidoDoHost ?? 'O host'} começa quando quiser.
          </span>
        </div>
      </BarraDeAcao>
    )
  }

  const travado = pendencias.length > 0

  return (
    <BarraDeAcao>
      {travado ? (
        <div className="flex flex-col items-start gap-1.5">
          <span className="selo bg-acento text-acento-contraste">
            {pendencias.length === 1 ? 'falta 1 coisa' : `faltam ${pendencias.length} coisas`}
          </span>
          <ul className="flex flex-col gap-1">
            {pendencias.map((pendencia) => (
              <li key={pendencia} className="flex gap-2 text-apoio leading-snug text-texto-2">
                <span aria-hidden="true">·</span>
                <span>{pendencia}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="selo border border-pronto text-pronto">tudo pronto</span>
          <span className="text-apoio text-texto-3">{resumo}</span>
        </div>
      )}

      <Botao
        larguraTotal
        onClick={() => enviar({ t: 'iniciar' })}
        motivo={travado ? pendencias.join(' ') : undefined}
        motivoOculto
      >
        {travado ? 'Começar' : `Começar com ${ativos} pessoas`}
      </Botao>
    </BarraDeAcao>
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

  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-linha py-3">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-corpo font-semibold text-texto">Jogo</span>
        {souHost && <span className="text-apoio text-texto-3">trocar reseta as regras</span>}
      </span>

      {souHost ? (
        <button
          type="button"
          onClick={() => {
            setJogoIdRascunho(jogoId)
            setModalAberto(true)
          }}
          className="flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-chip border border-controle-linha bg-fundo px-3 text-apoio font-semibold text-texto shadow-chip transition-transform motion-safe:active:translate-x-[2px] motion-safe:active:translate-y-[2px] motion-safe:active:shadow-none"
        >
          {nomeDoJogo(jogoId)}
          <span aria-hidden="true" className="text-texto-3">
            ⇄
          </span>
        </button>
      ) : (
        <span className="flex-none font-mono text-dado text-texto-2">{nomeDoJogo(jogoId)}</span>
      )}

      {modalAberto && (
        <Modal
          folha
          titulo="O que vamos jogar"
          descricao="Trocar de jogo reseta as regras da partida pro padrão do jogo novo."
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

// ---------------------------------------------------------------------------
// Regras da partida (`CFG-01`…`CFG-06`)
// ---------------------------------------------------------------------------

const OPCOES_DE_ORDEM = [
  { valor: 'sorteada' as const, rotulo: 'Sorteada' },
  { valor: 'entrada' as const, rotulo: 'Ordem de entrada' },
]

const OPCOES_DE_MODO = [
  { valor: 'livre' as const, rotulo: 'Livre', nota: 'Cada um escreve o que quiser.' },
  { valor: 'pacote' as const, rotulo: 'Pacotes', nota: 'Temas pré-definidos do jogo.' },
  { valor: 'personalizado' as const, rotulo: 'Personalizado', nota: 'Em breve.' },
]

const OPCOES_DE_DISTRIBUICAO = [
  { valor: 'aleatoria' as const, rotulo: 'Aleatória', nota: 'O jogo sorteia a carta.' },
  {
    valor: 'escolha' as const,
    rotulo: 'Escolher pro colega',
    nota: 'Você recebe 5 opções e escolhe uma.',
  },
]

const OPCOES_DE_DIFICULDADE: ReadonlyArray<{ valor: Dificuldade; rotulo: string }> = [
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'dificil', rotulo: 'Difícil' },
]

function Regras({
  config,
  pacotesDisponiveis,
  souHost,
  enviar,
}: {
  config: Config
  pacotesDisponiveis: PacoteResumo[] | undefined
  souHost: boolean
  enviar: PropsDaTela['enviar']
}) {
  const [folha, setFolha] = useState<string | null>(null)
  const [modalPacotesAberto, setModalPacotesAberto] = useState(false)
  const [pacoteIdsRascunho, setPacoteIdsRascunho] = useState<string[]>(config.pacoteIds)

  const pacotesSelecionados =
    pacotesDisponiveis?.filter((p) => config.pacoteIds.includes(p.id)) ?? []

  const abrir = (nome: string) => (souHost ? () => setFolha(nome) : undefined)

  return (
    <div className="flex flex-col">
      <LinhaDeRegra
        rotulo="Modo de jogo"
        dica="Livre: cada um escreve o que quiser. Pacotes: temas pré-definidos do jogo."
        valor={rotuloDe(OPCOES_DE_MODO, config.modoPacote)}
        aoAbrir={abrir('modo')}
      />

      {config.modoPacote === 'pacote' && (
        <>
          <LinhaDeRegra
            rotulo="Pacote"
            dica="O tema de cartas selecionado para todos os jogadores."
            valor={resumoDePacotes(pacotesSelecionados)}
            aoAbrir={() => {
                setPacoteIdsRascunho(config.pacoteIds)
                setModalPacotesAberto(true)
              }}
          />
          <LinhaDeRegra
            rotulo="Dificuldade"
            dica="Pelo menos um nível precisa estar marcado."
            valor={OPCOES_DE_DIFICULDADE.filter((o) => config.dificuldades.includes(o.valor))
              .map((o) => o.rotulo)
              .join(', ')}
            aoAbrir={abrir('dificuldade')}
          />
          {config.pacoteIds.length > 0 && (
            <LinhaDeRegra
              rotulo="Distribuição"
              dica="Aleatória: o jogo sorteia a carta. Escolher: você recebe 5 opções do pacote e escolhe uma delas pro seu colega."
              valor={rotuloDe(OPCOES_DE_DISTRIBUICAO, config.modoDistribuicao)}
              aoAbrir={abrir('distribuicao')}
            />
          )}
        </>
      )}

      <LinhaDeRegra
        rotulo="Ordem dos turnos"
        dica="Ordem de entrada: quem entrou primeiro na sala joga primeiro."
        valor={rotuloDe(OPCOES_DE_ORDEM, config.ordemTurnos)}
        aoAbrir={abrir('ordem')}
      />
      <LinhaDeRegra
        rotulo="Tempo por turno"
        dica="Tempo máximo que um jogador tem pra adivinhar a carta na sua vez."
        valor={rotuloDoTempo(config.tempoTurnoSeg)}
        aoAbrir={abrir('tempo')}
      />

      {config.modoPacote === 'personalizado' && (
        <div className="pacote-fantasma mt-3.5">
          <span aria-hidden="true" className="text-[24px] opacity-50">
            🔒
          </span>
          <span className="font-semibold text-texto-3">Crie seu pacote — em breve</span>
        </div>
      )}

      {folha === 'modo' && (
        <FolhaDeEscolha
          titulo="Modo de jogo"
          opcoes={OPCOES_DE_MODO}
          atual={config.modoPacote}
          aoEscolher={(modoPacote) => {
            if (modoPacote === 'livre') {
              enviar({
                t: 'configurar',
                config: { modoPacote, pacoteIds: [], modoDistribuicao: 'aleatoria' },
              })
            } else {
              enviar({ t: 'configurar', config: { modoPacote } })
            }
          }}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'dificuldade' && (
        <Modal
          folha
          titulo="Dificuldade"
          descricao="Pode marcar mais de um. Pelo menos um nível precisa ficar de pé."
          rotuloCancelar="Fechar"
          aoCancelar={() => setFolha(null)}
        >
          <div className="flex flex-col gap-2.5">
            {OPCOES_DE_DIFICULDADE.map((opcao) => {
              const marcado = config.dificuldades.includes(opcao.valor)
              const ehUltimaAtiva = marcado && config.dificuldades.length === 1
              return (
                <Botao
                  key={opcao.valor}
                  larguraTotal
                  variante={marcado ? 'primario' : 'secundario'}
                  motivo={ehUltimaAtiva ? 'Pelo menos um nível precisa estar marcado.' : undefined}
                  selecaoTravada={ehUltimaAtiva}
                  onClick={() => {
                    const dificuldades = marcado
                      ? config.dificuldades.filter((d) => d !== opcao.valor)
                      : [...config.dificuldades, opcao.valor]
                    enviar({ t: 'configurar', config: { dificuldades } })
                  }}
                >
                  {marcado ? `✓ ${opcao.rotulo}` : opcao.rotulo}
                </Botao>
              )
            })}
          </div>
        </Modal>
      )}

      {folha === 'distribuicao' && (
        <FolhaDeEscolha
          titulo="Distribuição"
          opcoes={OPCOES_DE_DISTRIBUICAO}
          atual={config.modoDistribuicao}
          aoEscolher={(modoDistribuicao) =>
            enviar({ t: 'configurar', config: { modoDistribuicao } })
          }
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'ordem' && (
        <FolhaDeEscolha
          titulo="Ordem dos turnos"
          opcoes={OPCOES_DE_ORDEM}
          atual={config.ordemTurnos}
          aoEscolher={(ordemTurnos) => enviar({ t: 'configurar', config: { ordemTurnos } })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'tempo' && (
        <FolhaDeTempo
          titulo="Tempo por turno"
          atual={config.tempoTurnoSeg}
          presets={PRESETS_DE_TEMPO}
          aoEscolher={(tempoTurnoSeg) => enviar({ t: 'configurar', config: { tempoTurnoSeg } })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {modalPacotesAberto && (
        <GavetaDePacotes
          titulo="Pacotes de cartas"
          descricao="Pode escolher mais de um — as cartas se somam."
          unidade="cartas"
          disponiveis={pacotesDisponiveis}
          // Em leitura o que vale é a config em vigor, não o rascunho: com o
          // rascunho, o host trocando de pacote com a gaveta de alguém aberta
          // deixaria a marca de "na partida" mentindo até fechar e reabrir.
          rascunho={souHost ? pacoteIdsRascunho : config.pacoteIds}
          somenteLeitura={!souHost}
          aoAlternar={setPacoteIdsRascunho}
          aoConfirmar={() => {
            enviar({ t: 'configurar', config: { pacoteIds: pacoteIdsRascunho } })
            setModalPacotesAberto(false)
          }}
          aoFechar={() => setModalPacotesAberto(false)}
        />
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Regras da partida de Espião (`AD-014`, `ESP-01`…`ESP-03`, `ESP-17`…`ESP-19`)
// ---------------------------------------------------------------------------

const OPCOES_NUM_ESPIOES: ReadonlyArray<{ valor: number | 'auto'; rotulo: string; nota?: string }> =
  [
    {
      valor: 'auto' as const,
      rotulo: 'Auto',
      nota: `1 espião até ${MESA_GRANDE_ESPIAO - 1} jogadores, 2 a partir de ${MESA_GRANDE_ESPIAO}.`,
    },
    ...[1, 2, 3, 4, 5].map((n) => ({ valor: n, rotulo: String(n) })),
  ]

const OPCOES_SIM_NAO = [
  { valor: true, rotulo: 'Sim' },
  { valor: false, rotulo: 'Não' },
]

const OPCOES_VISIBILIDADE_VOTO = [
  {
    valor: 'oculta' as const,
    rotulo: 'Oculta até fechar',
    nota: 'Ninguém vê a contagem enquanto a votação corre.',
  },
  {
    valor: 'tempoReal' as const,
    rotulo: 'Tempo real',
    nota: 'A contagem por pessoa aparece a cada voto.',
  },
]

/**
 * `ESP-28` — quanto a mesa tem pra decidir depois que a votação abre. Sem
 * "sem limite": uma votação sem prazo trava a partida esperando quem foi ao
 * banheiro.
 */
const PRESETS_DE_TEMPO_VOTACAO: ReadonlyArray<{ valor: number; rotulo: string }> = [
  { valor: 30, rotulo: '30s' },
  { valor: 60, rotulo: '1min' },
  { valor: 90, rotulo: '1min30' },
  { valor: 120, rotulo: '2min' },
]

const OPCOES_MAX_VOTACOES: ReadonlyArray<{ valor: number | null; rotulo: string }> = [
  { valor: 1, rotulo: '1 votação' },
  { valor: 2, rotulo: '2 votações' },
  { valor: 3, rotulo: '3 votações' },
  { valor: null, rotulo: 'Sem limite' },
]

const PRESETS_DE_TEMPO_RODADA: ReadonlyArray<{ valor: number | null; rotulo: string }> = [
  { valor: null, rotulo: 'Sem limite' },
  { valor: 180, rotulo: '3min' },
  { valor: 300, rotulo: '5min' },
  { valor: 600, rotulo: '10min' },
]

const PRESETS_DE_TEMPO_ESCOLHA: ReadonlyArray<{ valor: number | null; rotulo: string }> = [
  { valor: null, rotulo: 'Sem tempo' },
  { valor: 60, rotulo: '1min' },
  { valor: 90, rotulo: '1min30' },
  { valor: 180, rotulo: '3min' },
]

/** `CCT-44` — quantas trocas de mão cada um leva pra partida. */
const PRESETS_DE_REROLLS: ReadonlyArray<{ valor: number; rotulo: string }> = [
  { valor: 0, rotulo: 'Sem troca' },
  { valor: 1, rotulo: '1 troca' },
  { valor: 2, rotulo: '2 trocas' },
  { valor: 4, rotulo: '4 trocas' },
  { valor: 8, rotulo: '8 trocas' },
]

/** `CCT-45` — rodadas até a carta em branco voltar depois de gasta. */
const PRESETS_DE_RECARGA: ReadonlyArray<{ valor: number; rotulo: string }> = [
  { valor: 0, rotulo: 'Sempre à mão' },
  { valor: 3, rotulo: 'A cada 3 rodadas' },
  { valor: 5, rotulo: 'A cada 5 rodadas' },
  { valor: 8, rotulo: 'A cada 8 rodadas' },
  { valor: 12, rotulo: 'A cada 12 rodadas' },
]

const PRESETS_DE_META: ReadonlyArray<{ valor: number | null; rotulo: string }> = [
  { valor: null, rotulo: 'Sem meta' },
  { valor: 3, rotulo: '3 pontos' },
  { valor: 5, rotulo: '5 pontos' },
  { valor: 8, rotulo: '8 pontos' },
  { valor: 10, rotulo: '10 pontos' },
]

/** `CCT-01`, `CCT-31` — as regras do Cartas Contra a Turma. */
function RegrasCartas({
  config,
  pacotesDisponiveis,
  souHost,
  enviar,
}: {
  config: Config
  pacotesDisponiveis: PacoteResumo[] | undefined
  souHost: boolean
  enviar: PropsDaTela['enviar']
}) {
  const [folha, setFolha] = useState<string | null>(null)
  const [modalPacotesAberto, setModalPacotesAberto] = useState(false)
  const [pacoteIdsRascunho, setPacoteIdsRascunho] = useState<string[]>(config.pacoteIds)

  const pacotesSelecionados =
    pacotesDisponiveis?.filter((p) => config.pacoteIds.includes(p.id)) ?? []

  const abrir = (nome: string) => (souHost ? () => setFolha(nome) : undefined)
  const mudarCartas = (parcial: Partial<Config['cartas']>) =>
    enviar({ t: 'configurar', config: { cartas: { ...config.cartas, ...parcial } } })

  return (
    <div className="flex flex-col">
      <LinhaDeRegra
        rotulo="Pacotes de cartas"
        dica="O tom da mesa mora aqui: leve pra jogar com a família, pesado pra madrugada."
        valor={resumoDePacotes(pacotesSelecionados)}
        aoAbrir={() => {
            setPacoteIdsRascunho(config.pacoteIds)
            setModalPacotesAberto(true)
          }}
      />
      <LinhaDeRegra
        rotulo="Tempo de escolha"
        dica="Quanto tempo a mesa tem pra jogar a carta. Quem não jogar fica de fora da rodada."
        valor={rotuloDe(PRESETS_DE_TEMPO_ESCOLHA, config.cartas.tempoEscolhaSeg)}
        aoAbrir={abrir('tempoEscolha')}
      />
      <LinhaDeRegra
        rotulo="Meta de pontos"
        dica="Quem chegar primeiro leva a partida. Sem meta, a partida só acaba quando o host encerra."
        valor={rotuloDe(PRESETS_DE_META, config.cartas.metaDePontos)}
        aoAbrir={abrir('meta')}
      />
      <LinhaDeRegra
        rotulo="Trocas de mão"
        dica={`Quantas vezes cada um pode trocar a mão inteira. Ganha mais uma a cada ${RODADAS_POR_REROLL} rodadas.`}
        valor={rotuloDe(PRESETS_DE_REROLLS, config.cartas.rerollsIniciais)}
        aoAbrir={abrir('rerolls')}
      />
      <LinhaDeRegra
        rotulo="Carta em branco"
        dica="De quantas em quantas rodadas volta a chance de escrever a própria resposta."
        valor={rotuloDe(PRESETS_DE_RECARGA, config.cartas.recargaDaBrancaRodadas)}
        aoAbrir={abrir('recarga')}
      />

      {folha === 'tempoEscolha' && (
        <FolhaDeEscolha
          titulo="Tempo de escolha"
          descricao="A rodada fecha sozinha quando esse tempo vence — ou antes, se todo mundo já jogou."
          opcoes={PRESETS_DE_TEMPO_ESCOLHA}
          atual={config.cartas.tempoEscolhaSeg}
          aoEscolher={(tempoEscolhaSeg) => mudarCartas({ tempoEscolhaSeg })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'meta' && (
        <FolhaDeEscolha
          titulo="Meta de pontos"
          descricao="Cada rodada vencida vale 1 ponto."
          opcoes={PRESETS_DE_META}
          atual={config.cartas.metaDePontos}
          aoEscolher={(metaDePontos) => mudarCartas({ metaDePontos })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'rerolls' && (
        <FolhaDeEscolha
          titulo="Trocas de mão"
          descricao={`A mão velha vai pro descarte e sete novas entram. Cada um ganha mais uma troca a cada ${RODADAS_POR_REROLL} rodadas.`}
          opcoes={PRESETS_DE_REROLLS}
          atual={config.cartas.rerollsIniciais}
          aoEscolher={(rerollsIniciais) => mudarCartas({ rerollsIniciais })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'recarga' && (
        <FolhaDeEscolha
          titulo="Carta em branco"
          descricao="Depois de gastar a carta em branco, é esse o tempo até ela voltar. Em “sempre à mão”, dá pra escrever toda rodada."
          opcoes={PRESETS_DE_RECARGA}
          atual={config.cartas.recargaDaBrancaRodadas}
          aoEscolher={(recargaDaBrancaRodadas) => mudarCartas({ recargaDaBrancaRodadas })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {modalPacotesAberto && (
        <GavetaDePacotes
          titulo="Pacotes de cartas"
          descricao="Pode escolher mais de um — as cartas se somam. O tom vem escrito na descrição."
          unidade="cartas"
          disponiveis={pacotesDisponiveis}
          // Em leitura o que vale é a config em vigor, não o rascunho: com o
          // rascunho, o host trocando de pacote com a gaveta de alguém aberta
          // deixaria a marca de "na partida" mentindo até fechar e reabrir.
          rascunho={souHost ? pacoteIdsRascunho : config.pacoteIds}
          somenteLeitura={!souHost}
          aoAlternar={setPacoteIdsRascunho}
          aoConfirmar={() => {
            enviar({ t: 'configurar', config: { pacoteIds: pacoteIdsRascunho } })
            setModalPacotesAberto(false)
          }}
          aoFechar={() => setModalPacotesAberto(false)}
        />
      )}
    </div>
  )
}

/** `ENIG-24`, `ENIG-33` — as regras do Enigmas Sinistros. */
function RegrasEnigmas({
  config,
  pacotesDisponiveis,
  souHost,
  enviar,
}: {
  config: Config
  pacotesDisponiveis: PacoteResumo[] | undefined
  souHost: boolean
  enviar: PropsDaTela['enviar']
}) {
  const [folha, setFolha] = useState<string | null>(null)
  const [modalPacotesAberto, setModalPacotesAberto] = useState(false)
  const [pacoteIdsRascunho, setPacoteIdsRascunho] = useState<string[]>(config.pacoteIds)

  const pacotesSelecionados =
    pacotesDisponiveis?.filter((p) => config.pacoteIds.includes(p.id)) ?? []

  const abrir = (nome: string) => (souHost ? () => setFolha(nome) : undefined)
  const mudarEnigmas = (parcial: Partial<Config['enigmas']>) =>
    enviar({ t: 'configurar', config: { enigmas: { ...config.enigmas, ...parcial } } })

  return (
    <div className="flex flex-col">
      <LinhaDeRegra
        rotulo="Pacotes de enigmas"
        dica="O tom da mesa mora aqui: casos estranhos pra jogar na sala, sangue frio pra madrugada."
        valor={resumoDePacotes(pacotesSelecionados)}
        aoAbrir={() => {
            setPacoteIdsRascunho(config.pacoteIds)
            setModalPacotesAberto(true)
          }}
      />
      <LinhaDeRegra
        rotulo="Como perguntar"
        dica="Na fila, a pergunta é escrita e fica no histórico. Em voz alta, o app só registra as respostas do narrador."
        valor={rotuloDe(OPCOES_MODO_PERGUNTA, config.enigmas.modoPergunta)}
        aoAbrir={abrir('modoPergunta')}
      />
      <LinhaDeRegra
        rotulo="Meta de pontos"
        dica="Quem desatar mais enigmas leva. Sem meta, a partida só acaba quando o host encerra."
        valor={rotuloDe(PRESETS_DE_META_ENIGMAS, config.enigmas.metaDePontos)}
        aoAbrir={abrir('metaEnigmas')}
      />

      {folha === 'modoPergunta' && (
        <FolhaDeEscolha
          titulo="Como perguntar"
          descricao="Nos dois modos o narrador só responde sim, não ou não importa — o que muda é se a pergunta passa pelo app."
          opcoes={OPCOES_MODO_PERGUNTA}
          atual={config.enigmas.modoPergunta}
          aoEscolher={(modoPergunta) => mudarEnigmas({ modoPergunta })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'metaEnigmas' && (
        <FolhaDeEscolha
          titulo="Meta de pontos"
          descricao="Cada enigma desatado vale 1 ponto pra quem contou a história certa."
          opcoes={PRESETS_DE_META_ENIGMAS}
          atual={config.enigmas.metaDePontos}
          aoEscolher={(metaDePontos) => mudarEnigmas({ metaDePontos })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {modalPacotesAberto && (
        <GavetaDePacotes
          titulo="Pacotes de enigmas"
          descricao="Pode escolher mais de um — os enigmas se somam. O tom vem escrito na descrição."
          unidade="enigmas"
          disponiveis={pacotesDisponiveis}
          // Em leitura o que vale é a config em vigor, não o rascunho: com o
          // rascunho, o host trocando de pacote com a gaveta de alguém aberta
          // deixaria a marca de "na partida" mentindo até fechar e reabrir.
          rascunho={souHost ? pacoteIdsRascunho : config.pacoteIds}
          somenteLeitura={!souHost}
          aoAlternar={setPacoteIdsRascunho}
          aoConfirmar={() => {
            enviar({ t: 'configurar', config: { pacoteIds: pacoteIdsRascunho } })
            setModalPacotesAberto(false)
          }}
          aoFechar={() => setModalPacotesAberto(false)}
        />
      )}
    </div>
  )
}

/** `ENIG-33` — os dois jeitos de a mesa perguntar. */
const OPCOES_MODO_PERGUNTA: ReadonlyArray<{ valor: 'fila' | 'voz'; rotulo: string }> = [
  { valor: 'fila', rotulo: 'Fila no app' },
  { valor: 'voz', rotulo: 'Só em voz alta' },
]

const PRESETS_DE_META_ENIGMAS: ReadonlyArray<{ valor: number | null; rotulo: string }> = [
  { valor: null, rotulo: 'Sem meta' },
  { valor: 2, rotulo: '2 enigmas' },
  { valor: 3, rotulo: '3 enigmas' },
  { valor: 5, rotulo: '5 enigmas' },
  { valor: 8, rotulo: '8 enigmas' },
]

function RegrasEspiao({
  config,
  pacotesDisponiveis,
  souHost,
  enviar,
}: {
  config: Config
  pacotesDisponiveis: PacoteResumo[] | undefined
  souHost: boolean
  enviar: PropsDaTela['enviar']
}) {
  const [folha, setFolha] = useState<string | null>(null)
  const [modalLocaisAberto, setModalLocaisAberto] = useState(false)
  const [pacoteIdsRascunho, setPacoteIdsRascunho] = useState<string[]>(config.pacoteIds)

  // Espião sempre opera em modo pacote (não existe "escrita livre" de local,
  // `AD-014`); sem isso o servidor nunca anexa `pacotesDisponiveis` à projeção
  // do lobby (`sala-do.ts::confirmar`), e a seleção não tem o que listar.
  useEffect(() => {
    if (souHost && config.modoPacote !== 'pacote') {
      enviar({ t: 'configurar', config: { modoPacote: 'pacote' } })
    }
  }, [souHost, config.modoPacote, enviar])

  const pacotesSelecionados =
    pacotesDisponiveis?.filter((p) => config.pacoteIds.includes(p.id)) ?? []

  const abrir = (nome: string) => (souHost ? () => setFolha(nome) : undefined)
  const mudarEspiao = (parcial: Partial<Config['espiao']>) =>
    enviar({ t: 'configurar', config: { espiao: { ...config.espiao, ...parcial } } })

  return (
    <div className="flex flex-col">
      <LinhaDeRegra
        rotulo="Pacote de locais"
        dica="De onde saem os locais sorteados pra mesa."
        valor={resumoDePacotes(pacotesSelecionados)}
        aoAbrir={() => {
            setPacoteIdsRascunho(config.pacoteIds)
            setModalLocaisAberto(true)
          }}
      />
      <LinhaDeRegra
        rotulo="Nº de espiões"
        dica={`Auto usa 1 espião até ${MESA_GRANDE_ESPIAO - 1} jogadores e 2 a partir de ${MESA_GRANDE_ESPIAO}. Precisa sobrar ao menos 2 jogadores não-espiões pra rodada começar.`}
        valor={rotuloDe(OPCOES_NUM_ESPIOES, config.espiao.numEspioes)}
        aoAbrir={abrir('numEspioes')}
      />
      <LinhaDeRegra
        rotulo="Espiões se veem"
        dica="Com 2+ espiões, decide se eles sabem uns dos outros."
        valor={config.espiao.espioesSeVeem ? 'Sim' : 'Não'}
        aoAbrir={abrir('seVeem')}
      />
      <LinhaDeRegra
        rotulo="Visibilidade do voto"
        dica="Tempo real mostra a contagem enquanto a votação está aberta; oculta só revela ao fechar."
        valor={rotuloDe(OPCOES_VISIBILIDADE_VOTO, config.espiao.visibilidadeVoto)}
        aoAbrir={abrir('voto')}
      />
      <LinhaDeRegra
        rotulo="Tempo de rodada"
        dica="Tempo até a votação abrir automaticamente."
        valor={rotuloDoTempo(config.espiao.tempoRodadaSeg)}
        aoAbrir={abrir('tempoRodada')}
      />
      <LinhaDeRegra
        rotulo="Votações da mesa"
        dica="Quantas vezes a mesa pode abrir votação por conta própria. A votação final, que o relógio abre no zero, não conta."
        valor={rotuloDe(OPCOES_MAX_VOTACOES, config.espiao.maxVotacoes)}
        aoAbrir={abrir('maxVotacoes')}
      />
      <LinhaDeRegra
        rotulo="Tempo de votação"
        dica="Depois que a votação abre, ninguém mais pergunta: é só decidir."
        valor={rotuloDe(PRESETS_DE_TEMPO_VOTACAO, config.espiao.tempoVotacaoSeg)}
        aoAbrir={abrir('tempoVotacao')}
      />

      {folha === 'numEspioes' && (
        <FolhaDeEscolha
          titulo="Nº de espiões"
          descricao="Precisa sobrar ao menos 2 jogadores não-espiões pra rodada começar."
          opcoes={OPCOES_NUM_ESPIOES}
          atual={config.espiao.numEspioes}
          aoEscolher={(numEspioes) => mudarEspiao({ numEspioes })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'seVeem' && (
        <FolhaDeEscolha
          titulo="Espiões se veem"
          descricao="Com 2+ espiões, decide se eles sabem uns dos outros."
          opcoes={OPCOES_SIM_NAO}
          atual={config.espiao.espioesSeVeem}
          aoEscolher={(espioesSeVeem) => mudarEspiao({ espioesSeVeem })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'voto' && (
        <FolhaDeEscolha
          titulo="Visibilidade do voto"
          opcoes={OPCOES_VISIBILIDADE_VOTO}
          atual={config.espiao.visibilidadeVoto}
          aoEscolher={(visibilidadeVoto) => mudarEspiao({ visibilidadeVoto })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'tempoRodada' && (
        <FolhaDeTempo
          titulo="Tempo de rodada"
          atual={config.espiao.tempoRodadaSeg}
          presets={PRESETS_DE_TEMPO_RODADA}
          aoEscolher={(tempoRodadaSeg) => mudarEspiao({ tempoRodadaSeg })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'maxVotacoes' && (
        <FolhaDeEscolha
          titulo="Votações da mesa"
          descricao="Quando acabam, só o relógio abre a votação final — e ela decide a partida."
          opcoes={OPCOES_MAX_VOTACOES}
          atual={config.espiao.maxVotacoes}
          aoEscolher={(maxVotacoes) => mudarEspiao({ maxVotacoes })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {folha === 'tempoVotacao' && (
        <FolhaDeEscolha
          titulo="Tempo de votação"
          descricao="A votação fecha sozinha quando esse tempo vence — ou antes, se todo mundo já votou."
          opcoes={PRESETS_DE_TEMPO_VOTACAO}
          atual={config.espiao.tempoVotacaoSeg}
          aoEscolher={(tempoVotacaoSeg) => mudarEspiao({ tempoVotacaoSeg })}
          aoFechar={() => setFolha(null)}
        />
      )}

      {modalLocaisAberto && (
        <GavetaDePacotes
          titulo="Pacotes de locais"
          descricao="Pode escolher mais de um — os locais se somam."
          unidade="locais"
          disponiveis={pacotesDisponiveis}
          // Em leitura o que vale é a config em vigor, não o rascunho: com o
          // rascunho, o host trocando de pacote com a gaveta de alguém aberta
          // deixaria a marca de "na partida" mentindo até fechar e reabrir.
          rascunho={souHost ? pacoteIdsRascunho : config.pacoteIds}
          somenteLeitura={!souHost}
          aoAlternar={setPacoteIdsRascunho}
          aoConfirmar={() => {
            enviar({
              t: 'configurar',
              config: { modoPacote: 'pacote', pacoteIds: pacoteIdsRascunho },
            })
            setModalLocaisAberto(false)
          }}
          aoFechar={() => setModalLocaisAberto(false)}
        />
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Peças compartilhadas pelas duas listas de regras
// ---------------------------------------------------------------------------

function resumoDePacotes(selecionados: PacoteResumo[]): string {
  if (selecionados.length === 0) return 'nenhum'
  if (selecionados.length === 1) return selecionados[0]?.nome ?? 'nenhum'
  return `${selecionados.length} pacotes`
}

/** A gaveta de pacotes: cards de papel, seleção múltipla, confirma no fim. */
function GavetaDePacotes({
  titulo,
  descricao,
  unidade,
  disponiveis,
  rascunho,
  somenteLeitura = false,
  aoAlternar,
  aoConfirmar,
  aoFechar,
}: {
  titulo: string
  descricao: string
  unidade: string
  disponiveis: PacoteResumo[] | undefined
  rascunho: string[]
  /** Quem não é host abre a mesma gaveta pra ler o cardápio, sem mexer nele. */
  somenteLeitura?: boolean
  aoAlternar(proximo: string[]): void
  aoConfirmar(): void
  aoFechar(): void
}) {
  const miolo = (pacote: PacoteResumo) => (
    <>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="text-[20px]">
          {pacote.emoji}
        </span>
        <span className="font-semibold text-texto">{pacote.nome}</span>
      </span>
      <span className="text-apoio text-texto-3">{pacote.descricao}</span>
      <span className="font-mono text-compacto-apoio tracking-[0.1em] text-texto-3 uppercase">
        {pacote.quantidade} {unidade}
      </span>
    </>
  )

  /*
   * Só leitura não é o mesmo card desativado: um botão que não faz nada mente
   * sobre o que é. Vira lista, e o que está em jogo se anuncia por escrito, não
   * só pela borda — quem não enxerga a cor precisa da informação também.
   */
  if (somenteLeitura) {
    return (
      <Modal
        folha
        titulo={titulo}
        descricao="Quem escolhe é o host. Isto é o cardápio da sala."
        largura="larga"
        rotuloCancelar="Fechar"
        aoCancelar={aoFechar}
      >
        <ul className="pacote-grid">
          {disponiveis?.map((pacote) => {
            const emJogo = rascunho.includes(pacote.id)
            return (
              <li
                key={pacote.id}
                data-marcado={emJogo}
                className="pacote-card pacote-card--lendo"
              >
                {emJogo && (
                  <span className="selo bg-acento-suave text-acento-forte">na partida</span>
                )}
                {miolo(pacote)}
              </li>
            )
          })}
        </ul>
      </Modal>
    )
  }

  return (
    <Modal
      folha
      titulo={titulo}
      descricao={descricao}
      largura="larga"
      rotuloConfirmar="Confirmar"
      aoConfirmar={aoConfirmar}
      aoCancelar={aoFechar}
    >
      <div className="pacote-grid">
        {disponiveis?.map((pacote) => {
          const marcado = rascunho.includes(pacote.id)
          return (
            <button
              key={pacote.id}
              type="button"
              aria-pressed={marcado}
              onClick={() =>
                aoAlternar(
                  marcado ? rascunho.filter((id) => id !== pacote.id) : [...rascunho, pacote.id],
                )
              }
              className="pacote-card"
            >
              {miolo(pacote)}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}


/**
 * `AJU-19`, `AJU-20` — os presets mais qualquer duração da faixa do contrato.
 *
 * A faixa vem do contrato, não de um número escrito aqui; o campo trava no
 * tamanho e o botão diz por que não dá pra aplicar. O servidor continua
 * recusando o que não deveria passar (`CFG-04`).
 */
function FolhaDeTempo({
  titulo,
  atual,
  presets,
  aoEscolher,
  aoFechar,
}: {
  titulo: string
  atual: number | null
  presets: ReadonlyArray<{ valor: number | null; rotulo: string }>
  aoEscolher(segundos: number | null): void
  aoFechar(): void
}) {
  const personalizado = atual !== null && !presets.some((p) => p.valor === atual)
  const [texto, setTexto] = useState(personalizado ? paraCampoDeTempo(atual) : '')
  const segundos = tempoDigitado(texto)

  return (
    <FolhaDeEscolha
      titulo={titulo}
      opcoes={presets.map((preset) => ({ valor: preset.valor, rotulo: preset.rotulo }))}
      // Com um tempo personalizado em vigor nenhum preset está marcado — quem
      // mostra o valor é o campo abaixo.
      atual={personalizado ? Number.NaN : atual}
      aoEscolher={aoEscolher}
      aoFechar={aoFechar}
    >
      <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-linha pt-4">
        <label htmlFor="tempo-personalizado" className="text-corpo font-semibold text-texto">
          Outro tempo
        </label>
        <span className="text-apoio text-texto-3">
          Em segundos (<span className="font-mono">90</span>) ou em minutos (
          <span className="font-mono">1:30</span>).
        </span>
        <div className="flex items-start gap-2">
          <input
            id="tempo-personalizado"
            type="text"
            // `numeric` esconderia os dois pontos no teclado do celular.
            inputMode="text"
            value={texto}
            maxLength={6}
            placeholder="1:30"
            aria-invalid={texto !== '' && segundos === null}
            onChange={(evento) => setTexto(evento.target.value)}
            className={`h-12 w-24 rounded-chip border-2 bg-superficie px-3 text-corpo text-texto caret-acento placeholder:text-texto-apagado focus:outline-none ${
              texto !== '' && segundos === null ? 'border-acento' : 'border-linha'
            }`}
          />
          <Botao
            variante="secundario"
            onClick={() => {
              if (segundos !== null) {
                aoEscolher(segundos)
                aoFechar()
              }
            }}
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
        {personalizado && (
          <span className="font-mono text-rotulo text-texto-3 uppercase">
            em vigor: {rotuloDoTempo(atual)}
          </span>
        )}
      </div>
    </FolhaDeEscolha>
  )
}

function rotuloDe<T>(opcoes: ReadonlyArray<{ valor: T; rotulo: string }>, atual: T): string {
  return opcoes.find((opcao) => opcao.valor === atual)?.rotulo ?? '—'
}
