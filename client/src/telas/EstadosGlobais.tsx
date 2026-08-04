import type { ReactNode } from 'react'
import { AlternadorDeTema, Botao } from '../componentes'

/**
 * As telas que não são de uma fase da sala, e sim do estado da conexão
 * (`CONN-03`, `CONN-07`, `CONN-08`).
 *
 * Isto aqui é um celular no meio de uma resenha: a tela bloqueia, a rede
 * oscila, o app vai para segundo plano. Cair é o caminho comum, não a exceção —
 * por isso a mensagem de reconexão não alarma: ela diz, antes de qualquer outra
 * coisa, que a vaga continua sendo daquela pessoa.
 */

/** A moldura comum: um bloco centrado, sem cabeçalho e sem navegação. */
function Estado({ selo, children }: { selo?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-fundo">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-4 py-4">
        <div className="flex justify-end">
          <AlternadorDeTema />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden rounded-carta border border-linha bg-superficie">
          {selo}
          <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-6 py-10 text-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function Selo({ tom, texto }: { tom: 'aviso' | 'risco'; texto: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 border-b px-4 py-3 ${
        tom === 'aviso' ? 'border-aviso-linha bg-aviso-suave' : 'border-risco-linha bg-risco-suave'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-none rounded-pilula ${
          tom === 'aviso' ? 'animacao-pulso bg-aviso' : 'bg-risco'
        }`}
      />
      <span
        className={`font-mono text-[11px] tracking-[0.12em] uppercase ${
          tom === 'aviso' ? 'text-aviso' : 'text-risco'
        }`}
      >
        {texto}
      </span>
    </div>
  )
}

const TITULO = 'text-secao text-balance text-texto'
const CORPO = 'max-w-[32ch] text-[15px] leading-relaxed text-texto-2'

/** Primeira conexão: ainda não há sala nem projeção para desenhar. */
export function Conectando({ codigo }: { codigo: string }) {
  return (
    <Estado>
      <span
        aria-hidden="true"
        className="animacao-girando h-9 w-9 rounded-pilula border-[3px] border-linha border-t-acento"
      />
      <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-texto">Entrando na sala</h1>
      <span className="font-mono text-[13px] tracking-[0.14em] text-texto-3">{codigo}</span>
      <p className="max-w-[30ch] text-apoio leading-relaxed text-texto-2">
        Leva um instante. Deixe o celular acordado até aparecer a mesa.
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
    <Estado selo={<Selo tom="aviso" texto="reconectando" />}>
      <h1 className={TITULO}>Seu lugar está guardado</h1>
      <p className={CORPO}>
        A rede oscilou. A partida continua sem você por alguns segundos e sua carta segue selada —
        ninguém vê nada.
      </p>
      <span className="font-mono text-[12px] text-texto-3">tentando de novo sozinho</span>
    </Estado>
  )
}

/**
 * `CONN-07`, `CONN-08` — a sala foi destruída. Não há o que tentar de novo: o
 * caminho de volta é a única coisa que a tela oferece.
 */
export function SalaExpirada({
  codigo,
  mensagem,
  aoVoltar,
}: {
  codigo: string
  /** O que o servidor respondeu, quando respondeu. */
  mensagem?: string | undefined
  aoVoltar(): void
}) {
  return (
    <Estado selo={<Selo tom="risco" texto="sala fechada" />}>
      <span
        style={{
          background:
            'repeating-linear-gradient(135deg, var(--superficie-2) 0 8px, var(--fundo) 8px 16px)',
        }}
        className="flex h-[72px] w-full items-center justify-center rounded-bloco border border-dashed border-controle-linha"
      >
        <span className="font-mono text-[12px] tracking-[0.16em] text-texto-3 uppercase">
          {codigo}
        </span>
      </span>
      <h1 className={TITULO}>Esta sala já fechou</h1>
      <p className={CORPO}>
        {mensagem ??
          'Salas somem depois de algumas horas paradas. Peça o código novo para quem estava jogando — ou abra a sua.'}
      </p>
      <span className="w-full pt-2">
        <Botao larguraTotal onClick={aoVoltar}>
          Voltar ao início
        </Botao>
      </span>
    </Estado>
  )
}
