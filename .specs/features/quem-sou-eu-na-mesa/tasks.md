# Quem Sou Eu? na mesa — Tasks

**Status**: Implementada — falta o Verifier

- [x] **T1** `QSE-09`, `QSE-05` — `volta.ts`: `donoDoAparelho` sai (não sobrou caso), entra `aparelhoParaMostrar`, com testes.
- [x] **T2** `QSE-07` — `configLocal` força `tempoTurnoSeg: null`; o `Lobby` esconde a linha no modo local, como `PJ-09` já faz com a ordem.
- [x] **T3** `QSE-02` — `Carta` ganha `virada`: verso hachurado sem dono, porque num aparelho só não existe "a minha".
- [x] **T4** `QSE-01`…`QSE-04`, `QSE-06` — `QuemSouEuMesa.tsx`, o tabuleiro; a `Partida` a escolhe e passa o `aoMostrarCarta`.
- [x] **T5** — a tela de encerramento no modo local cai toda na mesma grade, sem "você era" e sem estrela de host.

## Test Coverage Matrix

| Módulo | Tests | Critérios |
| --- | --- | --- |
| `client/src/passaejoga/volta.ts` | `volta.test.ts` | `QSE-04`, `QSE-05`, `QSE-09` |
| `client/src/telas/passaejoga/QuemSouEuMesa.tsx` | verificação ao vivo no DOM | `QSE-01`, `QSE-02`, `QSE-03`, `QSE-06` |
| `client/src/passaejoga/motor.ts` | verificação ao vivo (`tempoTurnoSeg: null` na mesa guardada) | `QSE-07` |

O tabuleiro não tem teste de componente porque o projeto não tem nenhum: a
suíte é de módulos puros, e a decisão que dava pra errar aqui — para quem o
aparelho vai — foi extraída justamente pra caber nela (`QSE-09`).

## Gate Check Commands

```
npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build
```

Linha de base: **1063 unit / 98 integration**, 0 erros de lint, 2 warnings
pré-existentes de `react-hooks/exhaustive-deps` em `Jogo.tsx`. O total de unit
cai pra 1062: os quatro testes de `donoDoAparelho` viraram três de
`aparelhoParaMostrar` mais um da roda de um.
