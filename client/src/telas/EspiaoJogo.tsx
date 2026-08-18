import { useEffect, useRef, useState } from 'react'
import type { JogadorId, Projecao, ProjecaoEspiao } from '../../../shared/protocolo'
import {
  BarraDeAcao,
  BlocoDeNotas,
  Botao,
  Chat,
  FaixaDeFase,
  MarcadorDeJogador,
  Modal,
  PainelRecolhivel,
  RelogioDaFaixa,
  ResultadoDaVotacao,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { estaAcabando, formatarTempo } from '../estado/relogio'
import { useRestante } from '../estado/contagem'
import { tocarAcertou, tocarSuaVez, tocarTempoAcabando, tocarVezOutro } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * A tela padrão da rodada de Espião (`ESP-07`…`ESP-15`, `ESP-17`…`ESP-21`),
 * inclusive a votação — as duas vivem na mesma tela porque a votação é um
 * sub-estado da rodada, não uma fase própria (`AD-014`).
 *
 * A regra que manda no desenho: **as duas versões do papel têm a mesma
 * silhueta** — mesmo tamanho, mesma borda, mesma sombra, mesmo divisor. Muda só
 * o texto. Nenhuma cor exclusiva do papel de espião: se dá pra adivinhar o
 * papel do vizinho olhando de esguelha no sofá, o jogo vazou.
 *
 * Nada aqui decide quem é espião, quem venceu ou quando a votação fecha: tudo
 * isso chega pronto na projeção (AD-008).
 */

/** `ESP-20` — sorteio 100% local, sem round-trip nem ligação com o local sorteado (`AD-003`). */
const DICAS_DE_PERGUNTA = [
  'O que você faria aqui num dia comum?',
  'Você viria sozinho ou acompanhado?',
  'Que roupa você usaria pra vir aqui?',
  'Isso é um lugar caro ou barato?',
  'Você ficaria em pé ou sentado a maior parte do tempo?',
  'Tem barulho aqui, ou é um lugar silencioso?',
  'Você precisaria de ingresso pra entrar?',
  'Que horas do dia esse lugar fica mais cheio?',
  'Você traria crianças pra cá?',
  'É um lugar coberto ou ao ar livre?',
  'Você ficaria mais de uma hora aqui?',
  'Tem cheiro característico nesse lugar?',
  'Você precisaria de algum equipamento especial pra estar aqui?',
  'Esse lugar existe há muito tempo?',
  'Você indicaria esse lugar pra um amigo?',
]

/** A partir daqui a votação ganha busca e atalho — é o caso de 20 em 360px. */
const MESA_GRANDE = 10

export function EspiaoJogo({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const espiao = projecao.jogo?.espiao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)
  const [confirmandoVotacao, setConfirmandoVotacao] = useState(false)
  const [menuDeHost, setMenuDeHost] = useState(false)
  const [dica, setDica] = useState<string | null>(null)
  const [papelAberto, setPapelAberto] = useState(true)

  // Esta tela só monta quando a rodada libera: o som marca "seu papel está na
  // tela", que é o instante em que todo mundo olha pro celular ao mesmo tempo.
  useEffect(() => {
    tocarSuaVez()
  }, [])

  // A votação abrir é o momento que puxa todo mundo de volta pra tela — vale
  // som mesmo pra quem não abriu, que é justamente quem precisa perceber.
  const votacaoEstavaAbertaRef = useRef(false)
  const estaAberta = projecao.jogo?.espiao?.votacaoAberta !== undefined
  useEffect(() => {
    if (estaAberta && !votacaoEstavaAbertaRef.current) tocarVezOutro()
    votacaoEstavaAbertaRef.current = estaAberta
  }, [estaAberta])

  const votacao = espiao?.votacaoAberta
  const resultado = espiao?.resultadoVotacao
  const pausadaPor = espiao?.pausadaPor

  // O veredito chega de uma vez pra mesa inteira: som de fecho, como a
  // revelação. Quem estava de olho no chat percebe pelo ouvido.
  const tinhaResultadoRef = useRef(false)
  const temResultado = resultado !== undefined
  useEffect(() => {
    if (temResultado && !tinhaResultadoRef.current) tocarAcertou()
    tinhaResultadoRef.current = temResultado
  }, [temResultado])

  // Três janelas, um relógio de cada vez (`ESP-28`, `ESP-32`): a rodada corre,
  // depois a votação corre, depois o resultado fica um tempo na tela. Pausado,
  // nenhum deles corre — o servidor manda todos os prazos `null`.
  const restante = useRestante(espiao?.prazoRodada ?? null, sala.config.espiao.tempoRodadaSeg)
  const restanteVotacao = useRestante(
    votacao?.prazoVotacao ?? null,
    sala.config.espiao.tempoVotacaoSeg,
  )
  const emRodada = votacao === undefined && resultado === undefined && pausadaPor === undefined
  const acabando = emRodada && estaAcabando(restante)

  // Só no cruzamento pro "acabando" — o efeito reroda a cada tique do relógio.
  const avisouRef = useRef(false)
  useEffect(() => {
    if (acabando && !avisouRef.current) tocarTempoAcabando()
    avisouRef.current = acabando
  }, [acabando])

  if (espiao === undefined) return null

  const outrosEspioes = espiao.espioes?.filter((espiaoDaLista) => espiaoDaLista.id !== eu.id) ?? []
  const maioriaMinima = Math.floor(ativos.length / 2) + 1

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase
          selo={
            pausadaPor !== undefined
              ? 'pausado'
              : resultado !== undefined
                ? 'resultado'
                : votacao !== undefined
                  ? 'votação aberta'
                  : acabando
                    ? 'último minuto'
                    : 'rodada'
          }
          tom={
            pausadaPor !== undefined
              ? 'tinta'
              : resultado !== undefined || votacao !== undefined || acabando
                ? 'mostarda'
                : 'esmalte'
          }
          relogio={
            pausadaPor !== undefined ? (
              <PilulaDePausa />
            ) : resultado !== undefined ? undefined : votacao !== undefined ? (
              <RelogioDaFaixa
                texto={restanteVotacao === null ? null : formatarTempo(restanteVotacao)}
                acabando={estaAcabando(restanteVotacao)}
              />
            ) : (
              <RelogioDaFaixa
                texto={restante === null ? null : formatarTempo(restante)}
                acabando={acabando}
              />
            )
          }
        >
          {pausadaPor !== undefined
            ? `${pausadaPor.apelido} pausou a rodada. Ninguém joga até voltar.`
            : resultado !== undefined
              ? resultado.aMesaAcertou
                ? 'A mesa acertou.'
                : 'A mesa errou — a rodada volta em instantes.'
              : votacao !== undefined
                ? `${votacao.quantosVotaram} de ${votacao.total} já votaram · sem mais perguntas`
                : acabando
                  ? 'A votação abre sozinha no zero.'
                  : 'Pergunte, responda, e desconfie de todo mundo.'}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          <PapelDoJogador
            souEspiao={espiao.souEspiao}
            local={espiao.local}
            outrosEspioes={outrosEspioes}
            aberto={papelAberto}
            aoAlternar={() => setPapelAberto((estava) => !estava)}
          />

          {resultado !== undefined ? (
            <ResultadoDaVotacao resultado={resultado} jogadores={jogadores} euId={eu.id} />
          ) : votacao === undefined ? (
            <DicaDePergunta
              dica={dica}
              aoSortear={() =>
                setDica(DICAS_DE_PERGUNTA[Math.floor(Math.random() * DICAS_DE_PERGUNTA.length)] ?? null)
              }
            />
          ) : (
            <Votacao
              votacao={votacao}
              ativos={ativos}
              euId={eu.id}
              maioriaMinima={maioriaMinima}
              pausada={pausadaPor !== undefined}
              comBusca={ativos.length > MESA_GRANDE}
              enviar={enviar}
            />
          )}

          <div className="flex flex-col gap-3 lg:hidden">
            <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
            <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            </PainelRecolhivel>
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          {/* `NOTA-01`, `NOTA-02` — só o dono vê; a projeção nunca traz as de outro. */}
          <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
          <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </PainelRecolhivel>
        </div>
      </div>

      <BarraDeAcao>
        {pausadaPor !== undefined ? (
          // `ESP-37` — parado é parado pra todo mundo; nem o host joga daqui.
          <>
            <p className="text-apoio leading-snug text-texto-2">
              <strong className="font-semibold text-texto">A mesa está pausada.</strong>{' '}
              {pausadaPor.apelido} parou o relógio — ele volta exatamente de onde parou.
            </p>
            {eu.ehHost && (
              <Botao larguraTotal onClick={() => enviar({ t: 'retomar' })}>
                Retomar a rodada
              </Botao>
            )}
          </>
        ) : resultado !== undefined ? (
          <p className="text-apoio leading-snug text-texto-2">
            {resultado.aMesaAcertou ? (
              <>
                <strong className="font-semibold text-texto">Fim de partida.</strong> A revelação
                abre em instantes.
              </>
            ) : (
              <>
                <strong className="font-semibold text-texto">A rodada volta em instantes.</strong>{' '}
                Aproveite pra reler quem votou em quem.
              </>
            )}
          </p>
        ) : votacao === undefined ? (
          <>
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <Botao larguraTotal onClick={() => setConfirmandoVotacao(true)}>
                  {acabando ? 'Abrir votação agora' : 'Abrir votação'}
                </Botao>
              </div>
              {/* `VIS-04` — na tela de quem não é host esse ⋯ não aparece. */}
              {eu.ehHost && <BotaoDeMenu aoAbrir={() => setMenuDeHost(true)} />}
            </div>
            <p className="text-apoio leading-snug text-texto-3">
              {acabando
                ? 'No último minuto abrir agora é o esperado — o relógio abre sozinho no zero.'
                : 'Isso puxa a mesa toda pra tela — qualquer um pode abrir, inclusive o espião.'}
            </p>
          </>
        ) : (
          <>
            <p className="text-apoio leading-snug text-texto-2">
              {votacao.meuVoto === null
                ? 'Você ainda não votou.'
                : votacao.meuVoto === 'pular'
                  ? 'Você escolheu não acusar ninguém.'
                  : `Seu voto está em ${nomeDe(ativos, votacao.meuVoto)}. Trocar é permitido.`}{' '}
              <span className="text-texto-3">
                Precisa de {maioriaMinima} na mesma pessoa pra acusar.
              </span>
            </p>
            <div className="flex items-stretch gap-2">
              {/* `ESP-12` — só quem comanda fecha a votação antes da hora. */}
              {eu.ehHost && (
                <div className="min-w-0 flex-1">
                  <Botao
                    larguraTotal
                    variante="secundario"
                    onClick={() => enviar({ t: 'encerrarVotacao' })}
                  >
                    Fechar votação agora
                  </Botao>
                </div>
              )}
              {eu.ehHost && <BotaoDeMenu aoAbrir={() => setMenuDeHost(true)} />}
            </div>
          </>
        )}
      </BarraDeAcao>

      {/* `ESP-11` — abrir votação é gesto público: a mesa inteira para por causa dele. */}
      {confirmandoVotacao && (
        <Modal
          titulo="Abrir a votação?"
          descricao="Isso para o relógio e chama todo mundo pra tela. A mesa vai saber que foi você que abriu."
          rotuloConfirmar="Abrir e chamar a mesa"
          rotuloCancelar="Continuar perguntando"
          aoConfirmar={() => {
            enviar({ t: 'abrirVotacao' })
            setConfirmandoVotacao(false)
          }}
          aoCancelar={() => setConfirmandoVotacao(false)}
        >
          <ul className="flex flex-col gap-1.5 border-y border-dashed border-linha py-3">
            <li className="flex gap-2 text-apoio leading-snug text-texto-2">
              <span aria-hidden="true">·</span>
              <span>
                precisa de <strong className="font-semibold text-texto">maioria absoluta</strong> pra
                acusar: {maioriaMinima} de {ativos.length}
              </span>
            </li>
            <li className="flex gap-2 text-apoio leading-snug text-texto-2">
              <span aria-hidden="true">·</span>
              <span>quem não votar conta contra a acusação</span>
            </li>
          </ul>
        </Modal>
      )}

      {menuDeHost && (
        <Modal
          folha
          titulo="Quem comanda a mesa"
          descricao="Só você vê estas ações."
          rotuloCancelar="Fechar"
          aoCancelar={() => setMenuDeHost(false)}
        >
          {/* `ESP-35` — pausar é a saída pra interrupção real: a resenha para,
              o relógio para junto, e ninguém precisa encerrar a partida. */}
          <Botao
            larguraTotal
            variante="secundario"
            onClick={() => {
              setMenuDeHost(false)
              enviar({ t: 'pausar' })
            }}
          >
            Pausar a rodada
          </Botao>
          <Botao
            larguraTotal
            variante="destrutivo"
            onClick={() => {
              setMenuDeHost(false)
              setConfirmandoEncerrar(true)
            }}
          >
            Encerrar partida
          </Botao>
        </Modal>
      )}

      {/* `ESP-15` — encerrar revela o local e todos os espiões; confirma antes. */}
      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="Isso revela o local e todos os espiões pra mesa inteira, na hora."
          rotuloConfirmar="Encerrar e revelar"
          rotuloCancelar="Continuar jogando"
          destrutivo
          aoConfirmar={() => {
            enviar({ t: 'encerrar' })
            setConfirmandoEncerrar(false)
          }}
          aoCancelar={() => setConfirmandoEncerrar(false)}
        />
      )}
    </Shell>
  )
}

/** `VIS-04` — o mesmo ⋯ nas duas barras; só quem é host o recebe. */
function BotaoDeMenu({ aoAbrir }: { aoAbrir(): void }) {
  return (
    <button
      type="button"
      aria-label="Ações de quem comanda a mesa"
      onClick={aoAbrir}
      className="flex min-h-12 w-12 flex-none cursor-pointer items-center justify-center rounded-botao border border-controle-linha text-[18px] leading-none text-texto"
    >
      <span aria-hidden="true">⋯</span>
    </button>
  )
}

/** `ESP-35` — no lugar do relógio, porque é exatamente o relógio que parou. */
function PilulaDePausa() {
  return (
    <span className="flex-none rounded-chip border border-linha px-2.5 py-2 font-mono text-rotulo text-texto-3 uppercase">
      <span aria-hidden="true">⏸ </span>pausado
    </span>
  )
}

function nomeDe(ativos: Projecao['jogadores'], id: JogadorId): string {
  return ativos.find((jogador) => jogador.id === id)?.apelido ?? 'alguém'
}

/**
 * `ESP-07`, `ESP-08`, `ESP-17` — o papel da rodada.
 *
 * As duas versões são **o mesmo objeto**: mesma borda, mesma sombra, mesmo
 * divisor, mesmo botão de recolher. O que muda é o texto. Recolher existe
 * porque o celular fica na mão com gente do lado.
 */
function PapelDoJogador({
  souEspiao,
  local,
  outrosEspioes,
  aberto,
  aoAlternar,
}: {
  souEspiao: boolean
  local: string | undefined
  outrosEspioes: { id: JogadorId; apelido: string }[]
  aberto: boolean
  aoAlternar(): void
}) {
  return (
    <section className="flex flex-col gap-3 rounded-papel border-2 border-controle-linha bg-superficie p-4 shadow-botao">
      {/*
        O alternador mora no fim da linha do rótulo: no celular o polegar já
        está do lado direito, e no desktop tanto faz.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-rotulo text-texto-3 uppercase">
          seu papel nessa rodada
        </span>
        <button
          type="button"
          aria-expanded={aberto}
          onClick={aoAlternar}
          className="min-h-11 flex-none cursor-pointer font-mono text-rotulo text-acento uppercase"
        >
          {aberto ? 'esconder ▴' : 'mostrar ▾'}
        </button>
      </div>

      {aberto ? (
        <>
          <span className="font-display text-display text-balance text-texto">
            {souEspiao ? 'Você é o espião' : local}
          </span>
          <p className="text-apoio leading-relaxed text-texto-2">
            {souEspiao ? (
              <>
                Você <strong className="font-semibold text-texto">não sabe o local</strong>. Escute
                as respostas, deduza, e responda com cara de quem já esteve lá.
              </>
            ) : (
              <>
                Todo mundo na mesa sabe disso —{' '}
                <strong className="font-semibold text-texto">menos uma pessoa</strong>. Responda
                como quem já esteve aqui, sem entregar o lugar.
              </>
            )}
          </p>

          {souEspiao && outrosEspioes.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-dashed border-linha pt-3">
              <span className="font-mono text-rotulo text-texto-3 uppercase">
                também são espiões
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {outrosEspioes.map((outroEspiao) => (
                  <li
                    key={outroEspiao.id}
                    className="rounded-chip border border-linha px-2.5 py-1.5 text-apoio font-semibold text-texto"
                  >
                    {outroEspiao.apelido}
                  </li>
                ))}
              </ul>
              <span className="text-apoio text-texto-3">
                Combine no olhar, sem combinar em voz alta.
              </span>
            </div>
          )}
        </>
      ) : (
        /* O verso é idêntico pra espião e não-espião — é a casca reusada da
           carta selada do Quem Sou Eu?. */
        <span className="verso-secreto flex flex-col items-center justify-center gap-1 px-3 py-6 text-center">
          <span className="font-mono text-rotulo text-acento uppercase">seu papel está aqui</span>
          <span className="font-mono text-compacto-apoio tracking-[0.14em] text-acento uppercase">
            só você vê
          </span>
        </span>
      )}

    </section>
  )
}

/** `ESP-20` — a dica é local, aleatória e sem nenhuma ligação com o local sorteado. */
function DicaDePergunta({ dica, aoSortear }: { dica: string | null; aoSortear(): void }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-papel border border-dashed border-linha p-4">
      <span className="font-mono text-rotulo text-texto-3 uppercase">
        dica de pergunta · não tem relação com o local
      </span>
      {dica !== null && (
        <p className="font-display text-secao text-balance text-texto">“{dica}”</p>
      )}
      <Botao variante="secundario" onClick={aoSortear}>
        {dica === null ? 'Sortear uma pergunta' : 'Sortear outra'}
      </Botao>
    </section>
  )
}

/** `ESP-11`, `ESP-12`, `ESP-18`, `ESP-19` — um voto por toque, "pular" incluso. */
function Votacao({
  votacao,
  ativos,
  euId,
  maioriaMinima,
  pausada,
  comBusca,
  enviar,
}: {
  votacao: NonNullable<ProjecaoEspiao['votacaoAberta']>
  ativos: Projecao['jogadores']
  euId: JogadorId
  maioriaMinima: number
  pausada: boolean
  comBusca: boolean
  enviar: PropsDaTela['enviar']
}) {
  const [busca, setBusca] = useState('')
  const meuVoto = useRef<HTMLLIElement>(null)
  const votar = (alvoId: JogadorId | null) => enviar({ t: 'votar', alvoId })

  const filtrados =
    busca.trim() === ''
      ? ativos
      : ativos.filter((jogador) =>
          jogador.apelido.toLowerCase().includes(busca.trim().toLowerCase()),
        )

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-secao text-texto">Quem você acha que é o espião?</h2>
        <span className="font-mono text-rotulo text-texto-3 uppercase">
          {votacao.votos === undefined ? 'voto oculto' : 'tempo real'}
        </span>
      </div>

      {/* `ESP-27` — sem `abertaPor` foi o relógio que abriu, e aí não há quem citar. */}
      <p className="text-apoio leading-snug text-texto-2">
        {votacao.abertaPor === undefined
          ? 'O tempo da rodada acabou e a votação abriu sozinha.'
          : `${votacao.abertaPor.apelido} abriu a votação.`}{' '}
        <span className="text-texto-3">Agora é só votar — as perguntas ficam pra depois.</span>
      </p>

      {votacao.votos === undefined ? (
        <p className="flex gap-2 rounded-botao border border-dashed border-linha p-3 text-apoio leading-snug text-texto-2">
          <span aria-hidden="true">🔒</span>
          <span>
            <strong className="font-semibold text-texto">Voto oculto.</strong> Ninguém vê nada até
            fechar — nem quem já votou.
          </span>
        </p>
      ) : (
        <p className="text-apoio text-texto-3">
          Cada voto aparece na hora. Trocar o voto é permitido — o novo substitui o antigo.
        </p>
      )}

      {comBusca && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={busca}
            placeholder="buscar nome"
            aria-label="Buscar quem votar"
            onChange={(evento) => setBusca(evento.target.value)}
            className="h-12 min-w-0 flex-1 rounded-chip border-2 border-linha bg-superficie px-3 text-corpo text-texto caret-acento placeholder:text-texto-apagado focus:border-controle-linha focus:outline-none"
          />
          <button
            type="button"
            onClick={() => meuVoto.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
            className="min-h-12 flex-none cursor-pointer rounded-chip border border-controle-linha px-2.5 text-miudo font-semibold text-texto"
          >
            ir pro meu voto ↓
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {filtrados.map((jogador) => {
          const meuVotoNele = votacao.meuVoto === jogador.id
          const contagem = votacao.votos
            ? Object.values(votacao.votos).filter((voto) => voto === jogador.id).length
            : undefined
          return (
            <li key={jogador.id} ref={meuVotoNele ? meuVoto : undefined}>
              <button
                type="button"
                onClick={() => votar(jogador.id)}
                disabled={pausada}
                aria-pressed={meuVotoNele}
                className={`flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-botao px-3 py-2 text-left ${
                  meuVotoNele
                    ? 'border-2 border-controle-linha bg-superficie shadow-chip'
                    : 'border border-linha'
                } ${jogador.conectado ? '' : 'opacity-55'}`}
              >
                <MarcadorDeJogador
                  apelido={jogador.apelido}
                  cor={jogador.cor}
                  tamanho="grande"
                />
                <span className="min-w-0 flex-1 truncate text-apoio font-semibold text-texto">
                  {jogador.apelido}
                  {jogador.id === euId && <span className="text-texto-3"> · você</span>}
                </span>
                {meuVotoNele && (
                  <span className="flex-none font-mono text-compacto-apoio tracking-[0.1em] text-acento uppercase">
                    seu voto
                  </span>
                )}
                {contagem !== undefined && contagem > 0 && (
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-pilula bg-controle-linha font-mono text-compacto text-fundo">
                    {contagem}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={() => votar(null)}
        disabled={pausada}
        aria-pressed={votacao.meuVoto === 'pular'}
        className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-botao px-3 text-apoio font-semibold ${
          votacao.meuVoto === 'pular'
            ? 'border-2 border-controle-linha bg-superficie text-texto shadow-chip'
            : 'border border-dashed border-linha text-texto-3'
        }`}
      >
        <span>Pular — não acuso ninguém</span>
        {votacao.votos !== undefined && (
          <span className="font-mono text-compacto">
            {Object.values(votacao.votos).filter((voto) => voto === 'pular').length}
          </span>
        )}
      </button>

      <p className="text-apoio leading-snug text-texto-3">
        Maioria absoluta da mesa: {maioriaMinima} votos na mesma pessoa. Quem não votar conta contra
        — empate ou “pular” majoritário não acusa ninguém e a rodada volta a correr.
      </p>
    </section>
  )
}
