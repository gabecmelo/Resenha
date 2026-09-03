# Funil no Worker — Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/funil-do-worker/spec.md`
**Diff range**: `d000355..HEAD` (4 commits, branch `feat/funil-do-worker`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `analytics_engine_datasets` binding `FUNIL`/`resenha_funil` in `wrangler.jsonc:31-42`; `worker-configuration.d.ts:6` regenerated with `FUNIL: AnalyticsEngineDataset` (required). |
| T2   | ✅ Done | `server/core/funil.ts` — `EventoDeFunil`, `eventoDaTransicao`, `pontoDoFunil`, with `funil.test.ts`. |
| T3   | ✅ Done | `registrar()` fire-and-forget, silent without binding, with tests. |
| T4   | ✅ Done | `sala_criada` in `criar()` (`sala-do.ts:141`), `jogador_entrou` in `entrarNaSala()` (`sala-do.ts:301-306`). |
| T5   | ⚠️ Partial | Phase transitions hooked in `confirmar()`, called from all 5 sites that mutate room state. But the **timeout-expiration path in `alarm()`** (`CONN-07`/`CONN-08`) calls `expirar()` and returns *before* `confirmar()` is ever reached — see FUN-04 gap below. |
| T6   | ✅ Done | `docs/FUNIL.md` — SQL queries for the four events. |

---

## Spec-Anchored Acceptance Criteria

| ID | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------- | --------------------- | ------------------------ | ------ |
| FUN-01 | Sala criada emite `sala_criada` com `jogoId`; colisão (409) não emite | event `{t:'sala_criada', jogoId}` written once per successful create, none on 409 | `server/core/sala-do.ts:117` (409 returns before `registrar` at line 141) + `server/core/funil.integration.test.ts:102-106` — `expect(resumo()).toEqual(['sala_criada:quem-sou-eu:0'])` | ✅ PASS |
| FUN-02 | Entrada aceita emite `jogador_entrou` com posição de chegada (1 = criador); recusada não emite | `ordem` = `sala.jogadores.length` after insertion | `server/core/sala-do.ts:299-305` (`registrar(..., ordem: sala.jogadores.length, ...)`) + `funil.integration.test.ts:108-119` — `expect(resumo()).toEqual(['sala_criada:...:0','jogador_entrou:...:1','jogador_entrou:...:2'])`; refusal: `funil.integration.test.ts:121-132` — `expect(tipos().filter(t => t==='jogador_entrou')).toEqual(['jogador_entrou'])` (only Ana's, not the rejected duplicate) | ✅ PASS |
| FUN-03 | `lobby→escrita` or `lobby→jogo` emits `partida_iniciada` with player count; no double count on `escrita→jogo` | exact transition set, `jogadores` = room size at transition | `server/core/funil.ts:46-48` + `funil.test.ts:62-76` (exhaustive product-of-phases assertion listing exactly the 5 emitting transitions) + `funil.integration.test.ts:134-155` (`partida_iniciada:quem-sou-eu:2`, and only once across `escrita→jogo`) | ✅ PASS |
| FUN-04 | Any phase → `encerrada` emits `partida_encerrada` with player count | exact outcome for every arrival at `encerrada` | `server/core/funil.ts:49-51` + `funil.test.ts:35-49` + `funil.integration.test.ts:157-167` (`partida_encerrada:quem-sou-eu:2`) — **covers only the explicit `encerrar` command path**. The timeout-expiration path (`alarm()`, `CONN-07`/`CONN-08`) calls `this.expirar()` (`server/core/sala-do.ts:239`) and `return`s — `confirmar()` is never reached, `sala.fase` never becomes `'encerrada'` (storage is simply wiped by `destruir()` in `server/core/estado.ts:30-32`), so `eventoDaTransicao` never runs and no `partida_encerrada` is ever written for a room that dies of inactivity instead of an explicit command. No test exercises this path. | ❌ GAP — see below |
| FUN-05 | No event carries apelido/id/token/IP/código de sala/chat; sala identified by opaque DO id | closed string universe: event type, `jogoId`, opaque DO id only | `server/core/funil.test.ts:117-140` (closed-set assertion) + `funil.integration.test.ts:169-183` (`strings.filter(s => s.includes('Ana')\|\|s.includes('Bruno'))` empty, `codigo` absent, single `indexes[0]` across the room) — **verified independently by reading all 3 call sites** (`sala-do.ts:141`, `sala-do.ts:299-305`, `sala-do.ts:349` via `confirmar`): all three pass `this.ctx.id.toString()` (opaque DO id, distinct from `sala.codigo`) as `salaId`, and `eventoDaTransicao`'s type signature (`funil.ts:42`) structurally restricts what it can read from `sala` to `jogoId` and `jogadores.length` even though the full `EstadoSala` is passed in — there is no code path from `apelido`, `tokenHash`, or `sala.codigo` into `pontoDoFunil`'s `blobs`/`indexes`. | ✅ PASS |
| FUN-06 | Fire-and-forget; telemetry failure/latency never blocks/delays/alters a game command | `registrar` never throws, never awaited | `server/core/funil.ts:94-105` (`try/catch` wraps the entire `pontoDoFunil` + `writeDataPoint` call; no `await` anywhere on `registrar`, confirmed by grep — none of the 3 call sites in `sala-do.ts` await it, and `registrar`'s return type is `void`, not `Promise<void>`) + `funil.test.ts:160-170` (throwing binding does not throw) + `funil.integration.test.ts:185-201` (gameplay reaches the `escrita` phase and no player receives an error, with a broken `writeDataPoint`) | ✅ PASS |
| FUN-07 | No binding configured ⇒ everything works, nothing written | `registrar` no-ops silently | `server/core/funil.ts:99` (`if (env.FUNIL === undefined) return`) + `funil.test.ts:156-158` — `expect(() => registrar({}, ...)).not.toThrow()`. Type note: `worker-configuration.d.ts:6` declares `FUNIL` **required** on `Env` (generated from `wrangler.jsonc`, which always configures the binding), while `registrar`'s parameter type (`funil.ts:95`) is structurally `{ FUNIL?: AnalyticsEngineDataset }` — narrower/optional. This is **not a type lie**: a required `Env` is still structurally assignable to the optional-field parameter type (TS widening), so real callers pass fine, and the looser param type is what lets `funil.test.ts:157` legally pass `{}`. It's deliberate defensive typing for the exact runtime case FUN-07 describes (a binding declared in config but absent at runtime, or a caller — like this test — that never had `Env` in the first place). | ✅ PASS |
| FUN-08 | Beta writes to a separate dataset from production | dataset name differs per environment | `wrangler.jsonc:31-42` — single (production) `analytics_engine_datasets` entry, `dataset: "resenha_funil"`. Confirmed no `beta` environment exists anywhere in `wrangler.jsonc` on this branch (`git diff d000355..HEAD -- wrangler.jsonc` shows only the top-level addition). | ⚠️ Spec-precision gap — **honest, pre-declared**: spec.md:68 and tasks.md:22 both register this as "Parcial — só produção; o ambiente `beta` não existe na `main`", attributing the missing half to the unmerged `feat/passa-e-joga` branch. The registration is accurate — verified the `beta` environment is genuinely absent from this branch's `wrangler.jsonc`. Not counted as a fresh gap. |
| FUN-09 | Transition→event decision lives in a pure module, testable without Worker/network | `funil.ts` has no Worker-runtime dependency beyond ambient `AnalyticsEngineDataPoint`/`AnalyticsEngineDataset` types | `server/core/funil.ts:1` — only import is `type Fase` from `shared/protocolo`; `eventoDaTransicao` and `pontoDoFunil` are pure functions of plain-object arguments. `funil.test.ts` runs under `vitest.config.ts` (plain unit config, no `cloudflare:test`/Worker runtime) — confirmed by `npm run test:unit` passing without hitting the Workers pool. | ✅ PASS |
| FUN-10 | `jogoId` crosses as opaque string; `core` stays ignorant of concrete games (`AD-002`) | no import from `server/games` | `server/core/funil.ts` — no import of anything under `games/`; `EventoDeFunil`'s `jogoId: string` fields are untyped strings. `git diff d000355..HEAD -- server/games shared` is empty — confirms no game rule and no shared-protocol change accompanies this feature. | ✅ PASS |

**Status**: ❌ Gap present (FUN-04 partial) — 8/10 ACs fully PASS, 1 pre-declared spec-precision gap (FUN-08, honest), 1 real coverage/implementation gap (FUN-04).

---

## Discrimination Sensor

All mutations injected one at a time into the real working tree, `npm run test:unit` (or `test:integration` for the `sala-do.ts` mutation) run, then reverted with `git checkout -- <file>`. `git status --porcelain` confirmed clean after each and at the end.

| # | File:line | Description | Killed? |
| - | --------- | ------------ | ------- |
| 1 | `server/core/funil.ts:44` | `if (antes === depois) return null` → `if (false) return null` (emit even on no-op transitions) | ✅ Killed — `funil.test.ts` "cala quando a fase não mudou" and the exhaustive product-of-phases test both fail (2 tests) |
| 2 | `server/core/funil.ts:46` | Removed the `lobby → escrita` branch (`depois === 'escrita' \|\|` deleted) | ✅ Killed — exhaustive product-of-phases test fails (`lobby->escrita:partida_iniciada` missing) |
| 3 | `server/core/funil.ts:46` | Added `escrita → jogo` to also emit `partida_iniciada` (double-count) | ✅ Killed — exhaustive product-of-phases test fails (`escrita->jogo:partida_iniciada` unexpected) |
| 4 | `server/core/funil.ts:79-83` | `quantidadeDe` forced to always `return 0` | ✅ Killed — `pontoDoFunil` "leva quantos jogadores em double2" test fails (`[1,5]`/`[1,4]` expected, got `[1,0]`) |
| 5 | `server/core/funil.ts:100-104` | Removed `try/catch` around `writeDataPoint` | ✅ Killed — `registrar` "engole o erro do binding" test fails (throw propagates) |
| 6 | `server/core/sala-do.ts:184-185` | Moved `const faseAntes = sala.fase` to **after** `await despachar(...)` in `webSocketMessage` (the single most important mutation — if this survives, the funnel goes silent for every phase transition triggered by a player command, with nothing to notice) | ✅ Killed — `funil.integration.test.ts`: 3 tests fail (`FUN-03` "partida que começa" gets `[]` events instead of `partida_iniciada`; "conta uma vez só" also `[]`; `FUN-04` encerramento assertion sees `jogador_entrou` instead of `partida_encerrada` as the last event) |

**Sensor depth**: lightweight (default tier) — 6 mutations, all targeting the highest-risk new code (transition-decision branching, quantity computation, error containment, and the `faseAntes`-before-`despachar` ordering flagged as critical in the verification brief).
**Result**: 6/6 killed — ✅ PASS

---

## Interactive UAT Results

Not performed — backend-only infrastructure feature (no UI changes; spec.md explicitly states "nenhuma tela muda"), per validate.md §3 automated checks suffice.

---

## Code Quality

| Principle | Status | Notes |
| --------- | ------ | ----- |
| No features beyond what was asked | ✅ | Scope matches T1-T6 exactly |
| No abstractions for single-use code | ✅ | `funil.ts` is flat, no premature generalization |
| No unnecessary "flexibility" added | ✅ | — |
| Only touched files required for task | ✅ | Diff limited to `server/core/{funil.ts,funil.test.ts,funil.integration.test.ts,sala-do.ts}`, `wrangler.jsonc`, `docs/FUNIL.md`, `.specs/**` |
| Didn't "improve" unrelated code | ✅ | `git diff d000355..HEAD -- server/games shared` is empty |
| Matches existing patterns/style | ✅ | Portuguese domain naming, comment style, AC-tag references consistent with rest of repo |
| Would senior engineer approve? | ⚠️ | Would flag the `alarm()` timeout-expiration gap (FUN-04) before merging |
| Tests map to acceptance criteria and are non-shallow | ✅ | Spot-checked FUN-03/FUN-05; assertions target exact values, not just "was called" |
| Spec-anchored outcome check | ✅ | See table above — asserted values match spec-defined outcomes for 9/10 ACs |
| Per-layer Coverage Expectation met | ⚠️ | Domain logic (`funil.ts`) has full 1:1 AC mapping; the DO integration layer (`sala-do.ts`) misses the alarm/timeout error path for FUN-04 |
| Every test maps to a spec AC — no unclaimed tests | ✅ | All tests in `funil.test.ts`/`funil.integration.test.ts` carry AC tags in their names |
| Documented guidelines followed | ✅ | `docs/FUNIL.md` present; project has no separate testing-guideline doc beyond `tasks.md`'s Test Coverage Matrix, which was followed |

---

## Edge Cases (from spec.md)

- [x] Colisão de código (409) não emite `sala_criada`
- [x] Entrada recusada (apelido repetido) não emite `jogador_entrou`
- [x] `escrita → jogo` não duplica `partida_iniciada`
- [x] `encerrada → lobby` / `jogo → lobby` ("jogar de novo") não emite nada
- [x] Binding ausente não quebra nada e não escreve nada
- [x] Binding presente mas quebrado (`writeDataPoint` lança) não quebra o jogo
- [ ] **Sala que expira por prazo vencido (`CONN-07`/`CONN-08`, sem comando de jogador) — NÃO emite `partida_encerrada`.** Not handled; not tested.

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- **Result**: all green — 0 typecheck errors, 0 lint errors, 613 unit tests passed, 96 integration tests passed, build succeeded (both `resenha` and `client` environments)
- **Test count before feature** (per tasks.md baseline on `main`): 597 unit (22 files), 88 integration
- **Test count after feature**: **613 unit (23 files)**, **96 integration (7 files)** — matches tasks.md's stated post-feature numbers exactly
- **Delta**: +16 unit, +8 integration
- **Lint**: 0 errors, 2 pre-existing warnings (`react-hooks/exhaustive-deps` in `client/src/telas/Jogo.tsx:90` and `:101`) — matches expected baseline, not introduced by this feature
- **Skipped tests**: none
- **Failures**: none (in the real working tree; failures listed above are from the discrimination sensor's throwaway mutations, all reverted)

---

## Fix Plans

### Fix 1: `alarm()` timeout-expiration never reaches the funnel, silently dropping `partida_encerrada` for FUN-04

- **Root cause**: `async alarm()` (`server/core/sala-do.ts:229-264`) branches early for `salaVazia`/`salaOciosa` timeouts: `if (devidos.includes('salaVazia') || devidos.includes('salaOciosa')) { await this.expirar(); return }` (lines 238-241). `expirar()` (`server/core/sala-do.ts:422-429`) closes sockets and calls `destruir(this.ctx.storage)`, which is `storage.deleteAll()` (`server/core/estado.ts:30-32`) — it never sets `sala.fase = 'encerrada'` and never calls `this.confirmar()`. So `eventoDaTransicao` is never invoked for a room that dies of inactivity rather than an explicit `encerrar` command, and no `partida_encerrada` point is ever written for that room. Given that `CONN-07`/`CONN-08` timeouts are a normal way for a real room's lifecycle to end (someone opens a room, nobody plays, it silently expires 30 min or 6 h later), this is a real hole in the funnel's denominator for `partida_encerrada`, not just a missing test.
- **Fix task**: In `alarm()`, before calling `this.expirar()` (or inside `expirar()`, passed the current `sala` and `faseAntes`), call `registrar(this.env, { t: 'partida_encerrada', jogoId: sala.jogoId, jogadores: sala.jogadores.length }, this.ctx.id.toString())` whenever `sala.fase !== 'encerrada'` at the moment of timeout-driven expiry (mirroring what `eventoDaTransicao(faseAntes, 'encerrada', sala)` would have produced, since the room is being destroyed rather than persisted through a normal phase transition). Add an integration test in `funil.integration.test.ts` that fast-forwards/triggers the DO alarm for `salaVazia` (or `salaOciosa`) with no commands sent and asserts a trailing `partida_encerrada:...` point is written.
- **Priority**: Major — this is the exact scenario the verification brief flagged as most likely to go unnoticed ("o funil pode ficar mudo sem ninguém notar"), and it is confirmed real: no test covers it, and the code path genuinely does not call `registrar`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ---------- |
| FUN-01 | Implementing | ✅ Verified |
| FUN-02 | Implementing | ✅ Verified |
| FUN-03 | Implementing | ✅ Verified |
| FUN-04 | Implementing | ❌ Needs Fix (timeout-expiration path) |
| FUN-05 | Implementing | ✅ Verified |
| FUN-06 | Implementing | ✅ Verified |
| FUN-07 | Implementing | ✅ Verified |
| FUN-08 | Implementing | ⚠️ Parcial (pre-declared, honest) — unchanged |
| FUN-09 | Implementing | ✅ Verified |
| FUN-10 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues — one confirmed functional gap (FUN-04 for the timeout-expiration path), everything else verified.

**Spec-anchored check**: 9/10 ACs matched spec outcome exactly; 1 pre-declared spec-precision gap (FUN-08, honestly registered, not a fresh finding).
**Sensor**: 6/6 mutations killed, including the highest-risk one (moving `faseAntes` capture after `despachar`).
**Gate**: all 5 commands passed — 613 unit / 96 integration tests, 0 lint errors, build clean.

**What works**: Event shape, transition logic, PII exclusion, fire-and-forget error containment, missing-binding tolerance, and the command-driven `encerrar` path for FUN-04 are all solidly implemented and covered by discriminating tests (verified by mutation, not just inspection).

**Issues found**: FUN-04 is silently unmet for rooms that expire via the `CONN-07`/`CONN-08` alarm timeout instead of an explicit `encerrar` command — see Fix 1 above.

**Next steps**: Route Fix 1 to an implementer; add the alarm-triggered `registrar` call and a covering integration test, then re-verify FUN-04 only (other 9 ACs need no re-check).
