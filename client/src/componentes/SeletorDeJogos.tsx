import { useState } from 'react'
import { CATALOGO_DE_JOGOS } from '../../../shared/jogos-catalogo'
import { conteudoDoJogo } from '../../../shared/jogos-conteudo'
import { tocarClique } from '../sons'
import { ModalComoJogar } from './ModalComoJogar'

export interface PropsDoSeletorDeJogos {
  jogoIdSelecionado: string
  /**
   * Mostra a lista inteira, mas nada nela escolhe: o card vira papel, sem
   * clique de seleção. O "como jogar" continua de pé.
   *
   * É o que o não-host vê no lobby. Não fere `VIS-04`: o que a regra proíbe é
   * a **ação** de host aparecer na tela de quem não pode fazê-la, e ler o
   * catálogo não mexe na sala. Esconder o catálogo dele só fazia com que a
   * pessoa entrasse sem saber o que ia jogar.
   */
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
  const [explicando, setExplicando] = useState<string | null>(null)

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
        const temComoJogar = conteudoDoJogo(jogo.id) !== undefined
        // Só leitura: o miolo do card deixa de ser botão. Um botão que não faz
        // nada mente sobre o que a pessoa pode fazer ali.
        const Miolo = somenteLeitura ? 'div' : 'button'

        return (
          /*
            O card é um `div`, e não mais um `button`, porque agora carrega dois
            controles: escolher o jogo e ler as regras. Botão dentro de botão é
            HTML inválido — o navegador desmonta a árvore e o clique interno
            deixa de ser previsível. A moldura e a sombra vivem aqui; quem
            escuta o clique de escolher é o botão de dentro, que ocupa o card
            inteiro menos a linha do "como jogar".
          */
          <div
            key={jogo.id}
            className={`flex flex-col rounded-botao bg-superficie transition-[transform,box-shadow,border-color] duration-150 ${
              marcado
                ? 'border-2 border-controle-linha shadow-botao'
                : `border border-linha ${somenteLeitura ? '' : 'hover:border-controle-linha'}`
            }`}
          >
          <Miolo
            {...(somenteLeitura
              ? {}
              : { type: 'button' as const, 'aria-pressed': marcado, onClick: selecionar })}
            className={`flex w-full items-start gap-3 p-3.5 text-left ${
              somenteLeitura ? '' : 'cursor-pointer'
            } ${temComoJogar ? 'pb-2' : ''}`}
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
          </Miolo>

            {/*
              Alinhado à direita e discreto: a ação principal do card é
              escolher. Quem já conhece o jogo não deve tropeçar nesta linha
              toda vez, e quem não conhece precisa achá-la sem perguntar.
            */}
            {temComoJogar && (
              <button
                type="button"
                onClick={() => {
                  tocarClique()
                  setExplicando(jogo.id)
                }}
                className="mr-3.5 mb-2.5 ml-auto min-h-8 cursor-pointer font-mono text-[12px] text-texto-3 uppercase underline underline-offset-4 hover:text-acento"
              >
                como jogar
              </button>
            )}
          </div>
        )
      })}

      {explicando !== null && (
        <ModalComoJogar jogoId={explicando} aoFechar={() => setExplicando(null)} />
      )}
    </div>
  )
}
