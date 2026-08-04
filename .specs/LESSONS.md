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

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
