# Passa e Joga: ajustes de mesa — Tasks

**Status**: Concluída — T1 a T20 implementadas e commitadas

20 tarefas, 7 fases. As fases 1, 2 e 7 são ajuste de tela e config; 3, 4 e 5 são redesenho de fluxo e é onde mora o risco. Tudo que decide comportamento entra em módulo puro (`volta.ts`, `motor.ts`, `sorteio.ts`) — `.tsx` não tem harness de teste neste projeto, e o que mora lá não tem como ser provado.

## Fase 1 — A moldura e a porta

- [x] **T1** `PJ2-01` — a tela inicial chama o modo pelo nome: "ir para o Passa e Joga".
- [x] **T2** `PJ2-02` — as oito telas que passam `codigo={sala.codigo}` cru passam a usar `molduraDaSala(sala.codigo)`.
- [x] **T3** `PJ2-03` — a confirmação de sair no modo local fala em configuração perdida, não em vaga, host ou sala.

## Fase 2 — Os pacotes

- [x] **T4** `PJ2-04` — a mesa local nasce sem pacote marcado.
- [x] **T5** `PJ2-05` — sem pacote marcado, começar fica bloqueado e a tela diz o que falta.

## Fase 3 — O Quem Sou Eu em telas

- [x] **T6** `PJ2-06` — `Config.paresDeEscrita: 'sorteados' | 'roda'`, padrão `'sorteados'`; `sortearAlvos` respeita.
- [x] **T7** `PJ2-06` — o motor local monta a config com `'roda'`.
- [x] **T8** `PJ2-07`, `PJ2-08` — depois de escrever, a carta do vizinho aparece pra mesa, com uma ação só.
- [x] **T9** `PJ2-09`, `PJ2-10` — a última pessoa não recebe oferta de passar; o rodapé oferece só a ação da tela.

## Fase 4 — O Espião sem urna

- [x] **T10** `PJ2-11` — some a volta de passagem da votação e a contagem de votos.
- [x] **T11** `PJ2-12` — tela de acusação: lista os jogadores, um toque, N comandos idênticos.
- [x] **T12** `PJ2-13`, `PJ2-14` — a volta do chute entrega o aparelho só a quem chuta, e o ramo da tela distingue **qual** volta está aberta.

## Fase 5 — O Dedo na Cara sem urna

- [x] **T13** `PJ2-16` — o motor local força `dedo.autoVoto: true`.
- [x] **T14** `PJ2-17` — um toque em quem levou, uma confirmação, e a próxima carta.
- [x] **T15** `PJ2-18` — a contagem 3-2-1 antes da carta nova, pulável por toque.

## Fase 6 — Os Enigmas

- [x] **T16** `PJ2-19` — esconder e mostrar a solução sem sair da tela.
- [x] **T17** `PJ2-20` — segunda confirmação em quem desatou.
- [x] **T18** `PJ2-21` — a mesma contagem do Dedo antes do enigma novo.

## Fase 7 — O lobby local

- [x] **T19** `PJ2-22`, `PJ2-23` — o fim de partida oferece voltar ao lobby, com os nomes intactos.
- [x] **T20** `PJ2-24`, `PJ2-25` — trocar de jogo no lobby local, resetando as regras.

## Test Coverage Matrix

| Módulo | Tests | Critérios |
| --- | --- | --- |
| `shared/jogos/quem-sou-eu/sorteio.ts` | `sorteio.test.ts` | `PJ2-06` |
| `client/src/passaejoga/motor.ts` | `motor.test.ts` | `PJ2-06`, `PJ2-13`, `PJ2-16` |
| `client/src/passaejoga/volta.ts` | `volta.test.ts` | `PJ2-07`…`PJ2-14` |
| `client/src/telas/**/*.tsx` | none | `PJ2-01`…`PJ2-05`, `PJ2-15`, `PJ2-17`…`PJ2-25` — sem harness de componente |

## Gate Check Commands

```
npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build
```

Linha de base: 1025 unit (42 arquivos), 88 integration, 0 erros de lint, 2 warnings pré-existentes em `Jogo.tsx`.
