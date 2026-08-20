import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import { conteudoDoJogo } from '../../../shared/jogos-conteudo'
import { Modal } from './Modal'

/**
 * As regras do jogo, a um toque do card que o escolhe.
 *
 * Quem chega pela busca cai na página do jogo e lê tudo antes de entrar. Quem
 * chega pelo link de um amigo não passa por lá — e é justamente essa pessoa que
 * está prestes a escolher um jogo cujo nome não diz como se joga. O texto é o
 * mesmo dos dois lados (`shared/jogos-conteudo.ts`) de propósito: a mesa não
 * pode ler duas versões da mesma regra.
 *
 * Sem FAQ desdobrada por padrão: aqui a pergunta é "como funciona isso?", feita
 * de pé, com a turma esperando. O detalhe fica atrás de um clique para quem
 * quiser, e a página completa fica no rodapé para quem quiser mais ainda.
 */
export function ModalComoJogar({ jogoId, aoFechar }: { jogoId: string; aoFechar(): void }) {
  const conteudo = conteudoDoJogo(jogoId)

  // Um jogo do catálogo sem texto escrito ainda: não abre janela vazia.
  if (conteudo === undefined) return null

  return (
    <Modal
      titulo={`Como jogar ${nomeDoJogo(jogoId)}`}
      rotuloCancelar="Fechar"
      aoCancelar={aoFechar}
    >
      <p className="text-corpo text-texto-2">{conteudo.resumo}</p>

      {/* Pontilhado: é ficha informativa, não coisa em que se toca. */}
      <dl className="flex flex-wrap gap-x-6 gap-y-1.5 rounded-botao border border-dashed border-linha px-3.5 py-3 font-mono text-[12.5px]">
        <div className="flex gap-1.5">
          <dt className="text-texto-3">Jogadores:</dt>
          <dd className="text-texto-2">{conteudo.jogadores}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-texto-3">Duração:</dt>
          <dd className="text-texto-2">{conteudo.duracao}</dd>
        </div>
      </dl>

      <p className="text-apoio leading-relaxed text-texto-2">{conteudo.abertura}</p>

      <ol className="flex flex-col gap-3.5">
        {conteudo.passos.map((passo, indice) => (
          <li key={passo.titulo} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-acento font-mono text-[13px] text-acento-contraste"
            >
              {indice + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-texto">{passo.titulo}</span>
              <span className="text-apoio leading-relaxed text-texto-3">{passo.texto}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-1.5">
        {conteudo.faq.map((item) => (
          <details key={item.pergunta} className="group border-t border-linha pt-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14.5px] font-semibold text-texto">
              {item.pergunta}
              <span
                aria-hidden="true"
                className="flex-none font-mono text-texto-3 group-open:hidden"
              >
                +
              </span>
              <span
                aria-hidden="true"
                className="hidden flex-none font-mono text-texto-3 group-open:block"
              >
                −
              </span>
            </summary>
            <p className="mt-1.5 text-apoio leading-relaxed text-texto-3">{item.resposta}</p>
          </details>
        ))}
      </div>

      {/*
        Também é o único link em HTML do app para as páginas indexáveis — o
        resto da tela é pintado por JavaScript, então sem isto elas só seriam
        descobertas pelo sitemap.
      */}
      <a
        href={`/${conteudo.slug}`}
        className="font-mono text-rotulo text-texto-3 uppercase underline underline-offset-4 hover:text-acento"
      >
        ver a página completa de {nomeDoJogo(jogoId)} ↗
      </a>
    </Modal>
  )
}
