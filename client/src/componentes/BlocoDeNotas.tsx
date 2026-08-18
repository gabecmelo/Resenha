import { useEffect, useMemo, useRef, useState } from 'react'
import {
  chegouDoServidor,
  criarEnvioAdiado,
  digitou,
  rascunhoDoServidor,
} from '../estado/notas'
import { abreNoDesktop } from './PainelRecolhivel'

/** `NOTA-01`, `AJU-26` — o campo para no limite; o servidor continua validando. */
const LIMITE_DE_NOTAS = 2000

export interface PropsDoBloco {
  texto: string
  aoMudar(texto: string): void
}

/**
 * Bloco de anotações do jogador (`NOTA-01`, `NOTA-02`).
 *
 * Só o dono vê — a projeção nunca traz as notas de outra pessoa.
 *
 * **Abre no lugar, não em modal.** Num modal a pessoa que está anotando
 * precisa fechar a caixa antes de conseguir passar a vez ou declarar, e é
 * exatamente no meio da anotação que a vez costuma chegar. Aberto em linha ele
 * disputa espaço com a resenha, o que é um preço menor do que travar a ação.
 *
 * `AJU-22`…`AJU-25` — o que se digita é estado local: aparece na hora, sai para
 * o servidor depois da pausa e não é sobrescrito pela projeção enquanto o campo
 * está em edição.
 */
export function BlocoDeNotas({ texto, aoMudar }: PropsDoBloco) {
  const [aberto, setAberto] = useState(abreNoDesktop)
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
    <div className="flex flex-col rounded-papel border border-linha bg-superficie">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => {
          if (aberto) envio.liberar(aoMudar)
          setAberto((estava) => !estava)
        }}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="font-mono text-rotulo text-texto-3 uppercase">
          notas{linhas > 0 && ` · ${linhas} linha${linhas > 1 ? 's' : ''}`}
        </span>
        <span className="text-miudo font-semibold text-acento">
          {aberto ? 'recolher' : 'abrir'}
        </span>
      </button>

      {aberto && (
        <div className="flex flex-col gap-2 border-t border-dashed border-linha p-3.5">
          {/* O cadeado é escrito, não só desenhado: quem não enxerga o ícone lê a garantia. */}
          <span className="font-mono text-rotulo text-texto-3 uppercase">
            <span aria-hidden="true">🔒 </span>só você vê
          </span>
          <textarea
            value={proximo.texto}
            rows={6}
            maxLength={LIMITE_DE_NOTAS}
            aria-label="Suas anotações"
            placeholder={'Anote o que já descobriu: “não é ator”, “está vivo”…'}
            onChange={(evento) => {
              setRascunho(digitou(evento.target.value))
              envio.agendar(evento.target.value, aoMudar)
            }}
            onBlur={() => envio.liberar(aoMudar)}
            className="w-full resize-y bg-transparent text-corpo text-texto placeholder:text-texto-apagado focus:outline-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0 24px, var(--linha-suave) 24px 25px)',
            }}
          />
          <span className="self-end font-mono text-rotulo text-texto-3 uppercase">
            salvo sozinho
          </span>
        </div>
      )}
    </div>
  )
}
