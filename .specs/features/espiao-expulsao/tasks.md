# Espião — a expulsão que não acaba a partida — Tasks

**Status**: Implementada — falta o Verifier

- [x] **T1** `ESP-51`, `ESP-52` — `ConfigEspiao` ganha `expulsarContinua` (padrão `true`) e `chuteDoEspiaoPego` (padrão `false`); `ResultadoDaVotacao.desfecho` ganha `expulsaoSegue` e `mesaVenceu`; `ProjecaoEspiao` ganha `expulsos`.
- [x] **T2** `ESP-51`…`ESP-52a` — `regras.ts`: `EstadoEspiao.expulsos`, o helper `naRodada`, os dois ramos novos do `fecharVotacao` e as guardas de quem já saiu. Com testes.
- [x] **T3** `ESP-51e` — a projeção conta a votação sobre quem está na rodada.
- [x] **T4** `ESP-53` — `despacho.ts`: os dois campos atravessam o `configurar`, validados como boolean.
- [x] **T5** `ESP-53` — duas linhas no formulário de regras, nos dois modos.
- [x] **T6** `ESP-51f` — `EspiaoJogo` mostra quem está fora, tira o expulso de toda conta de votação e diz a ele que saiu; `EspiaoAcusacao` não o oferece de novo.
- [x] **T7** — os textos dos dois desfechos novos, no resultado e na tela de encerramento. Expulso não entra em "não votou": ele não se absteve, foi tirado.

## Test Coverage Matrix

| Módulo | Tests | Critérios |
| --- | --- | --- |
| `shared/jogos/espiao/regras.ts` | `regras.test.ts` | `ESP-51`…`ESP-51e`, `ESP-52`, `ESP-52a` |
| `server/core/despacho.ts` | `despacho.test.ts` | `ESP-53` (servidor) |
| `client/src/telas/EspiaoJogo.tsx` | verificação ao vivo no DOM | `ESP-51f` |
| `shared/jogos/espiao/projecao.ts` | `regras.test.ts` (`totalAtivos`, fechamento sozinho) | `ESP-51e` |

## Testes que mudaram de expectativa

Os do chute (`ESP-43`…`ESP-45`, `ESP-49`, e o `PJ2-13` da volta local) passaram
a ligar `chuteDoEspiaoPego`: eles descrevem a mesa que escolheu a cartada, que
agora é opção. Nenhum foi enfraquecido — ganharam a config que os torna
verdadeiros.

## Gate Check Commands

```
npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build
```

Linha de base: 1062 unit / 98 integration → **1070 unit** com os oito testes
novos. 0 erros de lint, 2 warnings pré-existentes em `Jogo.tsx`.
