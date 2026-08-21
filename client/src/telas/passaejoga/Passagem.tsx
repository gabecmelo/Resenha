import { useEffect } from 'react'
import type { Cor } from '../../../../shared/protocolo'
import { nomeDoJogo } from '../../../../shared/jogos-catalogo'
import { BarraDeAcao, Botao, MarcadorDeJogador, Shell } from '../../componentes'
import { tocarVezOutro } from '../../sons'

/**
 * A tela de passagem (`PJ-17`, `PJ-18`, `PJ-19`, `PJ-20`).
 *
 * Num aparelho só, quem protege o segredo é a tela. Esta é o **anúncio**: ela
 * nomeia quem deve estar com o aparelho e **não monta nada do conteúdo** — o
 * segredo não está escondido atrás de um `hidden`, ele simplesmente não existe
 * nesta árvore. Um `display:none` bastaria pra qualquer olho na mesa, mas não
 * pro dedo curioso que rola a tela nem pro navegador que a lê em voz alta.
 *
 * A revelação é a tela seguinte, e ela é de quem tem o segredo pra mostrar —
 * o papel do Espião, a carta a escrever, a cédula do voto. Este arquivo é o
 * gesto que a mesa aprende uma vez e repete nos quatro jogos: nome, toque,
 * conteúdo, "esconder e passar".
 *
 * `PJ-20` cai fora de graça: `revelado` não é persistido (`guarda.ts`), então
 * recarregar com um segredo à vista reabre exatamente aqui.
 */
export function Passagem({
  jogoId,
  jogador,
  posicao,
  total,
  instrucao,
  rotuloRevelar = 'Estou com o aparelho',
  aoRevelar,
  aoSair,
}: {
  jogoId: string
  /** De quem é o aparelho agora — nome e ficha, nada do que é dele. */
  jogador: { apelido: string; cor: Cor }
  /** 1-based, só pra mesa saber quanto falta da volta. */
  posicao: number
  total: number
  /** O que essa pessoa vai fazer ao revelar. Nunca o segredo em si. */
  instrucao: string
  rotuloRevelar?: string
  aoRevelar(): void
  aoSair(): void
}) {
  /*
    O aparelho trocou de mão: quem recebeu não estava olhando pra tela. O som
    é o que chama a atenção da pessoa certa numa mesa barulhenta — sem ele o
    aparelho fica parado na mão de alguém que nem viu que chegou a vez.
  */
  useEffect(() => {
    tocarVezOutro()
  }, [jogador.apelido])

  return (
    <Shell titulo={nomeDoJogo(jogoId)} aoSair={aoSair}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex flex-col items-start gap-2">
          <span className="selo bg-acento text-acento-contraste">passe o aparelho</span>
          {/*
            "para", e não "pro"/"pra": o nome de alguém não diz o gênero dessa
            pessoa, e a contração escolhe um. "Passe pro Ana" é o app errando o
            nome de quem está jogando na tela em que essa pessoa é o assunto.
          */}
          <h1 className="font-display text-display text-balance text-texto">
            Passe para {jogador.apelido}
          </h1>
          <p className="text-corpo text-texto-3">{instrucao}</p>
        </div>

        {/*
          A ficha grande é pra ser vista de longe, do outro lado da mesa: quem
          está com o aparelho entrega, quem recebe se reconhece. O nome vem
          junto porque cor sozinha não identifica ninguém.
        */}
        <div className="flex items-center gap-3 rounded-papel border border-linha bg-superficie p-4 shadow-[var(--sombra-botao)]">
          <MarcadorDeJogador apelido={jogador.apelido} cor={jogador.cor} tamanho="grande" />
          <span className="min-w-0 flex-1 truncate font-display text-titulo text-texto">
            {jogador.apelido}
          </span>
          <span aria-hidden="true" className="flex-1 border-b border-dotted border-linha" />
          <span className="flex-none font-mono text-rotulo text-texto-3 uppercase tabular-nums">
            {posicao} de {total}
          </span>
        </div>

        <p className="text-apoio leading-snug text-texto-3">
          Só toque no botão quando o aparelho já estiver na mão de{' '}
          <strong className="font-semibold text-texto">{jogador.apelido}</strong>. O que vem
          depois é só de quem recebeu.
        </p>
      </div>

      <BarraDeAcao>
        <Botao larguraTotal onClick={aoRevelar}>
          {rotuloRevelar}
        </Botao>
      </BarraDeAcao>
    </Shell>
  )
}

/**
 * O único caminho adiante a partir do conteúdo revelado (`PJ-18`, `PJ-19`).
 *
 * Mora aqui, e não em cada tela de jogo, porque é a outra metade do mesmo
 * gesto: se cada jogo desenhasse o seu, a mesa procuraria o botão de novo a
 * cada partida — e é justo no instante de esconder que hesitar custa o segredo.
 *
 * Barra própria em vez da `BarraDeAcao` das telas: ela é desenhada **por
 * cima** da tela de jogo, que já tem a barra dela, e precisa ganhar sempre.
 */
export function BarraDePassar({
  rotulo,
  motivo,
  aoPassar,
}: {
  rotulo: string
  /** O que ainda falta pra poder passar. Presente = botão travado. */
  motivo?: string | undefined
  aoPassar(): void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-controle-linha bg-superficie px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto w-full max-w-[520px]">
        <Botao larguraTotal variante="secundario" motivo={motivo} onClick={aoPassar}>
          {rotulo}
        </Botao>
      </div>
    </div>
  )
}
