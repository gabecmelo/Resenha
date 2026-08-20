import { CATALOGO_DE_JOGOS, nomeDoJogo } from '../../../shared/jogos-catalogo'

export interface PropsDoSeletorDeJogos {
  jogoIdSelecionado: string
  /** Ausente (ou `somenteLeitura`) = sem controle nenhum, só o nome do jogo atual (`VIS-04`). */
  somenteLeitura?: boolean
  aoSelecionar?(jogoId: string): void
}

/**
 * A escolha do jogo da sala — usada na tela Início (antes de criar) e no
 * "Mudar jogo" do Lobby (`HUB-01`, `HUB-06`, `HUB-07`).
 *
 * Lista vertical, não grade: cada jogo precisa caber a frase que explica a
 * mecânica e o mínimo de gente, e é isso que decide a escolha — não o nome.
 *
 * O escolhido levanta da mesa (borda de tinta e sombra dura); o que ainda não
 * existe fica pontilhado e sem seleção. Mesmo com um único jogo jogável o
 * seletor renderiza um card de verdade (Edge Case confirmado em `spec.md`).
 */
export function SeletorDeJogos({
  jogoIdSelecionado,
  somenteLeitura = false,
  aoSelecionar,
}: PropsDoSeletorDeJogos) {
  if (somenteLeitura) {
    return (
      <span className="font-display text-secao text-texto">{nomeDoJogo(jogoIdSelecionado)}</span>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {CATALOGO_DE_JOGOS.map((jogo) => {
        if (jogo.emBreve === true) {
          return (
            <div
              key={jogo.id}
              className="flex items-center justify-between gap-3 rounded-botao border border-dashed border-linha px-3.5 py-3"
            >
              <span className="min-w-0 truncate font-display text-[17px] text-texto-3 opacity-70">
                {jogo.nome}
              </span>
              <span className="flex-none font-mono text-compacto-apoio tracking-[0.1em] text-texto-3 uppercase">
                em breve
              </span>
            </div>
          )
        }

        const marcado = jogo.id === jogoIdSelecionado
        const selecionar = () => aoSelecionar?.(jogo.id)

        return (
          <button
            key={jogo.id}
            type="button"
            aria-pressed={marcado}
            onClick={selecionar}
            className={`flex w-full cursor-pointer items-start gap-3 rounded-botao bg-superficie p-3.5 text-left transition-[transform,box-shadow,border-color] duration-150 ${
              marcado
                ? 'border-2 border-controle-linha shadow-botao'
                : 'border border-linha hover:border-controle-linha'
            }`}
          >
            {/*
              O disco marcado é o mesmo gesto de um formulário de papel: um
              risco dentro do círculo. O ✓ carrega o estado junto com a cor.
            */}
            <span
              aria-hidden="true"
              className={`flex h-6.5 w-6.5 flex-none items-center justify-center rounded-pilula text-[14px] ${
                marcado ? 'bg-acento text-acento-contraste' : 'border border-linha'
              }`}
            >
              {marcado ? '✓' : ''}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-display text-[19px] text-texto">{jogo.nome}</span>
              <span className="text-apoio text-texto-3">{jogo.descricao}</span>
              <span className="mt-0.5 font-mono text-[12px] text-texto-3">
                {jogo.minJogadores}+ pessoas
                {/*
                  O mínimo é o que o servidor aceita; o recomendado é o que a
                  mesa quer saber. Os dois na mesma linha porque a decisão é uma
                  só — "cabe a gente que eu tenho aqui?".
                */}
                {jogo.recomendadoJogadores !== undefined && (
                  <span className="text-texto-apagado">
                    {' '}
                    · melhor com {jogo.recomendadoJogadores}
                  </span>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
