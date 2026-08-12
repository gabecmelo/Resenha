# Hub de Seleção de Jogos Validation

**Date**: 2026-08-12
**Spec**: `.specs/features/hub-selecao-jogos/spec.md`
**Diff range**: `a1b7147..38ed93a` (feature branch `feat/pacotes-avancados`, checked out in the main repo working copy at `C:\Users\Lokom\Documents\github\Resenha`; this Verifier's own assigned worktree was stale at an unrelated commit — see Notes)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Notes on Environment

This Verifier's assigned worktree (`.claude/worktrees/agent-ab73553d29ef5591c`) was checked out at `b6b2b16` (a later, unrelated merge of `feat/pacotes-avancados` into `main` that does **not** include the `hub-selecao-jogos` commits — `38ed93a` is not an ancestor of `b6b2b16`). The actual feature code was found checked out in the main repository working copy (`C:\Users\Lokom\Documents\github\Resenha`, on branch `feat/pacotes-avancados`, at `38ed93a`). All file reads, gate checks, and the discrimination sensor were run against that checkout (gate checks/npm commands directly; sensor mutations in disposable `git worktree add --detach` scratch copies, never touching the real tree). No writes were made to the main checkout. This report is being written into the Verifier's own assigned worktree because tooling restricts writes to that path; it should be copied/merged into the main checkout's `.specs/features/hub-selecao-jogos/validation.md` by the orchestrator.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `shared/protocolo.ts` — `jogoId`, `trocarJogo`, `JOGO_INVALIDO` all present |
| T2   | ✅ Done | `shared/jogos-catalogo.ts` + test |
| T3   | ✅ Done | `server/games/registro.ts`, sole `as JogoDaSala<unknown>` in the project (confirmed by grep) |
| T4   | ✅ Done | `despacho.ts` generalized, `trocarJogo()` implemented, 6 branches unit-tested |
| T5   | ⚠️ Partial | `sala-do.ts` generalized correctly, but the integration test suite does not exercise the "missing-module fail-closed" path the matrix promised (see Discrimination Sensor #3) |
| T6   | ✅ Done | `index.ts` validates/persists `jogoId`, 3 integration tests |
| T7   | ✅ Done | `SeletorDeJogos.tsx`, no test infra (accepted debt, matches matrix) |
| T8   | ✅ Done | `Inicio.tsx` integrates selector, sends `jogoId` |
| T9   | ✅ Done | `Lobby.tsx` "Mudar jogo" modal, draft pattern matches `pacoteIdsRascunho` |

---

## Spec-Anchored Acceptance Criteria

### P1: Escolher o jogo ao criar a sala

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| HUB-01: abre Início → mostra jogos disponíveis, Quem Sou Eu pré-selecionado | Seletor renderiza catálogo, `jogoId` inicial = `quem-sou-eu` | `client/src/telas/Inicio.tsx:62` — `useState(JOGO_PADRAO)`; `client/src/telas/Inicio.tsx:253` — `<SeletorDeJogos jogoIdSelecionado={jogoId} .../>`; `shared/jogos-catalogo.test.ts:5-13` — `expect(CATALOGO_DE_JOGOS).toEqual([{id:'quem-sou-eu',...}])` | ✅ PASS (UI path has no automated test — matches Test Coverage Matrix's documented "none, build gate + manual" convention for client components, not a gap) |
| HUB-02: confirma criação → envia `jogoId` no pedido | Corpo do `POST /api/salas` inclui `jogoId` | `client/src/telas/Inicio.tsx:94` — `body: JSON.stringify({ limiteJogadores, jogoId })`; `server/index.integration.test.ts:190-198` — asserts `(await lerSala(codigo))?.jogoId === 'quem-sou-eu'` after posting `{jogoId:'quem-sou-eu'}` | ✅ PASS |
| HUB-03: `jogoId` fora do registro → recusa sem abrir a sala | `400`, sala não nasce | `server/index.ts:47-49` — returns `JOGO_INVALIDO` before `criarSala()`/DO wake; `server/index.integration.test.ts:200-205` — `expect(resposta.status).toBe(400); expect(await resposta.json()).toEqual({erro:'JOGO_INVALIDO'})` | ✅ PASS |
| HUB-04: sem `jogoId` → cria com jogo padrão | `EstadoSala.jogoId === JOGO_PADRAO` | `server/index.ts:42-44`; `server/index.integration.test.ts:184-188` — `expect((await lerSala(codigo))?.jogoId).toBe('quem-sou-eu')` | ✅ PASS |
| HUB-05: sala criada com sucesso → persiste `jogoId` pra vida toda | Campo persistido em `EstadoSala` | `server/core/sala-do.ts:126` — `jogoId` written on `criar()`; `server/core/sala-do.integration.test.ts:580-586` — asserts projection and stored state both carry `jogoId` | ✅ PASS |

**Status**: ✅ All P1 ACs covered.

### P2: Trocar o jogo da sala no lobby

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| HUB-06: host no lobby → vê "Mudar jogo" | Botão visível, reabre seletor | `client/src/telas/Lobby.tsx:205-211` — `souHost ? <Botao onClick={abrirModal}>Mudar jogo</Botao> : ...` | ✅ PASS (UI-only, same accepted convention as HUB-01) |
| HUB-07: não-host → só nome do jogo, sem controle | Sem botão de troca | `client/src/telas/Lobby.tsx:212-214` — else branch renders `<p>{nomeDoJogo}</p>` only | ✅ PASS (UI-only, same accepted convention) |
| HUB-08: host troca p/ jogo diferente → `jogoId` muda, `config` reseta ao padrão do jogo novo | `sala.jogoId === novoId`, `sala.config === CONFIG_PADRAO` (exact) | `server/core/despacho.ts:253-255`; `server/core/despacho.test.ts:907-922` — `expect(sala.jogoId).toBe('jogo-b'); expect(sala.config).toEqual(CONFIG_PADRAO)` | ✅ PASS |
| HUB-09: host troca p/ **mesmo** jogo → config intocada | `sala.config` unchanged, no error | `server/core/despacho.ts:251`; `server/core/despacho.test.ts:924-939` — `expect(sala.config).toEqual(configAntes)` (non-default config used as control) | ✅ PASS |
| HUB-10: não-host tenta trocar (comando direto) → recusa, mesmo erro de autoridade | `SEM_AUTORIDADE`, sala intocada | `server/core/despacho.ts:246`; `server/core/despacho.test.ts:941-955` — `expect(resultado).toEqual({ok:false,erro:'SEM_AUTORIDADE'}); expect(sala).toEqual(antes)` | ✅ PASS |
| HUB-11: sala fora do lobby → recusa qualquer troca | `FASE_INVALIDA` | `server/core/despacho.ts:247`; `server/core/despacho.test.ts:957-971` | ✅ PASS |
| HUB-12: troca aceita → reflete `jogoId`/`config` na projeção de **todos os jogadores conectados**, imediatamente | Broadcast to every connected socket via `confirmar()` | `server/core/despacho.test.ts:989-996` only calls `jogo.projetar()` directly on one projection — **no integration test drives `trocarJogo` through a live WebSocket with a second connected player to confirm the broadcast actually reaches them** (`grep trocarJogo server/core/sala-do.integration.test.ts` → 0 matches) | ❌ GAP — see below |

**Status**: ⚠️ 6/7 P2 ACs covered; HUB-12 has a genuine coverage gap (see Gap #1).

**HUB-12 detail**: `trocarJogo`'s broadcast-to-other-players behavior is asserted only at the `despacho.ts` unit layer, which calls `projetar()` directly and never exercises `sala-do.ts`'s `confirmar()`/`difundir()` machinery. T9's Done-when explicitly claims *"mecanismo do servidor já coberto pelos testes de integração de T4/T5"* — but T4 (`despacho.test.ts`) is a **unit** test file per the Test Coverage Matrix, not integration, and T5's integration file (`sala-do.integration.test.ts`) has **zero** `trocarJogo` tests. The spec's own P2 Independent Test explicitly calls for this exact scenario ("a projeção de outro jogador conectado atualiza sozinha"), so this is not a stretch reading — it's the literal spec-required test that wasn't written. The generic broadcast mechanism (`confirmar()` runs after every accepted command) makes this low-risk in practice, but it is untested at the layer the spec asked for.

### P3: Registro do hub pronto para o segundo jogo

| Criterion (WHEN X THEN Y) | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| HUB-13: novo módulo no registro do servidor → aceito em criação/troca sem tocar `core/despacho.ts` ou `core/sala-do.ts` | Único ponto de registro | `server/games/registro.ts` is the only file with `as JogoDaSala<unknown>` (`grep -r "as JogoDaSala" **/*.{ts,tsx}` → 1 hit); `despacho.ts`/`sala-do.ts` take `registro: Record<string, JogoDaSala<unknown>>` generically, no `games/` import in either | ✅ PASS (code review, per spec's own "not testable with real data this round" note) |
| HUB-14: novo jogo no registro do cliente → aparece no seletor sem mudança estrutural | Catálogo é dado, seletor itera sobre ele | `grep -r "quem-sou-eu" **/*.{ts,tsx}` → hits confined to `shared/jogos-catalogo.ts`, `server/games/registro.ts`, and test fixture files only — **zero** hits in `despacho.ts`, `sala-do.ts`, `index.ts`, `SeletorDeJogos.tsx`, `Inicio.tsx`, `Lobby.tsx` | ✅ PASS (code review) |

**Status**: ✅ Both P3 ACs pass code review (spec itself scopes these to review-only this round).

---

## Discrimination Sensor

Sensor ran in disposable `git worktree add --detach` scratch copies of `38ed93a` (never the real tree), created and removed for each mutation.

| # | File:line | Description | Killed? |
| - | --------- | ------------ | ------- |
| 1 | `server/core/despacho.ts:251` (scratch copy) | Flipped `trocarJogo` idempotency check `jogoId === sala.jogoId` → `jogoId !== sala.jogoId` (HUB-09) | ✅ Killed — 3 tests in `despacho.test.ts` failed (idempotency, projection, config-reset tests) |
| 2 | `server/core/despacho.ts:246` (scratch copy) | Flipped `trocarJogo` host check `autor.id !== sala.hostId` → `autor.id === sala.hostId` (HUB-10) | ✅ Killed — 6 tests in `despacho.test.ts` failed |
| 3 | `server/core/sala-do.ts:333-339` (scratch copy) | Removed the `if (jogo === null) return` guard in `confirmar()` before `difundir()` calls `jogo.projetar(...)` (the fail-closed path for Edge Case 4 / T5's "missing-module fail-closed" requirement) | ❌ **Survived** — full `test:integration` suite (84/84) still passed with the guard removed |

**Sensor depth**: lightweight (default tier), 3 targeted mutations.
**Result**: 2/3 killed — ❌ FAIL (mutation #3 confirms a real gap, not sensor noise: it targets exactly the behavior the Test Coverage Matrix promised integration coverage for, and no test in `sala-do.integration.test.ts` constructs a registry missing the sala's `jogoId` to exercise this line).

---

## Interactive UAT Results

Not performed by this Verifier — the feature's own tasks (T8, T9) already record manual browser verification per their Done-when criteria, consistent with the project's documented "no React component test infra" convention. This is a backend-heavy hub feature where the automated gate + sensor + code review already give strong signal; re-running interactive UAT was judged out of scope for this validation pass.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — no speculative abstraction; `registro.ts` isolates the one type-erasure the design calls out |
| Surgical changes | ✅ — touched files match the task list exactly; test fixture files (`chat.test.ts`, `roster.test.ts`, etc.) only got the minimal `jogoId` field added to satisfy the now-required `EstadoSala.jogoId` |
| No scope creep | ✅ |
| Matches patterns | ✅ — `trocarJogo` reuses the "host + fase lobby" validation shape from `configurar()`; `SeletorDeJogos` reuses `.pacote-card`/`.pacote-grid`; Lobby's draft state (`jogoIdRascunho`) mirrors `pacoteIdsRascunho` |
| Spec-anchored outcome check | ⚠️ — 13/14 ACs match spec-defined outcomes exactly; HUB-12 gap noted above |
| Per-layer Coverage Expectation met | ⚠️ — domain logic (`despacho.ts`) has full 1:1 AC coverage; DO shell (`sala-do.ts`) is missing the promised "missing-module fail-closed" integration case (Gap #1) |
| Every test maps to a spec AC/edge case | ✅ — no unclaimed tests found; every new `it()` block in `despacho.test.ts`/`sala-do.integration.test.ts`/`index.integration.test.ts` cites a `HUB-NN` |
| Documented guidelines followed | `Test Coverage Matrix` in `tasks.md` (project-authored, cites no `AGENTS.md`/`CLAUDE.md` test policy — matrix follows repo convention instead, as intended) |

---

## Edge Cases

- [x] Edge case 1 (registro com 1 jogo só): `shared/jogos-catalogo.test.ts:4-18` confirms exactly one catalog entry; `SeletorDeJogos.tsx:29-52` maps the catalog unconditionally (no length-based branching) — handled correctly.
- [x] Edge case 2 (cancelar "Mudar jogo" sem mudar nada): `client/src/telas/Lobby.tsx:226` — `aoCancelar={() => setModalAberto(false)}` sends no command; `jogoIdRascunho` is reseeded from the live `jogoId` on next open (`Lobby.tsx:197-200`). No automated test (client UI, accepted debt) — handled correctly per code review.
- [x] Edge case 3 (`jogoId` na projeção pra reconexão): `server/core/sala-do.integration.test.ts:588-599` — `expect(ultimaProjecao(volta).sala.jogoId).toBe('quem-sou-eu')` after a close/reconnect cycle — handled correctly.
- [ ] Edge case 4 (jogo removido do registro depois de deploy): implemented in code (`server/core/sala-do.ts:240-241, 286-289, 333-339` all guard `jogoAtual()` returning `null`) and unit-tested at the `despacho.ts` layer (`despacho.test.ts:999-1015`), but **not** integration-tested at the `sala-do.ts` DO-shell layer where three of the four guarded call sites live (`confirmar()`, `entrarNaSala()`, `alarm()`). Confirmed as a real gap by the surviving mutant (Sensor #3).

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build` (Build gate, per Gate Check Commands in `tasks.md`), plus `npm run test:unit` and `npm run test:integration` separately.
- **typecheck**: ✅ PASS (0 errors)
- **lint**: technically reports 8 errors / 2 warnings, but **all in files untouched by this feature** (`client/src/sons.ts`, `client/src/sons.test.ts`, `scripts/seed-pacotes.ts`, `client/src/telas/Jogo.tsx`) — confirmed pre-existing via `git show a1b7147:client/src/sons.ts` (introduced in `f19cbd9`, part of `pacotes-avancados`, predates this feature's baseline commit `a1b7147`). Zero lint issues in any `hub-selecao-jogos`-touched file. Not a regression from this feature.
  - Note: running `npm run lint` (`eslint .`) directly against the checked-out main repo hit a `tsconfigRootDir` ambiguity error caused by this Verifier's own sibling worktree living under `.claude/worktrees/`; re-run as `npx eslint . --ignore-pattern ".claude/**"` to get real results — an artifact of this session's worktree layout, not a code defect.
- **build**: ✅ PASS (`vite build` succeeds for both `resenha` and `client` environments)
- **test:unit**: ✅ 495 passed, 0 failed (baseline at `a1b7147`: 484 passed — delta **+11**, matching the new/expanded tests in `shared/jogos-catalogo.test.ts` and `despacho.test.ts`)
- **test:integration**: ✅ 84 passed, 0 failed (baseline at `a1b7147`: 77 passed / 1 failed — a pre-existing intermittent timing failure in `sala-do.integration.test.ts` unrelated to this feature, "ninguém é da vez"; delta **+6** tests, now green)
- **Skipped tests**: none
- **Failures**: none at the feature's `HEAD` (`38ed93a`)

---

## Fix Plans

### Fix 1: HUB-12 / Edge Case 4 — missing DO-shell integration coverage for the registry-resolution fail-closed path

- **Root cause**: `trocarJogo`'s broadcast behavior and the "jogo ausente do registro" fail-closed guards in `sala-do.ts` (`confirmar()`, `entrarNaSala()`, `alarm()`) were only unit-tested through `despacho.ts`'s direct calls to `projetar()`/`executar()`. No integration test in `sala-do.integration.test.ts` (a) sends a live `trocarJogo` command over WebSocket with two connected players and asserts the second player's projection updates, or (b) constructs a `SalaDeJogo` with a registry missing the sala's `jogoId` to prove `confirmar()`/`entrarNaSala()`/`alarm()` skip their effect without throwing.
- **Fix task**: Add two tests to `server/core/sala-do.integration.test.ts`:
  1. In the existing `registro de jogos` describe block: two players in a lobby; host sends `{t:'trocarJogo', jogoId:'quem-sou-eu'}` (or a second registry entry stubbed in a test-local registry, if the integration harness allows injecting one); assert the second player's `ultimaProjecao(...).sala.jogoId`/`.config` updates without them sending anything.
  2. A `registro` missing the sala's `jogoId` (may require a small test seam to inject a partial registry into the DO under test, since `novaSala()` currently always wires the production `REGISTRO_DE_JOGOS`) exercising `confirmar()` and confirming no exception is thrown and the sala keeps responding to subsequent valid commands.
- **Priority**: Minor — the underlying mechanism (`confirmar()`'s broadcast, and the `jogoAtual() ?? null` guards) is implemented correctly and low-risk since it's the same generic broadcast path every other command already exercises; but per this skill's discrimination-sensor rule, a surviving mutant blocks marking the feature fully verified.

---

## Requirement Traceability (for reference — spec.md not modified by this read-only Verifier)

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| HUB-01 | In Design | ✅ Verified |
| HUB-02 | In Design | ✅ Verified |
| HUB-03 | In Design | ✅ Verified |
| HUB-04 | In Design | ✅ Verified |
| HUB-05 | In Design | ✅ Verified |
| HUB-06 | In Design | ✅ Verified |
| HUB-07 | In Design | ✅ Verified |
| HUB-08 | In Design | ✅ Verified |
| HUB-09 | In Design | ✅ Verified |
| HUB-10 | In Design | ✅ Verified |
| HUB-11 | In Design | ✅ Verified |
| HUB-12 | In Design | ❌ Needs Fix (integration coverage gap) |
| HUB-13 | In Design | ✅ Verified (code review, per spec) |
| HUB-14 | In Design | ✅ Verified (code review, per spec) |

---

## Summary

**Overall**: ⚠️ Issues (1 real gap, well-scoped fix)

**Spec-anchored check**: 13/14 ACs matched spec outcome; 0 spec-precision gaps (spec was precise everywhere it mattered); 1 genuine coverage gap (HUB-12)
**Sensor**: 2/3 mutations killed, 1 survived (confirms the HUB-12/Edge-Case-4 gap empirically, not just by inspection)
**Gate**: typecheck/build/test:unit/test:integration all green; lint clean for feature files (pre-existing unrelated debt elsewhere)

**What works**: The core architectural bet of this feature — the `core` never importing `games/` directly, a single registry resolving `jogoId` at every call site, `trocarJogo`'s host/lobby/idempotency/validation logic — is solid and thoroughly unit-tested (all 6 branches, exact-value assertions against `CONFIG_PADRAO`). Client wiring (Início, Lobby "Mudar jogo", cancel-discards-draft) matches the design and the project's own accepted "no component test infra" convention. HUB-13/14's "no literal outside the registry" claim is independently confirmed by grep, not just trusted.

**Issues found**: HUB-12 (and Edge Case 4) lack integration-level test coverage for the DO-shell broadcast/fail-closed paths that the Test Coverage Matrix explicitly promised and the spec's own P2 Independent Test explicitly asked for. A surviving mutant (guard-removal in `sala-do.ts confirmar()`) empirically confirms no test would catch a regression here today.

**Next steps**: Route Fix 1 back to an implementer (max 3 fix→re-verify iterations per the skill's rule) — add the two integration tests described above to `sala-do.integration.test.ts`, then re-run this Verifier.
