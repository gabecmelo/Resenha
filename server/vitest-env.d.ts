declare module 'cloudflare:test' {
  // Dá ao `env` de `cloudflare:test` os bindings declarados no `wrangler.jsonc`.
  // A interface vazia é o idioma de declaration merging exigido pelo pool.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends Env {}
}
