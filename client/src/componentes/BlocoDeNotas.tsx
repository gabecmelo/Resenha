import { useEffect, useMemo, useRef, useState } from 'react'
import {
  chegouDoServidor,
  criarEnvioAdiado,
  digitou,
  rascunhoDoServidor,
} from '../estado/notas'
import { Modal } from './Modal'

/** `NOTA-01`, `AJU-26` — o campo para no limite; o servidor continua validando. */
const LIMITE_DE_NOTAS = 2000

export interface PropsDoBloco {
  texto: string
  aoMudar(texto: string): void
}

/**
 * Bloco de anotações do jogador (`NOTA-01`, `NOTA-02`).
 *
 * Só o dono vê — a projeção nunca traz as notas de outra pessoa. Começa
 * recolhido para não disputar espaço com a mesa em 360px.
 *
 * `AJU-22`…`AJU-25` — o que se digita é estado local: aparece na hora, sai para
 * o servidor depois da pausa e não é sobrescrito pela projeção enquanto o campo
 * está em edição.
 */
export function BlocoDeNotas({ texto, aoMudar }: PropsDoBloco) {
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState(() => rascunhoDoServidor(texto))

  // A projeção só entra quando o campo não está em edição. `chegouDoServidor`
  // devolve o mesmo rascunho quando nada muda, o que fecha o ciclo.
  const proximo = chegouDoServidor(rascunho, texto)
  if (proximo !== rascunho) setRascunho(proximo)

  const aoMudarRef = useRef(aoMudar)
  useEffect(() => {
    aoMudarRef.current = aoMudar
  })

  const envio = useMemo(() => criarEnvioAdiado(), [])
  // Trocar de fase ou sair não pode engolir o que acabou de ser digitado.
  useEffect(() => () => envio.liberar(aoMudarRef.current), [envio])

  const linhas = proximo.texto === '' ? 0 : proximo.texto.split('\n').length

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-painel bg-superficie-2 px-3.5 py-3 text-left"
      >
        <span className="font-mono text-[11px] tracking-[0.1em] text-texto-3 uppercase">
          suas anotações{linhas > 0 && ` · ${linhas} linha${linhas > 1 ? 's' : ''}`}
        </span>
        <span className="text-miudo font-medium text-acento">abrir</span>
      </button>

      {aberto && (
        <Modal
          titulo="Suas Anotações"
          descricao="Só você vê o que escreve aqui."
          rotuloCancelar="Fechar"
          aoCancelar={() => {
            envio.liberar(aoMudar)
            setAberto(false)
          }}
        >
          <div className="flex flex-col gap-2 rounded-painel bg-superficie-2 p-3.5 mt-2">
            <textarea
              value={proximo.texto}
              rows={8}
              maxLength={LIMITE_DE_NOTAS}
              aria-label="Suas anotações"
              placeholder={'Anote o que já descobriu: “não é ator”, “está vivo”…'}
              onChange={(evento) => {
                setRascunho(digitou(evento.target.value))
                envio.agendar(evento.target.value, aoMudar)
              }}
              onBlur={() => envio.liberar(aoMudar)}
              className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-texto placeholder:text-texto-apagado focus:outline-none"
            />
            <span className="text-[12px] text-texto-3 self-end text-right">salvo automaticamente</span>
          </div>
        </Modal>
      )}
    </>
  )
}
