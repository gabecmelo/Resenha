# Pacotes de Cartas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/pacotes-de-cartas/spec.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: package.json scripts (`test:unit`, `test:integration`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Regras / Sorteio (Domain) | unit | All branches; 1:1 to spec ACs; all listed edge cases | `server/**/*.test.ts` | `npm run test:unit` |
| Core / DO (Controller) | integration | All commands: happy + edge + error | `server/**/*.integration.test.ts` | `npm run test:integration` |
| Protocolo / Config / Dados | none | — (build gate only) | — | build gate only |
| Client UI | none | — (build gate only, no client tests exist) | — | build gate only |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with e2e/integration tests | `npm test` |
| Build | After phase completion or config/entity-only tasks | `npm run typecheck && npm run lint && npm test` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Protocol and Data Foundation

Define the shared types and static data.

```
T1 → T2
```

### Phase 2: KV Storage Setup

Configure KV and seed script.

```
T3 → T4
```

### Phase 3: Game Rules (Domain Logic)

Implement core package assignment and turn logic.

```
T5 → T6 → T7 → T8
```

### Phase 4: Core Integration

Integrate game logic with Durable Object.

```
T9 → T10 → T11
```

### Phase 5: Client UI - Setup and Lobby

Lobby UI for package selection.

```
T12 → T13 → T14
```

### Phase 6: Client UI - Gameplay

Writing, game, and end screens.

```
T15 → T16 → T17
```

---

## Task Breakdown

### T1: [Expand Protocol Types]

**What**: Update `shared/protocolo.ts` with package-related types (`ModoPacote`, `ModoDistribuicao`, `PacoteResumo`), expand `Config`, `Projecao`, and add new `CodigoErro` and command (`sortearOutras`).
**Where**: `shared/protocolo.ts`
**Depends on**: None
**Reuses**: Existing types
**Requirement**: PKT-01, PKT-15, PKT-18, PKT-23

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `ModoPacote` and `ModoDistribuicao` exported types created
- [ ] `Config` updated with `modoPacote`, `pacoteId`, `modoDistribuicao`
- [ ] `Projecao` updated with `sala.pacotesDisponiveis`, `sala.pacote`, `eu.opcoesPacote`, `eu.jaSorteouOutras`
- [ ] `CodigoErro` added: `PACOTE_NAO_ENCONTRADO`, `PACOTE_INDISPONIVEL`, `PACOTE_INSUFICIENTE`
- [ ] `Comando` updated with `{ t: 'sortearOutras' }`
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: 0 tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T2: [Create Static Pack Data]

**What**: Create static file `pacotes-dados.ts` with 10 predefined packages.
**Where**: `server/games/quem-sou-eu/pacotes-dados.ts`
**Depends on**: T1
**Reuses**: `PacoteResumo` type
**Requirement**: PKT-21, PKT-22

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] File exports array of 10 complete packages with id, emoji, nome, descricao, and cartas (40-60 items in PT-BR each).
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: 0 tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T3: [Configure KV in Wrangler]

**What**: Add KV binding for `PACOTES_KV`.
**Where**: `wrangler.jsonc`, `worker-configuration.d.ts`
**Depends on**: T1
**Reuses**: existing wrangler config
**Requirement**: PKT-18, PKT-19

**Tools**:
- MCP: `filesystem`, run_command
- Skill: NONE

**Done when**:
- [ ] `wrangler.jsonc` has `PACOTES_KV` binding.
- [ ] `worker-configuration.d.ts` updated with `PACOTES_KV: KVNamespace`.
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: 0 tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T4: [Create Seed Script]

**What**: Script to populate KV with static package data.
**Where**: `scripts/seed-pacotes.ts`
**Depends on**: T2, T3
**Reuses**: Node fetch API / wrangler CLI
**Requirement**: PKT-18, PKT-19

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Script reads from `pacotes-dados.ts` and writes summary to `pacotes:indice` and full packs to `pacote:{id}`.
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: 0 tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T5: [Implement Game Sorteio Functions]

**What**: Add functions to randomly pick unique cards and distribute options.
**Where**: `server/games/quem-sou-eu/sorteio.ts`, `server/games/quem-sou-eu/sorteio.test.ts`
**Depends on**: T1
**Reuses**: existing `aleatorio` logic
**Requirement**: PKT-08, PKT-11, PKT-13

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `sortearCartasDoPacote(cartas, n, aleatorio)` returns N unique cards.
- [ ] `sortearOpcoesPorJogador(cartas, jogadores, alvos, qtdOpcoes, aleatorio)` returns exclusive options per player.
- [ ] Handles edge case where cards are not enough for everyone to have N options (PKT-28).
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: Quick

---

### T6: [Update Game Rules State and Iniciar]

**What**: Expand `EstadoQuemSouEu` and update `iniciarRodada` to handle package modes.
**Where**: `server/games/quem-sou-eu/regras.ts`, `server/games/quem-sou-eu/regras.test.ts`
**Depends on**: T5
**Reuses**: `sorteio.ts`
**Requirement**: PKT-08, PKT-09, PKT-10, PKT-11

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `EstadoQuemSouEu` has package fields (`pacoteId`, `pacoteNome`, `pacoteEmoji`, `modoDistribuicao`, `opcoesPorJogador`, `jaSorteouOutras`).
- [ ] `iniciarRodada` accepts package context via new parameter or updated `ContextoDeSala`.
- [ ] If `automatica`: fills `cartas` uniquely and returns `faseSeguinte: 'jogo'` (skips writing).
- [ ] If `escolha`: populates `opcoesPorJogador` and returns state for `'escrita'`.
- [ ] Returns `PACOTE_INSUFICIENTE` error if not enough cards.
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: Quick

---

### T7: [Implement Game Rules Write & Sorteio]

**What**: Update `escreverCarta` and implement `sortearOutras` in reducer.
**Where**: `server/games/quem-sou-eu/regras.ts`, `server/games/quem-sou-eu/regras.test.ts`
**Depends on**: T6
**Reuses**: None
**Requirement**: PKT-14, PKT-15, PKT-16, PKT-33

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `escreverCarta` in `escolha` mode validates text is one of the player's options.
- [ ] `sortearOutras` command generates 5 new exclusive options, marks `jaSorteouOutras` as true, and fails if already true.
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: Quick

---

### T8: [Update Game Rules Projecao]

**What**: Update `projetar` to include package info.
**Where**: `server/games/quem-sou-eu/projecao.ts`, `server/games/quem-sou-eu/projecao.test.ts`
**Depends on**: T7
**Reuses**: None
**Requirement**: PKT-12, PKT-23, PKT-24, PKT-25

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `eu.opcoesPacote` projected in `escrita` phase if present.
- [ ] `eu.jaSorteouOutras` projected in `escrita` phase.
- [ ] `sala.pacote` projected if `estado.pacoteId` is present.
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: Quick

---

### T9: [Update Core Estado]

**What**: Ensure package config is saved to and loaded from DO state.
**Where**: `server/core/estado.ts`, `server/core/estado.integration.test.ts`
**Depends on**: T1
**Reuses**: None
**Requirement**: PKT-07

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `modoPacote`, `pacoteId`, `modoDistribuicao` from `Config` are parsed and stringified properly if required.
- [ ] Gate check passes: `npm run test:integration`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: integration
**Gate**: Full

---

### T10: [Update Core Sala DO for KV]

**What**: Integrate KV reads into Sala DO.
**Where**: `server/core/sala-do.ts`, `server/core/sala-do.integration.test.ts`
**Depends on**: T8, T9
**Reuses**: `PACOTES_KV`
**Requirement**: PKT-18, PKT-19, PKT-20, PKT-31

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `projetarSala` injects `pacotesDisponiveis` into projection by reading `pacotes:indice` from KV (cached).
- [ ] Gate check passes: `npm run test:integration`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: integration
**Gate**: Full

---

### T11: [Update Core Despacho]

**What**: Route commands and handle start game with package.
**Where**: `server/core/despacho.ts`, `server/core/despacho.test.ts`
**Depends on**: T10
**Reuses**: None
**Requirement**: PKT-07, PKT-19

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `sortearOutras` dispatched to game module.
- [ ] `iniciar` command reads full package from KV if `modoPacote === 'pacote'`, passes it to `iniciarRodada`.
- [ ] Handles `PACOTE_INDISPONIVEL` if KV fails.
- [ ] Gate check passes: `npm test`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: integration
**Gate**: Full

---

### T12: [Client CSS and Colors]

**What**: Add styles for package UI components.
**Where**: `client/src/index.css`
**Depends on**: None
**Reuses**: Existing Tailwind theme
**Requirement**: PKT-01, PKT-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Styles for `.pacote-grid`, `.pacote-card`, `.pacote-fantasma`, `.opcao-carta` added.
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T13: [Client Lobby Game Mode Selection]

**What**: Add game mode tabs and package list to Lobby.
**Where**: `client/src/telas/Lobby.tsx`
**Depends on**: T1, T12
**Reuses**: `Escolha`, `Botao`
**Requirement**: PKT-01, PKT-02, PKT-04, PKT-06

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Host sees "Livre", "Pacotes", "Personalizado" selection.
- [ ] "Pacotes" shows grid of `sala.pacotesDisponiveis`.
- [ ] "Personalizado" shows disabled ghost card with lock icon.
- [ ] Non-hosts see read-only mode and package name.
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T14: [Client Lobby Distribution Config]

**What**: Add distribution config when package is selected.
**Where**: `client/src/telas/Lobby.tsx`
**Depends on**: T13
**Reuses**: `Escolha`
**Requirement**: PKT-03, PKT-05, PKT-30

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] "Distribuição" choice ("Aleatória" / "Cada um escolhe") appears only when a package is selected.
- [ ] Switching back to "Livre" clears package and distribution config in `configurar` command.
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T15: [Client Escrita with Options]

**What**: Update Escrita screen to support selecting from options.
**Where**: `client/src/telas/Escrita.tsx`
**Depends on**: T1
**Reuses**: `Botao`
**Requirement**: PKT-12, PKT-14, PKT-15, PKT-16

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] If `eu.opcoesPacote` exists, render clickable option cards instead of text input.
- [ ] Selecting a card sets it as the draft.
- [ ] Render "Sortear outras" button, disabled if `eu.jaSorteouOutras`.
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T16: [Client Jogo and Encerrada Badge]

**What**: Show package badge during gameplay.
**Where**: `client/src/telas/Jogo.tsx`, `client/src/telas/Encerrada.tsx`, `client/src/componentes/BadgePacote.tsx` (new)
**Depends on**: T1
**Reuses**: `projecao.sala.pacote`
**Requirement**: PKT-23, PKT-24, PKT-25, PKT-26, PKT-27

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Reusable `BadgePacote` component created.
- [ ] `Jogo.tsx` displays badge if `sala.pacote` exists.
- [ ] `Encerrada.tsx` displays badge if `sala.pacote` exists.
- [ ] "Nova Partida" button preserves config (no client change needed if core preserves it, but verify flow).
- [ ] Gate check passes: `npm run typecheck`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: none
**Gate**: Build

---

### T17: [Final Verification]

**What**: Integration sanity check (manual test prompt)
**Where**: N/A
**Depends on**: T16
**Reuses**: None
**Requirement**: All

**Tools**:
- MCP: `none`
- Skill: NONE

**Done when**:
- [ ] Output instructions for manual verification.

**Tests**: none
**Gate**: Build

---

## Phase Execution Map

```
Phase 1: T1 ──→ T2
Phase 2: T3 ──→ T4
Phase 3: T5 ──→ T6 ──→ T7 ──→ T8
Phase 4: T9 ──→ T10 ──→ T11
Phase 5: T12 ──→ T13 ──→ T14
Phase 6: T15 ──→ T16 ──→ T17
```
