# Funil no Worker — Validation

**Date**: 2026-09-03 (iteration 2 — fix→re-verify)
**Spec**: `.specs/features/funil-do-worker/spec.md`
**Diff range**: `25edc6c..HEAD` (branch `feat/funil-do-worker`, rebased onto real `origin/main`; supersedes the `d000355..HEAD` range used in iteration 1, which was measured against a `main` 171 commits stale)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Iteration history

- **Iteration 1** (range `d000355..HEAD`, stale local `main`): FAIL — single gap, FUN-04 unmet for the timeout-expiration path (`alarm()` → `expirar()` never reached `confirmar()`, so a room that died of inactivity never emitted `partida_encerrada`).
- **Between iterations**: branch rebased onto real `origin/main` (`25edc6c`, no conflicts — includes `feat/passa-e-joga` and the `AD-017` move of `server/games/` → `shared/jogos/`). A new AC, `FUN-11`, was added to the spec and implemented to close the iteration-1 gap with a dedicated `partida_abandonada` event instead of forcing the timeout path through `partida_encerrada`. The rebase also brought the `beta` environment into `wrangler.jsonc`, closing `FUN-08`.
- **This iteration**: re-derives coverage on the new base from scratch (per instructions, not inherited from iteration 1's assumptions), re-runs the critical mutant on the rebased `sala-do.ts`, and independently re-injects the FUN-11 mutants plus one not previously tried.

---

## Rebase integrity check (skeptical re-check, not assumed from "no conflict")

Verified directly by reading the current file (not diffing the merge), that all **six** `faseAntes`/`registrar`/`confirmar` sites in `server/core/sala-do.ts` landed correctly after the rebase:

| Site | Line(s) | Capture point | Correct? |
| ---- | ------- | -------------- | -------- |
| `webSocketMessage` | `sala-do.ts:184-185` | `faseAntes = sala.fase` **before** `await despachar(...)` | ✅ Confirmed — re-tested with the critical mutant (below), still kills |
| `webSocketClose` | `sala-do.ts:214,221` | `faseAntes = sala.fase` before jogador mutation | ✅ Unaffected by rebase |
| `alarm()` (turno/migração path) | `sala-do.ts:234,271` | `faseAntes = sala.fase` before `vencidos()`/loop | ✅ Unaffected |
| `alarm()` (timeout-expiration path, `FUN-11`) | `sala-do.ts:238-247` | `faseAntes` captured at 234, used at 246 in `eventoDaExpiracao(faseAntes, sala)`, **after** `await this.expirar()` at 239 | ✅ Present (closes iteration-1 FUN-04 gap) — see mutant results below for whether the ordering is load-bearing |
| `entrarNaSala` | `sala-do.ts:285,318` | `faseAntes = sala.fase` at handler start | ✅ Unaffected |
| `reconectarNaSala` | `sala-do.ts:339` | passes `sala.fase` inline (no earlier local) | ✅ Correct — nothing between entry and this call mutates `sala.fase` (`reconectar()` and `definir(sala,'migracaoHost',...)` don't touch it), so this is equivalent to capturing "before" |

`confirmar()` itself (`sala-do.ts:349-360`): the funnel hook (`eventoDaTransicao` + `registrar`) still runs immediately after `await this.persistir(sala)` and **before** the rebased 24-line pacotes block (`sala-do.ts:361-368`, moved/changed by the `feat/passa-e-joga` merge) — confirmed by reading the current file. The rebase did not insert anything between `persistir` and the funnel hook, and did not touch the funnel hook itself. `git diff 25edc6c..HEAD -- server/core/sala-do.ts` shows only additive lines (`faseAntes`, `eventoDaExpiracao`, the registrar calls) — no line inside the pre-existing pacotes/difusão logic was altered by this feature's commits.

`wrangler.jsonc` (`FUN-08`, closed by the rebase): confirmed both environments declare `analytics_engine_datasets` with **binding `FUNIL`** in both places (`wrangler.jsonc:39` production, `:122` beta) and **different dataset names** — `resenha_funil` (production, `:40`) vs. `resenha_funil_beta` (beta, `:123`). Code reads `env.FUNIL` uniformly (`server/core/funil.ts:129`), so no environment-specific code path is needed.

---

## Spec-Anchored Acceptance Criteria

| ID | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------- | --------------------- | ------------------------ | ------ |
| FUN-01 | Sala criada emite `sala_criada` com `jogoId`; 409 não emite | event written once per successful create, none on 409 | `server/core/sala-do.ts:117,141` (409 returns before `registrar`) + `funil.integration.test.ts` — `expect(resumo()).toEqual(['sala_criada:quem-sou-eu:0'])` | ✅ PASS |
| FUN-02 | Entrada aceita emite `jogador_entrou` com posição de chegada; recusada não emite | `ordem = sala.jogadores.length` post-insert | `server/core/sala-do.ts:311-316` (registrar with `ordem: sala.jogadores.length`) + `funil.integration.test.ts` — accepted sequence `['sala_criada:...:0','jogador_entrou:...:1','jogador_entrou:...:2']`; refused entry produces exactly one `jogador_entrou` | ✅ PASS |
| FUN-03 | `lobby→escrita`/`lobby→jogo` emits `partida_iniciada`; no double-count on `escrita→jogo` | exact transition set + player count | `server/core/funil.ts:44-56` (`eventoDaTransicao`) + `funil.test.ts` exhaustive product-of-phases assertion (5 emitting transitions, exact list) + `funil.integration.test.ts` (`partida_iniciada:quem-sou-eu:2`, single occurrence across `escrita→jogo`) | ✅ PASS |
| FUN-04 | Any phase → `encerrada` emits `partida_encerrada` with player count | exact outcome for arrival at `encerrada` via command | `server/core/funil.ts:54-56` + `funil.integration.test.ts` — `resumo().at(-1)` is `'partida_encerrada:quem-sou-eu:2'` after explicit `encerrar`. **Scope note**: FUN-04 as written covers arrival at `encerrada` via phase transition (the `encerrar` command path); the timeout-expiration path that iteration 1 flagged as missing is now handled by the dedicated `FUN-11` event (`partida_abandonada`), not by forcing that path through `partida_encerrada`. This is a deliberate, spec-registered design choice (see FUN-11 row) — `iniciada − encerrada` alone would double-count rooms still mid-game, per the code comment at `funil.ts:31-33`. | ✅ PASS (within its own defined scope) |
| FUN-05 | No event carries apelido/id/token/IP/código/chat; sala = opaque DO id | closed string universe | `funil.test.ts` closed-set assertion + `funil.integration.test.ts` (`Ana`/`Bruno`/`codigo` absent, single `indexes[0]`) — re-verified independently: all 5 `registrar()` call sites (`sala-do.ts:141`, `:311-316`, `:246-247`, and via `confirmar` at `:359-360` reached from `webSocketMessage`/`webSocketClose`/`entrarNaSala`/`reconectarNaSala`/`alarm`) pass `this.ctx.id.toString()` (opaque DO id, distinct from `sala.codigo`) as `salaId`; `eventoDaTransicao`/`eventoDaExpiracao`'s signatures (`funil.ts:47,74-76`) structurally restrict what they can read from `sala` to `jogoId` and `jogadores.length` | ✅ PASS |
| FUN-06 | Fire-and-forget; failure/latency never blocks a command | `registrar` never throws, never awaited | `funil.ts:124-135` (`try/catch` wraps the whole write; `void` return, no `await` at any of the 5 call sites) + `funil.test.ts` (throwing binding doesn't throw) + `funil.integration.test.ts` (gameplay reaches `escrita`, no error, with broken `writeDataPoint`) | ✅ PASS |
| FUN-07 | No binding ⇒ works, writes nothing | silent no-op | `funil.ts:129` (`if (env.FUNIL === undefined) return`) + `funil.test.ts` — `registrar({}, ...)` doesn't throw. `worker-configuration.d.ts` declares `FUNIL` required on `Env`; `registrar`'s param type is structurally optional — verified as intentional defensive typing (a required `Env` is still assignable to an optional-field parameter), not a type lie | ✅ PASS |
| FUN-08 | Beta writes to a separate dataset from prod | distinct dataset names, same binding name | `wrangler.jsonc:37-42` (prod: `binding: "FUNIL"`, `dataset: "resenha_funil"`) vs. `wrangler.jsonc:120-124` (beta: `binding: "FUNIL"`, `dataset: "resenha_funil_beta"`) — both present in this branch's `wrangler.jsonc` after the rebase, verified directly, dataset names differ, binding names match | ✅ PASS (closed — was the one spec-precision gap in iteration 1, now resolved by the rebase bringing in the `beta` environment) |
| FUN-09 | Transition→event decision in a pure module | no Worker-runtime dependency | `funil.ts:1` — only import is `type Fase`; `eventoDaTransicao`/`eventoDaExpiracao`/`pontoDoFunil` are pure functions; `funil.test.ts` runs under `vitest.config.ts` (no `cloudflare:test` runtime) | ✅ PASS |
| FUN-10 | `jogoId` opaque string; `core` ignorant of concrete games | no import from game modules | `funil.ts` has no import from `shared/jogos/` (post-`AD-017` location) or any game module; `git diff 25edc6c..HEAD -- shared/jogos server/games` is empty — confirms no game-rule change accompanies this feature | ✅ PASS |
| FUN-11 | Sala expira por inatividade **com partida em andamento** emite `partida_abandonada`; lobby que expira sem partida não emite | `partida_abandonada` only when `fase ∈ {'escrita','jogo'}` at expiry; player count at expiry | `funil.ts:62-79` (`eventoDaExpiracao`) — guard `if (fase !== 'escrita' && fase !== 'jogo') return null` + `funil.test.ts` (5 unit tests: counts `jogo`, counts `escrita`, excludes `lobby`, excludes `encerrada`, correct `doubles` shape) + `funil.integration.test.ts` (2 tests, using the `envelhecerOciosidade`/`dispararAlarme` technique from `expiracao.integration.test.ts`: a real mid-game room aged past `SALA_OCIOSA_MS` and alarmed emits `partida_abandonada:quem-sou-eu:2` as the trailing event; a lobby-only room aged the same way emits no `partida_abandonada`) | ✅ PASS |

**Status**: ✅ All 11 ACs covered and matched to spec-defined outcomes — 0 gaps, 0 spec-precision gaps remaining (FUN-08 closed by the rebase).

---

## Discrimination Sensor

Mutations injected one at a time into the real working tree on the current base (`25edc6c..HEAD`), relevant gate command run, mutation reverted with `git checkout -- <file>`, `git status --porcelain` confirmed empty after each and at the end.

| # | File:line | Description | Killed? |
| - | --------- | ------------ | ------- |
| 1 | `server/core/sala-do.ts:184-185` | **Re-run of the critical mutation from iteration 1, on the rebased file.** Moved `const faseAntes = sala.fase` to *after* `await despachar(...)` in `webSocketMessage`. Rebase risk: this is the exact site that sits near the rebased pacotes-block changes. | ✅ Killed — `funil.integration.test.ts`: 3 tests fail (`FUN-03` start-of-game and once-only assertions get `[]`/missing events; `FUN-04` last-event assertion sees `jogador_entrou` instead of `partida_encerrada`) — identical failure signature to iteration 1, confirms the rebase did not disturb this site |
| 2 | `server/core/funil.ts:77` | `FUN-11` guard `if (fase !== 'escrita' && fase !== 'jogo') return null` → `if (true) return null` (never counts abandonment). **Re-injected independently** — the implementer reported this mutation already; not taken on faith. | ✅ Killed — `funil.test.ts`: 2 tests fail (both "conta como abandono" cases return `null` instead of the event) |
| 3 | `server/core/funil.ts:77` | Guard → `if (fase === 'encerrada') return null` (implementer's second reported mutation). **Re-injected independently.** | ✅ Killed — `funil.test.ts`: "não conta o lobby que expira" fails (`lobby` now wrongly produces `partida_abandonada`) |
| 4 | `server/core/sala-do.ts:246` | **New mutant, not previously tried.** Changed `eventoDaExpiracao(faseAntes, sala)` to `eventoDaExpiracao(sala.fase, sala)` — uses the room's current in-memory `fase` instead of the pre-captured `faseAntes`. | ❌ **Survived** — `npm run test:integration`: 98/98 still pass. Investigated why: `this.expirar()` (called at line 239, before this line) never mutates `sala.fase` in memory — it only closes sockets and calls `destruir(this.ctx.storage)` (`estado.ts:30-32`, a pure `storage.deleteAll()`). Nothing between the `faseAntes` capture (line 234) and its use (line 246) — `vencidos()` included — writes to `sala.fase`. So in this specific branch, `faseAntes` and `sala.fase` are currently equivalent; capturing `faseAntes` early is defensive/future-proofing (consistent with the pattern used everywhere else in this file, and with guarding against a future change that makes `expirar()` or something before it touch `fase`) rather than fixing a bug that exists today. Reported as a finding, not a blocking gap — see note below. |
| 5 | `server/core/sala-do.ts:238-247` | **Coordinator-requested mutant.** Moved the `eventoDaExpiracao`+`registrar` block to run *before* `await this.expirar()` instead of after. | ❌ **Survived** — `npm run test:integration`: 98/98 still pass. The ordering is **not currently load-bearing**: `registrar()` only reads `sala` (already in memory) and writes to the `FUNIL` binding — it has no dependency on `expirar()` having run, and `expirar()` doesn't read anything `registrar()` writes. This differs from the `sala_criada`-after-`persistir` ordering (`sala-do.ts:139-141`), which *is* load-bearing: `persistir` can fail, and running it first means a room isn't counted unless it durably exists. For the `alarm()` abandonment path there is no equivalent failure mode being guarded against today — the code comment's analogy to `sala_criada`/`persistir` (`sala-do.ts:240-244`) is not accurate for this call site as currently written. This is a **documentation/reasoning inaccuracy**, not a functional bug: the order doesn't matter now, but the comment claims a "same reason" that doesn't actually apply here. |

**Sensor depth**: lightweight (default tier) — 5 mutations this iteration (1 re-run of the highest-risk existing mutant + 2 re-injected reported mutants + 2 new ones per the coordinator's request), plus the 4 non-`sala-do.ts` mutations already proven in iteration 1 (transition-branch flips, `quantidadeDe` zeroing, `try/catch` removal — not re-run since `funil.ts`'s pre-`FUN-11` code is untouched by the rebase, confirmed via `git diff` showing only additive `FUN-11` lines in that file).
**Result**: 3/5 killed, 2/5 survived — both survivors are **informative, not blocking**: they show the `faseAntes` capture and the registrar/expirar ordering in the `alarm()` timeout branch are not currently functionally load-bearing, only defensive/stylistic. Recorded as findings (see Fix Plans).

---

## Interactive UAT Results

Not performed — backend-only infrastructure feature (spec.md: "nenhuma tela muda").

---

## Code Quality

| Principle | Status | Notes |
| --------- | ------ | ----- |
| No features beyond what was asked | ✅ | `FUN-11` was explicitly commissioned to close iteration 1's gap |
| No abstractions for single-use code | ✅ | `eventoDaExpiracao` is a small, flat sibling of `eventoDaTransicao` |
| No unnecessary "flexibility" added | ✅ | — |
| Only touched files required for task | ✅ | This iteration's diff (`f03cecd`) touches only `funil.ts`, `funil.test.ts`, `funil.integration.test.ts`, `sala-do.ts`, `docs/FUNIL.md`, `.specs/**` |
| Didn't "improve" unrelated code | ✅ | `git diff 25edc6c..HEAD -- shared/jogos server/games` empty; pacotes-block changes in `sala-do.ts` are from the rebase, not this feature's commits |
| Matches existing patterns/style | ✅ | — |
| Would senior engineer approve? | ⚠️ | Would ask for the ordering comment at `sala-do.ts:240-244` to be corrected — see Fix 1 below |
| Tests map to acceptance criteria, non-shallow | ✅ | Spot-checked FUN-11: assertions target exact event/count, not just "was called" |
| Spec-anchored outcome check | ✅ | 11/11 ACs match spec-defined outcomes |
| Per-layer Coverage Expectation met | ✅ | Domain logic (`funil.ts`) 1:1 AC mapping; `sala-do.ts` integration layer now covers the alarm/timeout path that was missing in iteration 1 |
| Every test maps to a spec AC — no unclaimed tests | ✅ | All new tests carry `FUN-11` tags |
| Documented guidelines followed | ✅ | `docs/FUNIL.md` updated with the new query for `partida_abandonada` |

---

## Edge Cases (from spec.md)

- [x] Colisão de código (409) não emite `sala_criada`
- [x] Entrada recusada não emite `jogador_entrou`
- [x] `escrita → jogo` não duplica `partida_iniciada`
- [x] "jogar de novo" não emite nada
- [x] Binding ausente/quebrado não afeta o jogo
- [x] **Sala que expira por prazo vencido com partida em andamento — agora emite `partida_abandonada` (`FUN-11`, closes iteration-1 gap)**
- [x] Lobby que expira sem partida não emite `partida_abandonada`

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- **Result**: all green
  - typecheck: 0 errors
  - lint: 0 errors, 2 pre-existing warnings (`react-hooks/exhaustive-deps`, `client/src/telas/Jogo.tsx:96,107` — line numbers shifted slightly from iteration 1 due to the rebase, same two warnings)
  - **unit: 1063 passed (43 files)** — matches the coordinator's stated post-rebase baseline exactly
  - **integration: 98 passed (7 files)** — matches exactly (up from 96 in iteration 1's stale-base measurement; +2 for the two new `FUN-11` integration tests)
  - build: both `resenha` and `client` environments built clean (some pre-existing `INEFFECTIVE_DYNAMIC_IMPORT` warnings from `shared/jogos/*/regras.ts` dynamic imports, unrelated to this feature — present in the games catalog machinery brought in by the rebase, not touched by any funnel commit)
- **Test count context**: iteration 1's own gate numbers (613 unit/23 files, 96 integration/7 files) were measured against the stale local `main` and are superseded — not a regression, just the wrong baseline. This iteration's 1063/43 and 98/7 are the correct, current numbers and match what the coordinator independently measured.
- **Skipped tests**: none
- **Failures**: none in the real working tree (all failures above are from reverted sensor mutations)

---

## Fix Plans

### Fix 1 (non-blocking — documentation accuracy): ordering comment at `sala-do.ts:240-244` overstates its own justification

- **Root cause**: The comment says the `abandono` registration is placed after `expirar()` "pelo mesmo motivo que `sala_criada` vem depois do `persistir`: conta-se o que virou fato." Mutant #5 above shows this analogy doesn't hold today: `expirar()`'s side effects (closing sockets, wiping storage) have no bearing on whether `registrar()` can run or on what it writes, unlike `persistir()`, whose success genuinely gates whether a room durably exists. Moving the registration before `expirar()` doesn't break any current test.
- **Fix task** (optional, cosmetic): Soften or correct the comment to state the actual reason for the ordering (if there is one beyond "read `sala` before any of its data might become stale" — which is a real but different justification: `sala` is the in-memory snapshot, and placing `registrar` after `expirar` at least guarantees the write happens only for a room that is definitely being torn down, not as a defensive ordering against a persistence failure that doesn't apply on this path). Not required to close FUN-11 — the behavior is correct either way given the current test suite.
- **Priority**: Cosmetic.

### Fix 2 (non-blocking — test-suite discrimination note): `faseAntes` vs `sala.fase` in the alarm/timeout branch is currently unverified

- **Root cause**: Mutant #4 shows no test distinguishes `eventoDaExpiracao(faseAntes, sala)` from `eventoDaExpiracao(sala.fase, sala)` in the `alarm()` timeout branch, because nothing mutates `sala.fase` between capture and use on that path today. This is different from `webSocketMessage`, where the equivalent mutation is reliably killed (mutant #1) because `despachar()` genuinely mutates `sala.fase` in between.
- **Fix task** (optional): No code change needed now — flagged so that if `expirar()` (or code inserted before line 246) is ever changed to touch `sala.fase`, this stops being equivalent silently. Could add a comment noting the dependency, or a regression test that would need conscious updating if `expirar()`'s contract changes.
- **Priority**: Minor — informational, not a present defect.

---

## Requirement Traceability Update

| Requirement | Previous Status (iter. 1) | New Status |
| ----------- | -------------------------- | ---------- |
| FUN-01 | ✅ Verified | ✅ Verified |
| FUN-02 | ✅ Verified | ✅ Verified |
| FUN-03 | ✅ Verified | ✅ Verified |
| FUN-04 | ❌ Needs Fix | ✅ Verified (scope clarified: command-driven path; timeout path now covered by FUN-11) |
| FUN-05 | ✅ Verified | ✅ Verified |
| FUN-06 | ✅ Verified | ✅ Verified |
| FUN-07 | ✅ Verified | ✅ Verified |
| FUN-08 | ⚠️ Parcial (pre-declared) | ✅ Verified (closed by rebase bringing in `beta` environment) |
| FUN-09 | ✅ Verified | ✅ Verified |
| FUN-10 | ✅ Verified | ✅ Verified |
| FUN-11 | (new) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 ACs matched spec outcome exactly. 0 gaps, 0 spec-precision gaps.
**Sensor**: 3/5 mutations killed this iteration (plus 4/4 proven in iteration 1 and unaffected by the rebase); 2 survivors are both informative-only (ordering/capture-point choices in the `alarm()` timeout branch that aren't currently load-bearing, not missed bugs) — logged as non-blocking Fix 1/Fix 2, not gaps.
**Gate**: all 5 commands passed — 1063 unit (43 files) / 98 integration (7 files), 0 lint errors, 2 pre-existing warnings, build clean.

**What works**: All 11 ACs, including the new `FUN-11` (`partida_abandonada`) that closes the single gap from iteration 1. The rebase onto real `origin/main` did not disturb any of the six `faseAntes`/`registrar`/`confirmar` call sites — re-verified directly, not assumed from "no merge conflict." `FUN-08` is now fully closed (separate beta dataset, same binding name, confirmed in `wrangler.jsonc`).

**Issues found**: None blocking. Two non-blocking findings from the discrimination sensor (Fix 1: a comment's justification doesn't hold for its own code; Fix 2: an ordering choice in `alarm()`'s timeout branch isn't currently test-discriminated because nothing exercises the case where it would matter).

**Next steps**: No further fix→re-verify cycle required. Optionally route Fix 1/Fix 2 as low-priority cleanup, at the team's discretion — neither blocks marking the feature Verified.
