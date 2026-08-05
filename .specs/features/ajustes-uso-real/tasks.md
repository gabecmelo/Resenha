# Ajustes de uso real — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/ajustes-uso-real/spec.md`
**Spec pai**: `.specs/features/quem-sou-eu/spec.md` (atualizado: requisitos substituídos estão marcados)
**Status**: Draft

## Test Coverage Matrix

> Herdada de `.specs/features/quem-sou-eu/tasks.md` — mesmo projeto, mesmas camadas. Reproduzida aqui para o worker não precisar carregar o outro arquivo.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| **L1** Regras de jogo puras — `server/games/**` | unit | Todas as branches; 1:1 com os ACs; todo edge case listado | `server/**/*.test.ts` | `npm run test:unit` |
| **L2** Núcleo puro — `server/core/{roster,prazos,chat,codigo,despacho}.ts` | unit | Todas as branches; 1:1 com os ACs | `server/**/*.test.ts` | `npm run test:unit` |
| **L3** Casca da plataforma — `server/core/{sala-do,conexoes,estado}.ts`, `server/index.ts` | integration | Caminho feliz + edge cases + erros, no workerd | `server/**/*.integration.test.ts` | `npm run test:integration` |
| **L4** Lógica pura do cliente — `client/src/estado/*.ts` (exceto provider React) | unit | Todas as branches | `client/**/*.test.ts` | `npm run test:unit` |
| **L5** Componentes e telas React — `client/src/**/*.tsx` | none | Build gate + verificação no navegador | — | build gate |
| **L6** Config e tipos — `protocolo.ts`, `wrangler.jsonc`, configs | none | Build gate | — | build gate |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com unit | `npm run test:unit` |
| Full | Tasks com integração | `npm run test:unit && npm run test:integration` |
| Build | Fim de fase, ou tasks de config/tipos/React | `npm run typecheck && npm run lint && npm run build` |

**Baseline de entrada:** 314 unit + 65 integração, todos verdes.

---

## Execution Plan

### Phase 1: Contrato (1 task)

```
T1
```

### Phase 2: Regras e núcleo (5 tasks)

```
T2 → T3 → T4 → T5 → T6
```

### Phase 3: Integração ponta a ponta (1 task)

```
T7
```

### Phase 4: Lógica do cliente (3 tasks)

```
T8 → T9 → T10
```

### Phase 5: Interface (3 tasks)

```
T11 → T12 → T13
```

---

## Task Breakdown

### T1: Ajustar o contrato compartilhado

**What**: `MensagemChat` de jogador passa a carregar `apelido` e `cor`; `Config` perde `aoDescobrir`; o tempo por turno aceita valor livre.
**Where**: `shared/protocolo.ts`
**Depends on**: None
**Requirement**: `AJU-15`, `AJU-18`, `AJU-19`

**Done when**:
- [ ] `MensagemChat` do tipo `jogador` tem `apelido: string` e `cor: Cor` além de `autorId`
- [ ] `Config` não tem mais `aoDescobrir`; `CONFIG_PADRAO` idem
- [ ] Constantes de faixa do tempo personalizado exportadas (10s … 60min)
- [ ] `npm run typecheck` passa — os erros que aparecerem em outros arquivos são o mapa do que as próximas tasks precisam tocar

**Tests**: none · **Gate**: build
**Commit**: `feat(protocolo): grava autor na mensagem e remove config de rodizio`

---

### T2: Chat grava o autor na mensagem

**What**: Ao registrar mensagem de jogador, gravar apelido e cor do momento do envio.
**Where**: `server/core/chat.ts`
**Depends on**: T1
**Requirement**: `AJU-15`, `AJU-16`, `AJU-17`

**Done when**:
- [ ] A mensagem registrada carrega apelido e cor do autor
- [ ] Mensagem de sistema continua sem autor
- [ ] Mudança posterior no jogador (sair, ser expulso, virar host, trocar cor) não altera mensagem já registrada
- [ ] Gate: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): grava apelido e cor do autor na mensagem de chat`

---

### T3: Mínimo de 2 jogadores

**What**: Baixar o mínimo de 3 para 2 no início da rodada e na redistribuição.
**Where**: `server/games/quem-sou-eu/regras.ts`
**Depends on**: T1
**Requirement**: `AJU-06`, `AJU-07`, `AJU-08`

**Done when**:
- [ ] `MIN_JOGADORES` é 2 e o início com 2 ativos é aceito
- [ ] Início com 1 ativo é recusado
- [ ] Redistribuição que deixaria menos de 2 cancela a partida e volta ao lobby
- [ ] Sorteio com exatamente 2 produz o ciclo A→B→A, sem ponto fixo, verificado em execução repetida
- [ ] Gate: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): permite partida com dois jogadores`

---

### T4: Remover a opção "continua jogando"

**What**: Quem descobre sempre sai do rodízio; a configuração deixa de existir.
**Where**: `server/games/quem-sou-eu/regras.ts`, `server/core/despacho.ts`
**Depends on**: T1
**Requirement**: `AJU-18`, `AJU-21`

**Done when**:
- [ ] Confirmação de declaração sempre remove do rodízio (`DESC-06`)
- [ ] Nenhum caminho de código lê `aoDescobrir`
- [ ] Comando `configurar` que traga o campo removido é ignorado sem alterar o estado
- [ ] Testes do comportamento antigo removidos **porque o requisito deixou de existir** — não porque falharam; cite `AJU-18` no commit
- [ ] Gate: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): quem descobre sempre sai do rodizio (AJU-18)`

---

### T5: A última pessoa continua jogando

**What**: Sobrando um jogador no rodízio, a partida segue com ele — sem avanço de vez e sem prazo.
**Where**: `server/games/quem-sou-eu/regras.ts`
**Depends on**: T4
**Requirement**: `AJU-09`, `AJU-10`, `AJU-11`, `AJU-12`, `AJU-13`, `AJU-14`

**Done when**:
- [ ] Confirmação que deixa exatamente um no rodízio **mantém** a sala em JOGO
- [ ] Com um só no rodízio, a vez continua com ele e o rodízio não avança
- [ ] Com um só no rodízio, o prazo de turno é limpo e nenhum novo é agendado
- [ ] Declaração confirmada do último revela todas as cartas e move para ENCERRADA
- [ ] Rodízio vazio por saída continua encerrando (`FIM-05` preservado)
- [ ] O teste antigo de `DESC-08` é substituído, com `AJU-09` citado no commit
- [ ] Gate: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): ultimo jogador continua ate declarar (AJU-09)`

---

### T6: Tempo por turno personalizado

**What**: Aceitar qualquer duração entre 10 segundos e 60 minutos.
**Where**: `server/core/despacho.ts`
**Depends on**: T1
**Requirement**: `AJU-19`, `AJU-20`

**Done when**:
- [ ] Valores dentro da faixa são aceitos, incluindo os extremos
- [ ] Abaixo de 10s e acima de 60min são recusados e a configuração anterior permanece
- [ ] `null` (sem limite) continua válido
- [ ] Valor não inteiro ou não numérico é recusado
- [ ] Gate: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): aceita tempo de turno personalizado`

---

### T7: Integração das novas regras

**What**: Provar no workerd, ponta a ponta, o que as regras puras passaram a permitir.
**Where**: `server/core/sala-do.integration.test.ts` (ou arquivo próprio)
**Depends on**: T5, T6, T2
**Requirement**: `AJU-06`, `AJU-09`, `AJU-13`, `AJU-16`

**Done when**:
- [ ] Partida completa com **2 jogadores**, do lobby ao encerramento
- [ ] Com 3 jogadores, dois descobrem e o terceiro **continua** com a vez, sem prazo agendado
- [ ] A declaração do último revela todas as cartas e leva a ENCERRADA
- [ ] Mensagem de quem **saiu da sala** continua exibindo apelido e cor no chat de quem ficou
- [ ] Gate: `npm run test:unit && npm run test:integration`

**Tests**: integration · **Gate**: full
**Commit**: `test(core): cobre partida em dois e ultimo jogador ponta a ponta`

---

### T8: Sessão guarda apelido e reentra sozinha

**What**: Guardar o apelido junto do token e reconectar sem passar pela tela de entrada.
**Where**: `client/src/estado/sessao.ts`, `client/src/estado/conexao.tsx`, `client/src/App.tsx`
**Depends on**: T1
**Requirement**: `AJU-01`, `AJU-02`, `AJU-03`, `AJU-04`, `AJU-05`

**Done when**:
- [ ] O apelido é guardado por sala, junto do token, e lido de volta
- [ ] Abrir URL com código tendo token para **aquele** código entra direto, sem formulário
- [ ] Token de **outra** sala não é usado
- [ ] `visibilitychange` para visível com socket fechado reconecta na hora, sem esperar backoff; com socket aberto não faz nada
- [ ] Token recusado é descartado e a tela de entrada aparece com o motivo
- [ ] Enquanto reconecta, nenhum formulário de entrada é exibido
- [ ] A lógica pura fica em `sessao.ts` **com teste unitário**; o provider só a consome
- [ ] Gate: `npm run test:unit` e build

**Tests**: unit · **Gate**: quick
**Commit**: `feat(client): reentra na sala automaticamente`

---

### T9: Bloco de notas com digitação local

**What**: Estado local imediato, envio adiado, sem sobrescrever o que está sendo digitado.
**Where**: `client/src/estado/` (novo módulo), `client/src/componentes/BlocoDeNotas.tsx`
**Depends on**: T1
**Requirement**: `AJU-22`, `AJU-23`, `AJU-24`, `AJU-25`

**Done when**:
- [ ] Cada tecla aparece imediatamente, sem esperar o servidor
- [ ] O cursor não é reposicionado e nenhum caractere é descartado
- [ ] O envio acontece depois da pausa na digitação, não a cada tecla
- [ ] Projeção com notas diferentes **não** sobrescreve o texto em edição
- [ ] Projeção é aceita quando o campo não está em edição (ex.: após reconectar)
- [ ] A lógica fica em módulo próprio de `client/src/estado/` **com teste unitário**
- [ ] Gate: `npm run test:unit` e build

**Tests**: unit · **Gate**: quick
**Commit**: `fix(client): corrige digitacao no bloco de notas`

---

### T10: Cronômetro não passa do teto

**What**: Limitar o tempo exibido à duração configurada.
**Where**: `client/src/estado/relogio.ts`
**Depends on**: T1
**Requirement**: `AJU-31`, `AJU-32`

**Done when**:
- [ ] Turno de 30s nunca exibe `0:31`, mesmo com o restante calculado acima de 30.000 ms
- [ ] Restante entre 1 ms e 1.000 ms continua exibindo `0:01`
- [ ] `0:00` só aparece com restante zero
- [ ] Sem duração configurada, o comportamento atual é preservado
- [ ] Gate: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `fix(client): limita o cronometro a duracao do turno`

> A causa é a defasagem entre o relógio do cliente e o do servidor com `Math.ceil`. **Não troque o arredondamento** — `ceil` é o que sustenta `AJU-32`.

---

### T11: Travar os campos no limite

**What**: Impedir digitação além do limite no próprio campo, mantendo a validação do servidor.
**Where**: `client/src/componentes/CampoDeTexto.tsx` e os pontos de uso
**Depends on**: T9
**Requirement**: `AJU-26`

**Done when**:
- [ ] Apelido 16, carta 60, chat 300, notas 2.000 travados no campo
- [ ] Colar texto maior trunca no limite
- [ ] **Nenhuma validação de servidor foi removida ou afrouxada** — verificar e afirmar no relatório
- [ ] Gate: build

**Tests**: none · **Gate**: build
**Commit**: `feat(client): trava os campos no limite de caracteres`

---

### T12: Cabeçalho alinhado com ícone de tema

**What**: Corrigir o alinhamento e trocar o texto "Tema escuro" por ícone de sol/lua.
**Where**: `client/src/componentes/Shell.tsx`
**Depends on**: T1
**Requirement**: `AJU-27`, `AJU-28`

**Done when**:
- [ ] Os elementos do cabeçalho ficam alinhados entre si em 360px, 768px e 1280px
- [ ] O alternador é um ícone (sol e lua) com rótulo acessível
- [ ] Verificado no navegador, nos dois temas
- [ ] Gate: build

**Tests**: none · **Gate**: build
**Commit**: `fix(client): alinha o cabecalho e usa icone no alternador de tema`

---

### T13: Chat com altura fixa e rolagem

**What**: Conter o chat em altura limitada com rolagem própria.
**Where**: `client/src/componentes/Chat.tsx`
**Depends on**: T2, T12
**Requirement**: `AJU-29`, `AJU-30`, `AJU-16`

**Done when**:
- [ ] O chat não alonga a página, em nenhuma largura
- [ ] Rolagem acontece dentro do painel
- [ ] Mensagem nova rola para o fim quando já se está no fim
- [ ] Quem rolou para cima **não** é arrastado de volta
- [ ] O apelido exibido vem da mensagem; o literal `'quem saiu'` deixa de existir
- [ ] Verificado no navegador com chat cheio
- [ ] Gate: build

**Tests**: none · **Gate**: build
**Commit**: `fix(client): limita a altura do chat e preserva o autor`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1
Phase 2:  T2 → T3 → T4 → T5 → T6
Phase 3:  T7
Phase 4:  T8 → T9 → T10
Phase 5:  T11 → T12 → T13
```

---

## Task Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T1 | 1 arquivo de contrato | ✅ |
| T2, T3, T6 | 1 módulo cada | ✅ |
| T4, T5 | 1 arquivo (`regras.ts`), uma mudança de regra por task | ⚠️ Coeso — seams reais (remover opção → novo desfecho) |
| T7 | 1 suíte de integração | ✅ |
| T8 | 1 fluxo (sessão + reentrada) | ⚠️ Coeso — o módulo e o consumo não se testam separados |
| T9, T10 | 1 módulo cada | ✅ |
| T11, T12, T13 | 1 componente cada | ✅ |

Nenhum ❌.

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1 | None | início | ✅ |
| T2 | T1 | fase anterior | ✅ |
| T3 | T1 | fase anterior | ✅ |
| T4 | T1 | fase anterior | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T1 | fase anterior | ✅ |
| T7 | T5, T6, T2 | fases anteriores | ✅ |
| T8 | T1 | fase anterior | ✅ |
| T9 | T1 | fase anterior | ✅ |
| T10 | T1 | fase anterior | ✅ |
| T11 | T9 | fase anterior | ✅ |
| T12 | T1 | fase anterior | ✅ |
| T13 | T2, T12 | T12 → T13 | ✅ |

Nenhuma dependência aponta para fase posterior.

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| ---- | ------ | ------------ | -------- | ------ |
| T1 | L6 | none | none | ✅ |
| T2 | L2 | unit | unit | ✅ |
| T3 | L1 | unit | unit | ✅ |
| T4 | L1 + L2 | unit | unit | ✅ |
| T5 | L1 | unit | unit | ✅ |
| T6 | L2 | unit | unit | ✅ |
| T7 | L3 | integration | integration | ✅ |
| T8 | L4 | unit | unit | ✅ |
| T9 | L4 | unit | unit | ✅ |
| T10 | L4 | unit | unit | ✅ |
| T11 | L5 | none | none | ✅ |
| T12 | L5 | none | none | ✅ |
| T13 | L5 | none | none | ✅ |

Nenhuma ❌ VIOLATION.

## Requirement Coverage

| Requisitos | Tasks |
| ---------- | ----- |
| `AJU-01`…`AJU-05` | T8 |
| `AJU-06`…`AJU-08` | T3, T7 |
| `AJU-09`…`AJU-14` | T5, T7 |
| `AJU-15`…`AJU-17` | T1, T2, T7, T13 |
| `AJU-18`…`AJU-21` | T1, T4, T6 |
| `AJU-22`…`AJU-26` | T9, T11 |
| `AJU-27`…`AJU-30` | T12, T13 |
| `AJU-31`…`AJU-32` | T10 |

**32 de 32 requisitos mapeados. Nenhum órfão.**
