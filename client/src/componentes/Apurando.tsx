/**
 * O intervalo entre a última ação da mesa e a revelação.
 *
 * Ocupa exatamente o lugar do que vem a seguir, com a mesma silhueta de papel,
 * pra que a revelação não empurre a tela quando chegar. Os três pontos batem no
 * ritmo de quem conta até três antes de virar a carta.
 */
export function Apurando({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <section
      role="status"
      className="flex flex-col items-center gap-2.5 rounded-papel border-2 border-dashed border-linha p-6 text-center sm:p-8"
    >
      <span className="font-mono text-rotulo text-texto-3 uppercase">{rotulo}</span>
      <span className="font-display text-titulo text-balance text-texto">{texto}</span>
      <span aria-hidden="true" className="flex items-center gap-1.5 pt-1">
        <Ponto atraso="0ms" />
        <Ponto atraso="180ms" />
        <Ponto atraso="360ms" />
      </span>
    </section>
  )
}

function Ponto({ atraso }: { atraso: string }) {
  return (
    <span
      className="ponto-de-espera h-2 w-2 rounded-pilula bg-controle-linha"
      style={{ animationDelay: atraso }}
    />
  )
}
