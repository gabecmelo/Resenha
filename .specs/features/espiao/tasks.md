# Espião Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/espiao/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerado por amostragem do código (`server/games/quem-sou-eu/{regras,sorteio,projecao}.test.ts`, `server/core/despacho.test.ts`, `server/core/sala-do.integration.test.ts`, `shared/jogos-catalogo.test.ts`, `shared/pacotes.test.ts`) e convenção do projeto. Guidelines encontradas: nenhuma (`AGENTS.md`/`CLAUDE.md` presentes no repo, silenciosos sobre política de teste — mesma conclusão já registrada em `hub-selecao-jogos/tasks.md`). A matriz segue o padrão que o próprio repo já estabeleceu em vez do "strong default" da ferramenta.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | --------------------- | ----------------- | ----------- |
| `shared/` types (`protocolo.ts`) | none | Tipos só — coberto por `typecheck` | `shared/protocolo.ts` | `npm run typecheck` |
| `shared/` conteúdo estático (`locais-dados.ts`) | unit | Formato + ids únicos por pacote, 1:1 com o padrão já usado em `pacotes-dados.ts` | `shared/locais-dados.test.ts` | `npm run test:unit` |
| `shared/jogos-catalogo.ts` (entrada `espiao` + `minJogadores`) | unit | Ids únicos, `minJogadores` presente em toda entrada, mesma cobertura já existente pra `quem-sou-eu` | `shared/jogos-catalogo.test.ts` | `npm run test:unit` |
| `server/games/espiao/sorteio.ts` (domínio, puro) | unit | Todas as funções exportadas; determinismo com `aleatorio` injetado; sem ponto fixo indevido | `server/games/espiao/sorteio.test.ts` | `npm run test:unit` |
| `server/games/espiao/regras.ts` (domínio, reducer) | unit | Todos os `case` do switch; 1:1 com ACs `ESP-01`…`ESP-16`, `ESP-21`; todos os Edge Cases do spec | `server/games/espiao/regras.test.ts` | `npm run test:unit` |
| `server/games/espiao/projecao.ts` (domínio, visibilidade) | unit | Toda combinação de visibilidade (espião/não-espião, config `espioesSeVeem`, config `visibilidadeVoto`, fase `encerrada`) — 1:1 com `ESP-07`, `ESP-08`, `ESP-16`…`ESP-19` | `server/games/espiao/projecao.test.ts` | `npm run test:unit` |
| `server/games/espiao/index.ts` (montagem do módulo) | none | Literal trivial (`{ iniciarRodada, reduzir, projetar }`), exercitado transitivamente pelos testes acima e pelos testes de integração de `sala-do`/`despacho` | — | build gate only |
| `server/games/registro.ts` (nova entrada `espiao`) | none | Mapa trivial, exercitado transitivamente — mesmo tratamento já dado em `hub-selecao-jogos` | — | build gate only |
| `server/core/despacho.ts` (`configValida` estendido pra `parcial.espiao`) | unit | Toda combinação de bounds/enum inválidos de `ConfigEspiao`; aceitação do caminho válido | `server/core/despacho.test.ts` | `npm run test:unit` |
| `server/core/sala-do.ts` (filtro de pacotes por `jogoId`) | integration | Lobby de sala Espião só recebe pacotes com `jogoId === 'espiao'` na projeção; sala Quem Sou Eu não regride | `server/core/sala-do.integration.test.ts` | `npm run test:integration` |
| Client UI (`Lobby.tsx`, `EspiaoAguardando.tsx`, `EspiaoJogo.tsx`, `EspiaoEncerrada.tsx`, `App.tsx`) | none | Sem infraestrutura de teste de componente no repo (mesmo debt confirmado em `hub-selecao-jogos`) — build gate + verificação manual no navegador | — | `npm run typecheck` + `npm run lint` + UAT manual |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tasks só com teste unitário | `npm run typecheck && npm run test:unit` |
| Full | Depois de tasks com teste de integração | `npm run typecheck && npm run test:unit && npm run test:integration` |
| Build | Depois de fechar fase, ou tasks só de UI | `npm run typecheck && npm run lint && npm run build` |

---

## Execution Plan

Fases são ordenadas e rodam sequencialmente — cada fase termina antes da próxima começar, e as tasks dentro de uma fase executam em ordem.

### Phase 1: Contrato compartilhado e conteúdo

```
T1 → T2 → T3
```

### Phase 2: Módulo de jogo do servidor

```
T4 → T5 → T6 → T7 → T8 → T9 → T10
```

### Phase 3: Cliente

```
T11 → T12 → T13 → T14 → T15
```

---

## Task Breakdown

### T1: Estender o protocolo com os tipos de Espião

**What**: Adiciona `Comando` `abrirVotacao`, `votar` (`{ alvoId: JogadorId | null }`), `encerrarVotacao`; `Config.espiao: ConfigEspiao` (obrigatório, com `CONFIG_ESPIAO_PADRAO` populando `CONFIG_PADRAO.espiao`); `Projecao.jogo.espiao?: ProjecaoEspiao`; `PacoteResumo.jogoId: string`.
**Where**: `shared/protocolo.ts` (modify)
**Depends on**: None
**Reuses**: Padrão existente de `Comando`/`Config`/`Projecao` já no arquivo.
**Requirement**: ESP-01, ESP-09, ESP-11, ESP-12, ESP-17, ESP-19, ESP-22

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `Comando` inclui `abrirVotacao`, `votar`, `encerrarVotacao`
- [x] `ConfigEspiao`/`CONFIG_ESPIAO_PADRAO` definidos; `Config.espiao: ConfigEspiao` obrigatório; `CONFIG_PADRAO.espiao = CONFIG_ESPIAO_PADRAO`
- [x] `ProjecaoEspiao` definido; `Projecao.jogo.espiao?: ProjecaoEspiao` adicionado
- [x] `PacoteResumo.jogoId: string` adicionado
- [x] Gate check passa: `npm run typecheck` (vermelho esperado em consumidores existentes de `PacoteResumo`/`Config` até tasks posteriores preencherem `jogoId`/`espiao` — mesmo padrão já documentado em `hub-selecao-jogos` T1)

**Tests**: none
**Gate**: build

**Commit**: `feat(protocolo): adiciona tipos de configuração, comandos e projeção de Espião`

---

### T2: Criar conteúdo estático dos pacotes de locais

**What**: Novo arquivo com `LOCAIS: PacoteCompleto[]`, ao menos um pacote temático jogável de locais.
**Where**: `shared/locais-dados.ts` (new), `shared/locais-dados.test.ts` (new)
**Depends on**: None
**Reuses**: Tipos `PacoteCompleto`/`CartaDoPacote`/`Dificuldade` de `shared/pacotes-dados.ts` (só os tipos, não os dados); mesmo formato de dados.
**Requirement**: ESP-22

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `LOCAIS` contém ao menos um pacote com locais nas três dificuldades
- [x] Teste unitário garante ids de pacote únicos e ids de carta únicos dentro de cada pacote (mesmo padrão de `shared/jogos-catalogo.test.ts`)
- [x] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(shared): adiciona conteúdo estático dos pacotes de locais de Espião`

---

### T3: Adicionar Espião ao catálogo de jogos e `minJogadores` por jogo

**What**: `JogoCatalogo` ganha `minJogadores: number`; `quem-sou-eu` declara `2`; nova entrada `espiao` declara `nome: 'Espião'`, `descricao`, `minJogadores: 3`.
**Where**: `shared/jogos-catalogo.ts` (modify), `shared/jogos-catalogo.test.ts` (modify)
**Depends on**: None
**Reuses**: Padrão existente de `CATALOGO_DE_JOGOS`/`JOGO_PADRAO`.
**Requirement**: ESP-01, ESP-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `JogoCatalogo.minJogadores` adicionado; `quem-sou-eu.minJogadores === 2`
- [x] Entrada `espiao` adicionada com `minJogadores === 3`
- [x] Teste atualizado garante `minJogadores` presente e positivo em toda entrada do catálogo
- [x] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(shared): adiciona Espião ao catálogo de jogos com minJogadores por jogo`

---

### T4: Criar o sorteio de Espião

**What**: Novo arquivo com `embaralhar<T>()` (Fisher-Yates genérico) e `sortearEspioes(ativos, quantidade, aleatorio)`.
**Where**: `server/games/espiao/sorteio.ts` (new), `server/games/espiao/sorteio.test.ts` (new)
**Depends on**: None
**Reuses**: Mesmo algoritmo Fisher-Yates de `server/games/quem-sou-eu/sorteio.ts` (reimplementado, não importado — `AD-002`).
**Requirement**: ESP-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `embaralhar()` não muta a lista recebida; determinístico dado um `aleatorio` fixo
- [x] `sortearEspioes()` retorna exatamente `quantidade` ids distintos, todos dentre `ativos`
- [x] Testes cobrem: distribuição sem repetição, `quantidade === 1` e `quantidade > 1`, imutabilidade do array de entrada
- [x] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): adiciona sorteio de local, espiões e quem começa perguntando`

---

### T5: Criar o reducer de Espião

**What**: Novo arquivo com `estadoVazio()`, `iniciarRodada()` (sorteia local/espiões/quem começa perguntando, valida jogadores mínimos e espiões vs. ativos, seta `prazos.turno`) e `reduzir()` (switch por `comando.t`: `marcarPronto`, `abrirVotacao`, `votar`, `encerrarVotacao`, `encerrar`, `novaPartida`, `notas`, tratamento de `venceuPrazoTurno` e saída de jogador em partida).
**Where**: `server/games/espiao/regras.ts` (new), `server/games/espiao/regras.test.ts` (new)
**Depends on**: T1, T4
**Reuses**: Formato de `server/games/quem-sou-eu/regras.ts` — reducer por `switch`, `clonar()`/`structuredClone`, guarda de fase/autoridade antes de mutar, `jogadoresAtivos()`/`apelidoDe()`/`prazoDoTurno()`, mesmo tratamento de saída de jogador de `saiuJogador()`. `montarPoolDeCartas` de `shared/pacotes.ts`. `sortearEspioes`/`embaralhar` de T4.
**Requirement**: ESP-01, ESP-02, ESP-03, ESP-04, ESP-05, ESP-06, ESP-09, ESP-10, ESP-11, ESP-12, ESP-13, ESP-14, ESP-15, ESP-16, ESP-21

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `iniciarRodada`: menos de 3 ativos → `JOGADORES_INSUFICIENTES`; nº de espiões configurado não deixa 2+ não-espiões → `JOGADORES_INSUFICIENTES` (validado aqui, não em `configValida` — `ESP-02`); caso válido sorteia local (via `montarPoolDeCartas` + pacotes recebidos), espiões e quem começa perguntando; `prontos: []`; `rodadaIniciada: false`
- [x] `marcarPronto`: quando todos os ativos marcam pronto, `rodadaIniciada` vira `true` e `prazos.turno` é setado a partir de `config.espiao.tempoRodadaSeg` (`null` = sem prazo)
- [x] `abrirVotacao`: qualquer jogador ativo pode abrir durante `rodadaIniciada`; evento `venceuPrazoTurno` (timer esgotado) também abre votação automaticamente; prazo pausado (`prazos.turno: null`) enquanto a votação está aberta
- [x] `votar`: um voto por jogador ativo, substitui voto anterior do mesmo jogador; `alvoId` fora dos ativos → `COMANDO_INVALIDO`
- [x] `encerrarVotacao`/todos os ativos conectados votaram: fecha a votação e computa maioria absoluta sobre o total de ativos (não só votantes); acerto (maioria em um espião de fato) → `faseSeguinte: 'encerrada'`, revela local e espiões; qualquer outro resultado (empate, maioria errada, maioria em "pular", 0 votos válidos) → reabre o prazo da rodada, partida continua
- [x] `encerrar` (host, a qualquer momento da fase de jogo) → `faseSeguinte: 'encerrada'`, revela local e espiões
- [x] `notas`: persiste nota privada do autor, mesmo padrão de "Quem Sou Eu"
- [x] Edge cases: jogador sai e ativos caem abaixo de 3 → cancela partida, `promoverAguardando: true`, volta ao lobby; único espião sai e sobram ativos suficientes → partida segue sem espião algum; jogador desconecta durante votação aberta → "todos votaram" conta só ativos conectados
- [x] Comandos de votação fora da fase/estado certo → `FASE_INVALIDA`/`COMANDO_INVALIDO`; `encerrarVotacao`/`encerrar` por não-host → `SEM_AUTORIDADE`
- [x] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): adiciona reducer de Espião (rodada, votação, encerramento)`

---

### T6: Criar a projeção de Espião

**What**: Novo arquivo que monta `Projecao.jogo.espiao` a partir do `EstadoEspiao`, escondendo local de quem é espião, outros espiões conforme `config.espiao.espioesSeVeem`, e votos conforme `config.espiao.visibilidadeVoto`; revela tudo quando a partida está encerrada.
**Where**: `server/games/espiao/projecao.ts` (new), `server/games/espiao/projecao.test.ts` (new)
**Depends on**: T1, T5
**Reuses**: Formato de `server/games/quem-sou-eu/projecao.ts` (monta `Projecao` completo: `sala`, `eu`, `jogadores`, `jogo`, `chat`).
**Requirement**: ESP-07, ESP-08, ESP-16, ESP-17, ESP-18, ESP-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `souEspiao === true` → `local` ausente da projeção; `souEspiao === false` → `local` presente
- [x] `souEspiao && espioesSeVeem` → `espioes` presente com os outros espiões; `souEspiao && !espioesSeVeem` → `espioes` ausente (só sabe que é espião)
- [x] Fase `encerrada` → `local` e `espioes` presentes pra todos, inclusive quem entrou depois de encerrada
- [x] `visibilidadeVoto === 'tempoReal'` → `votacaoAberta.votos` presente e atualizado; `'oculta'` → `votos` ausente até a votação fechar
- [x] `votacaoAberta.meuVoto` reflete o voto do próprio jogador; `quantosVotaram`/`total` contam só ativos conectados
- [x] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): adiciona projeção de Espião com visibilidade condicional`

---

### T7: Montar o módulo de jogo de Espião

**What**: Novo arquivo que monta `ModuloDeJogo<EstadoEspiao, ComandoEspiao>` a partir de `iniciarRodada`/`reduzir`/`projetar`.
**Where**: `server/games/espiao/index.ts` (new)
**Depends on**: T5, T6
**Reuses**: Idêntico em forma a `server/games/quem-sou-eu/index.ts`.
**Requirement**: —

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `export const espiao: ModuloDeJogo<EstadoEspiao, ComandoEspiao> = { iniciarRodada, reduzir, projetar }`
- [x] Gate check passa: `npm run typecheck` (arquivo isolado, sem consumidores ainda até T8)

**Tests**: none
**Gate**: build

**Commit**: `feat(server): monta o módulo de jogo de Espião`

---

### T8: Registrar Espião no hub

**What**: Adiciona a entrada `'espiao': espiao as JogoDaSala<unknown>` ao registro.
**Where**: `server/games/registro.ts` (modify)
**Depends on**: T7
**Reuses**: `espiao` (T7), `JogoDaSala` (`server/core/despacho.ts`).
**Requirement**: ESP-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `REGISTRO_DE_JOGOS` inclui a chave `'espiao'`
- [x] Gate check passa: `npm run typecheck && npm run test:unit && npm run test:integration` (agora exercitado transitivamente pelos testes de integração existentes de `sala-do`/`server/index`)

**Tests**: none
**Gate**: full

**Commit**: `feat(server): registra Espião no hub`

---

### T9: Validar `config.espiao` em `configValida`

**What**: `configValida()` passa a validar estruturalmente `parcial.espiao` (bounds de `numEspioes` inteiro positivo, enum de `visibilidadeVoto`, bounds de `tempoRodadaSeg` reaproveitando `TEMPO_TURNO_MIN_SEG`/`TEMPO_TURNO_MAX_SEG` ou `null`, boolean de `espioesSeVeem`); `configurar()` remonta `sala.config.espiao` campo a campo.
**Where**: `server/core/despacho.ts` (modify), `server/core/despacho.test.ts` (modify)
**Depends on**: T1
**Reuses**: Mesmo padrão campo-a-campo já usado pros campos de "Quem Sou Eu" em `configurar()`/`configValida()`; `TEMPO_TURNO_MIN_SEG`/`TEMPO_TURNO_MAX_SEG` já importados.
**Requirement**: ESP-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `configValida` recusa `numEspioes` não-inteiro ou ≤ 0; `visibilidadeVoto` fora de `'oculta'`/`'tempoReal'`; `tempoRodadaSeg` fora da faixa (quando não `null`); aceita valores válidos incluindo `tempoRodadaSeg: null`
- [ ] `configurar()` remonta `sala.config.espiao` campo a campo (sem espalhamento), mesmo padrão dos demais campos de `Config`
- [ ] Sem importar nada de `games/` (checagem visual/grep — mesma garantia de isolamento já mantida no arquivo)
- [ ] Testes novos cobrem cada bound/enum inválido e o caminho válido
- [ ] Gate check passa: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(server): valida config.espiao em configValida`

---

### T10: Filtrar catálogo de pacotes por `jogoId`

**What**: `getPacotesDisponiveis()`/`confirmar()` filtram o catálogo global de pacotes pelo `jogoId` da sala antes de anexar à projeção; pacotes existentes de "Quem Sou Eu" e os novos de locais (T2) ganham `jogoId` no fallback estático.
**Where**: `server/core/sala-do.ts` (modify), `server/core/sala-do.integration.test.ts` (modify), `shared/pacotes-dados.ts` (modify — adiciona `jogoId: 'quem-sou-eu'` a cada entrada de `PACOTES`), `shared/locais-dados.ts` (modify — adiciona `jogoId: 'espiao'` a cada entrada de `LOCAIS`)
**Depends on**: T1, T2
**Reuses**: Estrutura existente de `getPacotesDisponiveis()`/`confirmar()`.
**Requirement**: ESP-22

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `PacoteResumo` anexado à projeção é filtrado por `pacotes.filter((p) => p.jogoId === sala.jogoId)`
- [ ] Fallback estático (`PACOTES`/`LOCAIS`) já carrega `jogoId` correto por entrada
- [ ] Teste de integração: sala Espião só vê pacotes com `jogoId === 'espiao'`; sala Quem Sou Eu continua vendo só os seus (sem regressão)
- [ ] Gate check passa: `npm run typecheck && npm run test:unit && npm run test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `feat(server): filtra catálogo de pacotes disponíveis por jogoId da sala`

---

### T11: Painel de configuração de Espião no Lobby

**What**: O painel de configuração existente em `Lobby.tsx` vira condicional a `jogoId === 'quem-sou-eu'`; novo bloco condicional a `jogoId === 'espiao'` com: nº de espiões, espiões se veem, visibilidade do voto, tempo de rodada, seleção de pacotes de locais (mesmo padrão de rascunho + modal "Ver locais" já usado pros pacotes de cartas).
**Where**: `client/src/telas/Lobby.tsx` (modify)
**Depends on**: T9, T10
**Reuses**: Padrão de estado de rascunho + confirmar/cancelar já usado no seletor de pacotes de "Quem Sou Eu"; `Modal.tsx`, `Botao.tsx`.
**Requirement**: ESP-01, ESP-02, ESP-03, ESP-17, ESP-18, ESP-19, ESP-22

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Painel de "Quem Sou Eu" só aparece quando `jogoId === 'quem-sou-eu'`
- [ ] Painel de Espião só aparece quando `jogoId === 'espiao'`, com todos os 4 controles + seleção de pacotes de locais
- [ ] `configurar` enviado reflete `config.espiao` (rascunho + confirmar, mesmo padrão existente)
- [ ] Verificado manualmente no navegador: abrir lobby de sala Espião mostra o painel certo, salvar config reflete na projeção
- [ ] Gate check passa: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): adiciona painel de configuração de Espião ao Lobby`

---

### T12: Tela de espera "aguardando prontos" de Espião

**What**: Nova tela mostrando quem começa perguntando e um botão PRONTO por jogador; some quando `rodadaIniciada` vira `true`.
**Where**: `client/src/telas/EspiaoAguardando.tsx` (new)
**Depends on**: T11
**Reuses**: `Shell.tsx`, `FichaDeJogador.tsx`, `Botao.tsx`.
**Requirement**: ESP-05, ESP-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Mostra quem "começa perguntando" e contagem de prontos (`prontos`/`total`)
- [ ] Botão PRONTO envia `marcarPronto`
- [ ] Gate check passa: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): adiciona tela de espera de Espião`

---

### T13: Tela de jogo de Espião

**What**: Tela padrão da rodada (local secreto ou "você é espião" + espiões visíveis se configurado, bloco de notas, botão de dica de pergunta client-side, contador do timer da rodada, botão "abrir votação") e a UI de votação (lista de jogadores pra votar/pular, contagem conforme visibilidade configurada, botão "encerrar votação" só pro host).
**Where**: `client/src/telas/EspiaoJogo.tsx` (new)
**Depends on**: T12
**Reuses**: `BlocoDeNotas.tsx`, `FichaDeJogador.tsx`, `Chat.tsx`, `Modal.tsx` (votação), `Botao.tsx`.
**Requirement**: ESP-07, ESP-08, ESP-09, ESP-10, ESP-11, ESP-12, ESP-13, ESP-14, ESP-15, ESP-17, ESP-18, ESP-19, ESP-20, ESP-21

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Jogador não-espião vê o local; espião vê que é espião, sem local
- [ ] Espiões visíveis entre si só quando `config.espiao.espioesSeVeem` e a projeção trouxer `espioes`
- [ ] Botão de dica de pergunta sorteia localmente de uma lista estática embutida (sem comando ao servidor)
- [ ] Bloco de notas envia `notas` (mesmo padrão de "Quem Sou Eu")
- [ ] Botão "abrir votação" visível pra qualquer jogador ativo durante a rodada; envia `abrirVotacao`
- [ ] UI de votação: um voto por clique (`votar`), opção "pular"; contagem em tempo real quando `visibilidadeVoto === 'tempoReal'`, oculta até fechar quando `'oculta'`; host vê botão "encerrar votação" (`encerrarVotacao`)
- [ ] Host vê botão "encerrar partida" a qualquer momento da fase de jogo (`encerrar`)
- [ ] Gate check passa: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): adiciona tela de jogo e votação de Espião`

---

### T14: Tela de revelação de Espião

**What**: Nova tela mostrando o local e todos os espiões, visível pra todos os jogadores inclusive quem entrou depois de encerrada.
**Where**: `client/src/telas/EspiaoEncerrada.tsx` (new)
**Depends on**: T13
**Reuses**: `Shell.tsx`, `FichaDeJogador.tsx`, `Botao.tsx` (botão "nova partida" pro host).
**Requirement**: ESP-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Mostra o local revelado e a lista de espiões
- [ ] Host vê botão "nova partida" (`novaPartida`)
- [ ] Gate check passa: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): adiciona tela de revelação de Espião`

---

### T15: Rotear `App.tsx` por `jogoId` e verificar a rodada completa

**What**: O `switch (projecao.sala.fase)` para os casos `'jogo'` e `'encerrada'` passa a checar `projecao.sala.jogoId` antes de escolher entre a tela de "Quem Sou Eu" e a de Espião (`EspiaoAguardando`/`EspiaoJogo`/`EspiaoEncerrada`, roteadas conforme `jogo.espiao.rodadaIniciada` dentro de `fase === 'jogo'`).
**Where**: `client/src/App.tsx` (modify)
**Depends on**: T14
**Reuses**: `EspiaoAguardando`/`EspiaoJogo`/`EspiaoEncerrada` (T12–T14).
**Requirement**: ESP-05, ESP-07, ESP-08, ESP-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `fase === 'jogo'` e `jogoId === 'espiao'` e `!jogo.espiao.rodadaIniciada` → `EspiaoAguardando`
- [ ] `fase === 'jogo'` e `jogoId === 'espiao'` e `jogo.espiao.rodadaIniciada` → `EspiaoJogo`
- [ ] `fase === 'encerrada'` e `jogoId === 'espiao'` → `EspiaoEncerrada`
- [ ] Telas de "Quem Sou Eu" continuam roteando como antes quando `jogoId === 'quem-sou-eu'` (sem regressão)
- [ ] Verificado manualmente no navegador, ponta a ponta: criar sala Espião, configurar (3+ jogadores, 1 espião, pacote de locais), começar, marcar todos prontos, ver local/espião conforme o papel, abrir votação, votar até maioria certa → tela de revelação; repetir e encerrar manualmente pelo host → mesma tela de revelação
- [ ] Gate check passa: `npm run typecheck && npm run lint && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(client): roteia App.tsx por jogoId para as telas de Espião`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6 ──→ T7 ──→ T8 ──→ T9 ──→ T10
Phase 3:  T11 ──→ T12 ──→ T13 ──→ T14 ──→ T15
```

Execution é estritamente sequencial — sem paralelismo intra-fase. Um único agente (ou worker de batch) trabalha uma task por vez, em ordem.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Protocolo | 1 arquivo, tipos | ✅ Granular |
| T2: Conteúdo de locais | 1 arquivo + teste | ✅ Granular |
| T3: Catálogo de jogos | 1 arquivo + teste | ✅ Granular |
| T4: Sorteio de Espião | 1 arquivo + teste | ✅ Granular |
| T5: Reducer de Espião | 1 arquivo + teste | ✅ Granular (maior escopo — um reducer completo, mesmo tratamento que `hub-selecao-jogos` T4/T5 deram a arquivos com múltiplas ramificações) |
| T6: Projeção de Espião | 1 arquivo + teste | ✅ Granular |
| T7: Montagem do módulo | 1 arquivo | ✅ Granular |
| T8: Registro no hub | 1 arquivo | ✅ Granular |
| T9: Validação de config.espiao | 1 arquivo + teste | ✅ Granular |
| T10: Filtro de pacotes por jogoId | 1 arquivo principal + teste + 2 arquivos de dados (adição de campo) | ✅ Granular (mudança pontual, mesmo campo em 3 arquivos) |
| T11: Painel de config no Lobby | 1 arquivo | ✅ Granular |
| T12: Tela de espera | 1 arquivo | ✅ Granular |
| T13: Tela de jogo | 1 arquivo | ✅ Granular |
| T14: Tela de revelação | 1 arquivo | ✅ Granular |
| T15: Roteamento em App.tsx | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ----------------------- | -------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | None | T2 → T3 (sequencial dentro da fase) | ✅ Match |
| T4 | None | — | ✅ Match |
| T5 | T1, T4 | EspiaoRegras → EspiaoSorteio (diagrama); T1/T4 → T5 (fase) | ✅ Match |
| T6 | T1, T5 | EspiaoProjecao (diagrama); T5 → T6 (fase) | ✅ Match |
| T7 | T5, T6 | T6 → T7 (fase) | ✅ Match |
| T8 | T7 | Registro → EspiaoRegras (diagrama, via módulo montado); T7 → T8 (fase) | ✅ Match |
| T9 | T1 | Despacho → genérico (diagrama); T1 → T9 (fase) | ✅ Match |
| T10 | T1, T2 | — (mudança pontual em `sala-do.ts`, descrita no design); T1/T2 → T10 (fase) | ✅ Match |
| T11 | T9, T10 | Lobby → painel condicional (diagrama); Phase 2 → Phase 3 | ✅ Match |
| T12 | T11 | AppTsx → EspiaoAguardando (diagrama); T11 → T12 (fase) | ✅ Match |
| T13 | T12 | AppTsx → EspiaoJogo (diagrama); T12 → T13 (fase) | ✅ Match |
| T14 | T13 | AppTsx → EspiaoEncerrada (diagrama); T13 → T14 (fase) | ✅ Match |
| T15 | T14 | AppTsx roteia por fase + jogoId (diagrama); T14 → T15 (fase) | ✅ Match |

Nenhuma dependência aponta para uma fase posterior; todas apontam para trás ou dentro da própria fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | ----------------------------- | ----------------- | ----------- | ------ |
| T1: Protocolo | `shared/` types | none | none | ✅ OK |
| T2: Conteúdo de locais | `shared/` static content | unit | unit | ✅ OK |
| T3: Catálogo de jogos | `shared/jogos-catalogo.ts` | unit | unit | ✅ OK |
| T4: Sorteio de Espião | `server/games/espiao/sorteio.ts` | unit | unit | ✅ OK |
| T5: Reducer de Espião | `server/games/espiao/regras.ts` | unit | unit | ✅ OK |
| T6: Projeção de Espião | `server/games/espiao/projecao.ts` | unit | unit | ✅ OK |
| T7: Montagem do módulo | `server/games/espiao/index.ts` | none (build gate) | none | ✅ OK |
| T8: Registro no hub | `server/games/registro.ts` | none (build gate) | none (gate `full` — exercitado transitivamente) | ✅ OK |
| T9: Validação de config.espiao | `server/core` domain logic (`despacho.ts`) | unit | unit | ✅ OK |
| T10: Filtro de pacotes por jogoId | `server/core` DO shell (`sala-do.ts`) | integration | integration | ✅ OK |
| T11: Painel de config no Lobby | Client UI | none (build gate) | none | ✅ OK |
| T12: Tela de espera | Client UI | none (build gate) | none | ✅ OK |
| T13: Tela de jogo | Client UI | none (build gate) | none | ✅ OK |
| T14: Tela de revelação | Client UI | none (build gate) | none | ✅ OK |
| T15: Roteamento em App.tsx | Client UI | none (build gate) | none | ✅ OK |

Todas as tasks batem com a matriz — nenhuma violação.
