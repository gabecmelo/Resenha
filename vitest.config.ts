import { defineConfig } from 'vitest/config'

/** Suíte unitária: núcleo puro e regras de jogo, sem plataforma nem rede. */
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts', 'client/**/*.test.ts', 'client/**/*.test.tsx', 'shared/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
})
