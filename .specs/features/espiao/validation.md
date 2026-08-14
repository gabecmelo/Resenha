# Espião Validation

**Date**: 2026-08-13
**Spec**: `.specs/features/espiao/spec.md`
**Diff range**: `fd30a44..main` (022ffdd)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verification environment note**: this Verifier's own worktree was several commits behind `main`. Rather than mutating the shared checkout (disallowed by this agent's sandbox), a read-only snapshot of `main` (`git archive main`) was extracted to a scratch directory, `node_modules` was junctioned in, and the gitignored `worker-configuration.d.ts` was copied from the shared checkout (a generated file, not a git object). All gate commands, spec-anchored evidence, and the discrimination sensor ran against that snapshot — byte-identical to `main`'s tracked tree. No commits, stashes, or working-tree changes were made to any git-tracked checkout.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `shared/protocolo.ts` — `Comando`, `ConfigEspiao`, `ProjecaoEspiao`, `PacoteResumo.jogoId` |
| T2   | ✅ Done | `shared/locais-dados.ts` + test |
| T3   | ✅ Done | `shared/jogos-catalogo.ts` + test |
| T4   | ✅ Done | `server/games/espiao/sorteio.ts` + test |
| T5   | ✅ Done | `server/games/espiao/regras.ts` + test |
| T6   | ✅ Done | `server/games/espiao/projecao.ts` + test |
| T7   | ✅ Done | `server/games/espiao/index.ts` |
| T8   | ✅ Done | `server/games/registro.ts` |
| T9   | ✅ Done | `server/core/despacho.ts` (`configEspiaoValida`) + test |
| T10  | ✅ Done | `server/core/sala-do.ts` filter by `jogoId` + integration test |
| T11  | ✅ Done | `client/src/telas/Lobby.tsx` conditional panel |
| T12  | ✅ Done | `client/src/telas/EspiaoAguardando.tsx` |
| T13  | ✅ Done | `client/src/telas/EspiaoJogo.tsx` |
| T14  | ✅ Done | `client/src/telas/EspiaoEncerrada.tsx` |
| T15  | ✅ Done | `client/src/App.tsx` routes by `jogoId` |

All 15 tasks marked `[x]` in `tasks.md`. No blocked/partial tasks. The one follow-up fix (`022ffdd`, outside the 15 numbered tasks) is in scope and independently verified below.

---

## Spec-Anchored Acceptance Criteria

### P1: Jogar uma rodada completa (ESP-01 … ESP-16)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ESP-01: host configura nº espiões/pacotes/tempo | Padrão 1 espião, pacote(s), 300s | `shared/protocolo.ts:117-124` `CONFIG_ESPIAO_PADRAO = { numEspioes: 1, ..., tempoRodadaSeg: 300 }`; `client/src/telas/Lobby.tsx:946-999` (4 controls wired to `configurar`) | ✅ PASS |
| ESP-02: nº espiões não deixa 2+ não-espiões → recusa | `JOGADORES_INSUFICIENTES`, validado no início da rodada | `server/games/espiao/regras.ts:92-93` `if (ativos.length - numEspioes < 2) return {ok:false, erro:'JOGADORES_INSUFICIENTES'}`; `server/games/espiao/regras.test.ts:115-122` `expect(resultado).toEqual({ok:false, erro:'JOGADORES_INSUFICIENTES'})` | ✅ PASS |
| ESP-03: <3 ativos → recusa | Mesmo erro de "Quem Sou Eu" | `regras.ts:90` `MIN_JOGADORES_ESPIAO = 3`; `regras.test.ts:109-113` | ✅ PASS |
| ESP-04: sorteia local/espiões/quem começa | Determinístico dado `aleatorio` fixo | `regras.ts:99-104`; `regras.test.ts:133-146` `expect({espioes,comecaPerguntando,local}).toEqual({espioes:['b'], comecaPerguntando:'b', local:'Escola'})` | ✅ PASS |
| ESP-05: rodada mostra "aguardando prontos" | `prontos:[]`, `rodadaIniciada:false` | `regras.ts:100-106`; `regras.test.ts:159-166` | ✅ PASS |
| ESP-06: todos PRONTO libera timer | `rodadaIniciada:true`, `prazos.turno` de `tempoRodadaSeg` | `regras.ts:164-171`; `regras.test.ts:229-265` (incl. `prazos.turno = AMBIENTE.agora + 120_000` para `tempoRodadaSeg:120`, e `null` quando sem limite) | ✅ PASS |
| ESP-07: não-espião vê local | `local` presente na projeção | `server/games/espiao/projecao.ts:101` `if (!souEspiao \|\| encerrada) espiao.local = estado.local`; `projecao.test.ts:77-84` `expect(...local).toBe('Submarino')` | ✅ PASS |
| ESP-08: espião não vê local | `local` ausente | `projecao.ts:101`; `projecao.test.ts:67-75` `expect(...local).toBeUndefined()` | ✅ PASS |
| ESP-09: qualquer ativo abre votação | `abrirVotacao` aceito de qualquer ativo durante rodada | `regras.ts:181-201`; `regras.test.ts:288-294` (autor `'c'`, não-host) | ✅ PASS |
| ESP-10: timer esgota → abre votação auto | `venceuPrazoTurno` abre votação | `regras.ts:203-226`; `regras.test.ts:321-328` | ✅ PASS |
| ESP-11: um voto por ativo, "pular" incluso, uma vez por votação | Substitui voto anterior, não soma | `regras.ts:233-253`; `regras.test.ts:378-401` (`{a:'b'}` → `{a:'c'}` substitui, não vira 2 votos) | ✅ PASS |
| ESP-12: todos votaram OU host encerra → fecha e revela contagem | Fecha em ambos os caminhos | `regras.ts:250,255-266`; `regras.test.ts:403-412` (fecha auto), `regras.test.ts:466-472` (host fecha manual) | ✅ PASS |
| ESP-13: maioria absoluta em espião de fato → encerra revelando local+espiões | `faseSeguinte:'encerrada'` | `regras.ts:288-296`; `regras.test.ts:495-503` `expect({faseSeguinte,local,espioes}).toEqual({faseSeguinte:'encerrada', local:'Escola', espioes:['b']})` — **discrimination-sensor confirmed** (ver abaixo) | ✅ PASS |
| ESP-14: empate/maioria errada/maioria "pular" → continua, reabre timer | `faseSeguinte` indefinido, `prazos.turno` recalculado | `regras.ts:298-303`; `regras.test.ts:505-524` (maioria errada, empate, maioria "pular", cada um como teste separado) | ✅ PASS |
| ESP-15: host encerra manualmente a qualquer momento → revela tudo | `faseSeguinte:'encerrada'` | `regras.ts:342-356`; `regras.test.ts:555-566` (mesmo antes da rodada começar) | ✅ PASS |
| ESP-16: tela de revelação pra todos, inclusive quem entrou depois | `local`+`espioes` sempre presentes quando `encerrada` | `projecao.ts:85,101,104` (`encerrada` bypassa toda condição de visibilidade); `projecao.test.ts:145-172` (inclui jogador `'d'` com `situacao:'aguardando'` entrando após encerrada) | ✅ PASS |

### P2: Ajustes de configuração (ESP-17 … ESP-21)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ESP-17: 2+ espiões + `espioesSeVeem` → cada espião vê os outros | `espioes` presente na própria projeção | `projecao.ts:104-106`; `projecao.test.ts:100-113` `expect(...espioes).toEqual([{id:'a',...},{id:'b',...}])` | ✅ PASS |
| ESP-18: `espioesSeVeem` desligado → só sabe que é espião | `espioes` ausente | `projecao.ts:104`; `projecao.test.ts:115-127` `expect({souEspiao:true, espioes:undefined})` | ✅ PASS |
| ESP-19: `visibilidadeVoto:'tempoReal'` → contagem em tempo real | `votacaoAberta.votos` presente e atualizado | `projecao.ts:117-120`; `projecao.test.ts:184-193` `'oculta'` case at `195-204` | ✅ PASS |
| ESP-20: dica de pergunta client-side | Sorteia de lista fixa embutida, sem comando ao servidor | `client/src/telas/EspiaoJogo.tsx:40-` (lista estática local), `:245-263` (botão local, `setDica`, sem `enviar(...)`) — client-only, no automated test (matrix: build-gate only for client UI); code inspection confirms no server round-trip | ✅ PASS (matrix says build-gate only; confirmed by inspection) |
| ESP-21: bloco de notas privado | Persiste nota, privada ao autor | `regras.ts:378-386` (`escreverNotas`); `regras.test.ts:604-611`; privacy confirmed in `projecao.test.ts:280-288` `expect(paraOutro).not.toContain('segredo de a')` | ✅ PASS |

### P3: Conteúdo — pacotes temáticos (ESP-22)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ESP-22: seleção de pacotes de locais mostra **mais de um** pacote temático | Literal AC text: `>1` pacote disponível | `shared/locais-dados.ts:15-41` ships exactly **one** pacote (`locais-classicos`); `shared/locais-dados.test.ts:5-7` itself asserts `LOCAIS.length).toBeGreaterThanOrEqual(1)` — i.e. the test encodes "at least one," not the literal AC's "more than one" | ❌ GAP (literal AC) / consistent with spec's own Out-of-Scope table |

**ESP-22 detail**: `spec.md`'s Out-of-Scope table explicitly defers "Múltiplos pacotes temáticos completos" to incremental content rounds, and P3's `Independent Test`/tasks T2 done-when both only require "ao menos um pacote jogável." This is a genuine internal contradiction inside `spec.md` itself (the P3 AC text says "more than one," the Out-of-Scope table says "one is enough for this round") — the implementation resolved it in favor of the Out-of-Scope table, which is a reasonable and likely-intended reading, but the literal AC as written is not met. Recommend updating `spec.md`'s ESP-22 wording (or its Requirement Traceability status) rather than adding a fix task to the code — this is a spec-authoring gap, not an implementation defect.

**Status**: ⚠️ 21/22 ACs matched their spec-defined outcome exactly; ESP-22 flagged as a spec self-contradiction (P3, deferred content, does not block P1/MVP).

---

## Edge Cases

- [x] Jogador sai, ativos < 3 (aguardando prontos ou jogo) → cancela partida, volta ao lobby — `server/games/espiao/regras.ts:407-421`; `regras.test.ts:619-632`
- [x] Único espião sai, sobram ativos suficientes → partida segue sem espião algum (não cancela, não redistribui) — `regras.ts:425` (`espioes` filtrado, sem re-sorteio); `regras.test.ts:634-644` `expect(resultado.estado.espioes).toEqual([])` and `expect(resultado.faseSeguinte).toBeUndefined()`
- [x] Jogador entra durante rodada em andamento → fica `aguardando` (padrão `SALA-10`/`ESCR-10`) — `regras.ts:133-135` (`entrouJogador` é no-op, não redistribui); confirmed structurally — no test asserts the `aguardando` assignment itself lives in `server/core` (generic, pre-existing), correctly out of this feature's diff surface
- [x] Jogador desconecta durante votação aberta → "todos votaram" conta só ativos conectados — `regras.ts:332-335` (`todosAtivosConectadosVotaram` filters `j.conectado`); `regras.test.ts:422-430` — **discrimination-sensor confirmed** (mutation 3 below)
- [x] Voto duplicado do mesmo jogador → substitui, não soma — `regras.ts:248`; `regras.test.ts:394-401`
- [x] Votação fecha com 0 votos válidos (todos "pular" ou host encerra sem ninguém votando) → "não acertou" — `regras.ts:283` (`acertou = vencedorId !== null && ...`, `vencedorDaVotacao` returns `null` when `contagens.size === 0`); `regras.test.ts:520-530` (both "maioria em pular" and "0 votos válidos, host encerra" as separate cases)

All 6 edge cases from `spec.md` handled and evidenced.

---

## Discrimination Sensor

Ran against the read-only scratch snapshot (`git archive main` extracted to a scratch dir); the real worktree/checkout was never touched.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `server/games/espiao/regras.ts:327` | Off-by-one on majority threshold: `if (maior < maioriaMinima)` → `if (maior <= maioriaMinima)` | ✅ Killed — `regras.test.ts` "maioria absoluta em quem é de fato espião encerra..." (ESP-13) fails, `faseSeguinte` becomes `undefined` instead of `'encerrada'` |
| 2 | `server/games/espiao/projecao.ts:101` | Flipped spy-visibility condition: `if (!souEspiao \|\| encerrada)` → `if (souEspiao \|\| encerrada)` | ✅ Killed — both "esconde o local de quem é espião" and "mostra o local pra quem não é espião" (ESP-07/ESP-08) fail |
| 3 | `server/games/espiao/regras.ts:333` | Removed `conectado` filter in `todosAtivosConectadosVotaram`: `jogadoresAtivos(ctx).filter((j) => j.conectado)` → `jogadoresAtivos(ctx)` | ✅ Killed — "desconectado não trava o fechamento" edge-case test fails, votação never auto-closes |
| 4 (bonus) | `server/games/espiao/regras.ts:281` | Majority base swapped from active-player count to voter count: `const totalAtivos = jogadoresAtivos(ctx).length` → `const totalAtivos = Object.keys(votacao.votos).length` | ❌ **Survived** — full `npm run test:unit` (589/589) still green with this mutation in place |

**Sensor depth**: lightweight (default tier), + 1 targeted bonus mutation on the specific "majority over active players, not voters" Tech Decision flagged in `design.md` as a known-risk area to verify.
**Result**: 3/4 killed — **mutation 4 survived, treated as a confirmed gap** (see Fix Plans below).

**Root cause of the survived mutant**: every existing votação-outcome test in `regras.test.ts` (`describe('resultado da votação...')`, lines 475-531) uses exactly 3 active players, and every winning/losing scenario either has full turnout or a turnout ratio that happens to coincide with the active-player ratio (e.g. 2-of-3 votes cast is simultaneously ">half of 3 active" and ">half of the 2 who voted"). No test exercises partial turnout at a size where "majority of active players" and "majority of voters" would diverge (e.g. 5 active players, only 3 vote, 2 vote for the same target — majority-of-voters would close with a winner; majority-of-active-players correctly would not). The code itself (`regras.ts:281`, `jogadoresAtivos(ctx).length`) is correct per `design.md`'s Tech Decision — this is a test-coverage gap, not a code defect.

---

## Interactive UAT Results

Not independently re-run by this Verifier — delegated to the implementer's manual browser UAT during T15 (per `tasks.md` T15 done-when, which is checked `[x]`: "Verificado manualmente no navegador, ponta a ponta: criar sala Espião, configurar (3+ jogadores, 1 espião, pacote de locais), começar, marcar todos prontos, ver local/espião conforme o papel, abrir votação, votar até maioria certa → tela de revelação; repetir e encerrar manualmente pelo host → mesma tela de revelação"). This covers both P1 core paths (vote-to-majority ending, host-manual-`encerrar` ending). No separate dated UAT record commit was found in `git log fd30a44..main` beyond the `tasks.md` checkbox itself; the last commit in range (`022ffdd`) is a bug fix that the task prompt states was discovered during that same manual UAT session (the dev-local KV fallback never checking `locais-dados.ts`, meaning Espião rooms couldn't start a round at all before the fix).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — no speculative abstractions; `sortearEspioes`/`embaralhar` deliberately duplicated from `quem-sou-eu/sorteio.ts` rather than shared, matching `AD-002` (games stay isolated) |
| Surgical changes | ✅ — `server/core/despacho.ts`, `server/core/sala-do.ts` changes are pointed (config validation block, one filter line); no adjacent refactors |
| No scope creep | ✅ — diff surface (`git diff fd30a44..main --stat`) matches exactly the files listed in `design.md`'s Components section, plus the two `quem-sou-eu` test files touched only to add the new mandatory `jogoId` field (verified below) |
| Matches patterns | ✅ — `regras.ts`/`projecao.ts`/`sorteio.ts` mirror `quem-sou-eu`'s file shapes and switch-based reducer style; `sala-do.ts`'s pre-existing semicolon-per-statement style in that block is unchanged |
| Spec-anchored outcome check (asserted values match spec) | ✅ for 21/22 ACs — see ESP-22 gap above |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — `regras.test.ts` covers every reducer branch; `projecao.test.ts` covers every visibility combination; `despacho.test.ts`/`sala-do.integration.test.ts` cover the two `server/core` touch points |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — every `describe`/`it` in the new test files cites an `ESP-*` id or an explicit "edge case" label |
| Documented guidelines followed | none — `AGENTS.md`/`CLAUDE.md` silent on test policy (same conclusion already recorded in `hub-selecao-jogos/tasks.md`); the project's own established test-matrix pattern was followed instead |

**Regression check on modified pre-existing tests** (`server/games/quem-sou-eu/projecao.test.ts`, `regras.test.ts`, `shared/pacotes.test.ts`, `shared/jogos-catalogo.test.ts`): diffed against `fd30a44` — every change is additive (`jogoId: 'quem-sou-eu'` added to fixtures/expectations, new `minJogadores` assertions added). No existing assertion was weakened, removed, or skipped.

---

## Edge Cases

(see dedicated section above — repeated per template heading)

---

## Gate Check

- **Gate command (Build)**: `npm run typecheck && npm run lint && npm run build` — **PASS** (typecheck: 0 errors after restoring the gitignored `worker-configuration.d.ts` generated file into the scratch snapshot — see environment note; lint: 0 errors/warnings in the Espião diff surface, 8 pre-existing errors + 2 warnings confirmed present in `fd30a44` already, all in files untouched by this feature — `client/src/sons.ts`, `client/src/sons.test.ts`, `client/src/telas/Jogo.tsx`, `scripts/seed-pacotes.ts`; build: succeeds, both `resenha` and `client` Vite environments build clean)
- **Gate command (Full)**: `npm run typecheck && npm run test:unit && npm run test:integration` — **PASS**
- **Result**: 589 unit + 88 integration = **677 passed, 0 failed, 0 skipped**
- **Test count before feature** (`spec.md` Success Criteria baseline): 495 unit + 86 integration = 581
- **Test count after feature**: 589 unit + 88 integration = 677
- **Delta**: +94 unit, +2 integration (+96 total) — growth, no regression
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: Strengthen the majority-vote test to distinguish "over active players" from "over voters"

- **Root cause**: `regras.test.ts`'s votação-outcome tests all use 3 active players with turnout ratios that happen to coincide under both interpretations of "majority." No test exercises a scenario where majority-of-active-players and majority-of-voters would produce different outcomes.
- **Fix task**: Add a test to `server/games/espiao/regras.test.ts` (in the `describe('resultado da votação...')` block) with 5+ active players, partial turnout (e.g. 3 of 5 vote, 2 vote for the same non-spy or spy target), asserting the outcome follows the active-player-count threshold, not the voter-count threshold.
- **Priority**: Minor (the underlying code is correct per `design.md`'s Tech Decision — this closes a coverage gap that would otherwise let a real regression on this decision slip through unnoticed).

### Fix 2 (spec, not code): Reconcile ESP-22's literal AC text with the Out-of-Scope table

- **Root cause**: `spec.md` ESP-22 AC text says "mostrar mais de um pacote temático," while the Out-of-Scope table explicitly defers multi-pacote content to a later round and both P3's Independent Test and `tasks.md` T2 only require "at least one." The implementation (one pacote, `locais-classicos`) matches the Out-of-Scope table, not the literal AC.
- **Fix task**: Update `spec.md` ESP-22's wording to match the Out-of-Scope decision (e.g. "at least one pacote, more to follow as incremental content"), or explicitly mark ESP-22 as intentionally deferred in the Requirement Traceability table.
- **Priority**: Cosmetic (documentation consistency; does not affect shipped behavior, which correctly matches the product's actual MVP decision).

---

## Fix Round 1 — resolução dos dois gaps (pós-relatório)

Ambos os gaps foram resolvidos pelo orquestrador logo após este relatório:

- **Fix 1 (mutante sobrevivente, `regras.ts:281`)** — resolvido em `server/games/espiao/regras.test.ts` com dois casos novos de comparecimento parcial, os únicos que separam "maioria dos ativos" de "maioria dos votantes":
  - `maioria entre quem votou, sem ser maioria dos ativos, não encerra a partida (ESP-13)` — 5 ativos, 3 votam, 2 acusam o espião: maioria entre votantes (2 de 3), mas não dos ativos (precisa de 3) → partida continua.
  - `exatamente metade dos ativos não é maioria absoluta (ESP-13)` — 4 ativos, 2 acusam o espião → metade exata não basta.
  - **Re-sensor executado**: a mutação original (denominador `jogadoresAtivos(ctx).length` → `Object.keys(votacao.votos).length`) agora **mata** os dois testes; uma segunda mutação de off-by-one (`Math.floor(totalAtivos / 2) + 1` → `Math.floor(totalAtivos / 2)`) também **mata** os dois. Ambas as mutações foram revertidas via `git checkout` — árvore real intacta.
- **Fix 2 (contradição interna do spec, ESP-22)** — resolvido reescrevendo o texto da AC de P3 em `spec.md` para "ao menos um pacote temático jogável, num formato que aceita novos pacotes sem mudança de código", alinhando-a à tabela de Out of Scope que ela contradizia. Nenhuma mudança de código: a implementação já estava correta, o texto da AC é que estava desalinhado.

**Gate após os fixes**: typecheck limpo, 591 unit (+2), 88 integration, 0 falhas.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| ESP-01 … ESP-21 | Pending | ✅ Verified |
| ESP-22 | Pending | ⚠️ Verified against Out-of-Scope table, not literal AC text — see Fix 2 |

---

## Summary

**Overall**: ✅ Ready (with one minor test-coverage gap flagged, non-blocking)

**Spec-anchored check**: 21/22 ACs matched their spec-defined outcome exactly; 1 flagged as a spec self-contradiction (ESP-22, P3/deferred content)
**Sensor**: 3/4 mutations killed — 1 survived (majority-over-active-players vs. majority-over-voters), confirmed as a real, actionable test-coverage gap
**Gate**: 677 passed (589 unit + 88 integration), 0 failed, 0 skipped; typecheck/lint/build all clean on the Espião diff surface

**What works**: The full P1 MVP loop (configure → sorteio → aguardando prontos → rodada → votação (both auto-close and host-close paths) → maioria certa/errada/empate/pular/0-votos → revelação, including late-joiners) is implemented and evidenced end-to-end with `file:line` citations. All 6 spec edge cases handled and tested. P2 visibility toggles (espiões se veem, visibilidade do voto) fully tested. The `App.tsx`/`Lobby.tsx`/`sala-do.ts` risk areas flagged in `design.md` were each resolved exactly as designed (confirmed by direct code read). The last commit in range (`022ffdd`, the KV-fallback fix for locais pacotes) is correctly covered by its own new test (`despacho.test.ts` "locais-classicos" case).

**Issues found**:
1. Discrimination sensor mutation 4 survived: `regras.ts`'s majority-vote arithmetic uses active-player count (correct per design), but no test distinguishes this from voter-count — see Fix 1.
2. ESP-22's literal AC text ("more than one pacote") is not met (only one pacote shipped); this matches the spec's own Out-of-Scope table for this round, so it's a spec-wording gap, not an implementation defect — see Fix 2.

**Next steps**: Route Fix 1 (add the distinguishing test) as a small follow-up task. Fix 2 is a documentation-only edit to `spec.md`, safe to batch with the next spec touch-up rather than blocking this feature.
