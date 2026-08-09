# Pacotes Avançados e Feedback Expressivo — Validation

**Date**: 2026-08-09
**Spec**: `.specs/features/pacotes-avancados/spec.md`
**Diff range**: `ed23c959d3ce025b6ddc727373fb7eecf5b85451..HEAD` (branch `feat/pacotes-avancados`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `shared/**/*.test.ts` in `vitest.config.ts` include |
| T2 | ✅ Done | `shared/pacotes-dados.ts` exists, old server path removed; import sites in `despacho.ts`/`regras.ts` updated — **`scripts/seed-pacotes.ts` was missed** (see Gap 1) |
| T3 | ✅ Done | `shared/pacotes.ts` + `shared/pacotes.test.ts`, 8 tests |
| T4 | ✅ Done | `Config.pacoteIds`, `Config.dificuldades`, `Projecao.sala.pacotesSelecionados` in `shared/protocolo.ts` |
| T5 | ✅ Done | 150/50/50/50 per package confirmed programmatically (see Special Audit §1) |
| T6 | ✅ Done | `buscarPacotes` in `despacho.ts:209-226`, tested `despacho.test.ts:712-` |
| T7 | ✅ Done | `iniciarRodada` calls `montarPoolDeCartas`, tested `regras.test.ts:270-330` |
| T8 | ✅ Done | Server-side `dificuldades`/`pacoteIds` validation, `despacho.test.ts:413-481` |
| T9 | ✅ Done | `projecao.ts` projects `pacotesSelecionados` array, `projecao.test.ts:312-350` |
| T10 | ✅ Done | `Modal.tsx` `largura` prop, `Modal.tsx:13,30,55` |
| T11 | ✅ Done | `.pacote-grid` 2/3/5 cols, `index.css:193-194` |
| T12 | ✅ Done | Multi-select checkbox cards, `Lobby.tsx:462-493` |
| T13 | ✅ Done | Dificuldade toggles + last-one-blocked, `Lobby.tsx:421-435` |
| T14 | ✅ Done | "Ver cartas"/"Ver pacote", `Lobby.tsx:347-352, 466-471` |
| T15 | ✅ Done | Badge array mapping, `Jogo.tsx:101-105`, `Encerrada.tsx:28-32` |
| T16 | ✅ Done | `tocarClique`/`tocarEntrada`, `sons.ts:110-120`, tested `sons.test.ts:87-115` |
| T17 | ✅ Done | `Botao.tsx` click sound + `motion-safe:active:scale-[0.97]` |
| T18 | ✅ Done | `tocarEntrada()` on own `'entrou'` message, `conexao.tsx:121-133` |

All 18 tasks done. No blocked/partial tasks. One execution slip found in T2 (see Gap 1) not caught by its own "Done when" checklist, which said "any other import of `./pacotes-dados`" but missed the one outside `tsconfig` coverage.

---

## Spec-Anchored Acceptance Criteria

### P1: Dificuldade por carta

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | --------------------- | ------------------------ | ------ |
| `PKT2-01` seletor de dificuldade, 3 opções, todas marcadas por padrão | 3 toggles Fácil/Médio/Difícil, default = todas marcadas | `client/src/telas/Lobby.tsx:293,421-435` (`OPCOES_DE_DIFICULDADE`); default via `shared/protocolo.ts` `CONFIG_PADRAO.dificuldades` (used directly in `despacho.test.ts`) | ⚠️ Evidence gap (UI) — no component test renders/asserts 3 toggles or default-checked state; implementation matches spec by code reading |
| `PKT2-02` desmarcar dificuldade remove cartas do pool | pool reflete dificuldades ativas, refletido na projeção de todos | `shared/pacotes.test.ts:20-28` — `expect(montarPoolDeCartas([filmes], ['facil','medio'])).toEqual(['A','B'])`; server-side propagation via `projecao.test.ts:312-341` | ✅ PASS (domain logic); UI toggle → `configurar` send is evidence-gap (see PKT2-01) |
| `PKT2-03` última dificuldade não pode ser desmarcada, motivo exato | botão desabilitado com motivo `"Pelo menos um nível precisa estar marcado"` | `client/src/telas/Lobby.tsx:425,430` — `motivo={ehUltimaAtiva ? 'Pelo menos um nível precisa estar marcado' : undefined}` (exact string match to spec) | ⚠️ Evidence gap — no automated test; text matches spec exactly by code reading. Server-side defense-in-depth (empty `dificuldades` rejected) IS tested: `despacho.test.ts:414-427` — `expect(resultado).toEqual({ ok:false, erro:'COMANDO_INVALIDO' })` |
| `PKT2-04` não-host vê dificuldades somente-leitura | modo leitura, mesmo padrão de `PKT-06` | `client/src/telas/Lobby.tsx:586-591` (`<Leitura rotulo="Dificuldade" .../>`) | ⚠️ Evidence gap (UI, no test) |

### P1: Múltiplos pacotes na mesma partida

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | --------------------- | ------------------------ | ------ |
| `PKT2-05` checkbox multi-seleção de pacotes | marcar 2+ pacotes sem desmarcar os anteriores | `client/src/telas/Lobby.tsx:480-484` (toggle appends/filters `pacoteIds`, does not clear); server accepts array — `despacho.test.ts:459-480` `expect(sala.config).toEqual({...pacoteIds:['filmes','anime']...})` | ✅ PASS (server); ⚠️ evidence gap (client interaction) |
| `PKT2-06` pool = união deduplicada por texto | duas dificuldades/pacotes combinados, sem duplicar texto idêntico | `shared/pacotes.test.ts:37-46` — `expect(pool).toEqual(['Harry Potter'])` (single entry from 2 packages); end-to-end via `regras.test.ts:294-303` — `expect(cartasNaPartida.sort()).toEqual(['Matrix','Naruto'])` | ✅ PASS — outcome matches spec exactly, and traced through a real integration point (see Special Audit §2) |
| `PKT2-07` badge mostra todos os pacotes em `jogo`/`encerrada` | todos, não só o primeiro | `server/games/quem-sou-eu/projecao.test.ts:326-341` — `expect(projecao.sala.pacotesSelecionados).toEqual([{filmes...},{anime...}])`; client renders array via `.map()`, `Jogo.tsx:103-105`, `Encerrada.tsx:30-32` | ✅ PASS (data assembly tested; client mapping is a trivial render, code-read confirmed) |
| `PKT2-08` desmarcar pacote remove suas cartas do pool exibido antes de iniciar | refletido imediatamente | `shared/pacotes.test.ts` (pool recompute is pure/sync) + `client/src/telas/Lobby.tsx:323-326` (`poolAtual` recomputed every render from `config.pacoteIds`) | ⚠️ Evidence gap (UI) — no test simulates unchecking and re-reading `poolAtual`; logic is a pure recompute, low risk |
| `PKT2-09` nenhum pacote marcado → recusa iniciar, mesmo motivo de hoje | `PACOTE_NAO_ENCONTRADO` (existing error) | `server/core/despacho.test.ts:820-` — `it('recusa iniciar com pacoteIds vazio, mesmo motivo de hoje')`; code: `despacho.ts:249` `if (sala.config.pacoteIds.length === 0) return { ok:false, erro:'PACOTE_NAO_ENCONTRADO' }` | ✅ PASS |

### P1: Ver pacote

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | --------------------- | ------------------------ | ------ |
| `PKT2-10` "Ver cartas" no modal, filtra por dificuldades marcadas, mesmo pacote não selecionado | lista filtrada exibida | `client/src/telas/Lobby.tsx:466-471` — `cartasFiltradas = PACOTES.find(...).cartas.filter(c => config.dificuldades.includes(c.dificuldade))` computed for every candidate card regardless of `marcado` | ⚠️ Evidence gap (UI, no test) |
| `PKT2-11` botão "Ver pacote" no lobby, pool combinado atual | todos jogadores (host + não-host) | `client/src/telas/Lobby.tsx:348-352` — rendered outside any `souHost` guard | ⚠️ Evidence gap (UI, no test) |
| `PKT2-12` botão ausente em modo Livre / nenhum pacote | não exibido | `client/src/telas/Lobby.tsx:348` — `{config.modoPacote === 'pacote' && config.pacoteIds.length > 0 && (<Botao...>)}` | ⚠️ Evidence gap (UI, no test) — condition matches spec exactly by code reading |
| `PKT2-13` "Ver pacote" nunca indica quem tem qual carta | lista de possibilidades apenas | `client/src/telas/Lobby.tsx:323-326,361-368` — `poolAtual: string[]` derived only from `config.pacoteIds`/`config.dificuldades` + static `PACOTES`; no reference to `estado.cartas`/player-assignment data anywhere in the component | ✅ PASS — traced structurally (see Special Audit §4); zero automated test but the data flow makes the leak class of bug (`JOGO-02`) structurally impossible, same spirit as `AD-008` |

### P1: Grid de pacotes em desktop

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | --------------------- | ------------------------ | ------ |
| `PKT2-14` ≥1024px → 5 colunas | `grid-cols-5` at `lg:` (1024px) | `client/src/index.css:193-194` — `.pacote-grid { @apply grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5; }` (Tailwind `lg:` = 1024px) | ⚠️ Evidence gap — build-gate only (CSS, no visual regression test in repo); value matches spec exactly by inspection |
| `PKT2-15` 640–1023px → 3 colunas | `sm:grid-cols-3` (Tailwind `sm:` = 640px) | same line | ⚠️ Evidence gap (CSS, same as above) |
| `PKT2-16` <640px → 2 colunas | `grid-cols-2` default | same line | ⚠️ Evidence gap (CSS, same as above) |
| `PKT2-17` altura limitada à tela, rolagem interna, nunca horizontal | `max-h-full overflow-y-auto` no modal; `max-h-[60vh] overflow-y-auto` na lista | `client/src/componentes/Modal.tsx:55`; `client/src/telas/Lobby.tsx:361` | ⚠️ Evidence gap — no automated horizontal-scroll assertion; `VIS-01` convention followed by pattern-match to existing modals |

### P2: Conteúdo expandido dos pacotes

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | --------------------- | ------------------------ | ------ |
| `PKT2-18` 150 cartas por pacote, 50/50/50 | exatamente 150, 50 each | Verified programmatically, Special Audit §1 — all 10 packages `total=150 facil=50 medio=50 dificil=50` | ✅ PASS |
| `PKT2-19` nenhuma carta repetida dentro do pacote | 0 duplicates by `texto` | Special Audit §1 — `dup=0` all 10 packages | ✅ PASS |
| `PKT2-20` checkpoint de revisão antes do commit | aprovação explícita do dono antes do commit | `tasks.md` T5 log: "✅ Done — aprovado pelo usuário (com recalibração de itens 'expert'...)"; commit `3f42d72` is a single atomic content commit after that note | ✅ PASS (process evidence, not testable by assertion) |

### P1: Feedback sonoro e visual em interações

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | --------------------- | ------------------------ | ------ |
| `FBK-01` clique em botão habilitado toca som + micro-transição <150ms | som + `active:scale` que desfaz | `client/src/sons.test.ts:87-92` — `tocarClique(); expect(oscillator.start).toHaveBeenCalled()` (asserts sound plays); `Botao.tsx:34,49` — `if (!desabilitado) tocarClique()`, `motion-safe:active:scale-[0.97] ... duration-150` (Tailwind `duration-150` = exactly the spec's <150ms) | ✅ PASS (sound); ⚠️ evidence gap (visual transition itself, no component test) |
| `FBK-02` botão desabilitado não toca som nem transição | nenhum dos dois | **No test file exists for `Botao.tsx`** (confirmed: no `Botao.test.*` anywhere in repo) | ❌ GAP — evidence-or-zero: not asserted by any automated test, only implied by code reading (`Botao.tsx:33-36`: `aoClicar` checks `!desabilitado` before `tocarClique()`, and native `disabled` also blocks the click handler and the `active:` pseudo-class from firing at all) — see Special Audit §3 |
| `FBK-03` som de entrada distinto | timbre diferente dos demais | `client/src/sons.test.ts:101-107` — `tocarEntrada(); expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(523, ...)` (distinct freq from `tocarChatMensagem`=800, `tocarSuaVez`=440/660) | ✅ PASS |
| `FBK-04` som desativado → nenhum som novo toca | `somEstaAtivo() === false` → mudo | `sons.test.ts:94-99` (`tocarClique` silent when off), `sons.test.ts:109-114` (`tocarEntrada` silent when off) | ✅ PASS |
| `FBK-05` `prefers-reduced-motion: reduce` suprime transição visual, mantém som | visual off, som on | `Botao.tsx:49` — `motion-safe:active:scale-[0.97]` (Tailwind's `motion-safe:` variant is itself a `@media (prefers-reduced-motion: no-preference)` wrapper — semantically correct); sound path (`tocarClique`) has no `motionReduzido()` check, so it always plays regardless | ⚠️ Evidence gap — no automated test exercises `prefers-reduced-motion`; CSS mechanism is correct by inspection |

### Edge Cases

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | --------------------- | ------------------------ | ------ |
| `PKT2-21` pool combinado < jogadores ativos → recusa contando pool combinado | `PACOTE_INSUFICIENTE` | `regras.test.ts:305-316` — `expect(resultado).toEqual({ ok:false, erro:'PACOTE_INSUFICIENTE' })`, scenario built so neither package alone would trigger it, only the combined pool | ✅ PASS |
| `PKT2-22` desmarcar todos os pacotes = `pacoteIds: []` | sem cartas, sem iniciar | `despacho.test.ts:820-` (empty `pacoteIds` recusa); `pacotes.test.ts:57-59` (`montarPoolDeCartas([], [...]) === []`) | ✅ PASS |
| `PKT2-23` mesma carta em dificuldades diferentes entre pacotes → mantém 1ª ocorrência (ordem de `pacoteIds`) | dedup por ordem de entrada | `shared/pacotes.test.ts:48-55` — `expect(montarPoolDeCartas([livros, personagensFilmes], ['facil'])).toEqual(['Harry Potter'])` where only the 2nd package's difficulty passes the filter, proving first-occurrence-wins is about **iteration order of `pacotes`**, not which difficulty matched | ✅ PASS |
| `FBK-06` cliques em sequência rápida não travam/acumulam atraso | sons sobrepostos permitidos | No dedicated test; `tocarTom` creates a fresh `OscillatorNode`/`GainNode` per call (`sons.ts:56-71`), same pattern as `tocarAcertou`/`tocarTempoAcabando` (spec's own reference point), which are also untested for this specific property | ⚠️ Spec-precision gap — same untested property already exists for the sibling functions the spec cites as precedent; not a regression introduced by this feature |

**Status**: ❌ Gaps present — 1 clause (`FBK-02`) has zero automated evidence for the negative-case behavior the spec explicitly separates from `FBK-01`. 14 additional criteria are ⚠️ evidence gaps consistent with the project's pre-existing, pre-declared "no client component tests" convention (documented in this feature's own `tasks.md` Test Coverage Matrix, matching the state of every other feature in the repo) — these are not scope violations, but per evidence-or-zero they are not "covered," so they are listed honestly rather than silently passed.

---

## Special Audit (requested by project owner)

### 1. 150 cards/package, 50/50/50, no intra-package duplicates

Ran a throwaway `tsx` script (`scratch-check-pacotes.mjs`, deleted after use, not committed) importing `PACOTES` from `shared/pacotes-dados.ts` directly and counting per-package totals, per-difficulty counts, and `Set`-based duplicate detection on `texto`.

**Result**: all 10 packages (`filmes`, `anime`, `personagens-filmes`, `livros`, `futebol`, `jogos`, `personagens-jogos`, `series`, `musica`, `super-herois`) show `total=150 facil=50 medio=50 dificil=50 dup=0`. Confirms `PKT2-18`/`PKT2-19` exactly, programmatically, not by sampling.

### 2. `PKT2-06`/`PKT2-23` dedup exercised by a real integration point

Traced: `despacho.ts:251` `buscarPacotes(sala.config.pacoteIds, env)` → `despacho.ts:263` `jogo.iniciarRodada(ctx, ambiente, pacotes)` → `regras.ts:117` `montarPoolDeCartas(pacotes, ctx.config.dificuldades)` → result feeds `sortearCartasDoPacote`/`sortearOpcoesPorJogador` unchanged.

This exact path (not a mock of `montarPoolDeCartas`) is exercised by `regras.test.ts:270-330`, which calls the real `iniciarRodada` with two real `PacoteCompleto` objects (`pacoteA`/`pacoteB`, overlapping by difficulty but not by card text in this scenario) and asserts on `estado.cartas` — the actual dealt hand — not just the pool. This is a genuine integration-level exercise of the dedup path, not an isolated unit test of `montarPoolDeCartas` alone.

### 3. `FBK-02` (disabled buttons: no sound, no transition) — asserted or only implied?

**Only implied.** No test file exists for `Botao.tsx` anywhere in the repo (confirmed no `Botao.test.*`, no `client/src/componentes/*.test.*` touching it in the diff or pre-existing). The behavior is correctly implemented (`Botao.tsx:33-36`: `tocarClique()` is gated by `!desabilitado`, and the CSS active-scale class is only applied in the enabled branch of the ternary at line 49-51 — plus native HTML `disabled` buttons don't fire `click` at all, doubling the protection) — but this is exactly the "implemented correctly, forgotten in tests" pattern the audit asked to check for. Flagged as Gap 2 below.

### 4. "Ver pacote" (`PKT2-11`, `PKT2-13`) — does it leak who has which card?

Traced the full data flow for both entry points:
- **Lobby "Ver pacote"** (`Lobby.tsx:320-326`): `poolAtual = montarPoolDeCartas(PACOTES.filter(p => config.pacoteIds.includes(p.id)), config.dificuldades)` — inputs are only `config.pacoteIds`/`config.dificuldades` (host-set config, mirrored to all via `PKT-06`) and the static `PACOTES` data. Never touches `sala.jogo`, `estado.cartas`, `estado.atribuicoes`, or any per-player projection field.
- **Modal "Ver cartas"** (`Lobby.tsx:466-471`): same pattern — filters the static `PACOTES` array by `dificuldade`, no player data involved.

Neither code path has access to (or references) player-card assignment state at all — it's not that the leak is filtered out, it's that the inputs to the computation structurally cannot carry that information. This mirrors the intent of `AD-008` (no projection ever carries data a recipient shouldn't see) one level further upstream: the computation itself has no channel for the leak, so there's no filtering to get wrong.

---

## Discrimination Sensor

All three mutations were applied to the real files via `git checkout -- <file>`-reversible edits (working tree was clean before and after; no scratch worktree needed since a plain edit → test → `git checkout --` cycle is fully reversible and equally safe).

| # | File:line | Description | Killed? |
| - | --------- | ------------ | ------- |
| 1 | `shared/pacotes.ts:22` | Removed the `if (vistos.has(carta.texto)) continue` dedup guard in `montarPoolDeCartas` | ✅ Killed — `shared/pacotes.test.ts:45` failed: `expected ['Harry Potter','Harry Potter'] to deeply equal ['Harry Potter']` |
| 2 | `server/core/despacho.ts:195` | Removed the `\|\| parcial.dificuldades.length === 0` clause from `configValida` (the server-side "can't send empty `dificuldades`" guard, defense-in-depth for `PKT2-03`) | ✅ Killed — `despacho.test.ts:425` failed: got `{ ok:true, valor:{removidos:[]} }` instead of `{ ok:false, erro:'COMANDO_INVALIDO' }` |
| 3 | `server/games/quem-sou-eu/regras.ts:119` | Flipped `pool.length < ativos.length` → `pool.length <= ativos.length` (boundary mutation on `PKT2-21`'s insufficiency check) | ✅ Killed — `regras.test.ts:294` failed: `PACOTE_INSUFICIENTE` returned unexpectedly for a pool exactly equal to `ativos.length` |

**Sensor depth**: lightweight (3 targeted mutations)
**Result**: 3/3 killed — ✅ PASS. The tests genuinely discriminate on the three highest-risk pieces of new logic: cross-package dedup, server-side difficulty validation, and the combined-pool insufficiency boundary.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ — `montarPoolDeCartas` is the one new abstraction, and it's used by both client and server per design's Approach A |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ⚠️ — `scripts/seed-pacotes.ts` was NOT touched, but should have been (see Gap 1) |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — `montarPoolDeCartas` mirrors `sorteio.ts`'s pure-function style; `tocarClique`/`tocarEntrada` mirror the existing `tocarX()` molde |
| Would senior engineer approve? | ⚠️ — yes, modulo Gap 1 and the FBK-02 test gap |
| Tests map to acceptance criteria and are non-shallow (spot-check: `PKT2-06`/`PKT2-23` story) | ✅ — `pacotes.test.ts` and `regras.test.ts` assert exact array contents, not just "no crash" |
| Spec-anchored outcome check: each test's asserted value matches the spec-defined outcome (or gap flagged) | ✅ — see AC table above; every domain-layer test targets the exact spec outcome (specific error codes, specific array contents, exact motivo string) |
| Per-layer Coverage Expectation met: domain logic has 1:1 AC mapping; routes/e2e cover happy + edge + error paths for every route in scope | ✅ for domain/despacho layers; client UI layer is 0:1 by the Test Coverage Matrix's own (pre-declared) design, matching every other feature in the repo |
| Every test in scope maps to a spec AC, listed edge case, or Done-when criterion (no unclaimed tests) | ✅ — spot-checked `pacotes.test.ts`, `regras.test.ts` §270-330, `despacho.test.ts` §413-481/712-830, `projecao.test.ts` §312-350, `sons.test.ts` §87-115; no orphan assertions found |
| Documented project quality/testing guidelines followed | `tasks.md` Test Coverage Matrix (this feature's own document, generated from repo sampling since no `AGENTS.md`/`CONTRIBUTING.md` exists) — followed as written |

❌ One "No"-adjacent item: Gap 1 (file that should have been touched, wasn't).

---

## Edge Cases

- [x] `PKT2-21`: Handled correctly, tested at the integration point (not just the pure function)
- [x] `PKT2-22`: Handled correctly
- [x] `PKT2-23`: Handled correctly, dedup-priority order specifically exercised
- [ ] `FBK-06`: Not independently tested — same untested property as its cited precedent (`tocarAcertou`/`tocarTempoAcabando`), not a new gap introduced by this feature

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm test` (per `tasks.md` Gate Check Commands, Build level)
- **`npm run typecheck`**: ✅ 0 errors (both `tsconfig.json` and `tsconfig.server.json`)
- **`npm run lint`**: ❌ 8 errors / 2 warnings — **confirmed pre-existing** (verified by running the identical `npm run lint` against a clean `git worktree` checked out at the base commit `ed23c959d3ce025b6ddc727373fb7eecf5b85451`: byte-identical error list, same files, same lines). Out of scope per this task's instructions (only `18d9e72`/`94f1acb` are in-scope pre-existing fixes; this lint debt is separate and untouched by either).
- **`npm run test:unit`**: ✅ 482 passed, 0 failed (17 test files)
- **`npm run test:integration`**: ✅ 78 passed, 0 failed (6 test files) — no flaky-test re-run needed, `CONN-03`/rodízio test passed on first run
- **Test count before feature** (at `ed23c959d3ce025b6ddc727373fb7eecf5b85451`, i.e. after the in-scope `18d9e72`/`94f1acb` fixes): 452 unit tests
- **Test count after feature**: 482 unit tests + 78 integration = 560 total
- **Delta**: +30 unit tests (matches the predicted arithmetic: T1 +0, T3 +8, T6-T9 +18 [despacho.test.ts + regras.test.ts + projecao.test.ts new cases], T16 +4)
- **Skipped tests**: none
- **Failures**: none (lint failure is pre-existing, not a regression — see above)

---

## Fix Plans

### Fix 1: `scripts/seed-pacotes.ts` has a broken import after the `pacotes-dados.ts` move (T2 gap)

- **Root cause**: T2 moved `server/games/quem-sou-eu/pacotes-dados.ts` → `shared/pacotes-dados.ts` and updated the two import sites its own "Done when" checklist named (`despacho.ts`, `regras.ts`/`index.ts`), but `scripts/seed-pacotes.ts` still does `import { PACOTES } from '../server/games/quem-sou-eu/pacotes-dados'`. This file is outside both `tsconfig.json` and `tsconfig.server.json`'s `include`, so `npm run typecheck` never sees it; it has no test coverage; and its own pre-existing lint error (`Unexpected any`, line 15) masked the fact that it's *also* now unresolvable at runtime. Confirmed by running it directly: `npx tsx scripts/seed-pacotes.ts` → `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...server\games\quem-sou-eu\pacotes-dados'`.
- **Impact**: Low — the script isn't wired into any `package.json` script and isn't part of CI, so it doesn't block anything today. But it's a real regression (the tool is unusable as-is) and a silent one, since none of the three gate layers (typecheck/lint/test) can catch a broken import in a file outside their `include`.
- **Fix task**: Update `scripts/seed-pacotes.ts:3` to `import { PACOTES } from '../shared/pacotes-dados'`. One-line change.
- **Verify**: `npx tsx scripts/seed-pacotes.ts` (or whatever its actual invocation/flags are) runs without `ERR_MODULE_NOT_FOUND`.
- **Priority**: Minor (no user-facing or CI impact today, but it's dead-tool rot that will confuse the next person who reaches for the seed script)

### Fix 2: `FBK-02` has no automated test evidence

- **Root cause**: The repo has zero React component test infrastructure (no `@testing-library/react`, no `Botao.test.*` pattern anywhere), and this feature's own `tasks.md` Test Coverage Matrix explicitly scoped all client-UI work to "build gate only." That's a legitimate, pre-declared project-wide convention, not something this feature invented — but it does mean the specific clause the spec calls out separately from `FBK-01` (disabled → *no* sound/transition) has never been exercised by a test, only by code reading.
- **Impact**: Low today (the implementation is correct: `!desabilitado` guard + native `disabled` blocking `click` entirely is a doubly-safe pattern) but this is precisely the kind of behavior that regresses silently on a future refactor of `Botao.tsx`, since nothing would fail.
- **Fix task**: Either (a) add minimal component-test infrastructure (e.g. `@testing-library/react` + `jsdom`, scoped to just `Botao.tsx` as a pilot) and assert `fireEvent.click` on a disabled `Botao` does not call a `tocarClique` mock, or (b) if the project intentionally wants to stay test-infra-free for UI, explicitly note in `tasks.md`/`STATE.md` that `FBK-02`/`PKT2-01`/`PKT2-03`-through-`PKT2-17`/`FBK-05` are manually-verified-only ACs, so future verifiers don't need to re-discover this each time.
- **Priority**: Minor — informational/process fix, not a functional defect present today.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| PKT2-01 | Implementing | ⚠️ Verified (evidence gap, UI) |
| PKT2-02 | Implementing | ✅ Verified |
| PKT2-03 | Implementing | ⚠️ Verified (evidence gap, UI; server defense-in-depth tested) |
| PKT2-04 | Implementing | ⚠️ Verified (evidence gap, UI) |
| PKT2-05 | Implementing | ✅ Verified (server); ⚠️ evidence gap (client) |
| PKT2-06 | Implementing | ✅ Verified |
| PKT2-07 | Implementing | ✅ Verified |
| PKT2-08 | Implementing | ⚠️ Verified (evidence gap, UI) |
| PKT2-09 | Implementing | ✅ Verified |
| PKT2-10 | Implementing | ⚠️ Verified (evidence gap, UI) |
| PKT2-11 | Implementing | ⚠️ Verified (evidence gap, UI) |
| PKT2-12 | Implementing | ⚠️ Verified (evidence gap, UI) |
| PKT2-13 | Implementing | ✅ Verified (structural evidence) |
| PKT2-14 | Implementing | ⚠️ Verified (evidence gap, CSS) |
| PKT2-15 | Implementing | ⚠️ Verified (evidence gap, CSS) |
| PKT2-16 | Implementing | ⚠️ Verified (evidence gap, CSS) |
| PKT2-17 | Implementing | ⚠️ Verified (evidence gap, CSS) |
| PKT2-18 | Implementing | ✅ Verified |
| PKT2-19 | Implementing | ✅ Verified |
| PKT2-20 | Implementing | ✅ Verified |
| FBK-01 | Implementing | ✅ Verified (sound); ⚠️ evidence gap (visual) |
| FBK-02 | Implementing | ❌ Needs Fix (no automated evidence) |
| FBK-03 | Implementing | ✅ Verified |
| FBK-04 | Implementing | ✅ Verified |
| FBK-05 | Implementing | ⚠️ Verified (evidence gap) |
| PKT2-21 | Implementing | ✅ Verified |
| PKT2-22 | Implementing | ✅ Verified |
| PKT2-23 | Implementing | ✅ Verified |
| FBK-06 | Implementing | ⚠️ Verified (spec-precision gap, matches precedent) |

---

## Summary

**Overall**: ⚠️ Issues — the domain/server layer (the MVP-critical logic: dedup, difficulty filtering, pool-insufficiency, validation, projection) is solidly tested, spec-anchored, and mutation-resistant. The gaps are concentrated in the client-UI layer, which the feature's own Tasks phase pre-declared as build-gate-only (consistent with the whole repo having zero component-test infrastructure) — that's a known trade-off, not a surprise. Two concrete, fixable issues were found: a broken import in an unwired dev script (Fix 1), and zero automated evidence for `FBK-02`'s negative case specifically (Fix 2), which the project owner's own audit request flagged as worth checking.

**Spec-anchored check**: 15/29 ACs matched spec outcome with direct automated evidence; 13/29 flagged as evidence gaps (client UI/CSS layer, consistent with pre-declared project convention); 1/29 (`FBK-02`) is a genuine gap worth a fix task.

**Sensor**: 3/3 mutations killed

**Gate**: 560 passed (482 unit + 78 integration), 0 failed; typecheck clean; lint pre-existing-only failures (verified byte-identical against base commit, out of scope)

**What works**: Content generation (150/50/50/50 × 10, zero dupes, checkpoint-approved), cross-package dedup with correct first-occurrence priority, combined-pool insufficiency check using the *combined* count, server-side defense-in-depth validation, projection of all selected packages (not just first), and the "Ver pacote" data flow is structurally incapable of leaking per-player card assignments (traced end-to-end for both entry points).

**Issues found**:
1. `scripts/seed-pacotes.ts:3` — broken import after the T2 file move, invisible to typecheck/lint/test because the script sits outside every gate's scope. Fix: update the import path.
2. `FBK-02` — the "disabled button stays silent" clause has zero automated test evidence, only code-reading confirmation. Fix: either add a minimal component test or explicitly document this AC (and its 12 UI-layer siblings) as manually-verified-only in `tasks.md`/`STATE.md`.

**Next steps**: Both fixes are Minor severity and don't block shipping — recommend a follow-up task rather than blocking this feature's merge. If the fix→re-verify loop is invoked, Fix 1 is a one-line change; Fix 2 is either a documentation update (fast) or a test-infra investment (slower, and a decision bigger than this feature — worth a `STATE.md` decision record either way, given `PKT2-01`/`03`/`04`/`08`/`10`-`17`/`FBK-01(visual)`/`FBK-05` share the same gap class).
