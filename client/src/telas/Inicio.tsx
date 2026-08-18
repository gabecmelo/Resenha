import { useState } from 'react'
import { MAX_JOGADORES, MIN_JOGADORES, TAMANHO_CODIGO } from '../../../shared/protocolo'
import { JOGO_PADRAO } from '../../../shared/jogos-catalogo'
import { Botao, CampoDeTexto, SeletorDeJogos, Shell } from '../componentes'
import type { ErroDeSala } from '../estado/conexao'
import {
  LIMITE_PADRAO,
  MAX_APELIDO,
  limiteDigitado,
  motivoDoCodigo,
  motivoParaCriar,
  motivoParaEntrar,
  normalizarCodigo,
} from '../estado/entrada'

/**
 * A porta de entrada (`SALA-01`…`SALA-06`, `SALA-08`).
 *
 * São dois caminhos, e o código vem primeiro: quem já tem um código veio pra
 * usá-lo, e deixar isso no rodapé fazia a pessoa cair no "Criar uma sala" no
 * automático. Digitar o código não pede apelido nenhum — ele leva à **mesma
 * porta** de quem chegou por link de convite, onde o apelido é a única coisa
 * que falta.
 *
 * Esta tela também é onde as recusas do servidor aparecem: enquanto não houver
 * projeção, é ela que está no ar.
 */

/** Recusas que fecham a porta: insistir com os mesmos dados não adianta. */
const ERROS_DE_PORTA: ReadonlyArray<ErroDeSala['codigo']> = [
  'SALA_NAO_ENCONTRADA',
  'CODIGO_INVALIDO',
  'SALA_CHEIA',
  'TOKEN_BANIDO',
  'SALA_EXPIRADA',
]

export interface PropsDoInicio {
  /** Código que veio pelo link, ou o da tentativa anterior. */
  codigoInicial: string
  apelidoInicial: string
  /** Última recusa do servidor, ou `null`. */
  erro: ErroDeSala | null
  /** Há uma tentativa de conexão em andamento. */
  conectando: boolean
  /** Fecha a tentativa em andamento e devolve o formulário limpo. */
  aoDesistir(): void
  /** Tenta entrar: cada chamada é uma tentativa nova. */
  aoEntrar(codigo: string, apelido: string): void
}

export function Inicio({
  codigoInicial,
  apelidoInicial,
  erro,
  conectando,
  aoDesistir,
  aoEntrar,
}: PropsDoInicio) {
  const [apelido, setApelido] = useState(apelidoInicial)
  const [codigo, setCodigo] = useState(codigoInicial)
  // `AJU-36` — já preenchido: quem não quiser mexer cria a sala sem passo a mais.
  const [limite, setLimite] = useState(LIMITE_PADRAO)
  // `HUB-01` — o jogo padrão já vem pré-selecionado.
  const [jogoId, setJogoId] = useState(JOGO_PADRAO)
  // Chegou por link ou já achou a sala pelo código: em ambos os casos a pessoa
  // está na porta, e o que falta é dizer como te chamam.
  const [naPorta, setNaPorta] = useState(codigoInicial !== '')
  const [criando, setCriando] = useState(false)
  const [falhaAoCriar, setFalhaAoCriar] = useState(false)
  // O erro é do objeto que chegou: dispensar um não esconde o próximo.
  const [dispensado, setDispensado] = useState<ErroDeSala | null>(null)

  const visivel = erro !== null && erro !== dispensado ? erro : null
  const dePorta = visivel !== null && ERROS_DE_PORTA.includes(visivel.codigo) ? visivel : null

  /*
   * Apelido recusado não é erro terminal: a conexão continua tentando por baixo
   * e `conectando` fica preso em `true`. Sem isto o botão nunca reabilita e a
   * pessoa fica olhando pra um "Entrando…" que não vai chegar a lugar nenhum —
   * justamente na tela onde o apelido é a única coisa a corrigir.
   */
  const travadoNoApelido = erroDoApelido(visivel) !== undefined
  const entrando = conectando && !travadoNoApelido
  // `HUB-01` — quem entra numa sala pronta não escolhe nada: o jogo é do host.
  const veioPorConvite = naPorta

  const voltarAoFormulario = () => {
    setDispensado(erro)
    setNaPorta(false)
    aoDesistir()
  }

  /** O código sozinho já abre a porta — o apelido é o passo seguinte. */
  const irParaAPorta = () => {
    if (motivoDoCodigo(codigo) !== undefined) return
    setDispensado(erro)
    setNaPorta(true)
  }

  const tentarEntrar = () => {
    if (motivoParaEntrar(apelido, codigo) !== undefined) return
    setDispensado(erro)
    aoEntrar(normalizarCodigo(codigo), apelido)
  }

  const motivoDeCriar = motivoParaCriar(apelido, limite)

  const criarSala = () => {
    // `AJU-35` — o limite escolhido vai no pedido; quem recusa é o servidor.
    const limiteJogadores = limiteDigitado(limite)
    if (limiteJogadores === null) return

    setCriando(true)
    setFalhaAoCriar(false)
    fetch('/api/salas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limiteJogadores, jogoId }),
    })
      .then((resposta) => (resposta.ok ? resposta.json() : Promise.reject(new Error('falhou'))))
      .then((dados: { codigo: string }) => {
        setDispensado(erro)
        aoEntrar(dados.codigo, apelido)
      })
      .catch(() => setFalhaAoCriar(true))
      .finally(() => setCriando(false))
  }

  if (dePorta !== null) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-[420px] pt-4">
          <PortaFechada
            erro={dePorta}
            codigo={codigo}
            apelido={apelido}
            motivoDeCriar={motivoDeCriar}
            criando={criando}
            aoCriar={criarSala}
            aoVoltar={voltarAoFormulario}
          />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-7 pt-3 lg:max-w-none lg:flex-row lg:items-start lg:justify-center lg:gap-16 lg:pt-6">
        <Apresentacao />

        <div className="flex w-full flex-col gap-7 lg:max-w-[420px]">
          {veioPorConvite ? (
            <>
              <Convite codigo={normalizarCodigo(codigo)} />

              <div className="flex flex-col gap-3.5">
                <CampoDeTexto
                  rotulo="Como te chamam?"
                  valor={apelido}
                  aoMudar={setApelido}
                  placeholder="Seu apelido na mesa"
                  dica={`De 2 a ${MAX_APELIDO} caracteres.`}
                  limite={MAX_APELIDO}
                  autoFoco
                  erro={erroDoApelido(visivel)}
                  aoTeclarEnter={tentarEntrar}
                />

                <Botao
                  larguraTotal
                  carregando={entrando}
                  onClick={tentarEntrar}
                  motivo={motivoParaEntrar(apelido, codigo)}
                >
                  {entrando ? 'Entrando…' : 'Entrar na sala'}
                </Botao>

                {visivel !== null && erroDoApelido(visivel) === undefined && (
                  <p className="flex gap-2 text-apoio text-acento">
                    <span aria-hidden="true">▲</span>
                    <span>{visivel.mensagem}</span>
                  </p>
                )}

                {/*
                  A saída existe sempre: quem digitou pode ter errado uma letra,
                  e quem veio por link pode preferir abrir a sala dele.
                */}
                <button
                  type="button"
                  onClick={() => setNaPorta(false)}
                  className="min-h-11 cursor-pointer self-start font-mono text-rotulo text-texto-3 uppercase underline underline-offset-4"
                >
                  ← entrar em outra sala
                </button>
              </div>
            </>
          ) : (
            <>
              {/*
                Primeiro o código: quem já tem um veio pra usá-lo, e o caminho
                dessa pessoa não pode ser o mais longe do polegar.
              */}
              <div className="flex flex-col gap-2">
                <label htmlFor="codigo-da-sala" className="text-[15px] font-semibold text-texto">
                  Já tem um código?
                </label>
                <div className="flex gap-2">
                  <input
                    id="codigo-da-sala"
                    type="text"
                    value={codigo}
                    placeholder="·····"
                    maxLength={TAMANHO_CODIGO}
                    onChange={(evento) => setCodigo(normalizarCodigo(evento.target.value))}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') irParaAPorta()
                    }}
                    className="min-h-[52px] w-full min-w-0 rounded-chip border border-linha bg-superficie px-3.5 font-mono text-[22px] tracking-[0.28em] text-texto caret-acento uppercase placeholder:text-texto-apagado focus:border-controle-linha focus:outline-none"
                  />
                  <Botao onClick={irParaAPorta} motivo={motivoDoCodigo(codigo)} motivoOculto>
                    Entrar
                  </Botao>
                </div>
                <p className="text-apoio text-texto-3">
                  5 letras. Sem I e sem O, pra ninguém confundir com 1 e 0.
                </p>
                {visivel !== null && erroDoApelido(visivel) === undefined && (
                  <p className="flex gap-2 text-apoio text-acento">
                    <span aria-hidden="true">▲</span>
                    <span>{visivel.mensagem}</span>
                  </p>
                )}
              </div>

              <Separador />

              <section className="flex flex-col gap-2.5">
                <h2 className="font-mono text-rotulo text-texto-3 uppercase">o que vamos jogar</h2>
                <SeletorDeJogos jogoIdSelecionado={jogoId} aoSelecionar={setJogoId} />
              </section>

              <div className="flex flex-col gap-3.5">
                <CampoDeTexto
                  rotulo="Como te chamam?"
                  valor={apelido}
                  aoMudar={setApelido}
                  placeholder="Seu apelido na mesa"
                  dica={`De 2 a ${MAX_APELIDO} caracteres.`}
                  limite={MAX_APELIDO}
                  erro={erroDoApelido(visivel)}
                />

                <LimiteDaSala valor={limite} aoMudar={setLimite} />

                <Botao
                  larguraTotal
                  carregando={criando}
                  onClick={criarSala}
                  motivo={motivoDeCriar}
                >
                  {criando ? 'Abrindo…' : 'Criar uma sala'}
                </Botao>

                {falhaAoCriar && (
                  <p className="flex gap-2 text-apoio text-acento">
                    <span aria-hidden="true">▲</span>
                    <span>Não deu para abrir a sala agora. Tente de novo.</span>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}

/**
 * `AJU-35`, `AJU-36`, `AJU-38` — quantas pessoas cabem na sala que se vai criar.
 *
 * Passo a passo em vez de campo livre: no celular ninguém quer abrir o teclado
 * numérico para trocar 10 por 12. A faixa vem do contrato (AD-011) e quem
 * recusa de fato continua sendo o servidor.
 */
function LimiteDaSala({ valor, aoMudar }: { valor: string; aoMudar(valor: string): void }) {
  const atual = limiteDigitado(valor) ?? MAX_JOGADORES
  const mexer = (passo: number) => {
    const proximo = Math.min(MAX_JOGADORES, Math.max(MIN_JOGADORES, atual + passo))
    aoMudar(String(proximo))
  }

  const botao =
    'flex h-[52px] w-[52px] flex-none cursor-pointer items-center justify-center rounded-chip border border-controle-linha bg-superficie text-[22px] text-texto disabled:cursor-not-allowed disabled:border-linha disabled:text-texto-apagado'

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-semibold text-texto">Quantas pessoas cabem</span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Uma pessoa a menos"
          disabled={atual <= MIN_JOGADORES}
          onClick={() => mexer(-1)}
          className={botao}
        >
          −
        </button>
        <output className="flex h-[52px] flex-1 items-center justify-center rounded-chip border border-linha bg-superficie font-mono text-[20px] font-medium text-texto tabular-nums">
          {atual}
        </output>
        <button
          type="button"
          aria-label="Uma pessoa a mais"
          disabled={atual >= MAX_JOGADORES}
          onClick={() => mexer(1)}
          className={botao}
        >
          +
        </button>
      </div>
      <p className="text-apoio text-texto-3">
        de {MIN_JOGADORES} a {MAX_JOGADORES} · dá pra mudar depois
      </p>
    </div>
  )
}

/** `SALA-03`, `SALA-04` — recusas que ficam no próprio campo, sem trocar de tela. */
function erroDoApelido(erro: ErroDeSala | null): string | undefined {
  if (erro === null) return undefined
  if (erro.codigo === 'APELIDO_INVALIDO' || erro.codigo === 'APELIDO_EM_USO') return erro.mensagem
  return undefined
}

function Apresentacao() {
  return (
    <div className="flex flex-col gap-1.5 lg:max-w-[420px] lg:pt-1">
      <h1 className="font-display text-display text-balance text-texto">
        Junta a galera e abre a mesa.
      </h1>
      <p className="text-corpo text-texto-3">
        Jogos de resenha no navegador. A tela é o tabuleiro — a graça acontece na mesa.
      </p>
    </div>
  )
}

/** `SALA-02` — a sala já está resolvida: o que falta é dizer como te chamam. */
function Convite({ codigo }: { codigo: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-papel border-2 border-controle-linha bg-superficie p-4 shadow-botao">
      <span className="font-mono text-rotulo text-texto-3 uppercase">
        te chamaram para a sala
      </span>
      <span className="font-display text-codigo text-texto">{codigo}</span>
    </div>
  )
}

function Separador() {
  return (
    <span className="flex items-center gap-3">
      <span className="h-px flex-1 bg-linha" />
      <span className="font-mono text-rotulo text-texto-3 uppercase">ou</span>
      <span className="h-px flex-1 bg-linha" />
    </span>
  )
}

/** `SALA-05`, `SALA-06`, `CONN-04`, `CONN-07` — a sala recusou; a saída fica na tela. */
function PortaFechada({
  erro,
  codigo,
  apelido,
  motivoDeCriar,
  criando,
  aoCriar,
  aoVoltar,
}: {
  erro: ErroDeSala
  codigo: string
  apelido: string
  motivoDeCriar: string | undefined
  criando: boolean
  aoCriar(): void
  aoVoltar(): void
}) {
  const { titulo, explicacao } = TEXTOS_DE_PORTA[erro.codigo] ?? {
    titulo: erro.mensagem,
    explicacao: 'Tente entrar de novo ou abra uma sala sua.',
  }

  return (
    <div className="flex flex-col gap-5 rounded-papel border-2 border-controle-linha bg-superficie p-5 shadow-papel">
      <div className="flex flex-col items-start gap-2.5">
        <span className="selo bg-acento text-acento-contraste">porta fechada</span>
        {codigo !== '' && (
          <span className="font-mono text-dado tracking-[0.16em] text-texto-3 uppercase">
            {codigo}
          </span>
        )}
        <h2 className="font-display text-titulo text-balance text-texto">{titulo}</h2>
        <p className="text-corpo text-texto-2">{explicacao}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Botao larguraTotal carregando={criando} onClick={aoCriar} motivo={motivoDeCriar}>
          {apelido.trim() === '' ? 'Criar uma sala' : `Criar uma sala como ${apelido.trim()}`}
        </Botao>
        <Botao larguraTotal variante="secundario" onClick={aoVoltar}>
          Digitar outro código
        </Botao>
      </div>
    </div>
  )
}

const TEXTOS_DE_PORTA: Partial<
  Record<ErroDeSala['codigo'], { titulo: string; explicacao: string }>
> = {
  SALA_NAO_ENCONTRADA: {
    titulo: 'Não achamos essa sala',
    explicacao:
      'Confira as letras — talvez seja um V no lugar do B. Ou comece a sua agora e mande o link para a galera.',
  },
  CODIGO_INVALIDO: {
    titulo: 'Esse código não existe',
    explicacao: 'São 5 letras, sem I e sem O. Confira com quem ditou.',
  },
  SALA_CHEIA: {
    titulo: 'Essa sala está cheia',
    explicacao:
      'Ela já bateu o tamanho que escolheram na criação. Se alguém sair, o seu lugar abre — pode tentar de novo.',
  },
  TOKEN_BANIDO: {
    titulo: 'Você foi removido desta sala',
    explicacao:
      'Quem comanda a sala tirou você da partida. Para voltar, alguém de lá precisa te chamar de novo.',
  },
  SALA_EXPIRADA: {
    titulo: 'Esta sala expirou',
    explicacao: 'Ela ficou parada tempo demais e fechou sozinha. As cartas foram descartadas.',
  },
}
