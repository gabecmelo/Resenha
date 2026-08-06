import { useState } from 'react'
import { MAX_JOGADORES, MIN_JOGADORES, TAMANHO_CODIGO } from '../../../shared/protocolo'
import { Botao, CampoDeTexto, Shell } from '../componentes'
import type { ErroDeSala } from '../estado/conexao'
import {
  LIMITE_PADRAO,
  MAX_APELIDO,
  limiteDigitado,
  motivoParaCriar,
  motivoParaEntrar,
  normalizarCodigo,
} from '../estado/entrada'

/**
 * A porta de entrada (`SALA-01`…`SALA-06`, `SALA-08`).
 *
 * Um campo de apelido serve aos dois caminhos: criar uma sala ou entrar com um
 * código. Quem chega por link encontra o código pronto e o cursor no apelido —
 * digitar e apertar Enter são as duas interações até estar dentro.
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
  const [criando, setCriando] = useState(false)
  const [falhaAoCriar, setFalhaAoCriar] = useState(false)
  // O erro é do objeto que chegou: dispensar um não esconde o próximo.
  const [dispensado, setDispensado] = useState<ErroDeSala | null>(null)

  const visivel = erro !== null && erro !== dispensado ? erro : null
  const dePorta = visivel !== null && ERROS_DE_PORTA.includes(visivel.codigo) ? visivel : null

  const voltarAoFormulario = () => {
    setDispensado(erro)
    aoDesistir()
  }

  const tentarEntrar = () => {
    if (motivoParaEntrar(apelido, codigo) !== undefined) return
    setDispensado(erro)
    aoEntrar(normalizarCodigo(codigo), apelido)
  }

  const motivoDeCriar = criando ? 'Abrindo a sala…' : motivoParaCriar(apelido, limite)

  const criarSala = () => {
    // `AJU-35` — o limite escolhido vai no pedido; quem recusa é o servidor.
    const limiteJogadores = limiteDigitado(limite)
    if (limiteJogadores === null) return

    setCriando(true)
    setFalhaAoCriar(false)
    fetch('/api/salas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limiteJogadores }),
    })
      .then((resposta) => (resposta.ok ? resposta.json() : Promise.reject(new Error('falhou'))))
      .then((dados: { codigo: string }) => {
        setDispensado(erro)
        aoEntrar(dados.codigo, apelido)
      })
      .catch(() => setFalhaAoCriar(true))
      .finally(() => setCriando(false))
  }

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-9 pt-4 lg:max-w-none lg:flex-row lg:items-start lg:justify-center lg:gap-20 lg:pt-14">
        <Apresentacao />

        <div className="flex w-full flex-col gap-6 lg:max-w-[420px]">
          {dePorta !== null ? (
            <PortaFechada
              erro={dePorta}
              codigo={codigo}
              apelido={apelido}
              motivoDeCriar={motivoDeCriar}
              aoCriar={criarSala}
              aoVoltar={voltarAoFormulario}
            />
          ) : (
            <>
              {codigoInicial !== '' && <Convite codigo={codigoInicial} />}

              <CampoDeTexto
                rotulo="Seu apelido"
                valor={apelido}
                aoMudar={setApelido}
                placeholder="Como te chamam?"
                dica={`De 2 a ${MAX_APELIDO} caracteres.`}
                limite={MAX_APELIDO}
                autoFoco
                erro={erroDoApelido(visivel)}
                aoTeclarEnter={tentarEntrar}
              />

              {codigoInicial === '' && (
                <>
                  <LimiteDaSala valor={limite} aoMudar={setLimite} />
                  <Botao larguraTotal onClick={criarSala} motivo={motivoDeCriar}>
                    Criar uma sala
                  </Botao>
                  {falhaAoCriar && (
                    <p className="text-apoio text-risco">
                      Não deu para abrir a sala agora. Tente de novo.
                    </p>
                  )}
                  <Separador />
                </>
              )}

              <div className="flex flex-col gap-4">
                {codigoInicial === '' && (
                  <CampoDeTexto
                    rotulo="Entrar com um código"
                    valor={codigo}
                    aoMudar={(valor) => setCodigo(normalizarCodigo(valor))}
                    placeholder="·····"
                    dica="5 letras, do jeito que te ditaram."
                    limite={TAMANHO_CODIGO}
                    mono
                    aoTeclarEnter={tentarEntrar}
                  />
                )}

                <Botao
                  larguraTotal
                  variante={codigoInicial === '' ? 'secundario' : 'primario'}
                  onClick={tentarEntrar}
                  motivo={
                    conectando ? 'Conectando com a sala.' : motivoParaEntrar(apelido, codigo)
                  }
                >
                  {conectando ? 'Entrando…' : 'Entrar'}
                </Botao>

                {visivel !== null && dePorta === null && erroDoApelido(visivel) === undefined && (
                  <p className="text-apoio text-risco">{visivel.mensagem}</p>
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
 * Abre preenchido com o padrão, então quem não liga para isso continua criando a
 * sala em duas interações: escrever o apelido e apertar o botão. A faixa vem do
 * contrato (AD-011) e o campo trava no tamanho; quem recusa de fato é o servidor.
 */
function LimiteDaSala({ valor, aoMudar }: { valor: string; aoMudar(valor: string): void }) {
  const serve = limiteDigitado(valor) !== null

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="limite-da-sala" className="text-apoio font-medium text-texto">
        Quantas pessoas cabem
      </label>
      <div className="flex items-center gap-3">
        <input
          id="limite-da-sala"
          type="text"
          inputMode="numeric"
          value={valor}
          maxLength={String(MAX_JOGADORES).length}
          aria-invalid={!serve}
          aria-describedby="limite-da-sala-apoio"
          onChange={(evento) => aoMudar(evento.target.value)}
          className={`h-12 w-20 rounded-controle border bg-superficie px-3.5 text-corpo focus:outline-none ${
            serve ? 'border-controle-linha text-texto focus:border-acento' : 'border-risco text-texto'
          }`}
        />
        <span
          id="limite-da-sala-apoio"
          className={`text-[12px] ${serve ? 'text-texto-3' : 'text-risco'}`}
        >
          De {MIN_JOGADORES} a {MAX_JOGADORES} pessoas.
        </span>
      </div>
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
    <div className="flex flex-col gap-3 lg:max-w-[420px] lg:pt-1">
      <h1 className="text-titulo text-balance text-texto lg:text-display">
        Party games para jogar com os amigos
      </h1>
      <p className="text-corpo text-texto-2">Sem cadastro. Escolha um apelido e entre.</p>
      <div className="mt-3 hidden flex-col gap-1.5 border-t border-linha pt-5 lg:flex">
        <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
          jogo disponível
        </span>
        <span className="text-[15px] font-medium text-texto">
          Quem Sou Eu? · {MIN_JOGADORES} a {MAX_JOGADORES} pessoas
        </span>
        <p className="text-apoio text-texto-2">
          Cada um recebe uma carta que todos veem menos ele. As perguntas são no viva-voz; o site só
          mostra as cartas e de quem é a vez.
        </p>
      </div>
    </div>
  )
}

/** `SALA-02` — chegou por link: o código já está resolvido, falta o apelido. */
function Convite({ codigo }: { codigo: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-painel border border-linha bg-superficie px-4 py-4">
      <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
        você foi chamado para a sala
      </span>
      <span className="font-mono text-titulo tracking-[0.16em] text-texto">{codigo}</span>
    </div>
  )
}

function Separador() {
  return (
    <span className="flex items-center gap-3">
      <span className="h-px flex-1 bg-linha" />
      <span className="text-miudo text-texto-3">ou</span>
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
  aoCriar,
  aoVoltar,
}: {
  erro: ErroDeSala
  codigo: string
  apelido: string
  motivoDeCriar: string | undefined
  aoCriar(): void
  aoVoltar(): void
}) {
  const { titulo, explicacao } = TEXTOS_DE_PORTA[erro.codigo] ?? {
    titulo: erro.mensagem,
    explicacao: 'Tente entrar de novo ou abra uma sala sua.',
  }

  return (
    <div className="flex flex-col gap-5 rounded-bloco border border-linha bg-superficie p-5">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
          {codigo === '' ? 'sala' : codigo}
        </span>
        <h2 className="text-secao text-balance text-texto">{titulo}</h2>
        <p className="text-[15px] leading-relaxed text-texto-2">{explicacao}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Botao larguraTotal onClick={aoCriar} motivo={motivoDeCriar}>
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
