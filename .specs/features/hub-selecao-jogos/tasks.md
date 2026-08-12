# Hub de Seleção de Jogos Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/hub-selecao-jogos/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase sampling (`server/core/despacho.test.ts`, `server/core/sala-do.integration.test.ts`, `server/index.integration.test.ts`, `shared/pacotes.test.ts`) and project convention. Guidelines found: none (`AGENTS.md`/`CLAUDE.md` present in repo but silent on test policy) — matrix follows the repo's own established pattern instead of the strong default.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | --------------------- | ----------------- | ----------- |
| `shared/` types (protocol additions) | none | Types only, no runtime behavior — covered by `typecheck` | `shared/protocolo.ts` | `npm run typecheck` |
| `shared/` static content/catalog | unit | Shape + uniqueness of ids; 1:1 with catalog entries | `shared/*.test.ts` | `npm run test:unit` |
| `server/core` domain logic (`despacho.ts`) | unit | All branches; 1:1 to spec ACs (`HUB-06`…`HUB-11`); every listed edge case | `server/core/despacho.test.ts` | `npm run test:unit` |
| `server/core` DO shell (`sala-do.ts`) | integration | Persistence + registry resolution paths; happy + edge (missing-module fail-closed) | `server/core/sala-do.integration.test.ts` | `npm run test:integration` |
| `server/index.ts` (Worker entry, HTTP validation) | integration | Happy path + every listed edge case + error/rejection paths (`HUB-01`…`HUB-04`) | `server/index.integration.test.ts` | `npm run test:integration` |
| `server/games/registro.ts` (registry wiring) | none | Trivial map literal, exercised transitively by the integration tests above — no test infra gap, same treatment as `server/index.ts`'s existing `SalaDurableObject` wiring today | — | build gate only |
| Client UI components (`SeletorDeJogos.tsx`, `Inicio.tsx`, `Lobby.tsx`) | none | No React component test infra exists in this repo yet (confirmed debt, same as `Botao.tsx`/`Modal.tsx`/`pacotes-avancados` UI work) — build gate + manual browser verification only | — | `npm run typecheck` + `npm run lint` + manual UAT |

These expectations intentionally mirror what the repo already does (unit for pure domain functions and static content, integration for anything touching the DO/HTTP boundary, none-but-gated for UI) rather than the tool's strong default, because the codebase's own convention is a legitimate, consistently-applied guideline in itself.

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run typecheck && npm run test:unit` |
| Full | After tasks with integration tests | `npm run typecheck && npm run test:unit && npm run test:integration` |
| Build | After phase completion, or UI-only tasks | `npm run typecheck && npm run lint && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Shared contract

```
T1 → T2
```

### Phase 2: Server core (tight dependency chain — registry, dispatch, DO shell, HTTP entry)

```
T3 → T4 → T5 → T6
```

### Phase 3: Client

```
T7 → T8 → T9
```

---

## Task Breakdown

### T1: Estender o protocolo com `jogoId`, comando `trocarJogo` e erro `JOGO_INVALIDO`

**What**: Adiciona `jogoId: string` a `EstadoSala` e `Projecao.sala`, a variante `{ t: 'trocarJogo'; jogoId: string }` a `Comando`, e `'JOGO_INVALIDO'` a `CodigoErro`.
**Where**: `shared/protocolo.ts` (modify)
**Depends on**: None
**Reuses**: Padrão existente de `Comando`/`CodigoErro`/`Projecao` já no arquivo.
**Requirement**: HUB-01, HUB-02, HUB-05, HUB-06, HUB-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `EstadoSala<E>.jogoId: string` adicionado
- [x] `Comando` inclui `{ t: 'trocarJogo'; jogoId: string }`
- [x] `CodigoErro` inclui `'JOGO_INVALIDO'`
- [x] `Projecao.sala.jogoId: string` adicionado
- [x] Gate check passa: `npm run typecheck` (vermelho esperado em `despacho.ts`/`sala-do.ts`/`index.ts` até T4–T6 — mesmo padrão já documentado em `pacotes-avancados` T4)

**Tests**: none
**Gate**: build (typecheck only — vermelho esperado nos consumidores até T4–T6, ver nota acima)

**Commit**: `feat(protocolo): adiciona jogoId, comando trocarJogo e erro JOGO_INVALIDO`

---

### T2: Criar catálogo de jogos compartilhado

**What**: Novo arquivo com `JogoCatalogo`, `CATALOGO_DE_JOGOS` (uma entrada, `quem-sou-eu`) e `JOGO_PADRAO`.
**Where**: `shared/jogos-catalogo.ts` (new), `shared/jogos-catalogo.test.ts` (new)
**Depends on**: None
**Reuses**: Padrão de `shared/pacotes-dados.ts` (conteúdo estático compartilhado, `AD-012`).
**Requirement**: HUB-01, HUB-13, HUB-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `CATALOGO_DE_JOGOS` contém exatamente a entrada `quem-sou-eu` com `id`/`nome`/`descricao`
- [x] `JOGO_PADRAO === 'quem-sou-eu'`
- [x] Teste unitário garante ids únicos no catálogo e que `JOGO_PADRAO` existe no catálogo
- [x] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(shared): adiciona catálogo de jogos do hub`

---

### T3: Criar o registro de módulos de jogo do servidor

**What**: Novo arquivo mapeando `jogoId → JogoDaSala<unknown>`, isolando o único apagamento de tipo do projeto.
**Where**: `server/games/registro.ts` (new)
**Depends on**: T1 (precisa do tipo `JogoDaSala` já existente em `despacho.ts`, sem mudança nele ainda — só referência de tipo)
**Reuses**: `quemSouEu` (`server/games/quem-sou-eu/index.ts`), `JogoDaSala` (`server/core/despacho.ts`).
**Requirement**: HUB-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `REGISTRO_DE_JOGOS: Record<string, JogoDaSala<unknown>>` exportado, com a chave `'quem-sou-eu'`
- [x] Nenhum outro arquivo do projeto contém `as JogoDaSala<unknown>` (grep — apagamento de tipo isolado neste arquivo)
- [x] Gate check passa: `npm run typecheck` (arquivo novo, isolado — sem consumidores ainda até T5/T6)

**Tests**: none
**Gate**: build

**Commit**: `feat(server): adiciona registro de módulos de jogo`

---

### T4: Generalizar `despacho.ts` para múltiplos jogos e implementar `trocarJogo`

**What**: `despachar`/`executar` deixam de ser genéricos em `E`, passam a receber `registro: Record<string, JogoDaSala<unknown>>` e resolvem o jogo por `sala.jogoId` internamente; novo `case 'trocarJogo'` com a função `trocarJogo()` (host + fase lobby + validação contra o registro + idempotência).
**Where**: `server/core/despacho.ts` (modify), `server/core/despacho.test.ts` (modify)
**Depends on**: T1, T3
**Reuses**: Padrão de validação "host + fase lobby" já usado por `configurar()`; `SEM_EFEITOS`.
**Requirement**: HUB-06, HUB-07, HUB-08, HUB-09, HUB-10, HUB-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `TipoDeComandoDoCore` inclui `'trocarJogo'`
- [x] `trocarJogo()`: não-host → `SEM_AUTORIDADE`; fora do lobby → `FASE_INVALIDA`; `jogoId` fora do registro → `JOGO_INVALIDO` sem mudar a sala; mesmo `jogoId` do atual → `ok: true` sem resetar `config`; `jogoId` diferente e válido → atualiza `sala.jogoId`, zera `sala.jogo`, reseta `sala.config` para `CONFIG_PADRAO`
- [x] `despachar`/`executar` resolvem `jogo = registro[sala.jogoId]` nos branches que precisam (`iniciar`, `expulsar`, `sair`, `paraOJogo`); jogo não encontrado no registro → `COMANDO_INVALIDO` (fail-closed, cenário de ops)
- [x] Testes novos cobrem as 6 ramificações de `trocarJogo` acima (host válido+diferente, host válido+idêntico/idempotente, não-host, fora do lobby, jogoId inválido, projeção reflete a troca)
- [x] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): generaliza despacho para múltiplos jogos e implementa trocarJogo`

---

### T5: Generalizar `SalaDeJogo` para operar sobre um registro de jogos

**What**: `SalaDeJogo<E>` perde o parâmetro de tipo (opera sobre `EstadoSala<unknown>`); construtor recebe `registro` em vez de `jogo`; novo helper `jogoAtual()`; `criar()` grava `jogoId`; `MENSAGENS_DE_ERRO` ganha `JOGO_INVALIDO`.
**Where**: `server/core/sala-do.ts` (modify), `server/core/sala-do.integration.test.ts` (modify)
**Depends on**: T3, T4
**Reuses**: Estrutura existente de `criar()`/`confirmar()`/`webSocketMessage()`/`alarm()`.
**Requirement**: HUB-01, HUB-05, HUB-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `SalaDeJogo` não é mais genérico; construtor recebe `registro: Record<string, JogoDaSala<unknown>>`
- [x] `criar(codigo, limiteJogadores, jogoId)` persiste `jogoId` em `EstadoSala`
- [x] `jogoAtual(sala)` resolve `this.registro[sala.jogoId] ?? null`; todo ponto que usava `this.jogo` fixo (`despachar`, `avisar` no `alarm()`/`entrarNaSala`, `projetar` em `confirmar()`) usa `jogoAtual()`
- [x] Jogo não encontrado no registro (edge case de ops) não lança exceção — `avisar`/`projetar` pulam o efeito naquele ciclo, sala não trava
- [x] `MENSAGENS_DE_ERRO.JOGO_INVALIDO` definida
- [x] Testes de integração cobrem: sala criada guarda o `jogoId` certo; reconexão reflete `jogoId` na projeção; comando roteado ao módulo certo via registro
- [x] Gate check passa: `npm run typecheck && npm run test:unit && npm run test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `refactor(server): SalaDeJogo passa a resolver o jogo por registro em vez de injeção fixa`

---

### T6: Validar e persistir `jogoId` na criação da sala (Worker entry)

**What**: `SalaDurableObject` injeta `REGISTRO_DE_JOGOS`; `POST /api/salas` lê `jogoId` do corpo, recusa antes de acordar o DO se não existir no registro, usa `JOGO_PADRAO` quando ausente, propaga para `/criar`.
**Where**: `server/index.ts` (modify), `server/index.integration.test.ts` (modify)
**Depends on**: T3, T5
**Reuses**: Padrão existente de `limitePedido()`/`limiteDeEntrada()` para validação pré-DO.
**Requirement**: HUB-01, HUB-02, HUB-03, HUB-04, HUB-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `SalaDurableObject` (não genérico) injeta `REGISTRO_DE_JOGOS` no `super()`
- [x] `jogoId` ausente no corpo → sala criada com `JOGO_PADRAO`, sem erro
- [x] `jogoId` presente mas fora de `Object.keys(REGISTRO_DE_JOGOS)` → `400 { erro: 'JOGO_INVALIDO' }`, **nenhuma chamada** ao Durable Object (sala não nasce)
- [x] `jogoId` válido → propagado para `/criar` e persistido (verificável via projeção pós-criação)
- [x] Testes de integração cobrem os três casos acima
- [x] Gate check passa: `npm run typecheck && npm run test:unit && npm run test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `feat(server): valida e persiste jogoId na criação da sala`

---

### T7: Criar o componente `SeletorDeJogos`

**What**: Componente de cliente reaproveitando o padrão visual de `.pacote-card`/`.pacote-grid`, renderiza `CATALOGO_DE_JOGOS` como cards selecionáveis (modo interativo) ou como texto simples do jogo atual (modo somente-leitura, para não-host).
**Where**: `client/src/componentes/SeletorDeJogos.tsx` (new)
**Depends on**: T2
**Reuses**: `.pacote-card`/`.pacote-grid` (`client/src/index.css`), padrão de card com `aria-pressed` já usado no seletor de pacotes.
**Requirement**: HUB-01, HUB-06, HUB-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Modo interativo: renderiza um card por entrada de `CATALOGO_DE_JOGOS`, com seleção controlada (`jogoIdSelecionado`/`aoSelecionar`), mesmo com 1 card só (Edge Case confirmado — nada de placeholder condicional)
- [x] Modo somente-leitura: mostra apenas o nome do jogo atual, sem controle nenhum (para não-host, `VIS-04`)
- [x] Gate check passa: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): adiciona componente SeletorDeJogos`

---

### T8: Integrar o seletor de jogos na tela Início

**What**: `Apresentacao()` passa a mostrar `SeletorDeJogos` de verdade em vez do texto fixo do Quem Sou Eu; `criarSala()` envia `jogoId` escolhido no corpo do `POST /api/salas`.
**Where**: `client/src/telas/Inicio.tsx` (modify)
**Depends on**: T7
**Reuses**: `SeletorDeJogos` (T7).
**Requirement**: HUB-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Tela Início mostra o seletor com o jogo padrão pré-selecionado
- [x] `fetch('/api/salas', ...)` inclui `jogoId` no corpo
- [x] Verificado manualmente no navegador: criar sala reflete o `jogoId` escolhido na projeção (checar via `javascript_tool`/DOM, já que não há infraestrutura de teste de componente)
- [x] Gate check passa: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): tela Início escolhe o jogo antes de criar a sala`

---

### T9: Adicionar "Mudar jogo" ao Lobby

**What**: Host vê um controle "Mudar jogo" que abre um `Modal` com `SeletorDeJogos` em modo rascunho (`jogoIdRascunho`, mesmo padrão de `pacoteIdsRascunho`); Confirmar envia `{ t: 'trocarJogo', jogoId }`, Cancelar descarta. Não-host vê só o nome do jogo atual.
**Where**: `client/src/telas/Lobby.tsx` (modify)
**Depends on**: T7
**Reuses**: `SeletorDeJogos` (T7), `Modal.tsx`, padrão de estado de rascunho já usado no seletor de pacotes.
**Requirement**: HUB-06, HUB-07, HUB-08, HUB-09, HUB-10, HUB-11, HUB-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Host vê "Mudar jogo"; não-host vê só o nome do jogo atual, sem controle
- [x] Modal abre com `SeletorDeJogos` em modo rascunho, seedado do `jogoId` atual da sala
- [x] Confirmar com jogo diferente envia `trocarJogo`; Cancelar não manda nada, estado da sala intacto
- [x] Verificado manualmente no navegador: comando `trocarJogo` confirmado ponta a ponta (WS envia `{t:'trocarJogo', jogoId}` no Confirmar, nada no Cancelar); controle "Mudar jogo" ausente para não-host, só o nome do jogo aparece. Reset de config visível em outro jogador **não pôde ser demonstrado com um jogo diferente** — catálogo atual tem só `quem-sou-eu`, então toda troca é para o mesmo jogo (idempotente por design, `HUB-09`); mecanismo do servidor já coberto pelos testes de integração de T4/T5.
- [x] Gate check passa: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): adiciona troca de jogo no Lobby`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4 ──→ T5 ──→ T6
Phase 3:  T7 ──→ T8 ──→ T9
```

Execution is strictly sequential — there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Estender protocolo | 1 arquivo, tipos | ✅ Granular |
| T2: Catálogo de jogos | 1 arquivo + teste | ✅ Granular |
| T3: Registro de módulos | 1 arquivo | ✅ Granular |
| T4: Generalizar despacho.ts | 1 arquivo + teste | ✅ Granular (uma função nova + generalização de assinatura existente, mesmo arquivo) |
| T5: Generalizar sala-do.ts | 1 arquivo + teste | ✅ Granular |
| T6: Validar jogoId no Worker entry | 1 arquivo + teste | ✅ Granular |
| T7: Componente SeletorDeJogos | 1 componente | ✅ Granular |
| T8: Integrar seletor no Início | 1 arquivo | ✅ Granular |
| T9: "Mudar jogo" no Lobby | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ----------------------- | -------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T1 | T1 → ... → T3 (Phase 1 → Phase 2) | ✅ Match |
| T4 | T1, T3 | T3 → T4 | ✅ Match |
| T5 | T3, T4 | T4 → T5 | ✅ Match |
| T6 | T3, T5 | T5 → T6 | ✅ Match |
| T7 | T2 | T2 → ... → T7 (Phase 1 → Phase 3) | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T7 | T7 → T9 (via T8, sequencial dentro da fase) | ✅ Match |

Nenhuma dependência aponta para uma fase posterior; todas apontam para trás ou dentro da própria fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | ----------------------------- | ----------------- | ----------- | ------ |
| T1: Protocolo | `shared/` types | none | none | ✅ OK |
| T2: Catálogo | `shared/` static content | unit | unit | ✅ OK |
| T3: Registro | `server/games/registro.ts` | none (build gate) | none | ✅ OK |
| T4: despacho.ts | `server/core` domain logic | unit | unit | ✅ OK |
| T5: sala-do.ts | `server/core` DO shell | integration | integration | ✅ OK |
| T6: index.ts | Worker entry (HTTP validation) | integration | integration | ✅ OK |
| T7: SeletorDeJogos | Client UI component | none (build gate) | none | ✅ OK |
| T8: Inicio.tsx | Client UI component | none (build gate) | none | ✅ OK |
| T9: Lobby.tsx | Client UI component | none (build gate) | none | ✅ OK |

Todas as tasks batem com a matriz — nenhuma violação.
