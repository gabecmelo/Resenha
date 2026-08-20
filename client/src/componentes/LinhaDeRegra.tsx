import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'

/**
 * Uma regra da partida, no formato de linha de talão: o rótulo à esquerda, o
 * valor à direita e a linha pontilhada ligando os dois. O valor é um objeto que
 * se aperta — ele levanta da mesa com sombra curta —, e apertar abre a gaveta
 * com as opções.
 *
 * Para quem não é host o valor vira texto: a mesma linha, sem controle nenhum
 * (`VIS-04`, `CFG-04`).
 */
export function LinhaDeRegra({
  rotulo,
  dica,
  valor,
  aoAbrir,
}: {
  rotulo: string
  dica?: string | undefined
  valor: string
  /** Ausente = só leitura. */
  aoAbrir?: (() => void) | undefined
}) {
  const [dicaAberta, setDicaAberta] = useState(false)

  return (
    <div className="flex flex-col gap-1.5 border-b border-dashed border-linha py-3">
      <div className="flex items-center gap-2">
        <span className="flex max-w-[52%] flex-none items-center gap-1.5 text-corpo font-semibold text-texto">
          {rotulo}
          {dica !== undefined && (
            <button
              type="button"
              aria-expanded={dicaAberta}
              aria-label={`O que é "${rotulo}"`}
              onClick={() => setDicaAberta((estava) => !estava)}
              className={`flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-pilula border font-mono text-[12px] ${
                dicaAberta ? 'border-acento text-acento' : 'border-linha text-texto-3'
              }`}
            >
              ?
            </button>
          )}
        </span>

        {/* A linha pontilhada é o que faz rótulo e valor lerem como um par. */}
        <span
          aria-hidden="true"
          className="mb-1.5 h-px flex-1 self-end border-b border-dotted border-texto-3/60"
        />

        {aoAbrir === undefined ? (
          <span className="max-w-[44%] flex-none text-right font-mono text-dado text-texto-2">
            {valor}
          </span>
        ) : (
          <button
            type="button"
            onClick={aoAbrir}
            className="max-w-[44%] flex-none cursor-pointer rounded-chip border border-controle-linha bg-fundo px-3 py-2.5 text-right font-mono text-dado text-texto shadow-chip transition-transform motion-safe:active:translate-x-[2px] motion-safe:active:translate-y-[2px] motion-safe:active:shadow-none"
          >
            {valor}
          </button>
        )}
      </div>

      {dicaAberta && dica !== undefined && (
        <p className="text-apoio leading-snug text-texto-3">{dica}</p>
      )}
    </div>
  )
}

/**
 * A gaveta de escolha de uma regra: as opções empilhadas, a atual marcada, e
 * escolher já fecha — não existe "confirmar" para uma decisão de um toque só.
 */
export function FolhaDeEscolha<T>({
  titulo,
  descricao,
  opcoes,
  atual,
  aoEscolher,
  aoFechar,
  children,
}: {
  titulo: string
  descricao?: string | undefined
  opcoes: ReadonlyArray<{ valor: T; rotulo: string; nota?: string }>
  atual: T
  aoEscolher(valor: T): void
  aoFechar(): void
  /** Um controle extra abaixo das opções — o campo de tempo personalizado. */
  children?: ReactNode
}) {
  return (
    <Modal folha titulo={titulo} descricao={descricao} rotuloCancelar="Fechar" aoCancelar={aoFechar}>
      <div className="flex flex-col gap-2">
        {opcoes.map((opcao) => {
          const escolhida = opcao.valor === atual
          return (
            <button
              key={opcao.rotulo}
              type="button"
              aria-pressed={escolhida}
              onClick={() => {
                aoEscolher(opcao.valor)
                aoFechar()
              }}
              className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-botao px-3.5 py-2.5 text-left ${
                escolhida
                  ? 'border-2 border-controle-linha bg-superficie shadow-chip'
                  : 'border border-linha'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-pilula text-[13px] ${
                  escolhida ? 'bg-acento text-acento-contraste' : 'border border-linha'
                }`}
              >
                {escolhida ? '✓' : ''}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-corpo font-semibold text-texto">{opcao.rotulo}</span>
                {opcao.nota !== undefined && (
                  <span className="text-apoio text-texto-3">{opcao.nota}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {children}
    </Modal>
  )
}
