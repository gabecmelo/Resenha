# Funil no Worker — Tasks

**Status**: Concluída — T1 a T6 implementadas e commitadas

Seis tarefas. O risco todo está em T4 e T5, que encostam no caminho quente de um
comando de jogo — por isso a decisão de o que virar evento sai antes, em módulo
puro (T2), e a escrita nasce tolerante a binding ausente (T3).

- [x] **T1** `FUN-08` — binding `FUNIL` no `wrangler.jsonc` com dataset próprio; `wrangler types` regenerado. O beta ficou de fora: o ambiente não existe nesta árvore.
- [x] **T2** `FUN-09`, `FUN-10`, `FUN-05` — `server/core/funil.ts`: o tipo `EventoDeFunil`, `eventoDaTransicao` e `pontoDoFunil`, com testes.
- [x] **T3** `FUN-06`, `FUN-07` — `registrar()`: fire-and-forget, silenciosa sem binding, com testes.
- [x] **T4** `FUN-01`, `FUN-02` — engancha `sala_criada` em `criar()` e `jogador_entrou` em `entrarNaSala()`.
- [x] **T5** `FUN-03`, `FUN-04` — engancha as transições de fase no `webSocketMessage`, comparando a fase antes e depois do `despachar`.
- [x] **T6** — `docs/`: as consultas SQL que respondem o funil, prontas para colar.
- [x] **T7** `FUN-11` — conserto da iteração 1 do Verifier: a sala que expira com partida em andamento emite `partida_abandonada`. O caminho do `expirar()` não passa pelo `confirmar`, então precisava de gancho próprio.
- [x] **T8** `FUN-08` — dataset `resenha_funil_beta` no ambiente `beta`, destravado pelo rebase na `main` real.

## Test Coverage Matrix

| Módulo | Tests | Critérios |
| --- | --- | --- |
| `server/core/funil.ts` | `funil.test.ts` | `FUN-01`…`FUN-05`, `FUN-09`, `FUN-10` |
| `server/core/sala-do.ts` | `funil.integration.test.ts` | `FUN-01`…`FUN-04`, `FUN-06`, `FUN-07` |
| `wrangler.jsonc` | — | `FUN-08`: os dois datasets, conferidos por `wrangler deploy --dry-run` em cada ambiente. |

## Gate Check Commands

```
npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build
```

Linha de base medida em `main`: **597 unit (22 arquivos)**, 88 integration, 0
erros de lint, 2 warnings pré-existentes de `react-hooks/exhaustive-deps` em
`Jogo.tsx`. (A primeira versão deste arquivo dizia 1011/41 — número copiado do
handoff da `feat/passa-e-joga`, que é outra árvore. Corrigido depois de medir.)

**Base corrigida.** A branch nasceu de uma `main` **local** que estava 171
commits atrás da `origin/main` — erro meu, por não conferir o remoto. Rebase
feito em `25edc6c` (que já contém o passa e joga e o movimento do `AD-017`),
sem conflito, e o rebase destravou o `FUN-08`.
