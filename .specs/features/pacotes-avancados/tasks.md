# Pacotes Avançados Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

**T5 é diferente de todas as outras: ela termina com uma pausa obrigatória para revisão do usuário antes do commit.** Nenhuma task depois de T5 pode começar até o usuário aprovar o conteúdo gerado nela.

---

**Design**: `.specs/features/pacotes-avancados/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerado a partir da amostragem do repositório (nenhum `AGENTS.md`/`CONTRIBUTING.md` com padrão de teste declarado — segue a convenção já em uso: domínio puro tem cobertura 1:1 com ACs, camada de UI do cliente não tem testes porque o repo não tem infraestrutura de teste de componente).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | ---------------------- | ------------------ | ------------- |
| Domínio puro (`shared/pacotes.ts`, `server/games/quem-sou-eu/regras.ts`, `sorteio.ts`) | unit | Todos os branches; 1:1 com as ACs do spec; todos os edge cases listados (`PKT2-06`, `08`, `09`, `21`, `22`, `23`) | `shared/**/*.test.ts`, `server/games/**/*.test.ts` | `npm run test:unit` |
| Núcleo/despacho (`server/core/despacho.ts`, `server/games/quem-sou-eu/projecao.ts`) | unit | Comandos afetados: caminho feliz + edge + erro — mesmo padrão já usado no repo (esses arquivos são testados sem Durable Object real, via `.test.ts`, não `.integration.test.ts`) | `server/core/despacho.test.ts`, `server/games/quem-sou-eu/projecao.test.ts` | `npm run test:unit` |
| Integração de sala (fluxo completo via Durable Object) | integration | Regressão apenas — esta feature não introduz cenário de integração isolado novo, mas a suíte existente não pode quebrar | `server/**/*.integration.test.ts` | `npm run test:integration` |
| Áudio (`client/src/sons.ts`) | unit | Novas funções seguem a mesma cobertura das funções irmãs já testadas (`tocarChatMensagem`, `tocarSuaVez`) | `client/src/sons.test.ts` | `npm run test:unit` |
| Protocolo/config/dados estáticos (`shared/protocolo.ts`, `shared/pacotes-dados.ts`) | none | — (build gate apenas — são tipos e dados, não lógica) | — | build gate only |
| UI do cliente (`Modal.tsx`, `Lobby.tsx`, `Botao.tsx`, badges, CSS) | none | — (build gate apenas — o repo não tem testes de componente React em nenhuma feature anterior) | — | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ----------- | ------------ | -------- |
| Quick | Depois de tasks só com teste unitário | `npm run test:unit` |
| Full | Depois de tasks com integração | `npm test` |
| Build | Depois de fase completa ou tasks de config/protocolo/CSS puros | `npm run typecheck && npm run lint && npm test` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Fundação em `shared/`

```
T1 → T2 → T3 → T4
```

### Phase 2: Conteúdo (com checkpoint de revisão)

```
T5
```

### Phase 3: Servidor consome múltiplos pacotes + dificuldade

```
T6 → T7 → T8 → T9
```

### Phase 4: Cliente — seleção, dificuldade, Ver pacote, grid

```
T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 5: Feedback sonoro e visual

```
T16 → T17 → T18
```

---

## Task Breakdown

### T1: Incluir `shared/` na suíte de testes unitários ✅ Done (`1cc366a`)

**What**: `vitest.config.ts` passa a rodar `shared/**/*.test.ts` — hoje o `include` só cobre `server/**` e `client/**`, então qualquer teste que eu escrever para `shared/pacotes.ts` em T3 seria silenciosamente ignorado sem isso.
**Where**: `vitest.config.ts`
**Depends on**: None
**Reuses**: padrão já existente de `include`/`exclude`
**Requirement**: (pré-requisito de infraestrutura para `PKT2-06`)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `include` contém `shared/**/*.test.ts`
- [ ] `npm run test:unit` continua passando com o mesmo número de testes de hoje (nenhum teste novo ainda)

**Tests**: none
**Gate**: build

**Commit**: `chore(test): inclui shared/ na suite de testes unitarios`

---

### T2: Mover conteúdo de pacotes para `shared/pacotes-dados.ts` ✅ Done

**What**: Move `server/games/quem-sou-eu/pacotes-dados.ts` para `shared/pacotes-dados.ts`. `cartas: string[]` vira `cartas: CartaDoPacote[]` (`{ texto: string; dificuldade: 'facil' | 'medio' | 'dificil' }`). As 40 cartas atuais de cada pacote são migradas com dificuldade distribuída (ex.: as ~13-14 primeiras `facil`, as ~13 seguintes `medio`, o resto `dificil`) — é conteúdo placeholder, T5 substitui por 150 cartas reais por pacote.
**Where**: `shared/pacotes-dados.ts` (novo), `server/games/quem-sou-eu/pacotes-dados.ts` (removido)
**Depends on**: None
**Reuses**: os dados e a estrutura já existentes, só muda o tipo de `cartas`
**Requirement**: `PKT2-18` (parcial — conteúdo placeholder até T5)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `shared/pacotes-dados.ts` exporta `PacoteCompleto` (com `cartas: CartaDoPacote[]`) e `PACOTES`
- [ ] `server/core/despacho.ts:215` (`import('../games/quem-sou-eu/pacotes-dados')`) aponta para `shared/pacotes-dados`
- [ ] `server/games/quem-sou-eu/index.ts` e qualquer outro import de `./pacotes-dados` são atualizados
- [ ] Cada pacote continua com exatamente as mesmas 40 cartas de hoje (nenhuma perdida na migração), cada uma com um `dificuldade` válido
- [ ] Gate check passes: `npm run typecheck`

**Tests**: none
**Gate**: build

**Commit**: `refactor(shared): move dados de pacotes para shared com campo dificuldade`

---

### T3: Criar `shared/pacotes.ts` com `montarPoolDeCartas` ✅ Done

**What**: Função pura que recebe pacotes selecionados + dificuldades ativas e devolve o pool combinado — união das cartas cujas dificuldades batem, deduplicada por `texto` exato, preservando ordem de primeira ocorrência.
**Where**: `shared/pacotes.ts` (novo), `shared/pacotes.test.ts` (novo)
**Depends on**: T1, T2
**Reuses**: nenhum — peça nova; segue o estilo de função pura de `server/games/quem-sou-eu/sorteio.ts`
**Requirement**: `PKT2-06`, `PKT2-09`, `PKT2-23`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `montarPoolDeCartas(pacotes: PacoteCompleto[], dificuldades: readonly Dificuldade[]): string[]` implementada
- [ ] Um pacote só, uma dificuldade: retorna exatamente as cartas daquela dificuldade daquele pacote
- [ ] Dois pacotes combinados: retorna a união, sem duplicar cartas com texto idêntico entre eles (`PKT2-06`)
- [ ] Duas dificuldades marcadas: pool contém as cartas das duas, exclui a terceira (`PKT2-02`)
- [ ] Nenhum pacote ou nenhuma dificuldade: retorna `[]` (`PKT2-21`, `PKT2-22`)
- [ ] Carta com mesmo texto em dois pacotes com dificuldades diferentes: mantém uma entrada só, dificuldade da primeira ocorrência na ordem de `pacotes` (`PKT2-23`)
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(shared): adiciona montarPoolDeCartas para combinar pacotes e dificuldades`

---

### T4: Atualizar protocolo — `pacoteIds`, `dificuldades`, `pacotesSelecionados` ✅ Done — typecheck fica vermelho até T9 (server) e T15 (client), documentado e esperado

**What**: `Config.pacoteId: string | null` vira `Config.pacoteIds: string[]`; novo `Config.dificuldades: Dificuldade[]`; `CONFIG_PADRAO` ganha `pacoteIds: []` e `dificuldades: ['facil', 'medio', 'dificil']`; `Projecao.sala.pacote?: PacoteResumo` vira `Projecao.sala.pacotesSelecionados?: PacoteResumo[]`.
**Where**: `shared/protocolo.ts`
**Depends on**: None (independente de T2/T3, mas fica na mesma fase por coesão)
**Reuses**: os tipos `PacoteResumo`, `Config`, `Projecao` já existentes
**Requirement**: `PKT2-01`, `PKT2-05`, `PKT2-07`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `export type Dificuldade = 'facil' | 'medio' | 'dificil'`
- [ ] `Config.pacoteIds: string[]` substitui `pacoteId`
- [ ] `Config.dificuldades: Dificuldade[]`
- [ ] `CONFIG_PADRAO` atualizado
- [ ] `Projecao.sala.pacotesSelecionados?: PacoteResumo[]` substitui `pacote`
- [ ] Gate check passes: `npm run typecheck` (erros em consumidores são esperados e resolvidos nas próximas tasks — este task só define o contrato)

**Tests**: none
**Gate**: build

**Commit**: `refactor(shared): protocolo suporta multiplos pacotes e niveis de dificuldade`

---

### T5: Gerar conteúdo — 150 cartas por pacote (checkpoint de revisão) ✅ Done — aprovado pelo usuário (com recalibração de itens "expert" em super-herois/series/personagens-jogos)

**What**: Substituir as 40 cartas placeholder de cada um dos 10 pacotes em `shared/pacotes-dados.ts` por 150 cartas reais (50 `facil`, 50 `medio`, 50 `dificil`), sem repetição dentro do mesmo pacote. **Ao terminar de gerar o conteúdo, PARAR e apresentar ao usuário para revisão — nenhum commit acontece até aprovação explícita.** Se o usuário pedir ajustes, aplicar e apresentar de novo antes de commitar.
**Where**: `shared/pacotes-dados.ts`
**Depends on**: T2
**Reuses**: os 10 temas e IDs de pacote já existentes (`filmes`, `anime`, `personagens-filmes`, `livros`, `futebol`, `jogos`, `personagens-jogos`, `series`, `musica`, `super-herois`)
**Requirement**: `PKT2-18`, `PKT2-19`, `PKT2-20`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Cada um dos 10 pacotes tem exatamente 150 cartas: 50 `facil`, 50 `medio`, 50 `dificil`
- [ ] Nenhuma carta se repete dentro do mesmo pacote (`PKT2-19`)
- [ ] **Conteúdo apresentado ao usuário e aprovado explicitamente antes do commit** (`PKT2-20`) — este é o único gate desta task, não o test runner
- [ ] Gate check passes: `npm run typecheck` (depois da aprovação)

**Tests**: none
**Gate**: build

**Commit**: `content(pacotes): expande os 10 pacotes para 150 cartas com dificuldade`

---

### T6: `despacho.ts` busca N pacotes ✅ Done

**What**: Extrair a busca de 1 pacote (`server/core/despacho.ts:204-223`) para `buscarPacotes(pacoteIds: string[], env?: Env): Promise<Resultado<PacoteCompleto[]>>`, buscando todos os ids em paralelo (KV + fallback estático, mesmo padrão de hoje por id). O comando `iniciar` passa a chamar `jogo.iniciarRodada(ctx, ambiente, pacotes)` com o array.
**Where**: `server/core/despacho.ts`
**Depends on**: T2, T4
**Reuses**: o try/catch e o fallback (`shared/pacotes-dados`) já existentes, generalizados para N ids
**Requirement**: `PKT2-09`, edge case `PKT2-21`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `buscarPacotes` retorna `PACOTE_NAO_ENCONTRADO` se qualquer id não existir (KV nem fallback)
- [ ] `buscarPacotes` retorna `PACOTE_INDISPONIVEL` se o KV falhar e o fallback também não tiver o pacote
- [ ] `pacoteIds: []` (nenhum pacote selecionado) recusa o início com o motivo já existente para pacote ausente (`PKT2-09`)
- [ ] Comando `iniciar` passa o array de pacotes para `jogo.iniciarRodada`
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): despacho busca multiplos pacotes na inicializacao da rodada`

---

### T7: `regras.ts` distribui a partir do pool combinado ✅ Done

**What**: `iniciarRodada` troca `pacote?: {...}` por `pacotes?: PacoteCompleto[]`, chama `montarPoolDeCartas(pacotes, ctx.config.dificuldades)` antes de `sortearCartasDoPacote`/`sortearOpcoesPorJogador` (que continuam recebendo `string[]`, sem mudança de assinatura). `EstadoQuemSouEu.pacoteId/pacoteNome/pacoteEmoji` (campos únicos) viram `pacotesSelecionados: { id: string; nome: string; emoji: string }[]`; a clonagem de estado (linha ~675) é atualizada.
**Where**: `server/games/quem-sou-eu/regras.ts`
**Depends on**: T3, T4, T6
**Reuses**: toda a lógica de distribuição automática/escolha já existente (`PKT-08`…`PKT-17`) — só a origem do `string[]` de entrada muda
**Requirement**: `PKT2-06`, `PKT2-08`, `PKT2-21`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `iniciarRodada` aceita `pacotes?: PacoteCompleto[]` e usa `montarPoolDeCartas` internamente
- [ ] Pool combinado menor que jogadores ativos retorna `PACOTE_INSUFICIENTE` com contagem do pool combinado, não de um pacote isolado (`PKT2-21`)
- [ ] `EstadoQuemSouEu.pacotesSelecionados` grava todos os pacotes usados na rodada, não só o primeiro (`PKT2-08`)
- [ ] Distribuição automática e "cada um escolhe" continuam funcionando idênticas a hoje sobre o pool combinado (regressão zero de `PKT-08`…`PKT-17`)
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): regras do quem-sou-eu distribuem a partir do pool combinado de pacotes`

---

### T8: `despacho.ts` valida `pacoteIds`/`dificuldades` no comando `configurar` ✅ Done

**What**: O comando `configurar` (que já valida `modoPacote`, `pacoteId`) passa a validar `pacoteIds` (array de strings) e `dificuldades` (array não vazio de valores de `Dificuldade`) — defesa em profundidade: o cliente já impede desmarcar a última dificuldade (`PKT2-03`), mas o servidor recusa também.
**Where**: `server/core/despacho.ts` (bloco de validação do comando `configurar`)
**Depends on**: T4
**Reuses**: o padrão de validação já existente para `modoPacote`/`pacoteId`
**Requirement**: `PKT2-01`, `PKT2-03`, `PKT2-05`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `dificuldades` vazio é recusado (mesmo erro de validação já usado para campos de config inválidos)
- [ ] `pacoteIds` com item que não é string é recusado
- [ ] `configurar` com `pacoteIds`/`dificuldades` válidos atualiza `sala.config` corretamente
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): valida pacoteIds e dificuldades no comando configurar`

---

### T9: `projecao.ts` projeta `pacotesSelecionados` ✅ Done — server-side typecheck (`npx tsc -p tsconfig.server.json --noEmit`) volta a ficar limpo

**What**: `server/games/quem-sou-eu/projecao.ts` monta `sala.pacotesSelecionados` (array de `PacoteResumo`) a partir de `estado.pacotesSelecionados`, substituindo a projeção singular de hoje.
**Where**: `server/games/quem-sou-eu/projecao.ts`
**Depends on**: T7
**Reuses**: a lógica de projeção de `pacotesDisponiveis` já existente, mesmo padrão para o novo campo
**Requirement**: `PKT2-07`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `sala.pacotesSelecionados` presente e correto em fase `jogo` e `encerrada` quando há pacotes selecionados (`PKT2-07`)
- [ ] Ausente/vazio quando `modoPacote !== 'pacote'` (mesma regra de `PKT-25`)
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): projeta lista de pacotes selecionados na sala`

---

### T10: `Modal.tsx` ganha variante de largura ✅ Done

**What**: Nova prop `largura?: 'padrao' | 'larga'` (default `'padrao'`, preserva `max-w-[420px]`); `'larga'` usa uma largura maior para acomodar o grid de pacotes. Nenhum outro uso de `Modal` no produto muda de comportamento.
**Where**: `client/src/componentes/Modal.tsx`
**Depends on**: None
**Reuses**: o componente `Modal` existente — só adiciona uma prop
**Requirement**: `PKT2-14`, `PKT2-15`, `PKT2-16`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `largura="larga"` renderiza com largura maior que `420px`; omitir a prop mantém o comportamento atual em todo modal existente (confirmação, destrutivo)
- [ ] Rolagem interna do conteúdo continua funcionando (`max-h-full overflow-y-auto` preservado)
- [ ] Gate check passes: `npm run typecheck`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): modal ganha variante de largura para grids maiores`

---

### T11: Grid de pacotes responsivo ✅ Done

**What**: `.pacote-grid` em `client/src/index.css` passa de `grid-cols-1 sm:grid-cols-2` para 2 colunas (`<640px`), 3 colunas (`640–1023px`), 5 colunas (`≥1024px`). `.pacote-card` não muda.
**Where**: `client/src/index.css`
**Depends on**: None
**Reuses**: a classe `.pacote-grid`/`.pacote-card` já existente
**Requirement**: `PKT2-14`, `PKT2-15`, `PKT2-16`, `PKT2-17`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `.pacote-grid` usa `grid-cols-2` (default), `sm:grid-cols-3`, `lg:grid-cols-5`
- [ ] Nenhuma rolagem horizontal em nenhuma largura (`VIS-01`)
- [ ] Gate check passes: `npm run typecheck`

**Tests**: none
**Gate**: build

**Commit**: `style(client): grid de pacotes responsivo 2/3/5 colunas`

---

### T12: Modal de seleção vira múltipla escolha

**What**: O modal de seleção de pacotes em `Lobby.tsx` (hoje seleção única, um clique fecha o modal) passa a permitir marcar mais de um pacote (checkbox, o modal não fecha ao marcar), usando `Modal largura="larga"`. Envia `configurar` com `pacoteIds` atualizado a cada toggle.
**Where**: `client/src/telas/Lobby.tsx`
**Depends on**: T4, T10, T11
**Reuses**: o modal e o `pacote-grid`/`pacote-card` já existentes, só muda a interação de clique único para múltipla marcação
**Requirement**: `PKT2-05`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Marcar um segundo pacote não desmarca o primeiro
- [ ] Cada card marcado mostra estado visual de selecionado (reaproveita `aria-pressed` já existente)
- [ ] Fechar o modal preserva a seleção feita até ali

**Tests**: none
**Gate**: build

**Commit**: `feat(client): modal de pacotes permite selecionar mais de um`

---

### T13: Seletor de dificuldade no lobby

**What**: Três toggles (Fácil/Médio/Difícil), todos marcados por padrão quando `modoPacote` vira `'pacote'`. Desmarcar a última dificuldade ativa é bloqueado com `Botao.motivo`. Não-host vê em modo somente-leitura.
**Where**: `client/src/telas/Lobby.tsx`
**Depends on**: T4
**Reuses**: o padrão de exibição somente-leitura já usado para as demais configs (`PKT-06`)
**Requirement**: `PKT2-01`, `PKT2-02`, `PKT2-03`, `PKT2-04`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Três toggles visíveis quando `modoPacote === 'pacote'`, todos marcados por padrão
- [ ] Desmarcar envia `configurar` com `dificuldades` atualizado
- [ ] Com só uma dificuldade marcada, o toggle correspondente fica desabilitado com o motivo "Pelo menos um nível precisa estar marcado" (`PKT2-03`)
- [ ] Não-host vê os toggles em modo somente-leitura

**Tests**: none
**Gate**: build

**Commit**: `feat(client): seletor de dificuldade no lobby`

---

### T14: "Ver pacote" — modal de seleção e lobby

**What**: Dentro do modal de seleção (host), cada card ganha "Ver cartas" que expande a lista daquele pacote candidato filtrada pelas dificuldades atualmente marcadas — sem precisar confirmar a seleção primeiro. No corpo do lobby (todos, host e não-host), um botão "Ver pacote" abre a lista do pool combinado atual (todos os pacotes × dificuldades já selecionados), computada localmente via `montarPoolDeCartas`/`shared/pacotes-dados` a partir de `sala.config` — sem chamada de rede. Ausente quando `modoPacote !== 'pacote'` ou nada selecionado ainda.
**Where**: `client/src/telas/Lobby.tsx`
**Depends on**: T3, T12, T13
**Reuses**: `Modal largura="larga"`, `montarPoolDeCartas`, `shared/pacotes-dados`
**Requirement**: `PKT2-10`, `PKT2-11`, `PKT2-12`, `PKT2-13`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] "Ver cartas" dentro do modal de seleção mostra as cartas do pacote candidato (mesmo não selecionado ainda), filtradas pelas dificuldades marcadas
- [ ] Botão "Ver pacote" no lobby some quando `modoPacote !== 'pacote'` ou `pacoteIds` vazio (`PKT2-12`)
- [ ] Lista de "Ver pacote" nunca associa uma carta a um jogador específico — é sempre a lista de possibilidades (`PKT2-13`)
- [ ] Não-host vê o botão "Ver pacote" no lobby (não vê o modal de seleção, que é ação de host)

**Tests**: none
**Gate**: build

**Commit**: `feat(client): ver pacote no modal de selecao e no lobby`

---

### T15: Badge mostra todos os pacotes selecionados

**What**: `Jogo.tsx` e `Encerrada.tsx` renderizam um `BadgePacote` por item de `sala.pacotesSelecionados` (mapeando o array), em vez de um badge único.
**Where**: `client/src/telas/Jogo.tsx`, `client/src/telas/Encerrada.tsx`
**Depends on**: T9
**Reuses**: `BadgePacote.tsx` sem modificação — só o call site passa a mapear um array
**Requirement**: `PKT2-07`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Partida com 2+ pacotes mostra 2+ badges, um por pacote, em `jogo` e `encerrada`
- [ ] Partida com 1 pacote continua mostrando 1 badge (regressão zero de `PKT-23`/`PKT-24`)

**Tests**: none
**Gate**: build

**Commit**: `feat(client): badge exibe todos os pacotes selecionados na partida`

---

### T16: Novos sons — clique e entrada

**What**: `tocarClique()` e `tocarEntrada()` em `client/src/sons.ts`, seguindo o molde de `tocarChatMensagem`/`tocarSuaVez` (tom curto via `tocarTom`, checa `somAtivo`).
**Where**: `client/src/sons.ts`, `client/src/sons.test.ts`
**Depends on**: None
**Reuses**: `tocarTom`, `somAtivo`, `motionReduzido` já existentes
**Requirement**: `FBK-01`, `FBK-03`, `FBK-04`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `tocarClique()` toca um tom curto e discreto quando `somAtivo`, nada quando desativado
- [ ] `tocarEntrada()` toca um tom distinto dos demais (frequência/timbre diferente de `tocarChatMensagem`, `tocarSuaVez`, etc.)
- [ ] Ambos respeitam `somAtivo === false` (`FBK-04`)
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: N tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(client): adiciona sons de clique e entrada na sala`

---

### T17: `Botao.tsx` toca clique e aplica micro-transição

**What**: O `onClick` interno do `Botao` chama `tocarClique()` antes do `onClick` do consumidor, só quando não desabilitado. Classe de micro-transição de toque (`active:scale-[0.97]` ou equivalente, desfazendo em <150ms) adicionada à `className` base, suprimida via `@media (prefers-reduced-motion: reduce)` (já existe em `index.css`).
**Where**: `client/src/componentes/Botao.tsx`
**Depends on**: T16
**Reuses**: `Botao.tsx` é o único lugar que renderiza `<button>` no produto — nenhuma tela precisa ser tocada
**Requirement**: `FBK-01`, `FBK-02`, `FBK-05`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Clique em botão habilitado toca `tocarClique()` e aplica a micro-transição
- [ ] Botão desabilitado (`motivo` presente) não toca som nem aplica a transição (`FBK-02`)
- [ ] `prefers-reduced-motion: reduce` suprime a transição visual mas não o som (`FBK-05`)
- [ ] Gate check passes: `npm run typecheck`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): botao toca som de clique e aplica micro-transicao visual`

---

### T18: Som de entrada na conexão

**What**: `client/src/estado/conexao.tsx` chama `tocarEntrada()` na primeira projeção recebida com sucesso após um `entrar`/`reconectar` bem-sucedido (a própria conexão do jogador, não a entrada de terceiros).
**Where**: `client/src/estado/conexao.tsx`
**Depends on**: T16
**Reuses**: o hook de conexão já existente — só adiciona a chamada de som no ponto onde a conexão é confirmada
**Requirement**: `FBK-03`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `tocarEntrada()` dispara uma vez ao completar a própria entrada/reconexão, não a cada mensagem subsequente
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm test`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): toca som ao entrar ou reconectar na sala`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4
Phase 2:  T5 (pausa para revisão do usuário antes do commit)
Phase 3:  T6 ──→ T7 ──→ T8 ──→ T9
Phase 4:  T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14 ──→ T15
Phase 5:  T16 ──→ T17 ──→ T18
```

Execution is strictly sequential — there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ------ | ------- |
| T1: Incluir shared/ nos testes | 1 arquivo de config | ✅ Granular |
| T2: Mover dados de pacotes | 1 arquivo movido + 2 import sites | ✅ Granular (movimentação atômica) |
| T3: `montarPoolDeCartas` | 1 função pura + testes | ✅ Granular |
| T4: Protocolo | 1 arquivo, 4 tipos relacionados | ✅ Granular (coesos, mesmo contrato) |
| T5: Conteúdo | 1 arquivo, dado apenas | ✅ Granular |
| T6: `despacho.ts` busca N pacotes | 1 função extraída + 1 call site | ✅ Granular |
| T7: `regras.ts` distribui do pool | 1 função + 1 tipo de estado no mesmo arquivo | ✅ Granular (coesos) |
| T8: Validação de config | 1 bloco de validação | ✅ Granular |
| T9: `projecao.ts` | 1 função de projeção | ✅ Granular |
| T10: `Modal.tsx` largura | 1 prop em 1 componente | ✅ Granular |
| T11: Grid CSS | 1 classe CSS | ✅ Granular |
| T12: Multi-seleção | 1 interação em 1 tela | ✅ Granular |
| T13: Seletor de dificuldade | 1 seção em 1 tela | ✅ Granular |
| T14: Ver pacote | 1 funcionalidade em 1 tela (2 pontos de entrada relacionados) | ✅ Granular |
| T15: Badge múltiplo | 2 call sites, mesma mudança | ✅ Granular (coesos) |
| T16: Sons novos | 2 funções irmãs no mesmo arquivo | ✅ Granular |
| T17: `Botao.tsx` | 1 componente | ✅ Granular |
| T18: Som de entrada | 1 hook | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ------------------------ | --------------- | ------- |
| T1 | None | (início da Phase 1) | ✅ Match |
| T2 | None | T1 → T2 | ✅ Match (sequencial na fase, sem dependência de dado) |
| T3 | T1, T2 | T2 → T3 | ✅ Match |
| T4 | None | T3 → T4 | ✅ Match (sequencial na fase, sem dependência de dado) |
| T5 | T2 | Phase 2 isolada, após Phase 1 | ✅ Match |
| T6 | T2, T4 | T5 → T6 (após checkpoint) | ✅ Match |
| T7 | T3, T4, T6 | T6 → T7 | ✅ Match |
| T8 | T4 | T7 → T8 | ✅ Match (sequencial na fase, sem dependência de T7) |
| T9 | T7 | T8 → T9 | ✅ Match |
| T10 | None | (início da Phase 4) | ✅ Match |
| T11 | None | T10 → T11 | ✅ Match (sequencial na fase, sem dependência de dado) |
| T12 | T4, T10, T11 | T11 → T12 | ✅ Match |
| T13 | T4 | T12 → T13 | ✅ Match (sequencial na fase, sem dependência de T12) |
| T14 | T3, T12, T13 | T13 → T14 | ✅ Match |
| T15 | T9 | T14 → T15 | ✅ Match (sequencial na fase; dependência real é T9, de fase anterior) |
| T16 | None | (início da Phase 5) | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T16 | T17 → T18 | ✅ Match (sequencial na fase; dependência real é T16) |

**Nota**: dentro de cada fase, a ordem no diagrama é sempre sequencial (T_n → T_n+1) mesmo quando a dependência real de dados aponta para uma task anterior na mesma fase ou em fase passada — é assim que o skill define "tasks dentro de uma fase executam em ordem". Nenhuma task depende de uma task de fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | ------------------------------ | ------------------ | ----------- | ------- |
| T1 | Config de teste | none | none | ✅ OK |
| T2 | Dado estático (`shared/pacotes-dados.ts`) | none | none | ✅ OK |
| T3 | Domínio puro (`shared/pacotes.ts`) | unit | unit | ✅ OK |
| T4 | Protocolo/config (`shared/protocolo.ts`) | none | none | ✅ OK |
| T5 | Dado estático | none | none | ✅ OK |
| T6 | Núcleo/despacho (`despacho.ts`) | unit | unit | ✅ OK |
| T7 | Domínio puro (`regras.ts`) | unit | unit | ✅ OK |
| T8 | Núcleo/despacho (`despacho.ts`) | unit | unit | ✅ OK |
| T9 | Núcleo/despacho (`projecao.ts`) | unit | unit | ✅ OK |
| T10 | UI do cliente (`Modal.tsx`) | none | none | ✅ OK |
| T11 | CSS | none | none | ✅ OK |
| T12 | UI do cliente (`Lobby.tsx`) | none | none | ✅ OK |
| T13 | UI do cliente (`Lobby.tsx`) | none | none | ✅ OK |
| T14 | UI do cliente (`Lobby.tsx`) | none | none | ✅ OK |
| T15 | UI do cliente (`Jogo.tsx`, `Encerrada.tsx`) | none | none | ✅ OK |
| T16 | Áudio (`sons.ts`) | unit | unit | ✅ OK |
| T17 | UI do cliente (`Botao.tsx`) | none | none | ✅ OK |
| T18 | UI do cliente (`conexao.tsx`) | none | none | ✅ OK |

Nenhuma violação — todas as tasks com camada de domínio/núcleo puro (`T3`, `T6`, `T7`, `T8`, `T9`, `T16`) incluem os próprios testes na mesma task, nenhuma foi adiada para "depois".
