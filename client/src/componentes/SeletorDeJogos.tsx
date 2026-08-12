import { CATALOGO_DE_JOGOS } from '../../../shared/jogos-catalogo'

export interface PropsDoSeletorDeJogos {
  jogoIdSelecionado: string
  /** Ausente (ou `somenteLeitura`) = sem controle nenhum, só o nome do jogo atual (`VIS-04`). */
  somenteLeitura?: boolean
  aoSelecionar?(jogoId: string): void
}

/**
 * Reaproveita o padrão visual de `.pacote-card`/`.pacote-grid` (`index.css`)
 * para escolher o jogo da sala — usado na tela Início (antes de criar) e no
 * "Mudar jogo" do Lobby (`HUB-01`, `HUB-06`, `HUB-07`).
 *
 * Mesmo com um único jogo no catálogo o seletor sempre renderiza um card de
 * verdade (Edge Case confirmado em `spec.md`) — nada de placeholder condicional.
 */
export function SeletorDeJogos({
  jogoIdSelecionado,
  somenteLeitura = false,
  aoSelecionar,
}: PropsDoSeletorDeJogos) {
  if (somenteLeitura) {
    const jogo = CATALOGO_DE_JOGOS.find((jogo) => jogo.id === jogoIdSelecionado)
    return <span className="text-[15px] font-medium text-texto">{jogo?.nome ?? jogoIdSelecionado}</span>
  }

  return (
    <div className="pacote-grid">
      {CATALOGO_DE_JOGOS.map((jogo) => {
        const marcado = jogo.id === jogoIdSelecionado
        const selecionar = () => aoSelecionar?.(jogo.id)
        return (
          <div
            key={jogo.id}
            role="button"
            tabIndex={0}
            aria-pressed={marcado}
            onClick={selecionar}
            onKeyDown={(evento) => {
              if (evento.key !== 'Enter' && evento.key !== ' ') return
              evento.preventDefault()
              selecionar()
            }}
            className="pacote-card text-left"
          >
            <h3 className="font-semibold text-texto">{jogo.nome}</h3>
            <p className="text-miudo text-texto-2">{jogo.descricao}</p>
          </div>
        )
      })}
    </div>
  )
}
