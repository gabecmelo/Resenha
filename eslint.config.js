import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // `worker-configuration.d.ts` é gerado por `wrangler types`.
  { ignores: ['dist/**', 'node_modules/**', '.wrangler/**', 'worker-configuration.d.ts'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // O compilador TypeScript já resolve identificadores; `no-undef` só produz
    // falso positivo sobre tipos globais da plataforma.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['server/**/*.ts'],
    languageOptions: { globals: globals.worker },
  },
)
