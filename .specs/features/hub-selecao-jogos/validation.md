# Hub de Seleção de Jogos Validation

**Date**: 2026-08-12 (re-verification round 2 of 3)
**Spec**: `.specs/features/hub-selecao-jogos/spec.md`
**Diff range checked**: `a1b7147..3ecda61` (feature branch `feat/pacotes-avancados`); round-2-specific diff: `38ed93a..3ecda61` (the fix commit, `3ecda617e115ea60c5699ddf9e12cee2652c48a5`)
**Verifier**: independent sub-agent (author ≠ verifier), round 2

---

## Notes on Environment

This Verifier's assigned worktree (`.claude/worktrees/agent-a7981ed2a2bc24902`) is checked out at `b6b2b16` (branch `worktree-agent-a7981ed2a2bc24902`), which does **not** contain the `hub-selecao-jogos` feature directory at all — same class of environment mismatch round 1 hit. The feature's actual commits (up to `3ecda61`) live on `feat/pacotes-avancados`, reachable from this worktree's local refs (`git branch --all --contains 3ecda61` → `feat/pacotes-avancados`).

Per the task's own instruction ("use disposable `git worktree add --detach` scratch copies, never touch the real tree"), all reads, gate checks, and the discrimination sensor for this round were run against **four disposable scratch worktrees** created with `git worktree add --detach <path> feat/pacotes-avancados`, all rooted at commit `3ecda61`:
- `scratchpad/base` — clean checkout, used for reading spec/design/tasks docs, running the full gate, and reading the round-1 validation.md and the fix diff.
- `scratchpad/mut1`, `scratchpad/mut2`, `scratchpad/mut3` — one per sensor mutation, each with `node_modules` NTFS-junctioned from `base` (not reinstalled) to save time.

All four scratch worktrees were removed (`git worktree remove --force`) at the end of this session. No writes were made to `feat/pacotes-avancados`, `worktree-agent-a7981ed2a2bc24902`, or any shared branch. This report is written into this Verifier's own assigned worktree because tooling restricts writes to that path; it should be copied/merged into the real checkout's `.specs/features/hub-selecao-jogos/validation.md`.

**Correction to round 1's notes**: round 1 additionally reported writing directly to "the main repository working copy" at `C:\Users\Lokom\Documents\github\Resenha`. This round did not touch that path at all — everything happened in disposable scratch worktrees, per the letter of the task's isolation instruction.

**On `tasks.md`'s "Fix Tasks (Verifier Round 1)" section**: the round-2 task briefing referenced this section as being "at the bottom" of `tasks.md`. It does not exist — `tasks.md` at `3ecda61` ends at "Test Co-location Validation" (last touched by commit `38ed93a`, before the fix commit `3ecda61`). The actual fix was tracked only via the fix commit's message and round 1's `validation.md` Fix Plan section (Fix 1), not a dedicated tasks.md section. This is a minor process gap (the fix wasn't logged back into tasks.md as its own entry) but does not block this verification — the fix commit's diff is self-explanatory and directly traceable to round 1's Fix 1 plan.

---

## Round-1 Recap (for context)

Round 1 found 13/14 ACs passing, with a genuine coverage gap at HUB-12: `trocarJogo`'s broadcast-to-other-players behavior was only unit-tested via direct `projetar()` calls in `despacho.test.ts`, never exercised through `sala-do.ts`'s real `confirmar()`/`difundir()` machinery over a live WebSocket with a second connected player. A discrimination-sensor mutation (removing the `if (jogo === null) return` guard in `confirmar()`) survived the full `test:integration` suite (84/84 still passed), confirming the gap empirically.

---

## Round 2: Re-Verification of the Fix

### Fix commit under review

`3ecda617e115ea60c5699ddf9e12cee2652c48a5` — adds two tests to `server/core/sala-do.integration.test.ts`, inside the existing `describe('registro de jogos (\`HUB-01\`, \`HUB-05\`, \`HUB-12\`)', ...)` block:

1. **`trocarJogo aceito difunde o jogoId e a config resetada pra todo jogador conectado (HUB-12)`** — two players (Ana, Bruno) join a lobby; Ana (host) sets a non-default `config.tempoTurnoSeg`; the sala's `jogoId` is force-set to a fake value via `runInDurableObject` so the upcoming `trocarJogo` is non-idempotent (`HUB-09` doesn't short-circuit it); Ana sends `{t:'trocarJogo', jogoId:'quem-sou-eu'}`; the test then asserts on **Bruno's** projection (`ultimaProjecao(bruno).sala.jogoId` and `.config.tempoTurnoSeg`) without Bruno having sent anything.
2. **`jogo ausente do registro falha fechado: comando ainda é aceito, só a difusão daquele ciclo é pulada (Edge Case)`** — forces `sala.jogoId` to a value absent from the registry, sends a `chat` command, and asserts the command is still accepted (persisted to storage, no error message, socket stays open, a subsequent command still works).

### HUB-12: does the new broadcast test genuinely prove it?

**Yes.** I read the test directly (see excerpt above) and confirm:
- It drives the scenario through the real production path: `mandar(ana, {t:'trocarJogo', ...})` → `webSocketMessage` → `despachar`/`executar` → `this.confirmar(sala)` → `difundir(this.ctx, ...)` — the exact `confirmar()`/`difundir()` machinery round 1 found untested.
- It asserts on **Bruno's** received projection, not Ana's — Bruno never calls `mandar`, so any update he sees can only have arrived via server-initiated broadcast, not a response to his own request.
- It sets up a non-default `config` beforehand and a non-idempotent `jogoId` transition, so the assertions (`jogoId === 'quem-sou-eu'`, `config.tempoTurnoSeg === null`) genuinely distinguish "broadcast happened and reset config" from "nothing happened" or "stale projection."

This closes round 1's HUB-12 gap. HUB-12 is now **✅ Verified** at the integration layer, not just unit-tested.

### Discrimination Sensor: re-run on the same 3 mutations

All three mutations were applied in disposable scratch worktrees (`git worktree add --detach`), never the real tree.

| # | File:line | Description | Result |
| - | --------- | ------------ | ------ |
| 1 | `server/core/despacho.ts:251` | Flipped `trocarJogo` idempotency check `jogoId === sala.jogoId` → `jogoId !== sala.jogoId` (HUB-09) | ✅ **Killed** — `despacho.test.ts`: 3 tests failed (idempotency, config-reset, projection-reflects-troca) |
| 2 | `server/core/despacho.ts:246` | Flipped `trocarJogo` host check `autor.id !== sala.hostId` → `autor.id === sala.hostId` (HUB-10) | ✅ **Killed** — `despacho.test.ts`: 6 tests failed |
| 3 | `server/core/sala-do.ts:335-336` | Removed the `if (jogo === null) return` guard in `confirmar()` before `difundir()` calls `jogo.projetar(...)` | See detailed analysis below |

#### Mutation #3 — detailed investigation

**Runtime test suite alone**: Reproduced the author's claim exactly. Running the full `test:integration` suite (`npx vitest run --config vitest.integration.config.ts`) against the mutant: **all 31 tests in `sala-do.integration.test.ts` still passed**, including both new HUB-12/Edge-Case-4 tests. The runtime logs an `uncaught exception` twice (once per `mandar`/`assentar` cycle in the "jogo ausente" test) — `TypeError: Cannot read properties of null (reading 'projetar')` at `sala-do.ts:338`, propagating through `difundir` → `confirmar` → `webSocketMessage` — but this is printed by the `workerd`/`vitest-pool-workers` process to the test runner's console, not surfaced to any application-level assertion.

**Independent probe** (added a throwaway test, not committed, to check for signals beyond `readyState`): listened for `close` and `error` events on the client-side `ws`, and inspected `state.getWebSockets()` from inside the Durable Object via `runInDurableObject` after the crash. Result:
- `close` event: **not fired**
- `error` event: **not fired**
- Client-side `ana.ws.readyState`: `1` (`OPEN`)
- Server-side socket (`state.getWebSockets()[0].readyState`): also `1` (`OPEN`)
- The chat message that triggered the crash was still persisted to storage (the crash happens in `difundir`, which runs *after* `persistir(sala)` in `confirmar()` — state-mutating work already completed by the time the exception fires)
- A follow-up command on the same connection still succeeds

So (a) the author's claim holds up exactly as described — I independently confirmed it with an additional signal (close/error events) they hadn't tried, and it also came back negative — and (b) no observable client-side or DO-internal-state signal exists in this harness that a test could assert on.

**What I found that changes the verdict**: `npm run typecheck` **does** catch this mutation. `jogoAtual()` is typed `JogoDaSala<unknown> | null`; both `tsconfig.json` and `tsconfig.server.json` have `"strict": true`. With the guard removed, `tsc -p tsconfig.server.json --noEmit` fails with:
```
server/core/sala-do.ts(338,24): error TS18047: 'jogo' is possibly 'null'.
```
This is the **only** typecheck error the mutation introduces (verified by copying `worker-configuration.d.ts` into the mutant worktree to eliminate unrelated missing-types noise from not re-running `wrangler types`, then re-running typecheck — one clean, on-target error remained). `npm run typecheck` is the **first** command in every Gate Check level defined in `tasks.md` (`Quick`, `Full`, and `Build` all start with it), chained with `&&`, so a real CI run or local gate check would fail before the test suite even executes.

**Verdict on mutation #3**: ✅ **Killed** — not by a dedicated runtime test, but by the project's own mandatory gate command (`npm run typecheck`, required at every gate level per `tasks.md`). I'm treating "killed by the declared gate" as equivalent to "killed by the discrimination sensor" here, because the sensor's purpose is to prove a regression would be caught by this project's actual verification process — and it would be, deterministically, before a PR could even reach the test-running stage. This is arguably a *stronger* guarantee than a runtime integration test: it fails at write-time for anyone with an editor running `tsc`, not just at test-run-time, and can't be accidentally skipped the way a specific test file could be.

**Independent judgment on the three options posed**:
- (a) Does the author's "swallowed silently, no observable signal" claim hold up? **Yes**, fully — I reproduced it and extended the check to `close`/`error` events and DO-side socket state, all negative.
- (b) Is there an observable signal I found that they missed? Not at the *runtime/integration-test* layer — I checked the two most likely candidates (WS close/error, DO internal state) and both came back negative, same as their `readyState` check. But I did find a signal at a *different* layer: `npm run typecheck`, which is not "unobservable" — it's a hard compile error, currently required by every gate level in this feature's own `tasks.md`.
- (c) Should this be accepted as a documented residual limitation? **My call: yes, but reframed** — not as "we can't test this and are shipping blind" (round 1's framing), but as "this specific class of regression (dereferencing a `T | null` without narrowing) is already caught deterministically by the project's `strict: true` TypeScript gate, so a dedicated runtime test would be redundant defense-in-depth, not the only defense." I am not requiring a new test for this. I'd note it in `tasks.md`/`design.md` as an explicit rationale (see Fix Plan below, now closed) so a future verifier doesn't re-open this as a live gap without re-deriving the typecheck evidence themselves.

**Sensor result**: 3/3 mutations killed (2 by tests, 1 by the mandatory typecheck gate) — ✅ **PASS**.

---

## Spec-Anchored Acceptance Criteria (updated)

Round 1's table for HUB-01–HUB-11, HUB-13, HUB-14 is unchanged and re-confirmed by re-reading the relevant files at `3ecda61` (no changes to those files between `38ed93a` and `3ecda61` — only test file + spec docs changed). Full detail in round 1's report (superseded content below for HUB-12 only):

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| HUB-12: troca aceita → reflete `jogoId`/`config` na projeção de **todos os jogadores conectados**, imediatamente | Broadcast to every connected socket via `confirmar()` | `server/core/sala-do.integration.test.ts:611-637` — `trocarJogo aceito difunde o jogoId e a config resetada pra todo jogador conectado (HUB-12)`: Bruno's projection updates to the new `jogoId`/reset `config` without Bruno sending anything | ✅ **PASS** (integration-level, drives real `confirmar()`/`difundir()`) |

**Status**: ✅ **All 14/14 ACs now covered**, including HUB-12 at the correct layer.

---

## Edge Cases (updated)

- [x] Edge case 4 (jogo removido do registro depois de deploy): now integration-tested at the `sala-do.ts` DO-shell layer via `jogo ausente do registro falha fechado...` (`sala-do.integration.test.ts:639-666`) — confirms the command is still accepted/persisted, no exception surfaces to the client, and the sala keeps responding to subsequent commands. The one call site this test doesn't directly exercise via WebSocket (`entrarNaSala`'s and `alarm()`'s own `jogoAtual() ?? null` guards, which share the same pattern but are separate call sites) remain unit-tested only (`despacho.test.ts`) — same as round 1, not re-flagged as a new gap since the underlying pattern (typed `| null`, `strict: true`) is uniformly protected by typecheck at all three call sites, not just `confirmar()`'s.

All other edge cases unchanged from round 1 (still ✅).

---

## Gate Check (re-run, round 2)

- **Gate command**: `npm run typecheck && npm run test:unit -- --run`, then `npx vitest run --config vitest.integration.config.ts` (per `tasks.md`'s Gate Check Commands / `package.json` scripts — `test:integration` is `vitest run --config vitest.integration.config.ts`).
- **typecheck**: ✅ PASS (0 errors) on the unmutated `3ecda61` checkout.
- **test:unit**: ✅ 495 passed, 0 failed (18 test files).
- **test:integration**: ✅ 86 passed, 0 failed (6 test files) — delta of **+2** over round 1's 84, matching exactly the two new tests in the fix commit.
- **lint**: 8 errors / 2 warnings, all in files untouched by this feature (`client/src/sons.ts`, `client/src/sons.test.ts`, `client/src/telas/Jogo.tsx`, `scripts/seed-pacotes.ts`) — same pre-existing, unrelated debt round 1 identified. Zero lint issues in any `hub-selecao-jogos`-touched file.
- **Skipped tests**: none.
- **Failures**: none at `3ecda61`.

---

## Fix Plans

### Fix 1 (round 1) — Status: ✅ Closed

HUB-12's missing DO-shell integration coverage is resolved by the new `trocarJogo aceito difunde...` test. Confirmed by direct code reading (not just trusting the commit message) that it exercises the real `confirmar()`/`difundir()` path with a passive second player.

### No new fix required for mutation #3 / Edge Case 4

Recorded as a documented, accepted limitation of the runtime-test layer for this specific defect class, with the mitigating evidence (typecheck catches it deterministically) captured above. No action item — closing this out rather than routing another fix→re-verify iteration, since requiring a runtime test to catch something the type system already catches at write-time would be redundant test-writing effort with no corresponding risk reduction for this codebase (`strict: true` is enforced project-wide, not opt-in per file).

---

## Requirement Traceability

| Requirement | Round 1 Status | Round 2 Status |
| --- | --- | --- |
| HUB-01 | ✅ Verified | ✅ Verified |
| HUB-02 | ✅ Verified | ✅ Verified |
| HUB-03 | ✅ Verified | ✅ Verified |
| HUB-04 | ✅ Verified | ✅ Verified |
| HUB-05 | ✅ Verified | ✅ Verified |
| HUB-06 | ✅ Verified | ✅ Verified |
| HUB-07 | ✅ Verified | ✅ Verified |
| HUB-08 | ✅ Verified | ✅ Verified |
| HUB-09 | ✅ Verified | ✅ Verified |
| HUB-10 | ✅ Verified | ✅ Verified |
| HUB-11 | ✅ Verified | ✅ Verified |
| HUB-12 | ❌ Needs Fix | ✅ **Verified** (fixed) |
| HUB-13 | ✅ Verified (code review) | ✅ Verified (code review) |
| HUB-14 | ✅ Verified (code review) | ✅ Verified (code review) |

---

## Summary

**Overall**: ✅ **PASS** — feature fully verified, no open gaps.

**Spec-anchored check**: 14/14 ACs matched spec-defined outcomes, all at the correct test layer.
**Sensor**: 3/3 mutations killed — 2 by dedicated unit tests, 1 (the round-1 survivor) by the project's mandatory `npm run typecheck` gate, independently re-verified with a clean, on-target `TS18047` error and no other observable signal in the integration harness (close/error events and DO-internal socket state both checked and negative).
**Gate**: typecheck/test:unit/test:integration all green; lint clean for feature files (pre-existing unrelated debt elsewhere, unchanged from round 1).

**What changed since round 1**: One fix commit (`3ecda61`) added exactly the two tests round 1's Fix Plan asked for. Both were read in full and confirmed to genuinely exercise the previously-untested code paths (real WebSocket broadcast to a passive second player; fail-closed behavior with a registry-missing `jogoId`), not just re-assert what unit tests already covered.

**Judgment call exercised this round**: the round-1 surviving mutant (null-guard removal in `confirmar()`) still isn't caught by any *runtime* test after the fix, and won't be without a bespoke test-only registry-injection seam the team explicitly chose not to build (per round 1's Fix 1 plan, which only asked for the two tests that were in fact added — not a third one for this exact mutation). Rather than routing a third fix iteration for it, I independently verified that `npm run typecheck` — a mandatory step in every gate level this feature's own `tasks.md` defines — catches this exact mutation with a precise, on-target strict-null-check error. I'm treating that as sufficient discrimination-sensor coverage: the regression is caught deterministically by the project's actual verification process, just at a different stage than a `.test.ts` file. This is not lowering the bar — it's recognizing the bar was already met by a mechanism the original sensor design didn't check for (mutation-vs-tests-only, not mutation-vs-full-gate).

**Next steps**: None required. Feature is ready to be marked Verified in `spec.md`'s Requirement Traceability table (all 14 `HUB-NN` rows).
