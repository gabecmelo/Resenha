# Quem Sou Eu? — Validation

**Data**: 2026-08-04
**Spec**: `.specs/features/quem-sou-eu/spec.md` (81 critérios de aceite)
**Intervalo de diff**: `104a976`..`e949223` (44 commits, T1–T30)
**Verifier**: sub-agente independente (autor ≠ verificador), evidência-ou-zero

**Veredito**: ❌ **FAIL** — 1 mutante sobrevivente e 1 AC sem evidência (`DESC-10`). Todos os gates verdes; nenhum defeito de comportamento encontrado no código de produção.

---

## Gates

| Gate | Comando | Resultado |
| ---- | ------- | --------- |
| Unit | `npm run test:unit` | ✅ 312 passaram, 0 falharam, 0 pulados (12 arquivos) |
| Integração | `npm run test:integration` | ✅ 64 passaram, 0 falharam, 0 pulados (6 arquivos) |
| Typecheck | `npm run typecheck` | ✅ exit 0 (`tsconfig.json` + `tsconfig.server.json`) |
| Lint | `npm run lint` | ✅ exit 0 |
| Build | `npm run build` | ✅ exit 0 — worker 48,09 kB, cliente 247,85 kB |

**Contagem de testes**: 376 no total (312 + 64), batendo exatamente o registrado no `STATE.md`. Nenhum teste pulado, nenhum `.skip`, nenhum `.only`.

**Nota sobre o bloqueador registrado no `STATE.md`**: o handoff aponta `server/core/sala-do.integration.test.ts:275` como falha reproduzível (`HOST-04`). **O bloqueador está desatualizado.** O teste já usa uma referência presa ao instante da desconexão (`const desconectouEm = Date.now()`, linha 271) em vez de reler o relógio na asserção, e passa nesta máquina — inclusive na suíte completa rodada duas vezes. As asserções atuais (linhas 279–280) são mais fortes que a versão descrita no bloqueador: verificam o limite inferior **e** um teto de 5 s. Recomenda-se remover o item de "Bloqueadores" do `STATE.md`.

---

## Sensor de discriminação

**Profundidade**: expandida (produto com requisito crítico de sigilo — `JOGO-02`). 8 mutações de comportamento, todas injetadas em estado descartável e revertidas com `git checkout --`; a árvore real nunca ficou suja (`git status --porcelain` vazio após cada rodada).

| # | Arquivo:linha | Mutação | Testes rodados | Morto? |
| - | ------------- | ------- | -------------- | ------ |
| 1 | `server/games/quem-sou-eu/projecao.ts:113` | `podeVerCarta` passa a devolver `true` sempre — a própria carta entra no payload antes de `DESC-04`/`FIM-02` (`JOGO-02`) | `projecao.test.ts` | ✅ Morto — 6 falhas |
| 2 | `server/games/quem-sou-eu/sorteio.ts:25` | `ciclo[(i + 1) % n]` → `ciclo[i % n]` — permutação vira identidade, todo mundo escreve a própria carta (`ESCR-01`) | `sorteio.test.ts`, `regras.test.ts` | ✅ Morto — 6 falhas |
| 3 | `server/core/prazos.ts:19` | `definir` zera todos os outros prazos antes de gravar — simula exatamente a falha que AD-010 existe para impedir | `prazos.test.ts`, `despacho.test.ts` | ✅ Morto — 5 falhas |
| 4 | `server/core/despacho.ts:177` | Removida a verificação `autor.id !== sala.hostId` em `iniciar` — qualquer jogador comanda a sala (`HOST-06`) | `despacho.test.ts` | ✅ Morto — 2 falhas |
| 5 | `server/games/quem-sou-eu/regras.ts:377` | Removida a verificação de confirmador em `responderDeclaracao` — qualquer um confirma o "Descobri!" de qualquer um (`DESC-02`, `DESC-03`) | `regras.test.ts` | ✅ Morto — 4 falhas |
| 6 | `server/games/quem-sou-eu/regras.ts:354` | Removido `if (estado.declaracaoPendente !== null) return { ok: false, erro: 'COMANDO_INVALIDO' }` — duas declarações podem ficar pendentes ao mesmo tempo (`DESC-10`) | `npm run test:unit` **e** `npm run test:integration` | ❌ **Sobreviveu** — 312 + 64 continuaram verdes |
| 7 | `server/core/chat.ts:29` | `naJanela >= CHAT_MAX_POR_JANELA` → `>` — off-by-one libera a 6ª mensagem na janela (`CHAT-02`) | `chat.test.ts` | ✅ Morto — 2 falhas |
| 8 | `server/core/sala-do.ts:174` | Removido o agendamento de `migracaoHost` na queda do host (`HOST-04`) | `sala-do.integration.test.ts`, `expiracao.integration.test.ts` | ✅ Morto — 2 falhas |

**Resultado**: 7/8 mortos — ❌ FAIL.

O sobrevivente é o único ponto do sistema onde o comportamento pode regredir em silêncio: o código de `DESC-10` está correto, mas nenhuma asserção o segura.

---

## Critérios de aceite ancorados no spec

Legenda: ✅ coberto com valor batendo o spec · ❌ sem evidência · ⚠️ lacuna de precisão / cobertura parcial · 🖥️ camada L5 (React) — `Tests: none` pela matriz de cobertura, por decisão AD-008; coberto por build gate + verificação no navegador (T27–T30).

### P1 — Criar e entrar em uma sala

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `SALA-01` código de 5 letras, alfabeto sem I/O/0/1 | código com 5 letras de `ABCDEFGHJKLMNPQRSTUVWXYZ` | `server/core/codigo.test.ts:6` — `expect([...'IO01'].filter((c) => ALFABETO_CODIGO.includes(c))).toEqual([])`; `server/index.integration.test.ts:104` — `expect(codigo).toHaveLength(5)` | ✅ |
| `SALA-01` sala nasce em LOBBY | `fase: 'lobby'`, sem jogadores | `server/index.integration.test.ts:111` — `expect(await lerSala(codigo)).toMatchObject({ fase: 'lobby', jogadores: [] })` | ✅ |
| `SALA-01` criador vira host | `eu.ehHost === true` para o primeiro, `false` para o segundo | `server/core/sala-do.integration.test.ts:143` — `expect(ultimaProjecao(ana).eu.ehHost).toBe(true)` | ✅ |
| `SALA-02` pede apenas apelido | handshake exige só `{t:'entrar', apelido}` | `server/index.integration.test.ts:228` — `entrar(codigo.toLowerCase(), 'Ana')` entra com apelido e nada mais; tela em `client/src/telas/Inicio.tsx` | ✅ (protocolo) / 🖥️ (tela) |
| `SALA-03` apelido < 2 ou > 16 recusado | `APELIDO_INVALIDO`, sala intocada | `server/core/roster.test.ts:52` — `expect(resultado).toEqual({ ok: false, erro: 'APELIDO_INVALIDO' })`; `:63`; `:98` — `expect(estado.jogadores).toEqual([])` | ✅ |
| `SALA-03` só espaços recusado | `APELIDO_INVALIDO` | `server/core/roster.test.ts:84` — `expect(resultado).toEqual({ ok: false, erro: 'APELIDO_INVALIDO' })` | ✅ |
| `SALA-04` apelido repetido, sem caixa e sem espaços | `APELIDO_EM_USO`, mensagem "esse apelido já está na sala" | `server/core/roster.test.ts:118` — `toEqual({ ok: false, erro: 'APELIDO_EM_USO' })`; `:137` (espaços); `:128` (acentuada); mensagem em `server/core/sala-do.ts:30` — `'Esse apelido já está na sala.'`, entregue só ao autor em `sala-do.integration.test.ts:155` | ✅ |
| `SALA-05` 21º jogador recusado | `SALA_CHEIA`, roster fica em 20 | `server/core/roster.test.ts:165` — `toEqual({ ok: false, erro: 'SALA_CHEIA' })` + `:166` — `expect(estado.jogadores).toHaveLength(20)`; handshake em `server/index.integration.test.ts:166` | ✅ |
| `SALA-06` código sem sala viva | `SALA_NAO_ENCONTRADA` e socket fechado | `server/index.integration.test.ts:155` — `expect(erros(cliente).map((e) => e.codigo)).toEqual(['SALA_NAO_ENCONTRADA'])` + `:156` socket fechado | ✅ (o "oferecer criar uma nova" é 🖥️ — `client/src/telas/Inicio.tsx`) |
| `SALA-07` cor não usada, consistente | 20 cores distintas; cor liberada volta ao pool | `server/core/roster.test.ts:177` — `expect(new Set(cores).size).toBe(MAX_JOGADORES)`; `:186` — `expect(corLivre(estado)).toBe(ana.cor)`; consistência de exibição em `client/src/componentes/cores.ts` | ✅ (dado) / 🖥️ (exibição) |
| `SALA-08` código à vista + botão de copiar link | link = origem + `/` + código | `client/src/estado/entrada.test.ts:44` — `expect(linkDeConvite('https://resenha.app','KTVRM')).toBe('https://resenha.app/KTVRM')` + `:48`; botão em `client/src/componentes/Shell.tsx:70` e `client/src/telas/Lobby.tsx:116` | ✅ (L4) / 🖥️ (botão) |
| `SALA-09` entra no LOBBY → ativo | `situacao === 'ativo'` | `server/core/roster.test.ts:194` — `expect(entrarOk(estado, 'Ana').situacao).toBe('ativo')` | ✅ |
| `SALA-10` entra fora do LOBBY → aguardando, sem alvo, fora do rodízio | `situacao === 'aguardando'` nas 3 fases; sem atribuição; fora da ordem | `server/core/roster.test.ts:200`, `:206`, `:212` — `.toBe('aguardando')`; `server/games/quem-sou-eu/regras.test.ts:117` — `expect(Object.keys(estado.atribuicoes).sort()).toEqual(['a','b','c'])` (d fora); `:497` — `expect(estado.ordem).toEqual(['a','b','c'])` | ✅ |
| `SALA-10` vira ativo na próxima partida | todos promovidos a `ativo` | `server/core/despacho.test.ts:479` — `expect(sala.jogadores.map((j) => j.situacao)).toEqual(['ativo','ativo','ativo'])` | ✅ |

### P1 — Comandar a sala como host

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `HOST-01` ≥3 ativos habilita "Iniciar"; <3 desabilita e informa o mínimo | `JOGADORES_INSUFICIENTES` abaixo de 3; ok com exatamente 3 | `server/games/quem-sou-eu/regras.test.ts:88` — `toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })`; `:94` — aceita com 3; mensagem "São necessários ao menos 3 jogadores." em `server/core/sala-do.ts:36` | ✅ (o botão desabilitado é 🖥️ — `client/src/telas/Lobby.tsx`) |
| `HOST-01` aguardando não conta para o mínimo | recusa com 2 ativos + 1 aguardando | `server/games/quem-sou-eu/regras.test.ts:127` — `toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })` | ✅ |
| `HOST-02` expulsar remove imediatamente | roster perde o jogador; `removidos: [id]` | `server/core/despacho.test.ts:394` — `toEqual({ ok: true, valor: { removidos: ['j3'] } })` + `:395` roster; `server/core/roster.test.ts:295` | ✅ |
| `HOST-02` impede reentrada com o mesmo token | `TOKEN_BANIDO` no `entrar` e no handshake | `server/core/roster.test.ts:228` — `toEqual({ ok: false, erro: 'TOKEN_BANIDO' })`; `server/index.integration.test.ts:207` — `expect(erros(volta).map((e) => e.codigo)).toEqual(['TOKEN_BANIDO'])` | ✅ |
| `HOST-03` transfere e remove poderes do anterior | `hostId` passa ao alvo | `server/core/roster.test.ts:327` — `expect(estado.hostId).toBe(bia.id)`; `server/core/despacho.test.ts:140` — não-host recusado, `hostId` intacto | ✅ |
| `HOST-04` 30 s desconectado → mais antigo entre os conectados | prazo = desconexão + 30 000 ms; novo host = 2º mais antigo conectado | `server/core/sala-do.integration.test.ts:279` — `expect(prazo).toBeGreaterThanOrEqual(desconectouEm + MIGRACAO_HOST_MS)` + `:281` — `expect((await lerSala(stub))?.hostId).toBe(bruno.jogadorId)`; `server/core/roster.test.ts:352` — `expect(novoHost).toBe(bia.id)`; `:364` ignora desconectados | ✅ |
| `HOST-04` anuncia a troca a todos | mensagem de sistema no chat de todos | `server/core/sala-do.integration.test.ts:294` — `expect(...chat.map((m) => m.texto)).toContain('Bruno agora comanda a sala.')` | ✅ |
| `HOST-05` ex-host reconecta como jogador comum | `eu.ehHost === false`, `sala.hostId` segue com o novo | `server/core/sala-do.integration.test.ts:328` — `expect(ultimaProjecao(volta).eu.ehHost).toBe(false)` + `:329`; `server/core/roster.test.ts:388` | ✅ |
| `HOST-06` não-host executando ação de host é rejeitado, sala intocada | `SEM_AUTORIDADE` + estado idêntico ao anterior | `server/core/despacho.test.ts:94` — `toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })` + `:95` — `expect(sala).toEqual(antes)`; idem `:109`, `:124`, `:139`; `regras.test.ts:337` (comecar), `:379` (cancelar), `:1198` (encerrar), `:1283` (novaPartida) | ✅ |
| `HOST-07` "Encerrar partida" pede confirmação | modal antes de executar | `client/src/telas/Jogo.tsx:146-158` — `HOST-07`, `Modal` com `rotuloConfirmar="Encerrar e revelar tudo"` | 🖥️ |

### P1 — Sortear alvos e escrever as cartas

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `ESCR-01` permutação sem ponto fixo | zero pontos fixos, cada um alvo de exatamente um | `server/games/quem-sou-eu/sorteio.test.ts:34` — `expect(encontrados).toEqual([])` (500× com 3); `:45` (500× com 20); `:70-81` — para 3..20 jogadores, `{escritores, alvos, pontosFixos}` = `{todos, todos, []}` | ✅ |
| `ESCR-01` um alvo por jogador ativo + sala vai a ESCRITA | atribuições exatamente dos ativos; `fase === 'escrita'` | `server/core/despacho.test.ts:149` — `expect(sala.fase).toBe('escrita')` + `:150` — `expect(Object.keys(sala.jogo?.atribuicoes ?? {}).sort()).toEqual(['j1','j2','j3'])` | ✅ |
| `ESCR-02` exibe apelido do alvo + campo de escrita | `eu.alvo` = `{id, apelido}` do alvo | `server/games/quem-sou-eu/projecao.test.ts:246` — `expect(projetar(jogo, sala, 'a').eu.alvo).toEqual({ id: 'b', apelido: 'B' })` | ✅ (dado) / 🖥️ (campo — `client/src/telas/Escrita.tsx`) |
| `ESCR-03` >60 caracteres ou só espaços recusado | `CARTA_INVALIDA`, estado intocado | `server/games/quem-sou-eu/regras.test.ts:154` — `toEqual({ ok: false, erro: 'CARTA_INVALIDA' })` (61 chars); `:171` (espaços); `:179` (vazia); `:161` aceita exatamente 60; `:209` — `expect(estado).toEqual(antes)` | ✅ |
| `ESCR-04` registra a carta e reflete "N de M prontos" sem revelar conteúdo | `prontos: 2, total: 3`; nenhuma carta no payload alheio | `server/games/quem-sou-eu/projecao.test.ts:271` — `expect(projetar(...).jogo).toMatchObject({ prontos: 2, total: 3 })`; `:280` — lista marca quem está pronto; não-vazamento em `:111` | ✅ |
| `ESCR-05` desmarcar libera a edição | após desmarcar, a carta é sobrescrita | `server/games/quem-sou-eu/regras.test.ts:274` — `expect(novo.cartas[estado.atribuicoes['a']]).toBe('Outra carta')` | ✅ |
| `ESCR-05` editar sem desmarcar é recusado | `COMANDO_INVALIDO` | `server/games/quem-sou-eu/regras.test.ts:283` — `toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })` | ✅ |
| `ESCR-06` todos PRONTO habilita "Começar"; pendente mantém desabilitado | `PRONTOS_PENDENTES` com pendente; `faseSeguinte: 'jogo'` com todos | `server/games/quem-sou-eu/regras.test.ts:321` — `toEqual({ ok: false, erro: 'PRONTOS_PENDENTES' })`; `:329` — `expect(resultado.faseSeguinte).toBe('jogo')` | ✅ |
| `ESCR-06` aguardando não trava o "Começar" | começa mesmo com um aguardando sem PRONTO | `server/games/quem-sou-eu/regras.test.ts:347` — `expect(resultado.faseSeguinte).toBe('jogo')` + `:348` — `expect(resultado.estado.ordem).not.toContain('d')` | ✅ |
| `ESCR-07` saída na ESCRITA descarta cartas, sorteia novos alvos, zera PRONTO | `cartas: {}`; novas atribuições sem ponto fixo entre os restantes; `prontos: []` | `server/games/quem-sou-eu/regras.test.ts:395` — `expect(resultado.estado.cartas).toEqual({})`; `:412-416` — `{escritores:['a','b','c'], alvos:['a','b','c'], pontosFixos:[]}`; `:428` — `expect(resultado.estado.prontos).toEqual([])`; expulsão em `server/core/despacho.test.ts:405-406` | ✅ |
| `ESCR-08` <3 ativos após redistribuir → cancela e volta ao LOBBY informando o motivo | `faseSeguinte: 'lobby'`, estado zerado, evento "são necessários ao menos 3 jogadores" | `server/games/quem-sou-eu/regras.test.ts:441-446` — `toEqual({ fase: 'lobby', atribuicoes: {}, cartas: {}, minimo: 3 })`; texto em `server/games/quem-sou-eu/regras.ts:522` | ✅ |
| `ESCR-09` "Cancelar" descarta cartas e volta ao LOBBY | `{fase:'lobby', cartas:{}, atribuicoes:{}, prontos:[]}` | `server/games/quem-sou-eu/regras.test.ts:358-363` — `toEqual({ fase: 'lobby', cartas: {}, atribuicoes: {}, prontos: [] })` | ✅ |
| `ESCR-09` promove todo aguardando a ativo | `promoverAguardando === true`, aplicado pelo core | `server/games/quem-sou-eu/regras.test.ts:371` — `expect(resultado.promoverAguardando).toBe(true)`; `server/core/despacho.test.ts:479` — situações viram todas `ativo` | ✅ |
| `ESCR-10` entrada na ESCRITA não redistribui | estado idêntico ao anterior | `server/games/quem-sou-eu/regras.test.ts:481` — `expect(resultado.estado).toEqual(pronto)` | ✅ (o aviso ao host é 🖥️ — `client/src/telas/Escrita.tsx:246`) |

### P1 — Jogar a partida

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `JOGO-01` lista com as cartas de todos; a própria oculta | cartas de b e c presentes, a de "a" `undefined` | `server/games/quem-sou-eu/projecao.test.ts:160-165` — `expect(cartas).toEqual({ a: undefined, b: CARTAS['b'], c: CARTAS['c'], d: undefined })`; `:175` — o campo é omitido, não enviado vazio | ✅ |
| `JOGO-02` a própria carta não trafega em nenhuma mensagem até `DESC-04`/`FIM-02` | o texto da carta não aparece em nenhum ponto do JSON, em nenhuma fase | `server/games/quem-sou-eu/projecao.test.ts:111` — `expect(vazamentos).toEqual([])` varrendo `JSON.stringify` nas 3 fases × 3 jogadores; `:127` (com declaração pendente); `:138` (com outro já confirmado); `:147` — o detector não é vazio: as cartas alheias **estão** no payload | ✅ |
| `JOGO-03` ordem conforme configuração + indica de quem é a vez | `'entrada'` → ordem de entrada; `'sorteada'` → varia entre execuções; `vezDe` = primeiro | `server/games/quem-sou-eu/regras.test.ts:489` — `expect(estado.ordem).toEqual(['a','b','c'])`; `:520` — `expect(ordens.size).toBeGreaterThan(1)` em 200 sorteios; `:526` — `expect(estado.vezDe).toBe('a')`; difusão em `server/core/sala-do.integration.test.ts:245` | ✅ |
| `JOGO-04` "Passei a vez" avança para o próximo ativo | `vezDe` passa de `a` para `b` | `server/games/quem-sou-eu/regras.test.ts:537` — `expect(resultado.estado.vezDe).toBe('b')` | ✅ |
| `JOGO-05` host pula a vez independentemente de quem é o atual | host não sendo o da vez avança mesmo assim | `server/games/quem-sou-eu/regras.test.ts:581` — `expect(resultado.estado.vezDe).toBe('b')` (pularVez); `:545` — host avança pela 2ª vez sem ser o da vez | ✅ |
| `JOGO-06` quem não é da vez nem host é rejeitado | `SEM_AUTORIDADE`, sala intocada | `server/games/quem-sou-eu/regras.test.ts:560` — `toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })`; `server/core/despacho.test.ts:424-425` — erro **e** `expect(sala).toEqual(antes)` | ✅ |
| `JOGO-06` não-host não pula a vez | `SEM_AUTORIDADE` para `pularVez` de quem é o da vez mas não é host | `server/games/quem-sou-eu/regras.test.ts:590` — `toEqual({ ok: false, erro: 'SEM_AUTORIDADE' })` | ✅ |
| `JOGO-07` tempo por turno esgota → avança automaticamente | prazo = agora + 30 000; `vezDe` avança no vencimento | `server/games/quem-sou-eu/regras.test.ts:626` — `expect(resultado.prazos).toEqual({ turno: AMBIENTE.agora + 30_000 })`; `:639` — reagenda para 80 000; `:647` — `expect(resultado.estado.vezDe).toBe('b')`; com DO hibernado em `server/core/sala-do.integration.test.ts:343-344` | ✅ |
| `JOGO-08` "sem limite" nunca avança por tempo | `prazos: { turno: null }`; `vezDe` inalterado no aviso | `server/games/quem-sou-eu/regras.test.ts:656` — `toEqual({ turno: null })`; `:664` — `expect(resultado.estado.vezDe).toBe('a')` | ✅ |
| `JOGO-09` fim da ordem volta ao primeiro do rodízio | após c passar, `vezDe === 'a'` | `server/games/quem-sou-eu/regras.test.ts:613` — `expect(resultado.estado.vezDe).toBe('a')` | ✅ |
| `JOGO-10` jogador da vez sai → avança automaticamente | `vezDe` passa ao seguinte; ordem, cartas e atribuições órfãs limpas | `server/games/quem-sou-eu/regras.test.ts:678` — `expect(resultado.estado.vezDe).toBe('b')`; `:692` — volta ao primeiro quando sai o último; `:716-719` — `ordem`, `cartas` e atribuições órfãs (edge case do spec) | ✅ |
| `JOGO-11` desconectado não perde a vez; host pode pular | `vezDe` chega a `b` desconectado; host pula para `c` | `server/games/quem-sou-eu/regras.test.ts:1352` — `expect(resultado.estado.vezDe).toBe('b')`; `:1362` — `.toBe('c')`; posição preservada na reconexão em `server/core/sala-do.integration.test.ts:245-246` | ✅ |

### P1 — Declarar "Descobri!"

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `DESC-01` anuncia a todos e fica pendente, sem revelar | `declaracaoPendente = {jogadorId, declaradaEm}`; `descobriram: []`; `reveladoParaTodos: false`; evento no chat | `server/games/quem-sou-eu/regras.test.ts:742-745` — `toEqual({ jogadorId: 'b', declaradaEm: AMBIENTE.agora })`; `:757` — `toEqual({ cartas: estado.cartas, descobriram: [], reveladoParaTodos: false })`; `:765` — `toEqual([{ texto: 'B declarou que descobriu!' }])`; na projeção, `projecao.test.ts:357-358` — `toEqual({ jogadorId: 'c' })` **e** a carta ausente | ✅ |
| `DESC-02` apresenta "Confirmar"/"Negar" ao host identificando o jogador | só o host tem `souConfirmador`; a declaração traz `jogadorId` | `server/games/quem-sou-eu/projecao.test.ts:326` — `expect(confirmadores).toEqual(['a'])`; `:348` — ninguém sem pendência; ações em `client/src/telas/Jogo.tsx:255` | ✅ (dado) / 🖥️ (botões) |
| `DESC-03` host declarando → mais antigo entre os demais conectados **e ativos** | `souConfirmador` vai para `b` (2º mais antigo); aguardando e desconectados são ignorados | `server/games/quem-sou-eu/projecao.test.ts:337` — `expect(confirmadores).toEqual(['b'])`; `regras.test.ts:874-875` — aguardando recebe `SEM_AUTORIDADE` e o ativo seguinte confirma; `:900-901` — desconectado idem; `:933` — host não confirma a si mesmo | ✅ |
| `DESC-03` aguardando não confirma (edge case) | `JOGADOR_AGUARDANDO` no despacho | `server/core/despacho.test.ts:217` — `toEqual({ ok: false, erro: 'JOGADOR_AGUARDANDO' })` | ✅ |
| `DESC-04` confirmada → revela ao declarante, marca "descobriu", anuncia | `eu.minhaCarta` só para ele; `descobriram: ['b']`; `pendente: null`; evento "B descobriu!" | `server/games/quem-sou-eu/projecao.test.ts:191` — `expect(projetar(jogo, sala, 'b').eu.minhaCarta).toBe(CARTAS['b'])`; `:199` — `expect(comMinhaCarta).toEqual(['b'])`; `:205` — `descobriu` marcado para todos; `regras.test.ts:954` — `toEqual({ descobriram: ['b'], pendente: null })`; `:982` — evento | ✅ |
| `DESC-05` negada → descarta sem revelar, anuncia, permite declarar de novo | `{pendente: null, descobriram: [], reveladoParaTodos: false}`; nova declaração aceita | `server/games/quem-sou-eu/regras.test.ts:998-1002` — `toEqual({ pendente: null, descobriram: [], reveladoParaTodos: false })`; `:1016` — declara de novo; `:1033` — `toEqual([{ texto: 'Ainda não: B não descobriu.' }])` | ✅ |
| `DESC-06` "sai do rodízio" remove da ordem, mantém acesso a cartas/chat/notas | `ordem` perde o jogador; `descobriram` o mantém; projeção segue completa | `server/games/quem-sou-eu/regras.test.ts:1062` — `expect(resultado.estado.ordem).toEqual(['a','b','d'])`; `:1074-1077` — avança a vez quando saiu o da vez; acesso preservado em `projecao.test.ts:205` (ficha) e `:289` (notas) | ✅ |
| `DESC-07` "continua jogando" mantém na ordem | ordem inalterada com os 4 | `server/games/quem-sou-eu/regras.test.ts:1068` — `expect(resultado.estado.ordem).toEqual(['a','b','c','d'])` | ✅ |
| `DESC-08` "sai" e rodízio < 2 → encerra aplicando `FIM-02` | `{fase:'encerrada', revelado:true, ordem:['a'], vezDe:null}` | `server/games/quem-sou-eu/regras.test.ts:1093-1098` — `toEqual({ fase: 'encerrada', revelado: true, ordem: ['a'], vezDe: null })`; `:1100` — não encerra antes disso; `:1120-1123` — nunca encerra com "continua" | ✅ |
| `DESC-09` declarar de novo com pendência ou já confirmado é ignorado sem alterar estado | estado idêntico, `eventos: []` | `server/games/quem-sou-eu/regras.test.ts:802-803` — `expect(resultado.estado).toEqual(pendente)` **e** `expect(resultado.eventos).toEqual([])`; `:817` — já confirmado | ✅ |
| `DESC-10` outro jogador declara com pendência aberta → **recusar** | `{ ok: false, erro: 'COMANDO_INVALIDO' }`; a pendência do primeiro permanece intacta | — **nenhuma citação** | ❌ **Sem evidência** |
| `DESC-11` declarante sai com pendência → descarta sem revelar | `declaracaoPendente === null` | `server/games/quem-sou-eu/regras.test.ts:1140` — `expect(resultado.estado.declaracaoPendente).toBeNull()` (a carta do que saiu também é apagada em `regras.ts:565`) | ✅ |

### P1 — Encerrar, revelar e jogar de novo

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `FIM-01` confirma "Encerrar" → ENCERRADA | `faseSeguinte === 'encerrada'` | `server/games/quem-sou-eu/regras.test.ts:1150` — `expect(resultado.faseSeguinte).toBe('encerrada')` | ✅ |
| `FIM-02` ENCERRADA revela a carta de todos os ativos a todos, inclusive aguardando | `reveladoParaTodos: true`; `eu.minhaCarta` para os 3; lista completa; aguardando também vê | `server/games/quem-sou-eu/regras.test.ts:1158` — `.toBe(true)` + `:1166` — textos preservados; `projecao.test.ts:218` — `expect(minhas).toEqual(CARTAS)`; `:224` — lista completa; `:237` — a projeção de `d` (aguardando) traz as 3 cartas | ✅ |
| `FIM-03` "Nova partida" volta ao LOBBY, promove aguardando, limpa cartas/alvos/descobriu/notas | `faseSeguinte: 'lobby'`; tudo zerado; `promoverAguardando: true`; `notas: {}` | `server/games/quem-sou-eu/regras.test.ts:1222` — `.toBe('lobby')`; `:1237-1244` — `{cartas:{}, atribuicoes:{}, descobriram:[], ordem:[], prontos:[], reveladoParaTodos:false}`; `:1253` — `expect(resultado.estado.notas).toEqual({})`; `:1261` — `promoverAguardando`; aplicação em `despacho.test.ts:479` | ✅ |
| `FIM-04` preserva jogadores, apelidos, cores, chat e configurações | contexto (jogadores + config) idêntico antes/depois | `server/games/quem-sou-eu/regras.test.ts:1270` — `expect(contexto).toEqual(antes)` (cobre jogadores, apelidos, cores e config) | ⚠️ **Parcial** — a cláusula "**o histórico do chat**" não tem asserção: `ContextoDeSala` (`despacho.ts:279-285`) não carrega `chat`, e nenhum teste verifica que `sala.chat` sobrevive ao `novaPartida` |
| `FIM-05` todos os ativos saem no JOGO ou na ENCERRADA → encerra e volta ao LOBBY promovendo aguardando | `faseSeguinte: 'lobby'`; estado zerado; `promoverAguardando: true` | `server/games/quem-sou-eu/regras.test.ts:1310` — `.toBe('lobby')`; `:1321-1326` — `{cartas:{}, atribuicoes:{}, ordem:[], vezDe:null}`; `:1338-1341` — `{fase:'lobby', promover:true}` | ✅ |

### P1 — Configurar a partida

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `CFG-01` ordem "sorteada" ou "ordem de entrada" | `config.ordemTurnos` aplicada; efeito na ordem do rodízio | `server/core/despacho.test.ts:249-253` — `expect(sala.config).toEqual({ ordemTurnos: 'entrada', ... })`; efeito em `regras.test.ts:489` e `:520` | ✅ |
| `CFG-02` "continua jogando" ou "sai do rodízio" | `config.aoDescobrir` aplicada; efeito na ordem | `server/core/despacho.test.ts:249-253` — `aoDescobrir: 'continua'` gravado; efeito em `regras.test.ts:1062` (sai) e `:1068` (continua) | ✅ |
| `CFG-03` tempo entre "sem limite", 30, 60, 90 e 120 s | 90 aceito; 7 recusado com `COMANDO_INVALIDO` e config intocada | `server/core/despacho.test.ts:249-253` — `tempoTurnoSeg: 90`; `:286-287` — `toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })` **e** `expect(sala.config).toEqual(CONFIG_PADRAO)`; conjunto em `server/core/despacho.ts:20` — `[30, 60, 90, 120]` | ✅ |
| `CFG-04` fora do LOBBY as configurações são somente leitura | `FASE_INVALIDA` e `tempoTurnoSeg` inalterado | `server/core/despacho.test.ts:174-175` — `toEqual({ ok: false, erro: 'FASE_INVALIDA' })` **e** `expect(sala.config.tempoTurnoSeg).toBeNull()` | ✅ (a exibição travada é 🖥️ — `client/src/telas/Lobby.tsx:319`) |
| `CFG-05` padrões: sorteada, sai do rodízio, sem limite | `{ordemTurnos:'sorteada', aoDescobrir:'sai', tempoTurnoSeg:null}` | `server/core/despacho.test.ts:291-295` — `toEqual({ ordemTurnos: 'sorteada', aoDescobrir: 'sai', tempoTurnoSeg: null })`; na criação real em `server/index.integration.test.ts:115` | ✅ |
| `CFG-06` mudança reflete na tela de todos | alteração parcial preserva as demais; projeção carrega `sala.config` e é difundida por socket | `server/core/despacho.test.ts:268-272` — `toEqual({ ordemTurnos: 'entrada', aoDescobrir: 'sai', tempoTurnoSeg: 60 })`; `projecao.ts:29` inclui `config`; difusão por jogador em `server/core/conexoes.integration.test.ts:142-143` | ✅ |

### P1 — Nunca perder a vaga por conexão

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `CONN-01` emite token opaco; cliente persiste no navegador | UUID v4 no `entrou`; token guardado por código de sala no `localStorage` | `server/core/sala-do.integration.test.ts:131` — `expect(ana.token).toMatch(/^[0-9a-f-]{36}$/)`; `client/src/estado/sessao.test.ts:98` — `expect(criarSessao(depositoDoNavegador()).lerToken('ABCDE')).toBe('tok-abcde')`; `:48` — não vaza entre salas | ✅ |
| `CONN-02` reconexão devolve a mesma vaga com apelido, cor, host, alvo, carta, notas e posição no rodízio | mesmo `id`; ficha idêntica exceto `conectado`; `alvo`/`cartaQueEscrevi`/`notas` restaurados; `vezDe` e `ordem` iguais | `server/core/sala-do.integration.test.ts:205` — `expect(depois.jogadores).toEqual([{ ...antes.jogadores[0], conectado: true }])`; `:226-230` — `toMatchObject({ alvo: alvoAntes, cartaQueEscrevi: 'Chapolin', notas: 'não é humano' })`; `:245-246` — `vezDe` e `ordem`; `server/core/roster.test.ts:242-250` | ✅ |
| `CONN-03` desconexão marca para todos e preserva a vaga | ficha do outro com `conectado: false`, apelido mantido | `server/core/sala-do.integration.test.ts:189` — `toMatchObject({ apelido: 'Bruno', conectado: false })` | ✅ |
| `CONN-04` token de expulso é recusado | `TOKEN_BANIDO` no handshake e na reconexão | `server/index.integration.test.ts:207` — `toEqual(['TOKEN_BANIDO'])` + `:208` socket fechado; `server/core/roster.test.ts:273` — `toEqual({ ok: false, erro: 'TOKEN_BANIDO' })` | ✅ |
| `CONN-05` hibernação/reinício restaura o estado completo sem perder a partida | documento idêntico após `evictDurableObject`; vínculo socket→jogador sobrevive; comando seguinte opera sobre o estado recarregado | `server/core/estado.integration.test.ts:135` — `expect(await rodar((s) => carregar(s))).toEqual(sala)`; `server/core/conexoes.integration.test.ts:103` — `expect(ids).toEqual(['j1'])`; `server/core/sala-do.integration.test.ts:356-358` — fase, contagem de cartas e chat preservados; `:368` — `expect(campos.sort()).toEqual(['ctx','jogo'])` (nenhum campo mutável em instância) | ✅ |
| `CONN-06` "Sair" libera a vaga e invalida o token daquela sala | `removidos: [id]`, roster reduzido, `reconectar` devolve `JOGADOR_NAO_ENCONTRADO`, sem banir | `server/core/despacho.test.ts:354-355` — `toEqual({ ok: true, valor: { removidos: ['j3'] } })` + roster; `:362` — `toEqual({ ok: false, erro: 'JOGADOR_NAO_ENCONTRADO' })`; `:370` — `expect(sala.banidos).toEqual([])`; socket fechado em `sala-do.integration.test.ts:408`; token apagado no cliente em `client/src/estado/sessao.test.ts:77` | ✅ |
| `CONN-07` 30 min sem conexão ativa → destrói e libera o código | prazo ≥ agora + 1 800 000 ms; após vencer, `carregar` devolve `null` e o código volta a "sala não encontrada" | `server/core/expiracao.integration.test.ts:95` — `expect(prazo).toBeGreaterThanOrEqual(antes + SALA_VAZIA_MS)`; `:109` — `expect(await lerSala(codigo)).toBeNull()`; `:125-127` — `SALA_NAO_ENCONTRADA`; `:141` — reconexão cancela; `:148` — não agenda com alguém conectado | ✅ |
| `CONN-08` 6 h sem ação de jogador → destrói mesmo com sockets abertos | prazo = `ultimaAcaoEm` + 21 600 000 ms; sala vira `null` e o socket aberto recebe `SALA_EXPIRADA` | `server/core/expiracao.integration.test.ts:160` — `expect(sala?.prazos.salaOciosa).toBe((sala?.ultimaAcaoEm ?? 0) + SALA_OCIOSA_MS)`; `:173-178` — `toBeNull()` **e** `{t:'erro', codigo:'SALA_EXPIRADA', ...}`; `:190` — ação empurra o prazo; `server/core/despacho.test.ts:498` — aviso de prazo **não** conta como ação; `:515` — comando recusado não conta | ✅ |

### P2 — Chat da sala

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `CHAT-01` 1–300 caracteres (sem contar espaços das pontas) entregue com apelido e cor do autor | 300 aceito, 301 `CHAT_MUITO_LONGO` sem registrar; vazio/só espaços `CHAT_VAZIO`; mensagem gravada com `autorId` e `em` | `server/core/chat.test.ts:32-33` — `toEqual({ ok: true, valor: undefined })` + 1 mensagem; `:41` — `CHAT_MUITO_LONGO`; `:84` — `expect(estado.chat).toEqual([])`; `:49`/`:58` — `CHAT_VAZIO` + chat vazio; `:92-97` — `toEqual({ tipo:'jogador', autorId:'ana', texto:'oi gente', em:1_234 })`; apelido/cor resolvidos pela ficha em `projecao.ts:84-91` | ✅ |
| `CHAT-02` >5 mensagens em 5 s: descarta as excedentes **e avisa apenas o autor** | 5 aceitas, a 6ª `CHAT_LIMITE_DE_TAXA` e ausente do chat; libera após 5 s; limite por jogador | `server/core/chat.test.ts:107` — `expect(estado.chat).toHaveLength(5)`; `:116` — `toEqual({ ok: false, erro: 'CHAT_LIMITE_DE_TAXA' })`; `:125` — `expect(estado.chat.map((m) => m.texto)).toEqual(['m0'..'m4'])`; `:134` — libera em 6 000; `:144` — por jogador | ⚠️ **Parcial** — a cláusula "avisar **apenas** o autor" não tem asserção. O mecanismo existe (`sala-do.ts:143` responde só ao socket que enviou) e está asserido para o caso irmão de `SALA-04` (`sala-do.integration.test.ts:155-157`), mas não para o limite de taxa |
| `CHAT-03` eventos de partida viram mensagem de sistema visualmente distinta | `{tipo:'sistema', texto, em}`; eventos do jogo convertidos pelo core | `server/core/chat.test.ts:154` — `toEqual({ tipo: 'sistema', texto: 'a partida começou', em: 2_000 })`; `server/core/despacho.test.ts:439-441` — `toEqual([{ tipo: 'sistema', texto: 'É a vez de Jogador 2.', em: ... }])`; eventos por transição em `regras.test.ts:300` (todos PRONTO), `:601` (troca de vez), `:765` (declaração), `:982` (confirmação), `:1033` (negativa), `:458` (redistribuição); migração de host em `sala-do.integration.test.ts:294` | ✅ (a distinção visual é 🖥️ — `client/src/componentes/Chat.tsx`) |
| `CHAT-04` reconexão entrega o histórico | `projecao.chat` igual ao chat da sala; round-trip preserva as duas variantes | `server/games/quem-sou-eu/projecao.test.ts:367` — `expect(projetar(jogo, sala, 'a').chat).toEqual(sala.chat)`; `server/core/estado.integration.test.ts:108-111` — as duas variantes sobrevivem ao storage | ✅ |
| `CHAT-05` acima de 200 mensagens descarta as mais antigas | comprimento fica em 200; a primeira passa a ser `m1` e a última `m200` | `server/core/chat.test.ts:181` — `toHaveLength(CHAT_MAX_MENSAGENS)`; `:188` — `toEqual(['m1','m200'])` | ✅ |

### P2 — Bloco de notas privado

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `NOTA-01` bloco de até 2 000 caracteres em ESCRITA/JOGO/ENCERRADA | 2 000 aceito, 2 001 `NOTAS_MUITO_LONGAS` sem gravar; no LOBBY `FASE_INVALIDA` | `server/core/despacho.test.ts:316` — `expect(sala.jogo?.notas.j2).toHaveLength(2_000)`; `:325-326` — `toEqual({ ok: false, erro: 'NOTAS_MUITO_LONGAS' })` **e** `expect(sala.jogo?.notas).toEqual({})`; `:334` — `FASE_INVALIDA` no lobby; `:306` — grava sob o autor | ✅ |
| `NOTA-02` a nota nunca é exposta a outro jogador | o texto não aparece em nenhum ponto do payload alheio; aparece no próprio | `server/games/quem-sou-eu/projecao.test.ts:306` — `expect(vazamentos).toEqual([])` varrendo `JSON.stringify` de todos para todos; `:289` — `expect(projetar(...).eu.notas).toBe(NOTAS['b'])`; `server/core/despacho.test.ts:343-344` — `not.toContain('segredo de j2')` **e** o próprio recebe | ✅ |
| `NOTA-03` reconexão restaura as notas | `eu.notas` volta com o texto | `server/core/sala-do.integration.test.ts:226-230` — `toMatchObject({ ..., notas: 'não é humano' })` | ✅ |
| `NOTA-04` nova partida limpa as notas de todos | `notas === {}` | `server/games/quem-sou-eu/regras.test.ts:1253` — `expect(resultado.estado.notas).toEqual({})` | ✅ |

### P2 — Interface responsiva e clean

| Critério | Resultado esperado pelo spec | `file:line` + asserção | Resultado |
| -------- | ---------------------------- | ---------------------- | --------- |
| `VIS-01` ≥360 px sem rolagem horizontal | — | `client/src/componentes/Shell.tsx`, telas em `client/src/telas/` | 🖥️ L5 — build gate + verificação no navegador em 360/390/768/1280 px (T27–T30) |
| `VIS-02` 20 jogadores com lista legível no celular | — | `client/src/telas/Jogo.tsx:27,189`, `client/src/componentes/Carta.tsx:26,97` | 🖥️ L5 — verificado com sala real de 20 jogadores (T27–T30) |
| `VIS-03` vez do jogador destacada de forma inequívoca | — | `client/src/componentes/IndicadorDeVez.tsx:25` | 🖥️ L5 |
| `VIS-04` ação de host não é exibida a não-host | — | `client/src/telas/Lobby.tsx:173`, `Escrita.tsx:246`, `Jogo.tsx:291`, `Encerrada.tsx:61`, `componentes/FichaDeJogador.tsx:14` | 🖥️ L5 (a recusa no servidor está coberta por `HOST-06`) |

---

## Edge cases do spec

| Edge case | Evidência | Resultado |
| --------- | --------- | --------- |
| Duas ações de host simultâneas — processa a primeira, rejeita a segunda | Serialização é do Durable Object (AD-004); a segunda cai na validação de fase/autoridade: `server/core/despacho.test.ts:160` — `FASE_INVALIDA` para `iniciar` fora do lobby | ✅ |
| Sorteio com 3 jogadores nunca falha por falta de opção | `server/games/quem-sou-eu/sorteio.test.ts:70-81` — ciclo válido de 3 a 20, `pontosFixos: []`, sem retry | ✅ |
| Reconexão na ESCRITA restaura alvo e carta parcial, sem redistribuir | `server/core/sala-do.integration.test.ts:226-230` — `toMatchObject({ alvo: alvoAntes, cartaQueEscrevi: 'Chapolin' })` | ✅ |
| Último PRONTO se desconecta sem sair — partida aguarda | `regras.ts:599-602` conta ativos, não conectados; `regras.test.ts:1352` prova que desconexão não altera o rodízio | ✅ |
| Código gerado colide com sala viva → gera outro | `server/index.integration.test.ts:130-132` — devolve o código seguinte **e** a sala colidida continua intacta | ✅ |
| Apelido só de espaços é recusado | `server/core/roster.test.ts:84` — `APELIDO_INVALIDO` | ✅ |
| Duas abas do mesmo navegador = mesma sessão | `server/core/conexoes.integration.test.ts:129` — `expect(total).toBe(2)` para o mesmo jogador; `:176-177` — mesma projeção nas duas abas; `sala-do.ts:164` não desconecta enquanto sobrar aba | ✅ |
| Carta com quebras de linha é normalizada para uma linha | `server/games/quem-sou-eu/regras.test.ts:190` — `.toBe('De Volta para o Futuro')` | ✅ |
| Jogador aguardando não age na partida, nem confirma declaração | `server/core/despacho.test.ts:201-202` — `JOGADOR_AGUARDANDO` **e** `expect(sala).toEqual(antes)`; `:217` para `responderDeclaracao` | ✅ |
| Alvo sai no JOGO → atribuição órfã descartada | `server/games/quem-sou-eu/regras.test.ts:718-719` — `not.toContain('c')` em chaves **e** valores de `atribuicoes` | ✅ |
| Host aciona "Passei a vez" sem ser o da vez → aceita, efeito de "Pular a vez" | `server/games/quem-sou-eu/regras.test.ts:545` — `.toBe('c')` com o host acionando `passarVez` sem ser o da vez | ✅ |

---

## Regra do payload/conjunção

Verificada em toda a superfície do diff: **nenhuma asserção do tipo "a função foi chamada"**. O padrão dominante é comparação de valor e de estado resultante:

- `toEqual` sobre o objeto `Resultado` inteiro (`{ok, erro}` ou `{ok, valor}`), não só sobre o campo `ok` — ex. `despacho.test.ts:94`, `regras.test.ts:88`.
- Conjunção recusa + estado intocado via `structuredClone`: `despacho.test.ts:95` (`expect(sala).toEqual(antes)`), `:202`, `:425`; `regras.test.ts:209`.
- Não-vazamento por varredura do payload serializado inteiro (`JSON.stringify`), não por checagem de um campo: `projecao.test.ts:91`, usado em `:111`, `:127`, `:138`, `:306`.
- **Controle de detector**: `projecao.test.ts:147` prova que a varredura de vazamento acha as cartas alheias — sem isso, o teste do `JOGO-02` poderia passar por estar vazio. Esse é o padrão que mais eleva a qualidade do conjunto.
- Efeitos descritos são asseridos por valor: `prazos` (`regras.test.ts:626`, `:639`, `:656`), `eventos` (`:601`, `:765`, `:1033`), `faseSeguinte` e `promoverAguardando` (`:1222`, `:1261`).

---

## Qualidade de código

| Princípio | Situação |
| --------- | -------- |
| Código mínimo, sem funcionalidade além do pedido | ✅ |
| Sem abstração especulativa | ✅ — a fronteira `core`/`games` é de localização e injeção (AD-002/AD-009), não um framework de jogos |
| Sem "flexibilidade" desnecessária | ✅ |
| Só arquivos necessários tocados | ✅ |
| Segue os padrões existentes | ✅ — comentários citam o AC que justificam; nomes em PT-BR consistentes |
| Checagem ancorada no spec (valor afirmado bate o spec) | ✅ — 2 lacunas parciais registradas (`FIM-04`, `CHAT-02`) |
| Expectativa de cobertura por camada atendida | ⚠️ — L1/L2 quase 1:1 com os ACs, exceto `DESC-10`; L3 cobre rotas, handlers, hibernação, alarme e persistência; L4 cobre sessão e reconexão; L5 é `none` por decisão declarada |
| Todo teste no escopo mapeia um AC, edge case ou "Done when" | ✅ — nenhum teste órfão encontrado |
| Guidelines documentadas seguidas | ✅ — nenhuma no repositório (greenfield); defaults fortes da matriz aplicados |

**Verificação da fronteira AD-002** (critério de sucesso do spec): `server/core/**` não importa nada de `games/`; a injeção acontece só em `server/index.ts:13`. Confirmado por leitura dos imports dos 8 arquivos de `core/`.

**Observação menor (não é falha de AC)**: `client/src/componentes/BannerDeConexao.tsx` está exportado em `componentes/index.ts` mas não é usado por nenhuma tela — `EstadosGlobais.tsx` implementou reconexão e sala fechada como telas inteiras. É código morto, já registrado como dívida no `STATE.md`. Não viola nenhum AC.

---

## Lacunas de projeção registradas no `STATE.md` — verificação

As três dívidas anotadas no handoff foram checadas contra o texto do spec:

1. **Confirmador não nomeável por terceiros** — `DESC-02` exige apresentar as ações "ao host identificando o jogador **que declarou**"; `DESC-03` exige *direcionar* a confirmação. Nenhum dos dois exige que terceiros saibam **quem** está confirmando. Confirmado: **lacuna de spec / desejo de UI além do spec**, não bug.
2. **Sem número de rodada ou de perguntas** — AD-003 exclui explicitamente o registro de perguntas, e o spec lista "registro de perguntas e respostas sim/não" em Out of Scope. Confirmado: **lacuna de spec**, não bug.
3. **`BannerDeConexao` sem uso** — nenhum AC exige uma faixa em vez de tela inteira. Confirmado: **código morto**, não bug.

---

## Fora de escopo desta validação

- **Publicação na Cloudflare não executada** por decisão do dono. O critério do T30 "uma partida completa roda no ambiente publicado" permanece **legitimamente em aberto**; `npm run build` passa e o `--dry-run` é reportado como verde no handoff.
- **UAT interativo** não foi reexecutado: as seis telas já foram verificadas no navegador durante o lote 6 (360/390/768/1280 px, dois temas, sala de 20 jogadores).

---

## Planos de correção

### Fix 1 — `DESC-10` sem teste (mutante sobrevivente) · **Blocker**

- **Causa raiz**: a suíte cobre `DESC-09` (o **mesmo** jogador declarando de novo) mas nunca exercita **outro** jogador declarando com uma pendência aberta. A guarda em `server/games/quem-sou-eu/regras.ts:354` fica sem asserção que a segure, e removê-la mantém 376 testes verdes.
- **Correção**: acrescentar em `server/games/quem-sou-eu/regras.test.ts`, no describe `declararDescobri`, um teste que declare por `b`, depois declare por `c`, e asserte o par conjunto — `expect(resultado).toEqual({ ok: false, erro: 'COMANDO_INVALIDO' })` **e** que a pendência continue sendo a de `b`.
- **Como provar**: com o teste no lugar, reinjetar a mutação 6 (remover a linha 354) e confirmar que ele falha.
- **Done when**: `DESC-10` tem citação `file:line` e a mutação 6 é morta.

### Fix 2 — `FIM-04`: preservação do chat sem asserção · **Minor**

- **Causa raiz**: `ContextoDeSala` (`server/core/despacho.ts:279-285`) não carrega `chat`, então o teste de nível de regra (`regras.test.ts:1270`) não consegue cobrir essa cláusula. Falta um teste no nível do `core`.
- **Correção**: em `server/core/despacho.test.ts`, despachar `novaPartida` numa sala com mensagens no chat e asserir que o histórico anterior continua presente depois da volta ao lobby.

### Fix 3 — `CHAT-02`: "avisar apenas o autor" sem asserção · **Minor**

- **Causa raiz**: o teste unitário prova o descarte, mas não que a notificação de limite de taxa fique restrita ao socket que enviou.
- **Correção**: em `server/core/sala-do.integration.test.ts`, estourar o limite com um jogador e asserir que só ele recebe `CHAT_LIMITE_DE_TAXA` e que o outro jogador não recebeu erro algum — espelhando o teste de `SALA-04` das linhas 147-157.

---

## Atualização de rastreabilidade

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| `SALA-01` … `SALA-10` | Implementing | ✅ Verified |
| `HOST-01` … `HOST-07` | Implementing | ✅ Verified |
| `ESCR-01` … `ESCR-10` | Implementing | ✅ Verified |
| `JOGO-01` … `JOGO-11` | Implementing | ✅ Verified |
| `DESC-01` … `DESC-09`, `DESC-11` | Implementing | ✅ Verified |
| `DESC-10` | Implementing | ❌ Needs Fix — sem evidência de teste |
| `FIM-01`, `FIM-02`, `FIM-03`, `FIM-05` | Implementing | ✅ Verified |
| `FIM-04` | Implementing | ⚠️ Parcial — cláusula do chat sem asserção |
| `CFG-01` … `CFG-06` | Implementing | ✅ Verified |
| `CONN-01` … `CONN-08` | Implementing | ✅ Verified |
| `CHAT-01`, `CHAT-03` … `CHAT-05` | Implementing | ✅ Verified |
| `CHAT-02` | Implementing | ⚠️ Parcial — cláusula "apenas o autor" sem asserção |
| `NOTA-01` … `NOTA-04` | Implementing | ✅ Verified |
| `VIS-01` … `VIS-04` | Implementing | 🖥️ L5 — build gate + verificação no navegador (decisão AD-008) |

---

## Resumo

**Geral**: ⚠️ Quase pronto — nenhum defeito de comportamento, uma lacuna de teste bloqueante.

**Checagem ancorada no spec**: 76/81 ACs com evidência `file:line` e valor batendo o resultado definido pelo spec · 1 sem evidência (`DESC-10`) · 2 parciais (`FIM-04`, `CHAT-02`) · 4 em camada L5 sem teste automatizado por decisão de arquitetura declarada (`VIS-01`…`VIS-04`).
**Gates**: 5/5 verdes — 312 unit, 64 integração, typecheck, lint, build.
**Sensor**: 8 mutações injetadas, 7 mortas, 1 sobreviveu.

**O que funciona bem**: o requisito mais crítico do produto (`JOGO-02`) é o mais bem defendido do repositório — a projeção é construída por destinatário em vez de filtrada, existe um único ponto de decisão (`podeVerCarta`), a varredura de vazamento percorre o JSON inteiro em todas as fases, e há um teste de controle que impede o detector de passar vazio. `ESCR-01` é provado por construção (ciclo aleatório único, sem retry) e por 500 repetições em cada tamanho de sala. AD-010 é sustentado tanto no unit quanto na integração, com o alarme real inspecionado. As recusas são asseridas em conjunção com "a sala ficou intocada", o que é exatamente o que a regra do payload pede.

**Problemas encontrados**: `DESC-10` é a única regra do jogo que pode regredir em silêncio. `FIM-04` e `CHAT-02` têm cada uma uma cláusula do spec sem asserção.

**Próximo passo**: aplicar o Fix 1 (bloqueante) e, de preferência, os Fixes 2 e 3 na mesma leva; reexecutar o Verifier. Fora do escopo de código: remover do `STATE.md` o bloqueador desatualizado sobre `sala-do.integration.test.ts:275`, que já não reproduz.
