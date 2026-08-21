import { useState } from 'react'
import {
  BarraDeAcao,
  BlocoDeNotas,
  Botao,
  CampoDeTexto,
  FaixaDeFase,
  MarcadorDeJogador,
  Modal,
  PainelDaResenha,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * Cada um escreve a carta de uma pessoa sorteada (`ESCR-02`…`ESCR-06`,
 * `ESCR-09`, `ESCR-10`).
 *
 * O alvo ocupa o topo como uma **etiqueta endereçada** — disco de cor grande,
 * apelido carimbado e a frase que fecha a dúvida ("ela nunca vê o que você
 * escrever") — e o nome se repete no rótulo do campo: escrever para a pessoa
 * errada é o erro fácil aqui, e ele não tem volta depois que a partida começa.
 * O progresso é só contagem — nunca mostra conteúdo de carta nenhuma
 * (`ESCR-04`).
 */

/** `ESCR-03` */
const CARTA_MAX = 60

export function Escrita({ projecao, enviar, aoSair, modo = 'sala' }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const prontos = projecao.jogo?.prontos ?? 0
  const total = projecao.jogo?.total ?? 0
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const aguardando = jogadores.filter((jogador) => jogador.situacao === 'aguardando')
  const host = jogadores.find((jogador) => jogador.id === sala.hostId)
  const todosProntos = total > 0 && prontos === total
  const faltam = ativos.filter((jogador) => !jogador.pronto).map((jogador) => jogador.apelido)

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
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          selo={eu.situacao === 'aguardando' ? 'assistindo' : eu.pronto ? 'pronto' : 'escrevendo'}
          tom={eu.situacao === 'aguardando' ? 'tinta' : eu.pronto ? 'pronto' : 'esmalte'}
        >
          {eu.situacao === 'aguardando'
            ? 'Você entra na próxima partida.'
            : `A mesa está escrevendo — ${prontos} de ${total} já entregaram.`}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          {eu.situacao === 'aguardando' ? (
            <Espectador apelidoDoHost={host?.apelido} />
          ) : (
            <>
              {redistribuido && <SorteioRefeito aoEntender={() => setRedistribuido(false)} />}

              {eu.alvo === undefined ? (
                <p className="text-corpo text-texto-2">Ainda não há alvo para você nesta rodada.</p>
              ) : (
                <>
                  <EtiquetaDoAlvo
                    apelido={eu.alvo.apelido}
                    cor={corDe(jogadores, eu.alvo.id)}
                    escolhe={eu.opcoesPacote !== undefined}
                    entregue={eu.pronto}
                  />

                  {eu.opcoesPacote ? (
                    <EscolhaDaCarta
                      opcoes={eu.opcoesPacote}
                      escolhida={rascunho}
                      travado={eu.pronto}
                      jaSorteou={eu.jaSorteouOutras === true}
                      aoEscolher={setRascunho}
                      aoSortearOutras={() => enviar({ t: 'sortearOutras' })}
                    />
                  ) : (
                    <CampoDeTexto
                      rotulo={eu.pronto ? `A carta de ${eu.alvo.apelido} · trancada` : `A carta de ${eu.alvo.apelido}`}
                      valor={rascunho}
                      aoMudar={setRascunho}
                      placeholder="Uma girafa de óculos escuros…"
                      dica={
                        eu.pronto
                          ? `${eu.alvo.apelido} não vê nada disso — só sabe que a carta já existe.`
                          : `Pessoa, bicho, objeto, personagem — o que a mesa vai achar graça de ver na testa de ${eu.alvo.apelido}.`
                      }
                      limite={CARTA_MAX}
                      travado={eu.pronto}
                      aoTeclarEnter={() => {
                        if (!eu.pronto && !vazio && !excedeu) marcarPronto()
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}

          <ProgressoDaMesa ativos={ativos} euId={eu.id} prontos={prontos} total={total} />

          <div className="flex flex-col gap-3 lg:hidden">
            <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
            <PainelDaResenha projecao={projecao} enviar={enviar} modo={modo} />
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          {/* `NOTA-01` — o bloco já existe na escrita. */}
          <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
          <PainelDaResenha projecao={projecao} enviar={enviar} modo={modo} />
        </div>
      </div>

      <AcoesDaFase
        souHost={eu.ehHost}
        apelidoDoHost={host?.apelido}
        souJogador={eu.situacao === 'ativo' && eu.alvo !== undefined}
        pronto={eu.pronto}
        vazio={vazio}
        excedeu={excedeu}
        apelidoDoAlvo={eu.alvo?.apelido}
        todosProntos={todosProntos}
        faltam={faltam}
        apelidosAguardando={aguardando.map((jogador) => jogador.apelido)}
        aoMarcarPronto={marcarPronto}
        aoDesmarcar={() => enviar({ t: 'marcarPronto', pronto: false })}
        enviar={enviar}
      />
    </Shell>
  )
}

function corDe(jogadores: PropsDaTela['projecao']['jogadores'], id: string) {
  return jogadores.find((jogador) => jogador.id === id)?.cor ?? 'grafite'
}

/**
 * A etiqueta endereçada: para quem é esta carta. É o maior elemento da tela
 * porque errar o destinatário é o erro caro desta fase.
 */
function EtiquetaDoAlvo({
  apelido,
  cor,
  escolhe,
  entregue,
}: {
  apelido: string
  cor: PropsDaTela['projecao']['jogadores'][number]['cor']
  escolhe: boolean
  entregue: boolean
}) {
  return (
    <section className="flex flex-col gap-3 rounded-papel border-2 border-controle-linha bg-superficie p-4 shadow-botao">
      <span className="font-mono text-rotulo text-texto-3 uppercase">
        {entregue ? 'carta entregue para' : escolhe ? 'você escolhe a carta de' : 'você escreve para'}
      </span>
      <span className="flex items-center gap-3">
        <MarcadorDeJogador apelido={apelido} cor={cor} tamanho="grande" />
        <span className="min-w-0 truncate font-display text-display text-texto">{apelido}</span>
      </span>
      <p className="text-apoio leading-relaxed text-texto-2">
        {apelido} vai passar a partida tentando adivinhar o que está aqui.{' '}
        <strong className="font-semibold text-texto">
          {apelido} nunca vê essa carta
        </strong>{' '}
        — nem agora, nem depois.
      </p>
    </section>
  )
}

/** `PKT-12`, `PKT-16` — cinco cartas sorteadas do pote, uma troca por rodada. */
function EscolhaDaCarta({
  opcoes,
  escolhida,
  travado,
  jaSorteou,
  aoEscolher,
  aoSortearOutras,
}: {
  opcoes: string[]
  escolhida: string
  travado: boolean
  jaSorteou: boolean
  aoEscolher(opcao: string): void
  aoSortearOutras(): void
}) {
  if (travado) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-papel border border-dashed border-linha p-5 text-center">
        <span className="font-mono text-rotulo text-texto-3 uppercase">carta trancada</span>
        <span aria-hidden="true" className="text-[22px]">
          🔒
        </span>
        <span className="font-mono text-secao tracking-[0.2em] text-texto-3">•••••••</span>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <span className="font-mono text-rotulo text-texto-3 uppercase">
        escolha uma das {opcoes.length} sorteadas do pote
      </span>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {opcoes.map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={escolhida === opcao}
            onClick={() => aoEscolher(opcao)}
            className="opcao-carta"
          >
            <span className="text-carta font-medium text-texto">{opcao}</span>
          </button>
        ))}
      </div>
      <Botao
        variante="terciario"
        larguraTotal
        onClick={aoSortearOutras}
        motivo={
          jaSorteou
            ? 'Você já sorteou uma vez — pra mesa não travar, é só uma troca por rodada.'
            : undefined
        }
      >
        Sortear outras opções
      </Botao>
    </section>
  )
}

/** `ESCR-07` — o susto que precisa parar a pessoa antes que ela escreva errado. */
function SorteioRefeito({ aoEntender }: { aoEntender(): void }) {
  return (
    <section className="flex flex-col items-start gap-2.5 rounded-papel border-2 border-risco bg-risco-suave p-4">
      <span className="selo bg-risco text-risco-contraste">o sorteio mudou</span>
      <h2 className="font-display text-secao text-texto">Você tem outro alvo agora.</h2>
      <p className="text-apoio leading-relaxed text-texto-2">
        Alguém saiu da mesa, então todo mundo ganhou alguém novo.{' '}
        <strong className="font-semibold text-texto">
          O que você já tinha escrito foi apagado.
        </strong>{' '}
        Confira o nome antes de escrever — não dá pra trocar depois que a partida começa.
      </p>
      <Botao variante="secundario" onClick={aoEntender}>
        Entendi
      </Botao>
    </section>
  )
}

/** `ESCR-04` — quem já terminou, sem nenhum conteúdo de carta. */
function ProgressoDaMesa({
  ativos,
  euId,
  prontos,
  total,
}: {
  ativos: PropsDaTela['projecao']['jogadores']
  euId: string
  prontos: number
  total: number
}) {
  return (
    <section className="flex flex-col gap-3 rounded-papel border border-linha bg-superficie p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-rotulo text-texto-3 uppercase">progresso da mesa</h2>
        <span className="font-mono text-dado text-texto">
          {prontos}
          <span className="text-texto-3">/{total}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Coluna
          titulo="prontos"
          marca="✓"
          jogadores={ativos.filter((jogador) => jogador.pronto)}
          euId={euId}
        />
        <Coluna
          titulo="escrevendo"
          marca="···"
          jogadores={ativos.filter((jogador) => !jogador.pronto)}
          euId={euId}
        />
      </div>

      <p className="border-t border-dashed border-linha pt-2.5 text-apoio text-texto-3">
        <span aria-hidden="true">🔒 </span>Aqui só aparece quem terminou. Nenhuma carta é mostrada
        pra ninguém — nem pro host.
      </p>
    </section>
  )
}

function Coluna({
  titulo,
  marca,
  jogadores,
  euId,
}: {
  titulo: string
  marca: string
  jogadores: PropsDaTela['projecao']['jogadores']
  euId: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="font-mono text-compacto-apoio tracking-[0.1em] text-texto-3 uppercase">
        {titulo} · {jogadores.length}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {jogadores.map((jogador) => (
          <li key={jogador.id} className="flex min-w-0 items-center gap-1.5">
            <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} tamanho="miudo" />
            <span className="min-w-0 truncate text-apoio text-texto-2">
              {jogador.apelido}
              {jogador.id === euId && ' · você'}
            </span>
            <span aria-hidden="true" className="flex-none text-miudo text-texto-3">
              {marca}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A barra fixa: primeiro a ação de quem está escrevendo, depois — para o host —
 * a ação que move a mesa inteira. `VIS-04`: quem não é host não vê ação de host
 * nem apagada.
 */
function AcoesDaFase({
  souHost,
  apelidoDoHost,
  souJogador,
  pronto,
  vazio,
  excedeu,
  apelidoDoAlvo,
  todosProntos,
  faltam,
  apelidosAguardando,
  aoMarcarPronto,
  aoDesmarcar,
  enviar,
}: {
  souHost: boolean
  apelidoDoHost: string | undefined
  souJogador: boolean
  pronto: boolean
  vazio: boolean
  excedeu: boolean
  apelidoDoAlvo: string | undefined
  todosProntos: boolean
  faltam: string[]
  apelidosAguardando: string[]
  aoMarcarPronto(): void
  aoDesmarcar(): void
  enviar: PropsDaTela['enviar']
}) {
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)

  return (
    <BarraDeAcao>
      {apelidosAguardando.length > 0 && souHost && (
        <p className="flex gap-2 text-apoio leading-snug text-texto-2">
          <span aria-hidden="true" className="text-aviso">
            ⚠
          </span>
          <span>
            {listar(apelidosAguardando)} {apelidosAguardando.length === 1 ? 'está' : 'estão'} de
            fora — incluir agora refaz o sorteio e apaga todas as cartas escritas.
          </span>
        </p>
      )}

      {souJogador &&
        (pronto ? (
          <>
            <Botao larguraTotal variante="secundario" onClick={aoDesmarcar}>
              Desmarcar e editar
            </Botao>
            <p className="text-apoio text-texto-3">
              Dá pra mudar de ideia até alguém começar a partida. Depois disso, trancou de verdade.
            </p>
          </>
        ) : (
          <Botao
            larguraTotal
            onClick={aoMarcarPronto}
            motivo={
              vazio
                ? `Escreva a carta d${apelidoDoAlvo !== undefined ? `e ${apelidoDoAlvo}` : 'o seu alvo'} pra liberar.`
                : excedeu
                  ? `A carta precisa caber em ${CARTA_MAX} caracteres.`
                  : undefined
            }
          >
            Pronto
          </Botao>
        ))}

      {souHost ? (
        <>
          <Botao
            larguraTotal
            onClick={() => enviar({ t: 'comecar' })}
            motivo={
              todosProntos
                ? undefined
                : `${faltam.length === 1 ? 'Falta' : 'Faltam'} ${listar(faltam)} ${
                    faltam.length === 1 ? 'marcar' : 'marcarem'
                  } pronto. Forçar início não existe.`
            }
          >
            Começar a partida
          </Botao>
          <Botao
            larguraTotal
            variante="terciario"
            onClick={() => setConfirmandoCancelamento(true)}
          >
            Cancelar e voltar ao lobby
          </Botao>
        </>
      ) : (
        todosProntos && (
          <p className="text-apoio text-texto-2">
            Esperando {apelidoDoHost ?? 'o host'} começar — todo mundo já marcou
            pronto.
          </p>
        )
      )}

      {confirmandoCancelamento && (
        <Modal
          titulo="Cancelar e voltar ao lobby?"
          descricao="Todas as cartas já escritas são apagadas e a mesa volta pro lobby. Quem estava de fora entra no próximo sorteio."
          rotuloConfirmar="Cancelar a partida"
          rotuloCancelar="Continuar escrevendo"
          destrutivo
          aoConfirmar={() => {
            enviar({ t: 'cancelar' })
            setConfirmandoCancelamento(false)
          }}
          aoCancelar={() => setConfirmandoCancelamento(false)}
        />
      )}
    </BarraDeAcao>
  )
}

/** `SALA-10` — entrou depois do sorteio: assiste esta e joga a próxima. */
function Espectador({ apelidoDoHost }: { apelidoDoHost: string | undefined }) {
  return (
    <section className="flex flex-col items-start gap-2.5 rounded-papel border border-dashed border-linha p-5">
      <span className="selo bg-controle-linha text-fundo">assistindo</span>
      <h2 className="font-display text-titulo text-texto">Você entra na próxima.</h2>
      <p className="text-apoio leading-relaxed text-texto-2">
        A mesa já sorteou as cartas dessa rodada. Ninguém escreve pra você agora, e você não escreve
        pra ninguém — fique de olho, zoe na resenha, e quando essa partida acabar você entra
        automaticamente.
      </p>
      <p className="text-apoio text-texto-3">
        {apelidoDoHost ?? 'O host'} pode voltar ao lobby pra incluir você nesta.
      </p>
    </section>
  )
}

function listar(apelidos: string[]): string {
  if (apelidos.length === 0) return 'alguém'
  if (apelidos.length === 1) return apelidos[0] ?? 'alguém'
  return `${apelidos.slice(0, -1).join(', ')} e ${apelidos[apelidos.length - 1]}`
}
