/**
 * Verdadeiro só no bundle publicado no staging (`resenha-beta`).
 *
 * Vem do `define` do Vite, que lê `CLOUDFLARE_ENV` na hora do build — o mesmo
 * sinal que escolhe o ambiente do `wrangler.jsonc`. Como é uma constante
 * literal, o bundler de produção apaga o código guardado por ela.
 */
declare const __BETA__: boolean
