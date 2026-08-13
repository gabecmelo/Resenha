import { useEffect, useState } from 'react'
import type { JogadorId, Projecao, ProjecaoEspiao } from '../../../shared/protocolo'
import {
  BadgePacote,
  BlocoDeNotas,
  Botao,
  Chat,
  MarcadorDeJogador,
  Modal,
  Shell,
} from '../componentes'
import { estaAcabando, formatarTempo, getAgora, restanteAte } from '../estado/relogio'
import type { PropsDaTela } from './tela'

/**
 * A tela padrão da rodada de Espião (`ESP-07`…`ESP-15`, `ESP-17`…`ESP-21`),
 * inclusive a votação — as duas vivem na mesma tela porque a votação é um
 * sub-estado da rodada, não uma fase própria (`AD-014`).
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

export function EspiaoJogo({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const espiao = projecao.jogo?.espiao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)
  const [dica, setDica] = useState<string | null>(null)

  if (espiao === undefined) return null

  const votacao = espiao.votacaoAberta
  const outrosEspioes = espiao.espioes?.filter((espiaoDaLista) => espiaoDaLista.id !== eu.id) ?? []

  return (
    <Shell
      codigo={sala.codigo}
      legenda={`Partida em andamento · ${ativos.length} na mesa`}
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-6">
        {sala.pacotesSelecionados && sala.pacotesSelecionados.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {sala.pacotesSelecionados.map((pacote) => (
              <BadgePacote key={pacote.id} pacote={pacote} />
            ))}
          </div>
        )}

        <RelogioDaRodada
          prazoRodada={espiao.prazoRodada}
          votacaoAberta={votacao !== undefined}
        />

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
          <section className="flex flex-col gap-5">
            <PapelDoJogador
              souEspiao={espiao.souEspiao}
              local={espiao.local}
              outrosEspioes={outrosEspioes}
            />

            {votacao === undefined ? (
              <RodadaEmAndamento
                dica={dica}
                aoSortearDica={() =>
                  setDica(DICAS_DE_PERGUNTA[Math.floor(Math.random() * DICAS_DE_PERGUNTA.length)])
                }
                aoAbrirVotacao={() => enviar({ t: 'abrirVotacao' })}
              />
            ) : (
              <Votacao votacao={votacao} ativos={ativos} euId={eu.id} souHost={eu.ehHost} enviar={enviar} />
            )}

            {eu.ehHost && (
              <div className="border-t border-linha pt-5">
                <Botao larguraTotal variante="destrutivo" onClick={() => setConfirmandoEncerrar(true)}>
                  Encerrar partida
                </Botao>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-5">
            {/* `NOTA-01`, `NOTA-02` — só o dono vê; a projeção nunca traz as de outro. */}
            <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] tracking-[0.1em] text-texto-3 uppercase">chat</h2>
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            </div>
          </section>
        </div>
      </div>

      {/* `ESP-15` — encerrar revela o local e todos os espiões; confirma antes. */}
      {confirmandoEncerrar && (
        <Modal
          titulo="Encerrar a partida?"
          descricao="O local e todos os espiões são revelados pra mesa inteira."
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

/** `ESP-09`, `ESP-10` — contador do relógio da rodada; some enquanto a votação está aberta (prazo pausado). */
function RelogioDaRodada({
  prazoRodada,
  votacaoAberta,
}: {
  prazoRodada: number | null
  votacaoAberta: boolean
}) {
  const restante = useRestante(prazoRodada)
  const acabando = estaAcabando(restante)

  if (votacaoAberta) {
    return (
      <section className="-mx-4 -mt-5 flex items-center px-4 py-3.5 sm:mx-0 sm:mt-0 sm:rounded-painel border-b border-linha bg-superficie-2 sm:border-b-0">
        <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
          votação aberta
        </span>
      </section>
    )
  }

  return (
    <section
      aria-live="polite"
      className={`-mx-4 -mt-5 flex items-center justify-between px-4 py-3.5 sm:mx-0 sm:mt-0 sm:rounded-painel ${
        acabando ? 'bg-risco' : 'border-b border-linha bg-superficie-2 sm:border-b-0'
      }`}
    >
      <span
        className={`font-mono text-[11px] tracking-[0.12em] uppercase ${
          acabando ? 'text-risco-contraste/75' : 'text-texto-3'
        }`}
      >
        {restante === null ? 'tempo da rodada' : acabando ? 'a votação abre logo' : 'tempo da rodada'}
      </span>
      {restante !== null ? (
        <span
          className={`font-mono text-[20px] font-medium tracking-[-0.02em] ${
            acabando ? 'animacao-pulso text-risco-contraste' : 'text-texto'
          }`}
        >
          {formatarTempo(restante)}
        </span>
      ) : (
        <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">sem limite</span>
      )}
    </section>
  )
}

function useRestante(prazoRodada: number | null): number | null {
  const [agora, setAgora] = useState(() => getAgora())

  useEffect(() => {
    if (prazoRodada === null) return
    const relogio = setInterval(() => setAgora(getAgora()), 500)
    return () => clearInterval(relogio)
  }, [prazoRodada])

  return restanteAte(prazoRodada, agora)
}

/** `ESP-07`, `ESP-08`, `ESP-17` — o local pra quem não é espião; o papel pro espião. */
function PapelDoJogador({
  souEspiao,
  local,
  outrosEspioes,
}: {
  souEspiao: boolean
  local: string | undefined
  outrosEspioes: { id: JogadorId; apelido: string }[]
}) {
  if (souEspiao) {
    return (
      <div className="flex flex-col gap-2 rounded-bloco bg-acento p-5">
        <span className="font-mono text-[11px] tracking-[0.12em] text-acento-contraste/75 uppercase">
          você é
        </span>
        <span className="text-titulo text-acento-contraste">O Espião</span>
        <p className="text-apoio leading-relaxed text-acento-contraste/80">
          Você não sabe o local. Faça perguntas com cuidado e tente descobrir sem se denunciar.
        </p>
        {outrosEspioes.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-acento-contraste/20 pt-3">
            <span className="font-mono text-[10px] tracking-[0.1em] text-acento-contraste/75 uppercase">
              outros espiões
            </span>
            <ul className="flex flex-wrap gap-2">
              {outrosEspioes.map((outroEspiao) => (
                <li
                  key={outroEspiao.id}
                  className="rounded-pilula bg-acento-contraste/15 px-2.5 py-1 text-apoio font-medium text-acento-contraste"
                >
                  {outroEspiao.apelido}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-bloco border border-linha bg-superficie p-5">
      <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">o local é</span>
      <span className="text-titulo text-balance text-texto">{local}</span>
    </div>
  )
}

/** `ESP-09`, `ESP-20` — dica de pergunta e o botão que qualquer ativo pode acionar. */
function RodadaEmAndamento({
  dica,
  aoSortearDica,
  aoAbrirVotacao,
}: {
  dica: string | null
  aoSortearDica(): void
  aoAbrirVotacao(): void
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-linha pt-5">
      <div className="flex flex-col gap-2">
        <Botao variante="secundario" onClick={aoSortearDica}>
          {dica === null ? 'Dica de pergunta' : 'Outra dica'}
        </Botao>
        {dica !== null && (
          <p className="rounded-painel bg-superficie-2 px-3.5 py-3 text-[15px] leading-relaxed text-texto-2">
            {dica}
          </p>
        )}
      </div>

      <Botao larguraTotal onClick={aoAbrirVotacao}>
        Abrir votação
      </Botao>
      <p className="text-[12px] leading-snug text-texto-3">
        Qualquer jogador pode abrir a votação quando achar que sabe quem é o espião.
      </p>
    </div>
  )
}

/** `ESP-11`, `ESP-12`, `ESP-18`, `ESP-19` — um voto por clique, "pular" incluso. */
function Votacao({
  votacao,
  ativos,
  euId,
  souHost,
  enviar,
}: {
  votacao: NonNullable<ProjecaoEspiao['votacaoAberta']>
  ativos: Projecao['jogadores']
  euId: JogadorId
  souHost: boolean
  enviar: PropsDaTela['enviar']
}) {
  const votar = (alvoId: JogadorId | null) => enviar({ t: 'votar', alvoId })

  return (
    <div className="flex flex-col gap-3 border-t border-linha pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">votação aberta</h2>
        <span className="font-mono text-[11px] text-texto-3">
          {votacao.quantosVotaram}/{votacao.total} votaram
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {ativos.map((jogador) => {
          const meuVotoNele = votacao.meuVoto === jogador.id
          const contagem = votacao.votos
            ? Object.values(votacao.votos).filter((voto) => voto === jogador.id).length
            : undefined
          return (
            <li key={jogador.id}>
              <button
                type="button"
                onClick={() => votar(jogador.id)}
                aria-pressed={meuVotoNele}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-controle border px-3.5 py-2.5 text-left transition-colors ${
                  meuVotoNele
                    ? 'border-acento bg-acento-suave'
                    : 'border-controle-linha hover:bg-superficie-2'
                }`}
              >
                <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-texto">
                  {jogador.apelido}
                  {jogador.id === euId && <span className="text-miudo font-medium text-acento"> · você</span>}
                </span>
                {contagem !== undefined && contagem > 0 && (
                  <span className="shrink-0 font-mono text-[12px] text-texto-3">{contagem}</span>
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
        className={`flex min-h-11 w-full cursor-pointer items-center justify-center rounded-controle border px-3.5 text-[15px] font-medium transition-colors ${
          votacao.meuVoto === 'pular'
            ? 'border-acento bg-acento-suave text-acento'
            : 'border-controle-linha text-texto-2 hover:bg-superficie-2'
        }`}
      >
        Pular
      </button>

      {souHost && (
        <Botao larguraTotal variante="secundario" onClick={() => enviar({ t: 'encerrarVotacao' })}>
          Encerrar votação
        </Botao>
      )}
    </div>
  )
}
