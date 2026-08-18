/**
 * Ícone da marca: duas cartas de papel sobre a mesa. A de trás, em esmalte, é a
 * que você vê dos outros; a da frente, em papel com contorno de tinta, é a sua —
 * guardada até que alguém a revele. Mesmo conceito da `Carta` (herói da tela de
 * partida), em miniatura.
 *
 * Usa os tokens semânticos do sistema (`index.css`) em vez de hex fixo, então
 * segue o tema claro/escuro sem variante própria. Cantos de 4 e contorno reto:
 * na direção Bancada tudo é papel carimbado, nada é pílula.
 */
export function LogoResenha({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect
        x="21"
        y="13"
        width="29"
        height="37"
        rx="4"
        fill="var(--acento)"
        transform="rotate(9 35 31)"
      />
      <rect
        x="13.5"
        y="16.5"
        width="28"
        height="36"
        rx="4"
        fill="var(--superficie)"
        stroke="var(--texto)"
        strokeWidth="3.5"
        transform="rotate(-8 27 34)"
      />
    </svg>
  )
}
