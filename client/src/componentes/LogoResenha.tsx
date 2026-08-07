/**
 * Ícone da marca: duas cartas sobrepostas. A de trás, cheia, é a que você vê
 * dos outros; a da frente, vazia em contorno, é a sua — oculta até que alguém
 * a revele. Mesmo conceito da `Carta` (herói da tela de partida), em miniatura.
 *
 * Usa os tokens semânticos do sistema (`index.css`) em vez de hex fixo, então
 * segue o tema claro/escuro sem variante própria.
 */
export function LogoResenha({ tamanho = 24 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="20"
        y="12"
        width="30"
        height="38"
        rx="6"
        fill="var(--acento)"
        transform="rotate(9 35 31)"
      />
      <rect
        x="12.5"
        y="15.5"
        width="29"
        height="37"
        rx="6"
        fill="var(--fundo)"
        stroke="var(--texto)"
        strokeWidth="3.5"
        transform="rotate(-8 27 34)"
      />
    </svg>
  )
}
