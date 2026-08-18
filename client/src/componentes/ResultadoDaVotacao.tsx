import type { JogadorId, Projecao, ProjecaoEspiao } from '../../../shared/protocolo'
import { MarcadorDeJogador } from './MarcadorDeJogador'

function nomeDe(jogadores: Projecao['jogadores'], id: JogadorId): string {
  return jogadores.find((jogador) => jogador.id === id)?.apelido ?? 'alguém'
}

/**
 * `ESP-29`…`ESP-31` — o veredito e o mapa de votos.
 *
 * Este bloco é a resposta que faltava à acusação: quem votou em quem, quanto
 * faltou, e se a mesa acertou. Os votos aparecem inteiros mesmo quando a
 * votação correu oculta — o sigilo protegia a decisão, não o que ela decidiu.
 */
export function ResultadoDaVotacao({
  resultado,
  jogadores,
  euId,
}: {
  resultado: NonNullable<ProjecaoEspiao['resultadoVotacao']>
  jogadores: Projecao['jogadores']
  euId: JogadorId
}) {
  const votos = Object.entries(resultado.votos) as [JogadorId, JogadorId | 'pular'][]
  const naoVotaram = jogadores.filter(
    (jogador) => jogador.situacao === 'ativo' && resultado.votos[jogador.id] === undefined,
  )

  return (
    <section className="flex flex-col gap-4">
      <div
        className={`flex flex-col gap-2.5 rounded-papel p-5 sm:p-6 ${
          resultado.aMesaAcertou ? 'bg-acento' : 'border-2 border-controle-linha bg-superficie'
        }`}
      >
        <span
          className={`selo self-start ${
            resultado.aMesaAcertou ? 'bg-pronto text-pronto-contraste' : 'bg-aviso text-aviso-contraste'
          }`}
        >
          {resultado.aMesaAcertou ? 'a mesa acertou' : 'a mesa errou'}
        </span>
        <span
          className={`font-display text-display text-balance ${
            resultado.aMesaAcertou ? 'text-acento-contraste' : 'text-texto'
          }`}
        >
          {resultado.acusado === undefined
            ? 'Ninguém teve maioria.'
            : `A mesa acusou ${resultado.acusado.apelido}.`}
        </span>
        <p
          className={`text-apoio leading-relaxed ${
            resultado.aMesaAcertou ? 'text-acento-contraste/85' : 'text-texto-2'
          }`}
        >
          {resultado.acusado === undefined ? (
            <>
              Empate, “pular” majoritário ou votos de menos: precisava de{' '}
              {resultado.maioriaMinima} de {resultado.totalAtivos} na mesma pessoa.
            </>
          ) : (
            <>
              {resultado.votosNoAcusado} de {resultado.totalAtivos} votos — precisava de{' '}
              {resultado.maioriaMinima}.{' '}
              {resultado.aMesaAcertou
                ? 'E era mesmo um espião.'
                : 'E não era o espião.'}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-rotulo text-texto-3 uppercase">como a mesa votou</span>
        <ul className="flex flex-col gap-1.5">
          {votos.map(([votante, alvo]) => (
            <li
              key={votante}
              className="flex min-h-12 items-center gap-2.5 rounded-botao border border-linha px-3 py-2"
            >
              <MarcadorDeJogador
                apelido={nomeDe(jogadores, votante)}
                cor={corDe(jogadores, votante)}
                tamanho="grande"
              />
              <span className="min-w-0 flex-1 truncate text-apoio font-semibold text-texto">
                {nomeDe(jogadores, votante)}
                {votante === euId && <span className="text-texto-3"> · você</span>}
              </span>
              <span aria-hidden="true" className="flex-none font-mono text-compacto text-texto-3">
                →
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-right text-apoio font-semibold ${
                  alvo === 'pular' ? 'text-texto-3' : 'text-texto'
                }`}
              >
                {alvo === 'pular' ? 'ninguém' : nomeDe(jogadores, alvo)}
              </span>
            </li>
          ))}
        </ul>

        {naoVotaram.length > 0 && (
          <p className="border-t border-dashed border-linha pt-2.5 text-apoio text-texto-3">
            {naoVotaram.map((jogador) => jogador.apelido).join(', ')}{' '}
            {naoVotaram.length === 1 ? 'não votou' : 'não votaram'} — e isso contou contra a
            acusação.
          </p>
        )}
      </div>
    </section>
  )
}

function corDe(jogadores: Projecao['jogadores'], id: JogadorId) {
  return jogadores.find((jogador) => jogador.id === id)?.cor ?? 'grafite'
}
