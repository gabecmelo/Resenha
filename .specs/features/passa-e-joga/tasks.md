# Passa e Joga Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/passa-e-joga/design.md`
**Status**: Concluída — T1 a T23 implementadas e commitadas na branch `feat/passa-e-joga`

**Linha de base antes da primeira task:** 894 testes unitários (34 arquivos) e 88 de integração, verdes. Toda contagem esperada abaixo parte daí.

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec — confirmar antes do Execute. Diretrizes encontradas: `.github/workflows/ci.yml` (os cinco portões), `vitest.config.ts`, `vitest.integration.config.ts`, `README.md` (§ testes). Não há `CLAUDE.md` nem `CONTRIBUTING.md` neste repositório.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra de jogo (`shared/jogos/*/regras.ts`, `projecao.ts`, `sorteio.ts`) | unit | Todos os ramos; 1:1 com as ACs da spec do jogo. **Nesta feature nenhuma regra muda** — os testes existentes são a rede da movimentação. | `shared/jogos/**/*.test.ts` | `npm run test:unit` |
| Núcleo compartilhado (`shared/jogos/aplicar.ts`, `prazos.ts`, `contrato.ts`) | unit | Todos os ramos; todo caso de borda listado no design | `shared/**/*.test.ts` | `npm run test:unit` |
| Motor local e módulos puros do cliente (`client/src/passaejoga/*.ts`) | unit | Todos os ramos; 1:1 com `PJ-11`–`PJ-21`, `PJ-26`, `PJ-32`–`PJ-35`; todo caso de erro da tabela de Error Handling | `client/src/passaejoga/*.test.ts` | `npm run test:unit` |
| Catálogo e conteúdo (`shared/jogos-catalogo.ts`, `jogos-conteudo.ts`) | unit | Invariantes do catálogo (id único, campos obrigatórios, o novo `passaEJoga`) | `shared/*.test.ts` | `npm run test:unit` |
| `core` e Durable Object (`server/core/**`) | integration | Caminhos já cobertos permanecem verdes; a extração de `aplicar` não pode mudar nenhum | `server/**/*.integration.test.ts` | `npm run test:integration` |
| Tela React (`client/src/**/*.tsx`) | none | Portão de build e lint, mais verificação ao vivo no navegador. **Amostragem:** nenhum `.tsx` do repositório tem teste; toda lógica testável do cliente vive em módulos puros (`client/src/estado/*.ts`, 8 arquivos de teste). O desenho desta feature segue o mesmo corte: `motor.ts`, `passagem.ts`, `nomes.ts` e `guarda.ts` carregam a lógica, e o `.tsx` só desenha. | — | portão de build |
| Build e páginas geradas (`scripts/paginas.ts`, `vite.config.ts`) | none | Portão de build: o arquivo é emitido e o sitemap o lista | — | `npm run build` |

## Gate Check Commands

> Gerados do código — confirmar antes do Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários apenas | `npm run test:unit` |
| Full | Tasks que tocam `server/core/**` ou o contrato compartilhado | `npm run typecheck && npm run test:unit && npm run test:integration` |
| Build | Fim de fase, tasks de tela e tasks de build/config | `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build` |

> Os cinco comandos do portão Build são exatamente os do `ci.yml`, na mesma ordem.
> **Sem `prettier`.** Este projeto não tem configuração de formatação; o estilo é a mão (aspas simples, sem ponto e vírgula). `npx prettier --write` reescreveria o repositório inteiro.

---

## Execution Plan

Fases ordenadas, sequenciais. Cada fase fecha antes da próxima começar.

### Fase 1: A mudança de casa

Movimentação e extração. Nenhum comportamento muda; a suíte existente é a prova.

```
T1 → T2 → T3 → T4
```

### Fase 2: O motor local

Tudo puro, testável sem React. É onde a feature de fato existe.

```
T5 → T6 → T7 → T8 → T9
```

### Fase 3: A porta e a mesa

Como se entra no modo e como se monta a partida.

```
T10 → T11 → T12 → T13 → T14 → T15
```

### Fase 4: As telas de jogo

A passagem e as quatro adaptações.

```
T16 → T17 → T18 → T19 → T20
```

### Fase 5: O acabamento

O que fecha a feature para o mundo.

```
T21 → T22 → T23
```

---

## Task Breakdown

### T1: Mover os jogos para `shared/jogos/`

**What**: `git mv server/games/* shared/jogos/`, com testes junto, e ajuste dos caminhos relativos de import (`../../../shared/` vira `../../`). Nenhuma edição de lógica.
**Where**: `shared/jogos/**` (novo), `server/games/**` (removido), `server/core/despacho.ts`, `server/core/sala-do.ts`, `server/index.ts`
**Depends on**: None
**Reuses**: os cinco módulos como estão
**Requirement**: `PJ-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `server/games/` não existe mais e nada importa de lá
- [x] `shared/jogos/registro.ts` continua sendo o único arquivo que nomeia jogos concretos (`AD-013`)
- [x] Nenhum arquivo em `shared/jogos/` importa de `server/`
- [x] Nenhum diff de lógica: o `git diff -M` mostra só renomeação e linhas de import
- [x] Portão passa: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- [x] Contagem: 894 unitários e 88 de integração — os mesmos de antes, nenhum a menos

**Tests**: unit (os que se mudam junto) · **Gate**: build
**Commit**: `refactor(jogos): muda os módulos de jogo de server/games para shared/jogos`

---

### T2: Extrair o contrato do jogo para `shared/jogos/contrato.ts`

**What**: `AvisoDeSala`, `EntradaDoJogo`, `JogoDaSala<E>` e `ComandoDeJogo` saem de `server/core/despacho.ts` para `shared/jogos/contrato.ts`. `despacho.ts` reexporta os quatro, para nenhum import do servidor mudar.
**Where**: `shared/jogos/contrato.ts` (novo), `server/core/despacho.ts` (modificado)
**Depends on**: T1
**Reuses**: as definições atuais, sem alteração
**Requirement**: `PJ-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Os quatro tipos vivem em `shared/jogos/contrato.ts` e só dependem de `shared/protocolo.ts`
- [x] `shared/jogos/registro.ts` importa `JogoDaSala` de `contrato.ts`, não de `server/`
- [x] `server/core/despacho.ts` reexporta os quatro; nenhum outro arquivo do servidor muda
- [x] Portão passa: `npm run typecheck && npm run test:unit && npm run test:integration`
- [x] Contagem: 894 e 88

**Tests**: none (só tipos; o portão de tipo é o teste) · **Gate**: full
**Commit**: `refactor(jogos): move o contrato entre core e jogo para shared`

---

### T3: Separar a parte pura de `prazos.ts`

**What**: `TIPOS_DE_PRAZO`, `definir`, `vencidos` e `menorPrazo` vão para `shared/jogos/prazos.ts`, com `prazos.test.ts` junto. `server/core/prazos.ts` fica só com `reagendar` e `FOLGA_DO_ALARME_MS` e reexporta o resto.
**Where**: `shared/jogos/prazos.ts` (novo), `shared/jogos/prazos.test.ts` (movido), `server/core/prazos.ts` (modificado)
**Depends on**: T2
**Reuses**: `server/core/prazos.ts` como está
**Requirement**: `PJ-12`, `PJ-14`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `reagendar` e `FOLGA_DO_ALARME_MS` continuam em `server/core/` — `AD-010` intacta, nenhum `setAlarm` em `shared/`
- [x] Os testes de `menorPrazo` e `vencidos` se mudam junto e continuam passando
- [x] Portão passa: `npm run typecheck && npm run test:unit && npm run test:integration`
- [x] Contagem: 894 e 88

**Tests**: unit · **Gate**: full
**Commit**: `refactor(prazos): separa o agendador puro do alarme do durable object`

---

### T4: Extrair `aplicar()` para `shared/jogos/aplicar.ts`

**What**: A `aplicar()` de `despacho.ts` vira função compartilhada com uma mudança de assinatura: em vez de escrever no chat, **devolve** `EventoDeJogo[]`. `despacho.ts` passa a chamá-la e registra os eventos devolvidos.
**Where**: `shared/jogos/aplicar.ts` (novo), `shared/jogos/aplicar.test.ts` (novo), `server/core/despacho.ts` (modificado)
**Depends on**: T3
**Reuses**: o corpo atual de `aplicar()`
**Requirement**: `PJ-11`, `PJ-12`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `aplicar` cobre os quatro efeitos com teste próprio: `estado`, `faseSeguinte`, cada prazo de `prazos` (inclusive `null` limpando), `eventos` devolvidos na ordem, e `promoverAguardando` promovendo todo mundo
- [x] Prazo não citado pelo jogo permanece intacto (`AD-010`) — teste dedicado
- [x] `despacho.ts` não tem mais lógica de aplicação; só chama e registra no chat
- [x] Portão passa: `npm run typecheck && npm run test:unit && npm run test:integration`
- [x] Contagem: 894 + os novos de `aplicar.test.ts`, e 88 de integração intactos

**Tests**: unit · **Gate**: full
**Commit**: `refactor(core): extrai a aplicação do resultado do reducer para shared`

---

### T5: A fila de passagem

**What**: `passagem.ts` puro: criar fila a partir da ordem da roda, revelar, avançar, saber se acabou. `revelado` zera **no mesmo despacho** que avança a posição.
**Where**: `client/src/passaejoga/passagem.ts`, `client/src/passaejoga/passagem.test.ts`
**Depends on**: T4
**Reuses**: `shared/protocolo.ts` (`JogadorId`)
**Requirement**: `PJ-17`, `PJ-18`, `PJ-19`, `PJ-21`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Fila nasce na ordem dos jogadores (a ordem da roda) e nomeia sempre um jogador só
- [x] Invariante testado: **nunca** existe estado com `revelado: true` e a posição recém-avançada
- [x] Fila de um item só funciona (troca de narrador dos Enigmas)
- [x] Fila terminada devolve "acabou" em vez de estourar índice
- [x] Portão passa: `npm run test:unit`
- [x] Contagem: suíte anterior + os novos, nenhum apagado

**Tests**: unit · **Gate**: quick
**Commit**: `feat(passa-e-joga): cria a fila de passagem do aparelho`

---

### T6: O motor local — iniciar, enviar e projetar

**What**: `motor.ts` com `iniciar`, `enviar` e `projetar`. Monta o `EstadoSala` local, resolve o jogo pelo registro compartilhado, despacha pelo `reduzir` e aplica com `aplicar()`.
**Where**: `client/src/passaejoga/motor.ts`, `client/src/passaejoga/motor.test.ts`
**Depends on**: T5
**Reuses**: `shared/jogos/registro.ts`, `shared/jogos/aplicar.ts`, `shared/protocolo.ts` (`CONFIG_PADRAO`, `EstadoSala`, `ContextoDeSala`)
**Requirement**: `PJ-11`, `PJ-12`, `PJ-13`, `PJ-15`, `PJ-16`, `PJ-31`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Os quatro jogos iniciam uma partida local com o mínimo de jogadores do catálogo, e recusam abaixo dele com o mesmo erro da sala (`PJ-31`)
- [x] Comando recusado devolve a mesa **idêntica** à anterior mais o código de erro — teste compara o objeto inteiro (`PJ-13`)
- [x] `projetar` projeta para `aparelhoCom` e não para outro jogador — teste com dois jogadores prova que a projeção muda quando o aparelho troca de mão (`PJ-16`)
- [x] Partida inteira de um dos jogos, do início ao encerramento, sem tocar em rede (`PJ-15`)
- [x] `ordemTurnos` é `entrada`, e `modoPergunta`/`visibilidadeVoto` ficam nos valores locais fixos do design
- [x] Portão passa: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(passa-e-joga): cria o motor local que roda a partida no navegador`

---

### T7: O prazo derivado do relógio

**What**: `cobrarPrazos(mesa, agora)` no motor: compara os prazos com o relógio e despacha `venceuPrazoTurno` uma vez só. Sem `setTimeout` de longa duração.
**Where**: `client/src/passaejoga/motor.ts` (modificado), `client/src/passaejoga/motor.test.ts` (modificado)
**Depends on**: T6
**Reuses**: `shared/jogos/prazos.ts` (`vencidos`), `client/src/estado/relogio.ts`
**Requirement**: `PJ-14`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Prazo vencido dispara **uma** vez; chamar de novo com o mesmo `agora` não dispara segunda
- [x] Um salto grande de relógio (tela apagada por dez minutos) dispara uma vez, não uma por segundo perdido
- [x] Sem prazo ativo, `cobrarPrazos` devolve a mesa intacta
- [x] Nenhum `setTimeout` maior que 1s no módulo — verificado por leitura, registrado em comentário
- [x] Portão passa: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(passa-e-joga): faz o prazo vencer pelo relógio, não por temporizador`

---

### T8: O pronto retido do Espião

**What**: No motor, o último `marcarPronto` da volta de revelação fica retido até o toque na tela de "todos prontos?". É o que impede o relógio de começar com o aparelho ainda circulando.
**Where**: `client/src/passaejoga/motor.ts` (modificado), `client/src/passaejoga/motor.test.ts` (modificado)
**Depends on**: T7
**Reuses**: `shared/jogos/espiao/regras.ts` (`prontos`, `rodadaIniciada`) — sem alterar
**Requirement**: `PJ-25`, `PJ-26`, `PJ-27`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Depois do último "esconder e passar", `rodadaIniciada` ainda é `false` e não há prazo de turno definido
- [x] O comando de começar dispara o pronto retido, `rodadaIniciada` vira `true` e o prazo nasce ali
- [x] O jogador que começa perguntando sai da projeção, não de sorteio novo do motor
- [x] `shared/jogos/espiao/regras.ts` não tem nenhuma linha alterada — verificado por `git diff`
- [x] Portão passa: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(passa-e-joga): segura o último pronto do espião até a mesa mandar começar`

---

### T9: A guarda em `localStorage`

**What**: `guarda.ts`: grava e lê a mesa, com `versao`. `revelado` nunca é serializado.
**Where**: `client/src/passaejoga/guarda.ts`, `client/src/passaejoga/guarda.test.ts`
**Depends on**: T8
**Reuses**: `client/src/estado/sessao.ts` (padrão de acesso ao `localStorage`)
**Requirement**: `PJ-20`, `PJ-32`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Ida e volta preserva a partida no mesmo ponto (`PJ-32`)
- [x] `revelado` volta sempre `false`, mesmo tendo sido `true` ao gravar (`PJ-20`)
- [x] `versao` diferente descarta em silêncio e devolve `null`
- [x] JSON quebrado devolve `null` sem lançar
- [x] `localStorage` indisponível (acesso lança) devolve `null` sem lançar
- [x] `jogoId` que não está no registro devolve `null`
- [x] Portão passa: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(passa-e-joga): guarda a partida local para sobreviver a um recarregamento`

---

### T10: `passaEJoga` no catálogo

**What**: `JogoCatalogo` ganha `passaEJoga?: boolean`; os quatro jogos o recebem, Cartas Contra a Turma não. Teste do invariante.
**Where**: `shared/jogos-catalogo.ts`, `shared/jogos-catalogo.test.ts`
**Depends on**: T9
**Reuses**: o catálogo como está
**Requirement**: `PJ-03`, `PJ-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Os quatro jogos marcados, Cartas não
- [x] Teste garante que todo jogo marcado existe no registro compartilhado — marcar sem implementar quebra a suíte
- [x] Portão passa: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): marca quais jogos rodam num aparelho só`

---

### T11: A validação da mesa

**What**: `nomes.ts` puro: normaliza e valida a lista de nomes, devolvendo o motivo pelo qual ainda não dá pra começar.
**Where**: `client/src/passaejoga/nomes.ts`, `client/src/passaejoga/nomes.test.ts`
**Depends on**: T10
**Reuses**: `client/src/estado/entrada.ts` (`motivoParaIniciar`, limites de apelido)
**Requirement**: `PJ-06`, `PJ-08`, `PJ-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Abaixo do mínimo do jogo, motivo diz quantos faltam
- [x] Nome repetido (ignorando caixa e espaço nas pontas) é recusado com o motivo certo
- [x] Nome vazio ou só espaço é recusado
- [x] Acima de 12 é recusado
- [x] Lista válida devolve `undefined`
- [x] Portão passa: `npm run test:unit`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(passa-e-joga): valida quem vai jogar antes de a partida começar`

---

### T12: A porta na tela inicial

**What**: Segunda ação abaixo de "Criar uma sala", com o `(?)` de dica.
**Where**: `client/src/telas/Inicio.tsx` (modificado)
**Depends on**: T11
**Reuses**: `Botao`, `ModalComoJogar` (padrão do `(?)`)
**Requirement**: `PJ-01`, `PJ-02`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] A ação tem nome autoexplicativo ("Jogar num celular só") e fica abaixo de "Criar uma sala"
- [x] O `(?)` explica em uma frase: um aparelho só, de mão em mão, sem link e sem código
- [x] Portão passa: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- [x] Verificado ao vivo no navegador, com captura

**Tests**: none (tela) · **Gate**: build
**Commit**: `feat(passa-e-joga): abre a porta do modo de um aparelho só na tela inicial`

---

### T13: A tela da porta

**What**: `Porta.tsx`: lista os jogos do catálogo marcados com `passaEJoga` e diz em uma linha por que Cartas não está ali.
**Where**: `client/src/telas/passaejoga/Porta.tsx`
**Depends on**: T12
**Reuses**: `SeletorDeJogos.tsx` (o card compacto já feito), `shared/jogos-catalogo.ts`
**Requirement**: `PJ-03`, `PJ-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] A lista sai do catálogo — nenhum jogo é citado por nome na tela (`PJ-04`)
- [x] A ausência de Cartas é explicada, não silenciosa (`PJ-03`)
- [x] Portão passa: build
- [x] Verificado ao vivo no navegador, com captura

**Tests**: none (tela) · **Gate**: build
**Commit**: `feat(passa-e-joga): lista na porta os jogos que cabem num aparelho`

---

### T14: A tela da mesa

**What**: `Mesa.tsx`: "Quem vai jogar?" com o aviso da ordem da roda, e as configurações daquele jogo, sem as de coordenação.
**Where**: `client/src/telas/passaejoga/Mesa.tsx`
**Depends on**: T13
**Reuses**: `client/src/passaejoga/nomes.ts`, os blocos de regra de `Lobby.tsx` (`RegrasDedo`, `GavetaDePacotes`)
**Requirement**: `PJ-06`, `PJ-07`, `PJ-08`, `PJ-09`, `PJ-10`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] O campo de nomes pede explicitamente a ordem da roda e explica por quê (`PJ-07`)
- [x] Botão desabilitado sempre diz o motivo, vindo de `nomes.ts` (`PJ-08`)
- [x] Aparecem só as configurações do jogo escolhido; voto secreto do Dedo, `modoPergunta` dos Enigmas, `ordemTurnos` e limite de sala não aparecem (`PJ-09`)
- [x] Cores sorteadas sem perguntar nada (`PJ-10`)
- [x] Portão passa: build
- [x] Verificado ao vivo no navegador, com captura

**Tests**: none (tela) · **Gate**: build
**Commit**: `feat(passa-e-joga): monta a mesa com quem vai jogar e como`

---

### T15: A entrada no app

**What**: `/?modo=passa-e-joga` abre o modo, carregado por `import()` dinâmico; sair com partida em andamento pede confirmação.
**Where**: `client/src/App.tsx` (modificado), `client/src/estado/entrada.ts` (modificado), `client/src/estado/entrada.test.ts`
**Depends on**: T14
**Reuses**: `jogoDaUrl` (mesmo padrão de leitura da busca), `Modal.tsx`
**Requirement**: `PJ-05`, `PJ-35`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `modoDaUrl` tem teste próprio: reconhece `?modo=passa-e-joga`, ignora qualquer outro valor
- [x] A rota entra por `import()` dinâmico e o `dist/` do bundle principal é medido antes e depois, com o número no commit
- [x] Sair com partida em andamento pede confirmação antes de descartar (`PJ-35`)
- [x] Portão passa: build
- [x] Verificado ao vivo no navegador, com captura

**Tests**: unit (`modoDaUrl`) · **Gate**: build
**Commit**: `feat(passa-e-joga): liga o modo ao app por rota própria e carregamento sob demanda`

---

### T16: A tela de passagem

**What**: `Passagem.tsx`: anúncio, revelação e "esconder e passar". Uma só, usada pelos quatro jogos.
**Where**: `client/src/telas/passaejoga/Passagem.tsx`
**Depends on**: T15
**Reuses**: `client/src/passaejoga/passagem.ts`, `MarcadorDeJogador`, `sons.ts`
**Requirement**: `PJ-17`, `PJ-18`, `PJ-19`, `PJ-20`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] O anúncio não monta nada do conteúdo secreto na árvore — verificado no DOM ao vivo, não só a olho
- [x] Um caminho só adiante a partir do conteúdo revelado
- [x] Recarregar com o segredo à vista reabre no anúncio (`PJ-20`), verificado ao vivo
- [x] Portão passa: build

**Tests**: none (tela; a lógica está coberta em T5) · **Gate**: build
**Commit**: `feat(passa-e-joga): cria a tela única de passar o aparelho`

---

### T17: Dedo na Cara num aparelho

**What**: A tela do Dedo no modo local: carta grande, aparelho na mesa, toque registra quem levou. Sem passagem.
**Where**: `client/src/telas/DedoJogo.tsx` (modificado), `client/src/telas/DedoEncerrada.tsx` (modificado)
**Depends on**: T16
**Reuses**: as telas atuais, com a prop `modo`
**Requirement**: `PJ-21`, `PJ-22`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Uma tela só, sem passagem obrigatória (`PJ-21`)
- [x] Quem levou a carta é sempre toque de gente; o sistema não escolhe ninguém (`AD-003`)
- [x] A tela não passou de dois ramos de `modo` — se passou, foi partida em duas
- [x] Portão passa: build
- [x] Partida local completa jogada ao vivo, com captura

**Tests**: none (tela) · **Gate**: build
**Commit**: `feat(passa-e-joga): adapta o dedo na cara para o aparelho na mesa`

---

### T18: Enigmas Sinistros num aparelho

**What**: O aparelho fica com quem narra; trocar de narrador é uma passagem de um item só.
**Where**: `client/src/telas/EnigmasJogo.tsx` (modificado), `client/src/telas/EnigmasEncerrada.tsx` (modificado)
**Depends on**: T17
**Reuses**: as telas atuais, o modo "só em voz alta" que já existe
**Requirement**: `PJ-23`, `PJ-24`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `modoPergunta` é `voz` e não aparece como opção
- [x] Troca de narrador passa pela tela de passagem antes de a solução nova aparecer (`PJ-24`)
- [x] Portão passa: build
- [x] Partida local completa jogada ao vivo, com captura

**Tests**: none (tela) · **Gate**: build
**Commit**: `feat(passa-e-joga): adapta os enigmas para o aparelho ficar com quem narra`

---

### T19: Espião num aparelho

**What**: A volta de revelação, a tela de "todos prontos?", o relógio com o anúncio de quem começa, e a votação por passagem.
**Where**: `client/src/telas/EspiaoAguardando.tsx` (modificado), `client/src/telas/EspiaoJogo.tsx` (modificado), `client/src/telas/EspiaoEncerrada.tsx` (modificado)
**Depends on**: T18
**Reuses**: `Passagem.tsx`, o pronto retido de T8
**Requirement**: `PJ-25`, `PJ-26`, `PJ-27`, `PJ-28`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] A volta é nome → "revelar" → papel → "esconder e passar" → próximo, na ordem da roda (`PJ-25`)
- [x] O relógio **não** começa durante a volta; começa no toque da tela de "todos prontos?" (`PJ-26`), verificado ao vivo
- [x] Começado o relógio, a tela anuncia quem começa perguntando e vira painel; nenhuma tela pede pra passar o aparelho até a votação (`PJ-27`)
- [x] A votação usa a tela de passagem, um por vez (`PJ-28`)
- [x] Portão passa: build
- [x] Partida local completa jogada ao vivo, com captura

**Tests**: none (tela; o fluxo está coberto em T8) · **Gate**: build
**Commit**: `feat(passa-e-joga): adapta o espião com a volta de revelação e o relógio na mesa`

---

### T20: Quem Sou Eu? num aparelho

**What**: A fila entrega o aparelho pra cada um escrever a carta de quem o sorteio designou; na vez de alguém, a carta em letra grande virada pra mesa.
**Where**: `client/src/telas/Escrita.tsx` (modificado), `client/src/telas/Jogo.tsx` (modificado), `client/src/telas/Encerrada.tsx` (modificado)
**Depends on**: T19
**Reuses**: `Passagem.tsx`, `Carta.tsx`
**Requirement**: `PJ-29`, `PJ-30`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] O sorteio de quem escreve pra quem vem do jogo, não da tela (`PJ-29`)
- [x] Ninguém vê a própria carta: a projeção do jogador da vez já a esconde, e a tela não a recupera de outro lugar (`PJ-30`)
- [x] A carta é legível de longe com o aparelho virado
- [x] Portão passa: build
- [x] Partida local completa jogada ao vivo, com captura

**Tests**: none (tela) · **Gate**: build
**Commit**: `feat(passa-e-joga): adapta o quem sou eu para o aparelho virado pra mesa`

---

### T21: Encerrar e jogar de novo

**What**: Encerrar com confirmação e placar final; jogar de novo com a mesma mesa, sem redigitar nome.
**Where**: `client/src/passaejoga/motor.ts` (modificado), `client/src/passaejoga/motor.test.ts` (modificado), `client/src/telas/passaejoga/Porta.tsx` (modificado)
**Depends on**: T20
**Reuses**: `novaPartida` de cada jogo, `Modal.tsx`
**Requirement**: `PJ-33`, `PJ-34`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Encerrar pede confirmação e mostra o placar final (`PJ-33`)
- [x] `novaPartida` preserva os mesmos jogadores, na mesma ordem, com as mesmas cores (`PJ-34`) — teste no motor
- [x] Portão passa: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`

**Tests**: unit · **Gate**: build
**Commit**: `feat(passa-e-joga): encerra a partida e oferece jogar de novo com a mesma mesa`

---

### T22: A página indexável do modo

**What**: `CONTEUDO_DO_PASSA_E_JOGA` e a emissão de `passa-e-joga.html` com entrada no `sitemap.xml`.
**Where**: `shared/jogos-conteudo.ts` (modificado), `scripts/paginas.ts` (modificado)
**Depends on**: T21
**Reuses**: `paginaDoJogo`, `sitemap`
**Requirement**: `PJ-05`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `npm run build` emite `dist/passa-e-joga.html`
- [x] O slug não tem 5 letras (não sombreia código de sala) e está no `sitemap.xml`
- [x] A página leva ao app por `/?modo=passa-e-joga`
- [x] Portão passa: build

**Tests**: none (build) · **Gate**: build
**Commit**: `feat(passa-e-joga): publica a página indexável do modo`

---

### T23: Fechar a feature

**What**: README (contagem de testes e o modo novo), `.specs/STATE.md` (Handoff), e os requisitos marcados como implementados.
**Where**: `README.md`, `.specs/STATE.md`, `.specs/features/passa-e-joga/spec.md`, `.specs/features/passa-e-joga/tasks.md`
**Depends on**: T22
**Reuses**: —
**Requirement**: —

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] README diz a contagem real de testes daquele momento, não a antiga
- [x] Handoff do `STATE.md` descreve o estado real da branch
- [x] Traceability da spec com todos os 35 em `Implementing`
- [x] Portão passa: build

**Tests**: none (documentação) · **Gate**: build
**Commit**: `docs(passa-e-joga): registra o modo de um aparelho só`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5

Fase 1:  T1 ──→ T2 ──→ T3 ──→ T4
Fase 2:  T5 ──→ T6 ──→ T7 ──→ T8 ──→ T9
Fase 3:  T10 ─→ T11 ─→ T12 ─→ T13 ─→ T14 ─→ T15
Fase 4:  T16 ─→ T17 ─→ T18 ─→ T19 ─→ T20
Fase 5:  T21 ─→ T22 ─→ T23
```

Execução estritamente sequencial: um agente por vez, uma task por vez, na ordem.

**Empacotamento previsto:** 23 tasks. Fases inteiras, ~7 por lote → **4 lotes**: (Fase 1 + Fase 2) = 9, (Fase 3) = 6, (Fase 4) = 5, (Fase 5) = 3.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | movimentação de pasta, sem edição de lógica | ✅ atômica |
| T2 | 1 arquivo de tipos | ✅ atômica |
| T3 | 1 arquivo dividido em dois | ✅ atômica |
| T4 | 1 função extraída | ✅ atômica |
| T5 | 1 módulo puro | ✅ atômica |
| T6 | 1 módulo puro (3 funções coesas do mesmo objeto) | ✅ coesa |
| T7 | 1 função | ✅ atômica |
| T8 | 1 comportamento do motor | ✅ atômica |
| T9 | 1 módulo puro | ✅ atômica |
| T10 | 1 campo de dado | ✅ atômica |
| T11 | 1 módulo puro | ✅ atômica |
| T12 | 1 tela modificada | ✅ atômica |
| T13 | 1 tela | ✅ atômica |
| T14 | 1 tela | ✅ atômica |
| T15 | 1 ponto de entrada | ✅ atômica |
| T16 | 1 tela | ✅ atômica |
| T17–T20 | 1 jogo cada | ✅ atômicas |
| T21 | 1 comportamento, 2 arquivos coesos | ✅ coesa |
| T22 | 1 página | ✅ atômica |
| T23 | documentação | ✅ atômica |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | (início da Fase 1) | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | Fase 1 → Fase 2, T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | Fase 2 → Fase 3, T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | Fase 3 → Fase 4, T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | Fase 4 → Fase 5, T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |

Nenhuma dependência aponta para frente.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra de jogo (movida) | unit | unit (os testes se mudam junto) | ✅ |
| T2 | Contrato (só tipos) | none (portão de tipo) | none | ✅ |
| T3 | Núcleo compartilhado | unit | unit | ✅ |
| T4 | Núcleo compartilhado | unit | unit | ✅ |
| T5 | Módulo puro do cliente | unit | unit | ✅ |
| T6 | Módulo puro do cliente | unit | unit | ✅ |
| T7 | Módulo puro do cliente | unit | unit | ✅ |
| T8 | Módulo puro do cliente | unit | unit | ✅ |
| T9 | Módulo puro do cliente | unit | unit | ✅ |
| T10 | Catálogo | unit | unit | ✅ |
| T11 | Módulo puro do cliente | unit | unit | ✅ |
| T12 | Tela React | none | none | ✅ |
| T13 | Tela React | none | none | ✅ |
| T14 | Tela React | none | none | ✅ |
| T15 | Tela React + módulo puro (`modoDaUrl`) | unit (a mais alta) | unit | ✅ |
| T16 | Tela React | none | none | ✅ |
| T17–T20 | Tela React | none | none | ✅ |
| T21 | Módulo puro do cliente + tela | unit (a mais alta) | unit | ✅ |
| T22 | Build/páginas geradas | none | none | ✅ |
| T23 | Documentação | none | none | ✅ |

Nenhuma violação. Onde a matriz permite `none`, é porque a camada é `.tsx` — e o desenho empurrou toda a lógica testável para módulos puros justamente para que esse `none` não esconda nada.
