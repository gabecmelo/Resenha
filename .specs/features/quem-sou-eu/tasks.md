# Quem Sou Eu? — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/quem-sou-eu/design.md`
**Status**: In Progress

## Progresso

| Lote | Tasks | Estado | Commits |
| ---- | ----- | ------ | ------- |
| 1 | T1–T8 (fases 1–2) | ✅ Completo | `a6913cd` … `3252ef2` + correções `fdafd2b`, `85d9fb6` |
| 2 | T9–T14 (fase 3) | ✅ Completo | `35e399a` … `05324b8` + correção `3beb637` |
| 3 | T15–T20 (fase 4) | ✅ Completo | `25fd1e9` … `d528e5c` |
| 4 | T21–T28 (fases 5–6) | Bloqueado — aguarda `design/handoff/` a partir do T23 | — |
| 5 | T29–T30 (fase 7) | Pendente | — |

**Servidor completo.** Todos os requisitos de servidor (SALA, HOST, ESCR, JOGO, DESC, FIM, CFG, CONN, CHAT, NOTA) estão implementados e verdes. O que falta é cliente.

**Testes acumulados:** 251 unit + 64 integração, 0 falhas.

**Pendências do lote 2 — todas resolvidas no lote 3:** roteamento de `{t:'notas'}` ao reducer do jogo, montagem do `ModuloDeJogo` (injetado em `server/index.ts`, único ponto onde `core` encontra `games`) e aplicação de `promoverAguardando` pelo `core`.

**Desvios registrados no lote 1** (aceitos pelo orquestrador):
- `@cloudflare/vitest-pool-workers` v0.20 removeu `defineWorkersConfig` e o subpath `/config`; a configuração passou a ser o plugin Vite `cloudflareTest()`. Confirmado no `.d.ts` publicado.
- `EstadoSala<E>` ficou genérico no jogo — o tipo do `design.md` acoplava `core` a `EstadoQuemSouEu`, violando AD-002. **O design.md está desatualizado nesse ponto.**
- `ResultadoReducer` ganhou variante de falha (`ESCR-03` exige que o jogo recuse carta inválida).
- `reconectar` devolve `Resultado` em vez de `Jogador | null`, para distinguir token banido de token desconhecido (`CONN-04`).

---

## Test Coverage Matrix

> Gerada a partir do spec e da escolha do usuário. Guidelines encontradas: **nenhuma** — repositório greenfield, sem `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `package.json` ou config de teste. Defaults fortes aplicados: todo AC e todo edge case listado tem teste.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| **L1** Regras de jogo puras — `server/games/**` | unit | Todas as branches; 1:1 com os ACs do spec; todo edge case listado tem teste | `server/**/*.test.ts` | `npm run test:unit` |
| **L2** Núcleo puro — `server/core/{roster,prazos,chat,codigo,despacho}.ts` | unit | Todas as branches; 1:1 com os ACs; todo edge case listado | `server/**/*.test.ts` | `npm run test:unit` |
| **L3** Casca da plataforma — `server/core/{sala-do,conexoes,estado}.ts`, `server/index.ts` | integration | Todas as rotas e handlers: caminho feliz + todo edge case + caminhos de erro; hibernação, alarme e persistência exercitados de verdade no workerd | `server/**/*.integration.test.ts` | `npm run test:integration` |
| **L4** Lógica pura do cliente — `client/src/estado/*.ts` (exceto provider React) | unit | Todas as branches; ACs de sessão e reconexão | `client/**/*.test.ts` | `npm run test:unit` |
| **L5** Componentes e telas React — `client/src/**/*.tsx` | none | Build gate + UAT interativo | — | build gate |
| **L6** Config e tipos — `protocolo.ts`, `wrangler.jsonc`, `vite.config.ts`, `tsconfig` | none | Build gate | — | build gate |

**Por que L5 é `none`:** por decisão de arquitetura (AD-008) o cliente não contém regra de jogo — ele renderiza a projeção que recebe. Toda a lógica testável vive em L1/L2/L3. O que sobra em L5 é apresentação, coberta pelo build gate e pelo UAT interativo com o Claude Browser ao fim do Execute. Isso é uma decisão consciente, não uma lacuna: se durante a implementação algum componente acumular lógica de decisão, essa lógica é extraída para L4 e testada.

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tasks só com testes unit | `npm run test:unit` |
| Full | Após tasks com testes de integração | `npm run test:unit && npm run test:integration` |
| Build | Fim de fase, ou tasks só de config/tipos | `npm run typecheck && npm run lint && npm test` |

---

## Execution Plan

Fases são ordenadas e rodam em sequência; tasks dentro de uma fase rodam em ordem.

### Phase 1: Fundação do projeto (4 tasks)

```
T1 → T2 → T3 → T4
```

### Phase 2: Núcleo puro da sala (4 tasks)

```
T5 → T6 → T7 → T8
```

### Phase 3: Regras do jogo (6 tasks)

```
T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 4: Plataforma e integração (6 tasks)

```
T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 5: Fundação do cliente (3 tasks)

```
T21 → T22 → T23
```

### Phase 6: Telas (5 tasks)

```
T24 → T25 → T26 → T27 → T28
```

### Phase 7: Acabamento (2 tasks)

```
T29 → T30
```

---

## Task Breakdown

### T1: Scaffold do projeto

**What**: Estrutura de pastas, `package.json`, TypeScript, Vite + React + Tailwind, ESLint.
**Where**: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `client/`, `server/`, `.gitignore`
**Depends on**: None
**Requirement**: — (fundação)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `client/` e `server/` existem com a fronteira `server/core/` e `server/games/quem-sou-eu/` (AD-002)
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` existem e passam num projeto vazio
- [ ] Tailwind aplicado numa página de teste

**Tests**: none · **Gate**: build
**Commit**: `chore: inicializa projeto com vite, react, typescript e tailwind`

---

### T2: Configurar Worker, Durable Object e assets

**What**: `wrangler.jsonc` com o binding do Durable Object usando migração **`new_sqlite_classes`**, assets estáticos em modo SPA, e o plugin Vite da Cloudflare.
**Where**: `wrangler.jsonc`, `vite.config.ts` (modificar)
**Depends on**: T1
**Requirement**: — (fundação, habilita `CONN-05`)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A migração usa **`new_sqlite_classes`** — verificado lendo o arquivo; `new_classes` é irreversível e inutiliza o namespace no plano free
- [ ] `not_found_handling` está em `"single-page-application"`
- [ ] `wrangler deploy --dry-run` passa
- [ ] `npm run build` gera front e worker juntos

**Tests**: none · **Gate**: build
**Commit**: `chore: configura worker, durable object sqlite e assets spa`

> ⚠️ Task isolada de propósito. O tipo de storage do namespace é **imutável** — errar aqui obriga a recriar o namespace com outro nome de classe.

---

### T3: Infraestrutura de testes

**What**: Vitest para unit e `@cloudflare/vitest-pool-workers` para integração, com os scripts do Gate Check.
**Where**: `vitest.config.ts`, `vitest.integration.config.ts`, `package.json` (modificar)
**Depends on**: T2
**Requirement**: — (fundação)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run test:unit` e `npm run test:integration` rodam com suíte vazia e saem com código 0
- [ ] Um teste de fumaça de integração instancia um Durable Object e lê/escreve no storage
- [ ] `npm test` roda as duas suítes

**Tests**: none · **Gate**: build
**Commit**: `chore: configura vitest e vitest-pool-workers`

---

### T4: Tipos do protocolo

**What**: Contrato compartilhado entre cliente e servidor — `Comando`, `Mensagem`, `Projecao`, `EstadoSala`, `Config`, `Fase`, `CodigoErro`, e a interface `ModuloDeJogo`.
**Where**: `shared/protocolo.ts`
**Depends on**: T1
**Requirement**: — (habilita todos)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Todos os tipos do `design.md` declarados, incluindo `ModuloDeJogo` com as três funções puras (AD-009)
- [ ] Importável por `client/` e por `server/`
- [ ] `npm run typecheck` passa

**Tests**: none · **Gate**: build
**Commit**: `feat(protocolo): define contrato entre cliente e servidor`

---

### T5: Roster da sala

**What**: Entrada, validação de apelido, cor única, situação, reconexão, expulsão, transferência e migração de host — funções puras sobre o documento da sala.
**Where**: `server/core/roster.ts`
**Depends on**: T4
**Requirement**: `SALA-03`, `SALA-04`, `SALA-05`, `SALA-07`, `SALA-09`, `SALA-10`, `HOST-02`, `HOST-03`, `HOST-04`, `HOST-05`, `CONN-02`, `CONN-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Apelido de 2 a 16 caracteres; só espaços é recusado; duplicado é recusado
- [ ] 21º jogador recusado
- [ ] Cor atribuída nunca repete na sala
- [ ] Entrada em `lobby` gera `ativo`; nas demais fases gera `aguardando`
- [ ] Reconexão por `tokenHash` devolve o mesmo jogador; token banido é recusado
- [ ] `migrarHost` escolhe o conectado há mais tempo; ex-host que volta é jogador comum
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~22 testes passam (sem deleções silenciosas)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): implementa roster de jogadores da sala`

---

### T6: Agendador de prazos

**What**: Multiplexação dos quatro prazos sobre o alarme único do Durable Object (parte pura: definir, listar vencidos, calcular o menor).
**Where**: `server/core/prazos.ts`
**Depends on**: T4
**Requirement**: `JOGO-07`, `HOST-04`, `CONN-07`, `CONN-08` (AD-010)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Definir um prazo nunca apaga outro
- [ ] `vencidos()` devolve todos os prazos com vencimento ≤ agora, e só eles
- [ ] `menorPrazo()` devolve o próximo vencimento, ou `null` quando não há nenhum
- [ ] Limpar um prazo recalcula corretamente o próximo
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~10 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): implementa agendador de prazos da sala`

---

### T7: Chat da sala

**What**: Mensagens de jogador com limite de taxa e retenção, e mensagens de sistema.
**Where**: `server/core/chat.ts`
**Depends on**: T4
**Requirement**: `CHAT-01`, `CHAT-02`, `CHAT-03`, `CHAT-05`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Mensagem acima de 300 caracteres é recusada
- [ ] A 6ª mensagem em 5 segundos é descartada e só o autor é avisado
- [ ] Passados os 5 segundos, o jogador volta a enviar
- [ ] Ao passar de 200 mensagens, as mais antigas saem e o total para em 200
- [ ] Mensagem de sistema é marcada como tal e não conta no limite de taxa
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~12 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): implementa chat da sala com limite de taxa`

---

### T8: Código de sala

**What**: Geração e validação do código de 5 letras.
**Where**: `server/core/codigo.ts`
**Depends on**: T4
**Requirement**: `SALA-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Gera 5 letras maiúsculas do alfabeto sem `I`, `O`, `0` e `1`
- [ ] Validação recusa comprimento errado e caracteres fora do alfabeto
- [ ] Normaliza entrada em minúsculas para maiúsculas
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~7 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): implementa geracao e validacao de codigo de sala`

---

### T9: Sorteio de alvos

**What**: Permutação sem ponto fixo por ciclo aleatório único.
**Where**: `server/games/quem-sou-eu/sorteio.ts`
**Depends on**: T4
**Requirement**: `ESCR-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Nenhum jogador é alvo de si mesmo, verificado em execução repetida (≥500 sorteios)
- [ ] Todo jogador é alvo de exatamente um escritor
- [ ] Funciona com o mínimo de 3 e com o máximo de 20
- [ ] Não há caminho de falha nem retry
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~7 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): implementa sorteio de alvos sem ponto fixo`

---

### T10: Regras da fase de escrita

**What**: `iniciarRodada`, escrever carta, marcar/desmarcar PRONTO, redistribuição por saída, cancelar.
**Where**: `server/games/quem-sou-eu/regras.ts`
**Depends on**: T9, T5
**Requirement**: `ESCR-01`…`ESCR-10`, `HOST-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Iniciar com menos de 3 ativos é recusado
- [ ] Carta acima de 60 caracteres ou só com espaços é recusada; quebras de linha são normalizadas
- [ ] `Começar` só é permitido com todos os ativos PRONTO
- [ ] Desmarcar PRONTO libera a edição enquanto a fase é `escrita`
- [ ] Saída de um ativo descarta todas as cartas, sorteia alvos novos e zera todos os PRONTO
- [ ] Redistribuição que deixaria menos de 3 ativos cancela a partida e volta ao lobby
- [ ] Entrada de novo jogador durante a escrita **não** redistribui e marca que há alguém aguardando
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~24 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): implementa regras da fase de escrita`

---

### T11: Regras de turnos

**What**: Ordem do rodízio, passar a vez, pular a vez, expiração por tempo, saída do jogador da vez.
**Where**: `server/games/quem-sou-eu/regras.ts` (modificar)
**Depends on**: T10, T6
**Requirement**: `JOGO-03`…`JOGO-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Ordem respeita a config (`sorteada` ou `entrada`)
- [ ] Só o jogador da vez e o host avançam a vez; qualquer outro é rejeitado
- [ ] Fim da ordem volta ao primeiro que ainda está no rodízio
- [ ] Prazo de turno vencido avança a vez; config "sem limite" nunca avança por tempo
- [ ] Saída do jogador da vez avança a vez
- [ ] Jogador desconectado mantém a vez (não é pulado automaticamente)
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~20 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): implementa rodizio de turnos`

---

### T12: Regras do "Descobri!"

**What**: Declaração, confirmação e negativa, com as duas configurações de rodízio.
**Where**: `server/games/quem-sou-eu/regras.ts` (modificar)
**Depends on**: T11
**Requirement**: `DESC-01`…`DESC-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Declarar coloca em pendente e **não** revela a carta
- [ ] O confirmador é o host; quando quem declara é o host, é o outro jogador conectado há mais tempo
- [ ] Confirmar revela a carta ao declarante e o marca como "descobriu"
- [ ] Negar descarta a declaração sem revelar e permite declarar de novo
- [ ] Config `sai` remove do rodízio; config `continua` mantém
- [ ] Com `sai`, ficar com menos de 2 no rodízio encerra a partida
- [ ] Declarar duas vezes não altera o estado
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~20 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): implementa declaracao de descoberta com confirmacao`

---

### T13: Regras de encerramento e nova partida

**What**: Encerrar, revelação geral, nova partida, encerramento automático por esvaziamento, limpeza de notas.
**Where**: `server/games/quem-sou-eu/regras.ts` (modificar)
**Depends on**: T12
**Requirement**: `FIM-01`…`FIM-05`, `NOTA-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Encerrar leva a `encerrada` e marca todas as cartas como reveladas
- [ ] Nova partida volta ao lobby, promove os `aguardando` a `ativo` e limpa cartas, alvos, "descobriu" e notas
- [ ] Nova partida preserva jogadores, apelidos, cores, chat e configurações
- [ ] Saída de todos os ativos durante o jogo encerra a partida e volta ao lobby
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~14 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): implementa encerramento e nova partida`

---

### T14: Projeção por jogador

**What**: Montagem do que **um** jogador pode ver — o guardião do `JOGO-02`.
**Where**: `server/games/quem-sou-eu/projecao.ts`
**Depends on**: T13
**Requirement**: `JOGO-01`, `JOGO-02`, `ESCR-02`, `ESCR-04`, `DESC-02`, `DESC-03`, `NOTA-01`, `NOTA-02`, `CHAT-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A projeção traz a carta de todos os outros jogadores ativos
- [ ] **Teste de não-vazamento**: para cada jogador, serializar a projeção inteira e falhar se o texto da carta dele aparecer em qualquer lugar do payload — inclusive em campos aninhados
- [ ] O não-vazamento se mantém em todas as fases e com declaração pendente
- [ ] Após confirmação, a carta do declarante aparece **só** na projeção dele
- [ ] Após `FIM-02`, todas as cartas aparecem para todos, inclusive para quem está aguardando
- [ ] A projeção traz o alvo e a carta escrita pelo jogador, e nunca as notas de outro
- [ ] `souConfirmador` verdadeiro só para quem deve confirmar
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~22 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(quem-sou-eu): implementa projecao por jogador`

> Task mais crítica do projeto. O teste de não-vazamento é sobre o payload serializado inteiro, não sobre um campo específico — asserção sobre um campo passaria se a carta vazasse por outro caminho.

---

### T15: Persistência do documento da sala

**What**: `carregar`, `salvar` e `destruir` sobre o storage do Durable Object.
**Where**: `server/core/estado.ts`
**Depends on**: T4, T3
**Requirement**: `CONN-05`, `SALA-06` (AD-005)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `carregar` devolve `null` num DO nunca inicializado
- [ ] Round-trip preserva o documento inteiro, incluindo `Record` aninhados e o chat
- [ ] `destruir` esvazia o storage e faz `carregar` voltar a `null`
- [ ] Gate check passa: `npm run test:unit && npm run test:integration`
- [ ] Test count: ~8 testes passam

**Tests**: integration · **Gate**: full
**Commit**: `feat(core): implementa persistencia do documento da sala`

---

### T16: Registro de conexões

**What**: Vínculo socket → jogador via `serializeAttachment` e difusão de projeções.
**Where**: `server/core/conexoes.ts`
**Depends on**: T15
**Requirement**: `CONN-02`, `CONN-05`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O vínculo socket → `jogadorId` sobrevive à hibernação do Durable Object
- [ ] `difundir` envia uma projeção distinta por socket conectado
- [ ] Socket sem vínculo é ignorado sem derrubar a difusão
- [ ] Dois sockets do mesmo jogador recebem a mesma projeção
- [ ] Gate check passa: `npm run test:unit && npm run test:integration`
- [ ] Test count: ~9 testes passam

**Tests**: integration · **Gate**: full
**Commit**: `feat(core): implementa registro de conexoes com hibernacao`

---

### T17: Despacho de comandos e autoridade

**What**: Validação de autoridade e de fase, roteamento para `core` ou para o módulo de jogo, aplicação de configurações e notas.
**Where**: `server/core/despacho.ts`
**Depends on**: T14, T7, T8
**Requirement**: `HOST-06`, `JOGO-06`, `CFG-01`…`CFG-06`, `NOTA-01`, `CONN-06`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Comando de host vindo de não-host é rejeitado e o estado fica intocado
- [ ] Comando inválido para a fase atual é rejeitado
- [ ] Jogador `aguardando` tem qualquer ação de partida rejeitada
- [ ] Configuração só é alterável no lobby e só pelo host; padrões são sorteada / sai / sem limite
- [ ] Notas acima de 2.000 caracteres são recusadas e nunca chegam a outro jogador
- [ ] `sair` libera a vaga e invalida o token daquela sala
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~24 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): implementa despacho de comandos com verificacao de autoridade`

---

### T18: Durable Object da sala

**What**: A classe do DO — upgrade de WebSocket, handlers de mensagem/fechamento/erro, handler de alarme.
**Where**: `server/core/sala-do.ts`
**Depends on**: T16, T17, T6
**Requirement**: `CONN-01`, `CONN-03`, `CONN-05`, `HOST-04`, `JOGO-07`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Conectar emite token de sessão e devolve a projeção inicial
- [ ] Queda de socket marca desconectado e difunde, preservando a vaga
- [ ] Reconexão com token válido devolve a mesma vaga, com carta, alvo, notas e posição no rodízio
- [ ] Host desconectado por 30s dispara migração automática e anuncia
- [ ] Prazo de turno vencido avança a vez mesmo com o DO tendo hibernado
- [ ] O construtor recarrega o estado do storage — nenhum campo mutável de sala vive em campo de instância
- [ ] JSON malformado é descartado sem derrubar o socket
- [ ] Gate check passa: `npm run test:unit && npm run test:integration`
- [ ] Test count: ~20 testes passam

**Tests**: integration · **Gate**: full
**Commit**: `feat(core): implementa durable object da sala`

---

### T19: Rotas do Worker

**What**: `POST /api/salas` (criar), `GET /api/salas/:codigo/ws` (upgrade) e entrega dos assets estáticos.
**Where**: `server/index.ts`
**Depends on**: T18
**Requirement**: `SALA-01`, `SALA-02`, `SALA-05`, `SALA-06`, `CONN-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Criar devolve um código único e inicializa o Durable Object
- [ ] Upgrade em código inexistente devolve `SALA_NAO_ENCONTRADA` e fecha
- [ ] Upgrade em sala cheia é recusado
- [ ] Token banido é recusado no handshake
- [ ] Requisição sem header de upgrade devolve 426
- [ ] Colisão de código gera outro código
- [ ] Gate check passa: `npm run test:unit && npm run test:integration`
- [ ] Test count: ~14 testes passam

**Tests**: integration · **Gate**: full
**Commit**: `feat(server): implementa rotas de criacao e conexao de sala`

---

### T20: Expiração da sala

**What**: Destruição por sala vazia (30 min) e por ociosidade (6 h), ponta a ponta pelo alarme.
**Where**: `server/core/sala-do.ts` (modificar), `server/core/prazos.ts` (modificar)
**Depends on**: T19
**Requirement**: `CONN-07`, `CONN-08`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] 30 min sem nenhuma conexão destrói a sala e libera o código
- [ ] 6 h sem nenhuma ação destrói a sala mesmo com sockets abertos
- [ ] Uma reconexão dentro da janela cancela a expiração por sala vazia
- [ ] Após a destruição, o mesmo código volta a ser "sala não encontrada"
- [ ] Agendar o prazo de turno não cancela os prazos de expiração
- [ ] Gate check passa: `npm run test:unit && npm run test:integration`
- [ ] Test count: ~10 testes passam

**Tests**: integration · **Gate**: full
**Commit**: `feat(core): implementa expiracao automatica de salas`

---

### T21: Sessão e reconexão no cliente

**What**: Guarda do token por código de sala e política de reconexão com backoff.
**Where**: `client/src/estado/sessao.ts`
**Depends on**: T4
**Requirement**: `CONN-01`, `CONN-02`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Token guardado e lido por código de sala, sem vazar entre salas diferentes
- [ ] `localStorage` indisponível degrada para memória, sem quebrar
- [ ] Backoff cresce e satura num teto; reconexão bem-sucedida zera o contador
- [ ] Sair de uma sala apaga o token dela e só dela
- [ ] Gate check passa: `npm run test:unit`
- [ ] Test count: ~11 testes passam

**Tests**: unit · **Gate**: quick
**Commit**: `feat(client): implementa sessao e politica de reconexao`

---

### T22: Provider de conexão

**What**: Socket único da aplicação, envio de comandos e exposição da projeção ao React.
**Where**: `client/src/estado/conexao.tsx`
**Depends on**: T21
**Requirement**: `CONN-01`, `CONN-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `useProjecao()` devolve a projeção mais recente e `enviar()` despacha comandos
- [ ] Reconecta usando `sessao.ts` e reenvia `ola`
- [ ] Estado de conexão (conectando / conectado / reconectando / expirada) exposto aos componentes
- [ ] Nenhuma regra de jogo no cliente (AD-008)
- [ ] `npm run typecheck` e `npm run lint` passam

**Tests**: none · **Gate**: build
**Commit**: `feat(client): implementa provider de conexao websocket`

---

### T23: Componentes compartilhados

**What**: Carta, ficha de jogador, indicador de vez, chat, bloco de notas, modal, banner de conexão, botão.
**Where**: `client/src/componentes/`
**Depends on**: T22
**Requirement**: `SALA-07`, `VIS-03`, `VIS-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Todos os estados do `design-brief.md` implementados, incluindo a carta oculta
- [ ] A cor do jogador nunca é o único diferenciador — o apelido acompanha sempre
- [ ] Botão desabilitado exibe o motivo
- [ ] Segue o handoff de `design/handoff/` quando existir
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam

**Tests**: none · **Gate**: build
**Commit**: `feat(client): implementa componentes compartilhados`

---

### T24: Tela de Início

**What**: Criar sala, entrar por código, apelido e todos os estados de erro.
**Where**: `client/src/telas/Inicio.tsx`
**Depends on**: T23
**Requirement**: `SALA-01`…`SALA-06`, `SALA-08`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Código pré-preenchido quando se chega por link; foco vai para o apelido
- [ ] Erros de sala não encontrada, cheia, apelido inválido, apelido repetido, banido e expirada exibidos
- [ ] "Sala não encontrada" oferece criar sala ali mesmo
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam

**Tests**: none · **Gate**: build
**Commit**: `feat(client): implementa tela de inicio`

---

### T25: Tela de Lobby

**What**: Lista de jogadores, código e link, configurações, ações de host.
**Where**: `client/src/telas/Lobby.tsx`
**Depends on**: T24
**Requirement**: `SALA-07`…`SALA-09`, `HOST-01`, `HOST-02`, `HOST-03`, `CFG-01`…`CFG-06`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Botão de copiar link funciona; o código fica em destaque
- [ ] Iniciar desabilitado abaixo de 3 jogadores, com o motivo visível
- [ ] Configurações editáveis só pelo host; os demais veem em modo leitura
- [ ] Ações de host ausentes da tela de quem não é host
- [ ] Modal de expulsar nomeia a pessoa
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam

**Tests**: none · **Gate**: build
**Commit**: `feat(client): implementa tela de lobby`

---

### T26: Tela de Escrita

**What**: Alvo, campo da carta, PRONTO, progresso do grupo, avisos de redistribuição e de jogador aguardando.
**Where**: `client/src/telas/Escrita.tsx`
**Depends on**: T25
**Requirement**: `ESCR-02`…`ESCR-06`, `ESCR-09`, `ESCR-10`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O alvo fica inequívoco na tela
- [ ] Contador de caracteres e erro acima de 60
- [ ] PRONTO trava o campo, com caminho óbvio para desmarcar e editar
- [ ] Progresso "N de M prontos" sem revelar conteúdo
- [ ] Aviso de redistribuição impossível de ignorar
- [ ] Aviso ao host de jogador aguardando, explicando que Cancelar permite incluí-lo
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam

**Tests**: none · **Gate**: build
**Commit**: `feat(client): implementa tela de escrita das cartas`

---

### T27: Tela de Partida

**What**: Lista de cartas com a própria oculta, vez, contagem regressiva, "Descobri!", ações de host, chat e notas.
**Where**: `client/src/telas/Jogo.tsx`
**Depends on**: T26
**Requirement**: `JOGO-01`, `JOGO-03`…`JOGO-11`, `DESC-01`…`DESC-07`, `NOTA-01`, `CHAT-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A própria carta aparece como espaço guardado, não como erro
- [ ] Contagem regressiva calculada a partir do timestamp absoluto da projeção
- [ ] Declaração pendente tem três visões distintas: declarante, confirmador e demais
- [ ] "Passei a vez" só aparece para quem é da vez
- [ ] Jogador desconectado e jogador que já descobriu ficam marcados
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam

**Tests**: none · **Gate**: build
**Commit**: `feat(client): implementa tela de partida`

---

### T28: Tela de Encerramento e estados globais

**What**: Revelação geral, nova partida, e as telas de conectando, reconectando, offline e sala expirada.
**Where**: `client/src/telas/Encerrada.tsx`, `client/src/telas/EstadosGlobais.tsx`
**Depends on**: T27
**Requirement**: `FIM-02`, `FIM-03`, `CONN-03`, `CONN-07`, `CONN-08`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Revelação mostra todas as cartas sem placar nem colocação
- [ ] "Nova partida" só para o host
- [ ] Reconexão comunica que a vaga está guardada, sem alarmar
- [ ] Sala expirada oferece caminho de volta ao início
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam

**Tests**: none · **Gate**: build
**Commit**: `feat(client): implementa encerramento e estados globais`

---

### T29: Responsividade e caso de 20 jogadores

**What**: Fechar os requisitos visuais em 360px e no caso de estresse.
**Where**: `client/src/componentes/`, `client/src/telas/` (modificar)
**Depends on**: T28
**Requirement**: `VIS-01`, `VIS-02`, `VIS-03`, `VIS-04`

**Tools**: MCP: `Claude_Browser` · Skill: NONE

**Done when**:
- [ ] Nenhuma tela rola horizontalmente em 360px
- [ ] Sala de 20 jogadores permanece legível e navegável em 360px, verificado no navegador
- [ ] O destaque de "é a sua vez" é inequívoco em todas as larguras
- [ ] Verificado também em 390px, 768px e 1280px
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam

**Tests**: none · **Gate**: build
**Commit**: `fix(client): ajusta responsividade e caso de 20 jogadores`

---

### T30: README e publicação

**What**: Instruções de desenvolvimento e deploy, e a primeira publicação na Cloudflare.
**Where**: `README.md`, `package.json` (modificar)
**Depends on**: T29
**Requirement**: — (entrega)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] README cobre rodar localmente, rodar os testes e publicar
- [ ] `npm run deploy` publica front e worker num comando
- [ ] Uma partida completa roda no ambiente publicado
- [ ] Gate check passa: `npm run typecheck && npm run lint && npm test`

**Tests**: none · **Gate**: build
**Commit**: `docs: adiciona readme e instrucoes de publicacao`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4
Phase 2:  T5 ──→ T6 ──→ T7 ──→ T8
Phase 3:  T9 ──→ T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14
Phase 4:  T15 ──→ T16 ──→ T17 ──→ T18 ──→ T19 ──→ T20
Phase 5:  T21 ──→ T22 ──→ T23
Phase 6:  T24 ──→ T25 ──→ T26 ──→ T27 ──→ T28
Phase 7:  T29 ──→ T30
```

Execução estritamente sequencial — sem paralelismo dentro da fase.

---

## Task Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T1 | 1 scaffold de projeto | ✅ Granular |
| T2 | 1 arquivo de config | ✅ Granular |
| T3 | 1 setup de teste | ✅ Granular |
| T4 | 1 arquivo de tipos | ✅ Granular |
| T5 | 1 módulo (roster) | ✅ Granular |
| T6 | 1 módulo (prazos) | ✅ Granular |
| T7 | 1 módulo (chat) | ✅ Granular |
| T8 | 1 módulo (código) | ✅ Granular |
| T9 | 1 função (sorteio) | ✅ Granular |
| T10–T13 | 1 arquivo (`regras.ts`), uma transição de estado por task | ⚠️ Coeso — mesmo arquivo, seams de dependência reais (escrita → turnos → descobri → fim) |
| T14 | 1 módulo (projeção) | ✅ Granular |
| T15–T16 | 1 módulo cada | ✅ Granular |
| T17 | 1 módulo (despacho) | ✅ Granular |
| T18 | 1 classe (DO) | ✅ Granular |
| T19 | 1 roteador | ✅ Granular |
| T20 | 1 comportamento (expiração) | ✅ Granular |
| T21–T22 | 1 módulo cada | ✅ Granular |
| T23 | 1 pasta de componentes compartilhados | ⚠️ Coeso — os componentes partilham os tokens do design system e não fazem sentido isolados |
| T24–T28 | 1 tela cada | ✅ Granular |
| T29 | 1 passe de responsividade | ✅ Granular |
| T30 | 1 entrega | ✅ Granular |

Nenhum ❌ — as duas marcas ⚠️ são coesão legítima, não escopo demais.

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| ---- | ------------------ | --------------- | ------ |
| T1 | None | início da Phase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T1 | T3 → T4 (mesma fase, ordem sequencial) | ✅ |
| T5 | T4 | T4 → T5 (fronteira de fase) | ✅ |
| T6 | T4 | T5 → T6 (mesma fase) | ✅ |
| T7 | T4 | T6 → T7 (mesma fase) | ✅ |
| T8 | T4 | T7 → T8 (mesma fase) | ✅ |
| T9 | T4 | T8 → T9 (fronteira de fase) | ✅ |
| T10 | T9, T5 | T9 → T10; T5 em fase anterior | ✅ |
| T11 | T10, T6 | T10 → T11; T6 em fase anterior | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T4, T3 | fases anteriores | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T14, T7, T8 | fases anteriores | ✅ |
| T18 | T16, T17, T6 | T17 → T18; T6 em fase anterior | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T4 | fase anterior | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 (fronteira de fase) | ✅ |
| T25 | T24 | T24 → T25 | ✅ |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T26 | T26 → T27 | ✅ |
| T28 | T27 | T27 → T28 | ✅ |
| T29 | T28 | T28 → T29 (fronteira de fase) | ✅ |
| T30 | T29 | T29 → T30 | ✅ |

Nenhuma dependência aponta para uma fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| ---- | ------------------------ | ------------ | -------- | ------ |
| T1 | L6 config | none | none | ✅ |
| T2 | L6 config | none | none | ✅ |
| T3 | L6 config | none | none | ✅ |
| T4 | L6 tipos | none | none | ✅ |
| T5 | L2 núcleo puro | unit | unit | ✅ |
| T6 | L2 núcleo puro | unit | unit | ✅ |
| T7 | L2 núcleo puro | unit | unit | ✅ |
| T8 | L2 núcleo puro | unit | unit | ✅ |
| T9 | L1 regras | unit | unit | ✅ |
| T10 | L1 regras | unit | unit | ✅ |
| T11 | L1 regras | unit | unit | ✅ |
| T12 | L1 regras | unit | unit | ✅ |
| T13 | L1 regras | unit | unit | ✅ |
| T14 | L1 regras | unit | unit | ✅ |
| T15 | L3 plataforma | integration | integration | ✅ |
| T16 | L3 plataforma | integration | integration | ✅ |
| T17 | L2 núcleo puro | unit | unit | ✅ |
| T18 | L3 plataforma | integration | integration | ✅ |
| T19 | L3 plataforma | integration | integration | ✅ |
| T20 | L3 plataforma | integration | integration | ✅ |
| T21 | L4 cliente puro | unit | unit | ✅ |
| T22 | L5 React | none | none | ✅ |
| T23 | L5 React | none | none | ✅ |
| T24–T28 | L5 React | none | none | ✅ |
| T29 | L5 React | none | none | ✅ |
| T30 | L6 config | none | none | ✅ |

Nenhuma ❌ VIOLATION. Nenhum `Tests: none` justificado por "testado em outra task".

---

## Requirement Coverage

| Categoria | Requisitos | Tasks |
| --------- | ---------- | ----- |
| SALA (10) | `SALA-01`…`SALA-10` | T5, T8, T19, T24, T25 |
| HOST (7) | `HOST-01`…`HOST-07` | T5, T10, T17, T18, T25 |
| ESCR (10) | `ESCR-01`…`ESCR-10` | T9, T10, T14, T26 |
| JOGO (11) | `JOGO-01`…`JOGO-11` | T11, T14, T18, T27 |
| DESC (9) | `DESC-01`…`DESC-09` | T12, T14, T27 |
| FIM (5) | `FIM-01`…`FIM-05` | T13, T28 |
| CFG (6) | `CFG-01`…`CFG-06` | T17, T25 |
| CONN (8) | `CONN-01`…`CONN-08` | T5, T15, T16, T18, T19, T20, T21, T22, T28 |
| CHAT (5) | `CHAT-01`…`CHAT-05` | T7, T14, T27 |
| NOTA (4) | `NOTA-01`…`NOTA-04` | T13, T14, T17, T27 |
| VIS (4) | `VIS-01`…`VIS-04` | T23, T27, T29 |

**79 de 79 requisitos mapeados. Nenhum órfão.**
