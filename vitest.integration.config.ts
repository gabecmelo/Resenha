import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

/** Suíte de integração: roda dentro do workerd, com Durable Object de verdade. */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  test: {
    include: ['server/**/*.integration.test.ts'],
    passWithNoTests: true,
    // Estes testes dirigem sockets, alarmes e hibernação de verdade: uma
    // partida inteira não cabe no limite padrão de 5s.
    testTimeout: 30_000,
  },
})
