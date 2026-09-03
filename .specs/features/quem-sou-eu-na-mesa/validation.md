# Quem Sou Eu? na mesa — Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/quem-sou-eu-na-mesa/spec.md`
**Diff range**: `a6888a8..HEAD` (commit `3d2454c`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `donoDoAparelho` removido (grep confirma zero ocorrências), `aparelhoParaMostrar` em `volta.ts:164` com testes em `volta.test.ts:202-238` |
| T2   | ✅ Done | `configLocal` força `tempoTurnoSeg: null` (`motor.ts:367`); `Lobby.tsx:750-757` esconde a linha com `!local` |
| T3   | ✅ Done | `Carta.tsx` ganha prop `virada` (linhas 24-30, 56, 108-114) |
| T4   | ✅ Done | `QuemSouEuMesa.tsx` criado; `Partida.tsx` roteia por `jogoId === 'quem-sou-eu'` (linha ~350) e passa `aoMostrarCarta` |
| T5   | ✅ Done | `Encerrada.tsx` cai numa grade só em `modo === 'local'` (linhas 33-39, 56-60, 78) |

---

## Spec-Anchored Acceptance Criteria

| Critério | Outcome definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| `QSE-01` — fase `jogo` num aparelho só: todas as cartas viradas, sem vez/relógio/"Descobri!"/"Passei a vez"/"Pular a vez" | Nenhum desses elementos deve aparecer | `client/src/telas/passaejoga/QuemSouEuMesa.tsx` (componente inteiro, 113 linhas) não referencia vez, relógio, "Descobri", "Passei a vez" ou "Pular a vez" — confirmado por inspeção completa do arquivo. `Carta` recebe `virada={!estaAberta}` (linha 74), sempre `true` por padrão. Sem teste de componente (o projeto não tem nenhum — justificado em `tasks.md`) | ✅ PASS (por inspeção, não por teste automatizado — ver Code Quality) |
| `QSE-02` — cada carta tem botão que mostra; carta aberta tem botão que esconde | Toggle "Mostrar"/"Esconder" por carta | `QuemSouEuMesa.tsx:77-83` — `onClick={() => (estaAberta ? setAberta(null) : mostrar(jogador.id))}`, rótulo alterna `'Esconder' : 'Mostrar'` | ✅ PASS (verificação de código; sem teste de componente) |
| `QSE-03` — só uma carta aberta por vez | Abrir a segunda fecha a primeira | `QuemSouEuMesa.tsx:43` — `useState<JogadorId \| null>` (estado único, não um Set/Map), `mostrar` faz `setAberta(alvo)` substituindo o valor anterior | ✅ PASS (a estrutura de dados torna a segunda abertura estruturalmente exclusiva com a primeira; sem teste de componente) |
| `QSE-04` — a carta de qualquer pessoa pode ser aberta, inclusive a de quem segura o aparelho, movendo o aparelho para o vizinho seguinte | Mostrar a carta do portador move o aparelho ao vizinho seguinte antes de abrir | `client/src/passaejoga/volta.test.ts:210-217` — `aparelhoParaMostrar(veja(mesa), portador, portador)` retorna exatamente `vizinho = roda[(roda.indexOf(portador)+1) % roda.length]`; `volta.test.ts:219-231` prova que, depois do movimento, `jogadores.find(portador).carta` existe na nova projeção; `volta.test.ts:203-208` prova que a carta de outra pessoa não move nada (`toBeNull()`) | ✅ PASS |
| `QSE-05` — aparelho não persegue mais a vez; fica parado fora das voltas de segredo | `PJ-30` (perseguir a vez) não vale mais para "Quem Sou Eu?" | `client/src/telas/passaejoga/Partida.tsx` — o `useEffect` que chamava `donoDoAparelho` foi removido (grep de `donoDoAparelho` no repo inteiro: zero ocorrências); substituído por `mostrarCartaDe`, que só move o aparelho a pedido explícito de "mostrar carta" | ✅ PASS |
| `QSE-06` — "Encerrar partida" com confirmação é a única saída da fase `jogo`; revela tudo | Modal de confirmação; ao confirmar, `enviar({t:'encerrar'})` | `QuemSouEuMesa.tsx:90-110` — botão único na `BarraDeAcao`, `Modal` com `aoConfirmar` disparando `enviar({t:'encerrar'})`; `regras.ts` (`shared/jogos/quem-sou-eu`, fora de escopo) já revela tudo em `encerrar`, comportamento não tocado por esta feature | ✅ PASS |
| `QSE-07` — num aparelho só, "Tempo por turno" some do formulário e a partida nasce com `tempoTurnoSeg: null` | Campo oculto no form local; config nasce com `tempoTurnoSeg: null` | `client/src/telas/Lobby.tsx:750-757` — `{!local && <LinhaDeRegra rotulo="Tempo por turno" .../>}`; `client/src/passaejoga/motor.ts:367` — `tempoTurnoSeg: null` hard-coded em `configLocal` | ⚠️ **Spec-precision gap / lacuna de teste** — **nenhum teste unitário ou de integração afirma `tempoTurnoSeg: null` na mesa guardada**. O sensor de discriminação confirmou: removendo a linha `tempoTurnoSeg: null` de `configLocal`, a suíte inteira (1070 unit + 98 integration) continua passando. O `tasks.md` já reconhecia isso como "verificação ao vivo", mas não há evidência automatizada — **GAP** |
| `QSE-08` — fase de escrita não muda: cada um escreve a carta do vizinho na volta do aparelho | Comportamento de `PJ-29`/`PJ2-07` preservado, sem alteração | `client/src/passaejoga/volta.ts:76-92` (bloco `fase === 'escrita'`) é byte-a-byte idêntico ao pré-existente — o `git diff a6888a8..HEAD -- client/src/passaejoga/volta.ts` não toca essas linhas; `volta.test.ts:114-126` (`PJ-29`) continua passando inalterado | ✅ PASS |
| `QSE-09` — a decisão de para quem o aparelho vai mora em função pura, testável sem React | Função pura, sem dependência de React | `client/src/passaejoga/volta.ts:164-174` — `aparelhoParaMostrar(projecao, aparelhoCom, alvo)` não importa React, recebe e devolve dados simples; testada diretamente em `volta.test.ts` sem montar nenhum componente | ✅ PASS |

**Status**: ⚠️ 8/9 ACs com evidência forte; `QSE-07` tem lacuna de cobertura automatizada (código correto, mas não travado por teste).

---

## Discrimination Sensor

| # | File:line | Mutação | Morto? |
| - | --------- | ------- | ------ |
| 1 | `client/src/passaejoga/volta.ts:169` | `if (alvo !== aparelhoCom) return null` → `if (alvo === aparelhoCom) return null` (inverte a condição de guarda) | ✅ Morto (3 testes falharam — erro de projeção com `null`) |
| 2 | `client/src/passaejoga/volta.ts:172` | `roda.indexOf(alvo) + 1` → `+ 2` | ✅ Morto (1 teste falhou: vizinho esperado != recebido) |
| 3 | `client/src/passaejoga/motor.ts:367` | Removida a linha `tempoTurnoSeg: null` de `configLocal` | ❌ **Sobrevivente** — 1070 unit + 98 integration passam inalterados. Nenhum teste afirma o valor de `tempoTurnoSeg` na config local. Vira gap (`QSE-07`, acima) |

**Sensor depth**: lightweight (3 mutações, cobrindo o núcleo puro novo — `aparelhoParaMostrar` — e a mudança de configuração)
**Resultado**: 2/3 mortos — ❌ **FAIL** (mutante sobrevivente aponta lacuna real de cobertura)

Todas as mutações foram desfeitas com `git checkout --` nos arquivos afetados; `git status` confirma árvore limpa ao final.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — só os arquivos listados no `tasks.md` |
| Sem scope creep | ✅ — `shared/jogos/quem-sou-eu/**` não foi tocado, como o escopo exige |
| Casa com os padrões existentes | ✅ — segue o padrão de `PJ-09`/`PJ2-06` já citado no próprio spec |
| Checagem de outcome contra a spec | ⚠️ — `QSE-07` correto no código, mas sem teste que trave o valor (ver sensor) |
| Cobertura por camada (domínio 1:1; UI happy+edge) | ⚠️ — o domínio puro (`volta.ts`) tem 1:1 sólido; a UI (`QuemSouEuMesa.tsx`) não tem nenhum teste automatizado, o que o projeto já assume como limitação estrutural (não há testes de componente em lugar nenhum do repo) |
| Todo teste mapeia pra uma AC | ✅ — os testes novos de `volta.test.ts` mapeiam a `QSE-04`, `QSE-05`, `QSE-09` |
| Diretrizes de projeto seguidas | `tasks.md` da própria feature — segue à risca; "sem teste de componente" é decisão de projeto documentada, não omissão |

---

## Edge Cases

- [x] Roda de uma pessoa: `aparelhoParaMostrar` devolve `null` (não há vizinho) — `volta.test.ts:233-238`
- [x] Carta de terceiro (não o portador): não move nada — `volta.test.ts:203-208`

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- **Resultado**: typecheck 0 erros; lint 0 erros, 2 warnings pré-existentes (`react-hooks/exhaustive-deps` em `client/src/telas/Jogo.tsx:96,107`); unit **1070 passed**; integration **98 passed**; build ok (só warnings pré-existentes de bundling, nada relacionado à feature)
- **Contagem de teste antes**: 1063 unit / 98 integration (linha de base do `tasks.md`)
- **Contagem de teste depois**: 1070 unit / 98 integration
- **Delta**: a linha de base do `tasks.md` previa 1062 (queda de 1 com a troca de `donoDoAparelho` por `aparelhoParaMostrar`); o commit da feature seguinte (`espiao-expulsao`) já soma +8 por cima, resultando em 1070 no HEAD atual — os números batem quando a série completa é somada
- **Skipped**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

### Fix 1: `QSE-07` sem teste que trave `tempoTurnoSeg: null`

- **Causa raiz**: `configLocal` (`client/src/passaejoga/motor.ts:357-375`) tem o valor certo, mas nenhum teste unitário chama `iniciar(...)` num jogo local e afirma `sala.config.tempoTurnoSeg === null`. O sensor de mutação provou isso ao remover a linha e ver a suíte inteira passar.
- **Fix task**: em `client/src/passaejoga/motor.test.ts` (ou `volta.test.ts`, onde `mesaDe` já existe), adicionar um teste que monta uma mesa de "Quem Sou Eu?" local e afirma `mesa.sala.config.tempoTurnoSeg === null`.
- **Prioridade**: Minor — o comportamento em produção está correto (confirmado por leitura de código e pela linha explícita no `motor.ts`); o risco é de regressão silenciosa futura, não de bug atual.

---

## Requirement Traceability Update

| Requirement | Status Anterior | Novo Status |
| --- | --- | --- |
| QSE-01 | Pending | ✅ Verified (por inspeção) |
| QSE-02 | Pending | ✅ Verified (por inspeção) |
| QSE-03 | Pending | ✅ Verified (por inspeção) |
| QSE-04 | Pending | ✅ Verified |
| QSE-05 | Pending | ✅ Verified |
| QSE-06 | Pending | ✅ Verified |
| QSE-07 | Pending | ✅ Verified (depois do Fix 1) |
| QSE-08 | Pending | ✅ Verified |
| QSE-09 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ PASS — depois do Fix 1, aplicado na iteração 2 (ver abaixo)

**Spec-anchored check**: 8/9 ACs com evidência forte; 1 com implementação correta mas sem teste que a trave (`QSE-07`)

**Sensor**: 2/3 mutações mortas; 1 sobreviveu (`motor.ts:367`, `tempoTurnoSeg: null`)

**Gate**: 1070 unit + 98 integration passed, 0 lint errors, build ok

**O que funciona**: o tabuleiro de cartas viradas, a troca de mão pra abrir a própria carta (`QSE-04`), a remoção completa de `donoDoAparelho`/`PJ-30`, a fase de escrita intocada, e a decisão pura testável (`aparelhoParaMostrar`) — tudo com evidência direta.

**Problema encontrado**: `QSE-07` está implementado corretamente, mas nenhum teste afirma o valor `tempoTurnoSeg: null` na config guardada — uma regressão futura (por exemplo, alguém reordenando os spreads em `configLocal`) passaria pela suíte inteira sem ser notada.

---

## Iteração 2 — o Fix 1 aplicado

O `QSE-07` ganhou cobertura em `client/src/passaejoga/motor.test.ts`, no teste
"ignora quem tentar reabrir a coordenação pela config": a mesa agora pede
`tempoTurnoSeg: 60` e a asserção exige `null` de volta. É o mesmo teste que já
prova as outras quatro coordenações que o modo local sobrescreve — o relógio de
turno é mais uma delas, e não merecia teste próprio.

Uma segunda asserção, no teste "fixa as configurações que descrevem coordenação",
foi escrita e **removida em seguida**: naquela mesa o `CONFIG_PADRAO` já traz
`tempoTurnoSeg: null`, então ela passaria com ou sem a linha em `configLocal`.
Asserção que não discrimina é pior do que asserção nenhuma: parece cobertura.

**Sensor, re-rodado**: a mesma mutação (remover `tempoTurnoSeg: null` de
`configLocal`, `motor.ts:367`) agora **morre** — `motor.test.ts` falha em
"ignora quem tentar reabrir a coordenação pela config". Mutação desfeita,
`git diff` do `motor.ts` vazio.

**Sensor final**: 3/3 mortos.

**Gate depois do fix**: typecheck 0 erros, lint 0 erros (2 warnings
pré-existentes), 1070 unit, 98 integration.
