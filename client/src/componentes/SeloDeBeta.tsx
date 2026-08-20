/**
 * O carimbo do staging.
 *
 * Fica no canto, torto como os outros selos, e não recebe clique — é etiqueta
 * colada no papel, não controle. Existe pra ninguém abrir a mesa com os amigos
 * achando que está na produção.
 *
 * `__BETA__` é resolvido **no build** (`CLOUDFLARE_ENV=beta`), não pelo
 * hostname: assim a faixa acompanha o bundle pra onde ele for — inclusive pro
 * `resenha-beta.workers.dev` e pro `npm run preview` local. Em produção a
 * constante é `false` literal, e o bundler apaga o componente inteiro.
 */
export function SeloDeBeta() {
  if (!__BETA__) return null

  return (
    <p className="selo-beta" title="Ambiente de testes — as salas daqui não são as da produção">
      beta
    </p>
  )
}
