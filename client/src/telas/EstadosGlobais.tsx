import type { ReactNode } from 'react'
import type { CodigoErro } from '../../../shared/protocolo'
import { AlternadorDeTema, Botao, LogoResenha } from '../componentes'

/**
 * As telas que não são de uma fase da sala, e sim do estado da conexão
 * (`CONN-03`, `CONN-07`, `CONN-08`).
 *
 * Sem cabeçalho, sem navegação, sem resenha: quando a conexão é o assunto, ela
 * é a tela toda. Isto aqui é um celular no meio de uma resenha — a tela bloqueia,
 * a rede oscila, o app vai pra segundo plano. Cair é o caminho comum, não a
 * exceção, por isso a mensagem de reconexão **começa pela garantia**: a vaga
 * continua sendo daquela pessoa.
 */

/** A moldura comum: um papel centrado na mesa, e nada além dele. */
function Estado({ selo, children }: { selo?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-fundo">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex items-center gap-1.5">
          <LogoResenha tamanho={20} />
          <span className="font-display text-[16px] tracking-[-0.01em] text-texto">resenha</span>
          <span className="flex-1" />
          <AlternadorDeTema />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden rounded-papel border-2 border-controle-linha bg-superficie">
          {selo}
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function Cabecalho({ tom, texto }: { tom: 'aviso' | 'risco'; texto: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b-2 border-dashed border-linha px-4 py-3">
      <span className={`selo ${tom === 'aviso' ? 'bg-aviso text-aviso-contraste' : 'bg-risco text-risco-contraste'}`}>
        {texto}
      </span>
    </div>
  )
}

const TITULO = 'font-display text-titulo text-balance text-texto'
const CORPO = 'max-w-[32ch] text-apoio leading-relaxed text-texto-2'

/** Primeira conexão: ainda não há sala nem projeção para desenhar. */
export function Conectando({ codigo }: { codigo: string }) {
  return (
    <Estado>
      <span
        aria-hidden="true"
        className="animacao-girando h-9 w-9 rounded-pilula border-[3px] border-linha border-t-acento"
      />
      <h1 className={TITULO}>Entrando na sala…</h1>
      <p className={CORPO}>
        Só um segundo — estamos puxando a mesa{' '}
        <span className="font-mono font-medium text-texto">{codigo}</span>.
      </p>
    </Estado>
  )
}

/**
 * `CONN-03` — a vaga fica guardada enquanto a sala existir. A tela diz isso
 * antes de dizer qualquer outra coisa; ninguém precisa correr para voltar.
 */
export function Reconectando() {
  return (
    <Estado selo={<Cabecalho tom="aviso" texto="seu lugar está guardado" />}>
      <h1 className={TITULO}>Ninguém tomou sua cadeira.</h1>
      <p className={CORPO}>
        A sua carta continua selada e a mesa está te esperando. Voltamos assim que a rede voltar —
        sem pressa.
      </p>
      <span className="font-mono text-rotulo text-texto-3 uppercase">tentando de novo…</span>
      <p className="max-w-[32ch] text-miudo text-texto-3">
        Se você fechou a aba, é só abrir o link de novo.
      </p>
    </Estado>
  )
}

/**
 * O fim da linha para quem já estava dentro: a sala sumiu (`CONN-07`,
 * `CONN-08`) ou a pessoa foi removida dela (`HOST-02`, `CONN-04`).
 *
 * Não há o que tentar de novo — insistir com a mesma credencial dá no mesmo —,
 * então a tela diz o que aconteceu e oferece o caminho de volta.
 */
const FECHAMENTOS: Partial<
  Record<CodigoErro, { selo: string; titulo: string; explicacao: string }>
> = {
  TOKEN_BANIDO: {
    selo: 'você saiu da mesa',
    titulo: 'Tiraram você desta sala',
    explicacao:
      'O host tirou você da partida. Pra voltar, alguém de lá precisa te chamar de novo.',
  },
  SALA_CHEIA: {
    selo: 'sala cheia',
    titulo: 'Não deu pra voltar',
    explicacao:
      'A sala encheu enquanto você estava fora. Se alguém sair, o seu lugar abre — peça o código de novo.',
  },
}

const FECHAMENTO_PADRAO = {
  selo: 'sala fechada',
  titulo: 'Esta sala já fechou',
  explicacao:
    'Salas somem depois de um tempo paradas. Peça o código novo pra quem estava jogando — ou abra a sua.',
}

export function ConexaoEncerrada({
  codigo,
  erro,
  aoVoltar,
}: {
  codigo: string
  /** A recusa que fechou a porta, quando o servidor chegou a dar uma. */
  erro: CodigoErro | undefined
  aoVoltar(): void
}) {
  const { selo, titulo, explicacao } =
    (erro === undefined ? undefined : FECHAMENTOS[erro]) ?? FECHAMENTO_PADRAO

  return (
    <Estado selo={<Cabecalho tom="risco" texto={selo} />}>
      {/* O código hachurado: o papel que existia e não vale mais. */}
      <span className="verso-secreto flex h-[76px] w-full items-center justify-center rounded-papel">
        <span className="font-display text-[26px] tracking-[0.14em] text-texto-3 line-through">
          {codigo}
        </span>
      </span>
      <h1 className={TITULO}>{titulo}</h1>
      <p className={CORPO}>{explicacao}</p>
      <span className="w-full pt-2">
        <Botao larguraTotal onClick={aoVoltar}>
          Voltar pro início
        </Botao>
      </span>
    </Estado>
  )
}
