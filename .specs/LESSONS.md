# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — Quando um AC recusa a acao de um segundo ator sobre um estado ja ocupado, escreva um teste com dois atores distintos: o teste do mesmo ator repetindo a acao nao cobre essa guarda
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server/games` · harmful: 0
- features: quem-sou-eu
- evidence: validation.md sensor #6 — server/games/quem-sou-eu/regras.ts:354 (DESC-10) (server/games)
- last seen: 2026-08-04T14:44:34Z

### L-002 — Quando o contexto passado ao reducer nao carrega um campo que o AC manda preservar, cubra essa clausula com um teste na camada que possui o campo, em vez de dar o AC por coberto
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `server/core` · harmful: 0
- features: quem-sou-eu
- evidence: validation.md — FIM-04, ContextoDeSala em server/core/despacho.ts:279-285 nao carrega chat (server/core)
- last seen: 2026-08-04T14:44:45Z

### L-003 — Quando o AC diz que a recusa vai apenas ao autor, asserte tambem que os demais destinatarios nao receberam nada, nao so que o autor recebeu o erro
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `server/core` · harmful: 0
- features: quem-sou-eu
- evidence: validation.md — CHAT-02, clausula 'avisar apenas o autor' sem assercao (server/core)
- last seen: 2026-08-04T14:44:45Z

### L-004 — Requisito que atravessa servidor e tela precisa de uma task em cada camada: com a projecao decidindo (AD-008), a metade de servidor passa nos testes sem o comportamento chegar ao usuario
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tasks` · harmful: 0
- features: ajustes-uso-real
- evidence: validation.md obs.2 + spec.md:231 (AJU-33, AJU-34 nascidos no Execute) + tasks.md:542 (tasks)
- last seen: 2026-08-06T02:29:46Z

### L-005 — AC de aparencia ou de estado de tela precisa nomear o valor observavel que o cumpre (o rotulo exibido, a altura, o elemento renderizado), senao a camada L5 fica sem criterio verificavel
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `client` · harmful: 0
- features: ajustes-uso-real
- evidence: validation.md — AJU-05, AJU-27, AJU-29 sem resultado observavel definido (client)
- last seen: 2026-08-06T02:29:56Z

### L-006 — AC com duas clausulas so esta coberto quando as duas tem assercao propria: cobrir a clausula testavel e dar o AC por fechado esconde a outra
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `client` · harmful: 0
- features: ajustes-uso-real
- evidence: validation.md — AJU-23, clausula do cursor sem assercao (client)
- last seen: 2026-08-06T02:29:56Z

### L-007 — When a Durable-Object shell layer resolves an injected registry by key and guards a missing entry, add an integration test with a registry missing that key to prove the guard actually runs — a unit test on the pure resolver function alone does not exercise the shell's guard.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server/core` · harmful: 0
- features: hub-selecao-jogos
- evidence: server/core/sala-do.ts:333-339 (confirmar() null-guard mutation, validation.md Sensor #3) (server/core)
- last seen: 2026-08-12T14:57:33Z

### L-008 — When a command's spec-required outcome is broadcasting to every connected player, add an integration test that sends the command over a live connection with a second connected client and asserts that client's projection updates — a unit test that calls the projection function directly does not prove the broadcast path works.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `server/core` · harmful: 0
- features: hub-selecao-jogos
- evidence: HUB-12 (spec.md P2 AC7) — no evidence in sala-do.integration.test.ts (server/core)
- last seen: 2026-08-12T14:57:39Z

### L-009 — When a spec pins a majority/threshold calculation to a specific denominator (e.g. active players, not voters), add a test with partial turnout where the two denominators would diverge, not just full-turnout or coincidental-ratio cases.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server/games` · harmful: 0
- features: espiao
- evidence: server/games/espiao/regras.ts:281 (mutant survived unit suite) (server/games)
- last seen: 2026-08-13T22:22:37Z

### L-010 — When a spec's Out-of-Scope table narrows a phase's scope below what that phase's own AC text literally says, resolve the contradiction in spec.md itself before Tasks, or flag it explicitly in Requirement Traceability — don't let Verify be the first place it surfaces.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: espiao
- evidence: ESP-22 vs spec.md Out-of-Scope table (specs)
- last seen: 2026-08-13T22:22:44Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
