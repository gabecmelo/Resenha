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
  Shell,
  TiraDePacotes,
} from '../componentes'
import { estaAcabando, formatarTempo } from '../estado/relogio'
import { useRestante } from '../estado/contagem'
import { tocarSuaVez, tocarTempoAcabando, tocarVezOutro } from '../sons'
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
  // `ESP-10` — enquanto a votação está aberta o prazo pausa: o servidor manda
  // `prazoRodada: null` e a faixa troca o relógio pela pílula de pausa (o valor
  // congelado não existe no payload, então não há o que contar).
  const restante = useRestante(espiao?.prazoRodada ?? null, sala.config.espiao.tempoRodadaSeg)
  const acabando = votacao === undefined && estaAcabando(restante)

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
          selo={votacao !== undefined ? 'votação aberta' : acabando ? 'último minuto' : 'rodada'}
          tom={votacao !== undefined ? 'mostarda' : acabando ? 'mostarda' : 'esmalte'}
          relogio={
            votacao !== undefined ? (
              <span className="flex-none rounded-chip border border-linha px-2.5 py-2 font-mono text-rotulo text-texto-3 uppercase">
                <span aria-hidden="true">⏸ </span>pausado
              </span>
            ) : (
              <RelogioDaFaixa
                texto={restante === null ? null : formatarTempo(restante)}
                acabando={acabando}
              />
            )
          }
        >
          {votacao !== undefined
            ? `${votacao.quantosVotaram} de ${votacao.total} já votaram · relógio pausado`
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

          {votacao === undefined ? (
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
        {votacao === undefined ? (
          <>
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <Botao larguraTotal onClick={() => setConfirmandoVotacao(true)}>
                  {acabando ? 'Abrir votação agora' : 'Abrir votação'}
                </Botao>
              </div>
              {/* `VIS-04` — na tela de quem não é host esse ⋯ não aparece. */}
              {eu.ehHost && (
                <button
                  type="button"
                  aria-label="Ações de quem comanda a mesa"
                  onClick={() => setMenuDeHost(true)}
                  className="flex min-h-12 w-12 flex-none cursor-pointer items-center justify-center rounded-botao border border-controle-linha text-[18px] leading-none text-texto"
                >
                  <span aria-hidden="true">⋯</span>
                </button>
              )}
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
              {eu.ehHost && (
                <button
                  type="button"
                  aria-label="Ações de quem comanda a mesa"
                  onClick={() => setMenuDeHost(true)}
                  className="flex min-h-12 w-12 flex-none cursor-pointer items-center justify-center rounded-botao border border-controle-linha text-[18px] leading-none text-texto"
                >
                  <span aria-hidden="true">⋯</span>
                </button>
              )}
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
      <span className="font-mono text-rotulo text-texto-3 uppercase">
        seu papel nessa rodada
      </span>

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

      <button
        type="button"
        aria-expanded={aberto}
        onClick={aoAlternar}
        className="min-h-11 cursor-pointer self-start font-mono text-rotulo text-acento uppercase"
      >
        {aberto ? 'esconder papel ▴' : 'mostrar papel ▾'}
      </button>
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
  comBusca,
  enviar,
}: {
  votacao: NonNullable<ProjecaoEspiao['votacaoAberta']>
  ativos: Projecao['jogadores']
  euId: JogadorId
  maioriaMinima: number
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
