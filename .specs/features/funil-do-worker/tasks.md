# Funil no Worker — Tasks

**Status**: Em execução

Seis tarefas. O risco todo está em T4 e T5, que encostam no caminho quente de um
comando de jogo — por isso a decisão de o que virar evento sai antes, em módulo
puro (T2), e a escrita nasce tolerante a binding ausente (T3).

- [ ] **T1** `FUN-08` — binding `FUNIL` no `wrangler.jsonc`, dataset próprio na produção e no beta; `wrangler types` regenerado.
- [ ] **T2** `FUN-09`, `FUN-10`, `FUN-05` — `server/core/funil.ts`: o tipo `EventoDeFunil`, `eventoDaTransicao` e `pontoDoFunil`, com testes.
- [ ] **T3** `FUN-06`, `FUN-07` — `registrar()`: fire-and-forget, silenciosa sem binding, com testes.
- [ ] **T4** `FUN-01`, `FUN-02` — engancha `sala_criada` em `criar()` e `jogador_entrou` em `entrarNaSala()`.
- [ ] **T5** `FUN-03`, `FUN-04` — engancha as transições de fase no `webSocketMessage`, comparando a fase antes e depois do `despachar`.
- [ ] **T6** — `docs/`: as consultas SQL que respondem o funil, prontas para colar.

## Test Coverage Matrix

| Módulo | Tests | Critérios |
| --- | --- | --- |
| `server/core/funil.ts` | `funil.test.ts` | `FUN-01`…`FUN-05`, `FUN-09`, `FUN-10` |
| `server/core/sala-do.ts` | `funil.integration.test.ts` | `FUN-01`…`FUN-04`, `FUN-06`, `FUN-07` |
| `wrangler.jsonc` | — | `FUN-08` (config; conferida no `deploy:dry`) |

## Gate Check Commands

```
npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build
```

Linha de base em `main`: 1011 unit (41 arquivos), 88 integration, 0 erros de
lint, 2 warnings pré-existentes de `react-hooks/exhaustive-deps` em `Jogo.tsx`.
