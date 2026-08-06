# Ajustes de uso real — Validation

**Data**: 2026-08-05
**Spec**: `.specs/features/ajustes-uso-real/spec.md` (40 ACs `AJU-01`…`AJU-40`)
**Spec pai**: `.specs/features/quem-sou-eu/spec.md` — requisitos substituídos marcados; comportamento antigo **não** foi verificado, por decisão de escopo
**Diff range**: `c04c993..HEAD` (24 commits, 19 tasks)
**Verifier**: sub-agente independente (autor ≠ verificador), evidência-ou-zero

**Veredito**: ✅ **PASS**

---

## Gates

| Gate | Comando | Resultado |
| ---- | ------- | --------- |
| Unit | `npm run test:unit` | ✅ **430 passaram**, 0 falharam, 0 pulados (15 arquivos) |
| Integração | `npm run test:integration` | ✅ **78 passaram**, 0 falharam, 0 pulados (6 arquivos) |
| Typecheck | `npm run typecheck` | ✅ passou (`tsconfig.json` + `tsconfig.server.json`) |
| Lint | `npm run lint` | ✅ passou, sem avisos |
| Build | `npm run build` | ✅ passou (worker 51,10 kB; cliente 253,41 kB) |

**Confirmação dos gates de entrada**: os 430 unit + 78 de integração declarados foram **executados e conferidos**, não presumidos.

**Integridade da suíte**: baseline de entrada da rodada era 314 unit + 65 integração. Delta **+116 unit, +13 integração**. A contagem subiu; nenhuma asserção foi afrouxada.

---

## Testes removidos — auditoria (lote 1)

Três testes foram removidos. Cada remoção cita, no corpo do commit, o `AJU-*` que a autoriza, e **nenhuma** foi por teste falhando.

| Teste removido | Commit | Requisito que autoriza | Texto do commit |
| -------------- | ------ | ---------------------- | --------------- |
| `mantém o jogador no rodízio quando a configuração é "continua"` | `d45a0a5` | `AJU-18` (remove `DESC-07`) | "removidos porque o requisito deixou de existir por AJU-18 -- nao por falharem" |
| `não encerra a partida com a configuração "continua", por mais que todos descubram` | `d45a0a5` | `AJU-18` (remove `DESC-07`) | idem |
| `encerra a partida quando o rodízio fica com menos de 2 jogadores` | `ffe9a19` | `AJU-09` (substitui `DESC-08`) | "O teste de DESC-08 foi substituido porque o requisito mudou" |

**Reescritas, não remoções** (verificadas uma a uma, equivalente presente na suíte atual):
- `regras.test.ts` — `marca o declarante como "descobriu" e limpa a pendência` → presente em `regras.test.ts:1015`
- `despacho.test.ts` — `aplica as três opções…` → `aplica as opções escolhidas pelo host no lobby (CFG-01, CFG-03)` em `despacho.test.ts:244` (perdeu uma opção porque `aoDescobrir` deixou de existir)
- `sessao.test.ts` — 7 testes de "token por sala" reescritos como "sessão por sala" (`{token, apelido}`), todos com equivalente em `sessao.test.ts:31-131`

✅ **Nenhum teste removido por estar falhando.**

---

## Critérios de aceite ancorados no spec

### P1 — Voltar para a sala sozinho

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-01` código na URL + token daquele código → reconecta sem tela de apelido | devolve a sala; token de outra sala não serve | `client/src/estado/sessao.test.ts:188` — `expect(reentradaAutomatica('ABCDE', sessao)).toEqual({ codigo: 'ABCDE', apelido: 'Ana' })`; `:195` `reentradaAutomatica('', sessao)).toBeNull()`; `:202` `reentradaAutomatica('FGHJK', sessao)).toBeNull()` | ✅ PASS |
| `AJU-02` aba visível + socket fechado → reconecta sem backoff | verdadeiro só com aba visível **e** sem socket | `client/src/estado/sessao.test.ts:241` — `expect(deveReconectarAoAparecer(true, false)).toBe(true)`; `:245` `(true, true)).toBe(false)`; `:249` `(false, false)).toBe(false)` — consumo em `client/src/estado/conexao.tsx:158` | ✅ PASS |
| `AJU-03` guarda o apelido junto do token, por sala | apelido lido de volta; um por sala | `client/src/estado/sessao.test.ts:82` — `expect(sessao.ler('ABCDE')?.apelido).toBe('Ana')`; `:91` `toEqual(['Ana','Bia'])`; `:98` ida e volta pelo depósito | ✅ PASS |
| `AJU-04` token recusado → descarta e mostra a entrada com o motivo | vaga liberada, sala expirada, expulso ⇒ true; recusas de apelido ⇒ false | `client/src/estado/sessao.test.ts:212-235` — `expect(tokenFoiRecusado('TOKEN_BANIDO')).toBe(true)` … `expect(tokenFoiRecusado('APELIDO_EM_USO')).toBe(false)` — descarte em `conexao.tsx:135` | ✅ PASS |
| `AJU-05` durante a reconexão automática: indica, e não exibe formulário | spec não define **como** indicar | `client/src/App.tsx:118-121` (`<Conectando/>` em vez do formulário), `:113` (`<Reconectando/>`) — L5, sem teste unitário | ⚠️ Spec-precision gap |
| `AJU-33` entrar por qualquer caminho reflete o código na URL | `/CODIGO`; raiz quando fora de sala; ida e volta | `client/src/estado/entrada.test.ts:58` — `expect(caminhoDaSala('KTVRM')).toBe('/KTVRM')`; `:62` `caminhoDaSala(null)).toBe('/')`; `:66` `expect(codigoDaUrl(caminhoDaSala('KTVRM'))).toBe('KTVRM')` — aplicação em `App.tsx:43,48,82` (`replaceState`) | ✅ PASS |

### P1 — Jogar em dois

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-06` LOBBY com ≥2 ativos habilita "Iniciar" (substitui `HOST-01`) | aceita 2; recusa 1 | `server/games/quem-sou-eu/regras.test.ts:91` — `expect(Object.keys(estado.atribuicoes).sort()).toEqual(['a','b'])`; `:85` `toEqual({ ok: false, erro: 'JOGADORES_INSUFICIENTES' })`; `:354` leva ao jogo; cliente: `client/src/estado/entrada.test.ts:186` `expect(motivoParaIniciar(2)).toBeUndefined()` | ✅ PASS |
| `AJU-07` redistribuição que deixaria <2 cancela e volta ao LOBBY (substitui `ESCR-08`) | com 2 redistribui; abaixo cancela para lobby | `server/games/quem-sou-eu/regras.test.ts:458` (redistribui) e `:474` (cancela → `faseSeguinte: 'lobby'`) | ✅ PASS |
| `AJU-08` sorteio com exatamente 2 → ciclo A→B→A, sem ponto fixo | `{ a: 'b', b: 'a' }` em execução repetida | `server/games/quem-sou-eu/regras.test.ts:97` — `expect(estado.atribuicoes).toEqual({ a: 'b', b: 'a' })` dentro de laço repetido | ✅ PASS |
| `AJU-34` mínimo vem do contrato; não repetir no cliente | `MIN_JOGADORES` em `shared/`, importado dos dois lados | `shared/protocolo.ts:31` `export const MIN_JOGADORES = 2`; servidor `server/games/quem-sou-eu/regras.ts:2,21`; cliente `client/src/estado/entrada.ts:13,121`; teste `client/src/estado/entrada.test.ts:194` — `expect(motivoParaIniciar(1)).toBe('Precisa de pelo menos 2 pessoas — falta 1.')` | ✅ PASS |

### P1 — A última pessoa continua jogando

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-09` confirmação que deixa exatamente um → **mantém** em JOGO (substitui `DESC-08`) | fase inalterada, sem revelar, ordem `['a']`, vez `'a'` | `server/games/quem-sou-eu/regras.test.ts:1165` — `toEqual({ fase: undefined, revelado: false, ordem: ['a'], vezDe: 'a' })`; ponta a ponta `server/core/sala-do.integration.test.ts:465,500` | ✅ PASS |
| `AJU-10` um só no rodízio → vez fica com ele, rodízio não avança | `vezDe: 'a'`, `ordem: ['a']` após passar/pular/vencer prazo | `regras.test.ts:1183` (`passarVez`), `:1191` (`pularVez`), `:1202` (`venceuPrazoTurno`) — todos `toEqual({ vezDe: 'a', … })` | ✅ PASS |
| `AJU-11` um só no rodízio → limpa o prazo, não agenda novo | `prazos: { turno: null }` | `regras.test.ts:1171` — `expect(ultima.prazos).toEqual({ turno: null })`; `:1183`, `:1191`, `:1202`, `:1302` idem | ✅ PASS |
| `AJU-12` oferece só "Descobri!"; sem "Passei a vez"; sem "Pular a vez" ao host | servidor ignora o avanço; tela esconde os dois botões | servidor: `regras.test.ts:1191` (`pularVez` não avança nem reagenda); cliente: `client/src/telas/Jogo.tsx:285` `{ehMinhaVez && !sozinhoNoRodizio && …Passei a vez}`, `:306` `…&& !sozinhoNoRodizio && …Pular a vez de`, `:271` "Descobri!" preservado — L5, sem teste unitário | ✅ PASS |
| `AJU-13` declaração do último confirmada → revela tudo e vai a ENCERRADA | `fase:'encerrada'`, `revelado:true`, `ordem:[]`, `vezDe:null`, `turno:null` | `regras.test.ts:1225` — `toEqual({ fase:'encerrada', revelado:true, ordem:[], vezDe:null, prazos:{turno:null} })`; cartas preservadas `:1245`; integração `sala-do.integration.test.ts:524` | ✅ PASS |
| `AJU-14` rodízio **vazio** por saída → encerra, preservando `FIM-05` | mesma tupla de encerramento | `regras.test.ts:1276` — `toEqual({ fase:'encerrada', revelado:true, ordem:[], vezDe:null, prazos:{turno:null} })`; `FIM-05` intacto em `regras.ts:568` | ✅ PASS |

### P1 — Chat que não perde o nome de quem saiu

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-15` grava apelido e cor do autor no momento do envio | mensagem carrega `apelido` e `cor` | `server/core/chat.test.ts:132` — `toMatchObject({ autorId:'bia', apelido:'Bia', cor:'magenta' })`; `:115` mensagem completa; cores não se contaminam `:165` | ✅ PASS |
| `AJU-16` autor sai → apelido e cor gravados continuam exibidos | valores preservados após remoção do roster | `server/core/chat.test.ts:141` — `expect(estado.chat[0]).toMatchObject({ apelido:'Bia', cor:'magenta' })` após `filter`; integração `sala-do.integration.test.ts:551`; render em `client/src/componentes/Chat.tsx:87-89` (vem da mensagem, não da lista) | ✅ PASS |
| `AJU-17` troca de estado do jogador não altera mensagem já registrada | mensagem idêntica ao clone anterior | `server/core/chat.test.ts:156` — `expect(estado.chat[0]).toEqual(registrada)` após desconectar, renomear, trocar cor e virar host | ✅ PASS |

### P1 — O host define o tamanho da sala

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-35` escolher o limite na criação, entre o mínimo e 20 | limite gravado na sala; faixa `[MIN_JOGADORES, MAX_JOGADORES]` | `server/index.integration.test.ts:146` — `expect((await lerSala(codigo))?.limiteJogadores).toBe(3)`; `server/core/roster.test.ts:219,223,227` — `limiteDeEntrada(2/20/6)` → `{ ok:true, valor:… }` | ✅ PASS |
| `AJU-36` tela de criação já vem com o padrão 20 | ausente ⇒ 20 | `server/index.integration.test.ts:152` — `expect(…limiteJogadores).toBe(20)`; `roster.test.ts:211,215`; cliente `client/src/estado/entrada.test.ts:114` — `expect(LIMITE_PADRAO).toBe('20')`, uso em `Inicio.tsx:59` | ✅ PASS |
| `AJU-37` sala no limite recusa novas entradas (substitui o teto fixo de `SALA-05`) | `SALA_CHEIA`, sala intocada | `server/core/roster.test.ts:193` — `toEqual({ ok:false, erro:'SALA_CHEIA' })` + `expect(estado.jogadores).toHaveLength(3)`; `:202` sala de 2; integração `server/index.integration.test.ts:247` — quarta pessoa em sala de 3 recebe `['SALA_CHEIA']` e o socket não abre | ✅ PASS |
| `AJU-38` limite não inteiro ou fora da faixa recusa a criação | `LIMITE_INVALIDO`, HTTP 400 | `server/core/roster.test.ts:231,235,239,243,247` — `toEqual({ ok:false, erro:'LIMITE_INVALIDO' })` para `1`, `21`, `4.5`, `'6'`, `NaN`; HTTP `server/index.integration.test.ts:158,165,172` — `expect(resposta.status).toBe(400)` + `toEqual({ erro:'LIMITE_INVALIDO' })` | ✅ PASS |
| `AJU-39` lotação exibida usa o limite **daquela** sala | projeção traz o limite da sala | `server/index.integration.test.ts:270` — `expect(ultimaProjecao(ana).sala.limiteJogadores).toBe(4)`; render `client/src/telas/Lobby.tsx:49` `${jogadores.length}/${sala.limiteJogadores}` | ✅ PASS |
| `AJU-40` sala já existente: limite **não** pode ser alterado | limite persistido e projetado permanecem no valor da criação | `server/index.integration.test.ts:280` — `expect((await lerSala(codigo))?.limiteJogadores).toBe(3)` **e** `:281` `expect(ultimaProjecao(ana).sala.limiteJogadores).toBe(3)` após `configurar` com `limiteJogadores: 20` | ✅ PASS |

**Busca ativa de caminho de alteração (`AJU-40`)** — não confiei no relatório do autor. Varredura de todas as ocorrências de `limiteJogadores` fora de testes:

| Local | Operação | Alcançável depois da criação? |
| ----- | -------- | ----------------------------- |
| `server/core/sala-do.ts:98` | **única escrita** | Não — `sala-do.ts:89` devolve `409` antes de tocar no estado se a sala já existe |
| `server/core/sala-do.ts:120` | leitura (handshake) | — |
| `server/core/roster.ts:60` | leitura (`entrar`) | — |
| `server/games/quem-sou-eu/projecao.ts:35` | leitura (projeção) | — |
| `server/index.ts:53,59,79` | leitura (criação) | — |

Estruturalmente fechado por dois motivos independentes: (1) `limiteJogadores` vive em `EstadoSala`, **não** em `Config` (`shared/protocolo.ts:153` vs `:91-96`); (2) `despacho.ts:151-155` remonta `sala.config` **campo a campo** — só `ordemTurnos` e `tempoTurnoSeg` —, então nenhum campo extra vindo do cliente entra. ✅ Nenhum caminho encontrado.

### P2 — Configurações que fazem sentido

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-18` remove a escolha "continua jogando"/"sai do rodízio" | quem descobre sempre sai; campo removido é descartado | `server/games/quem-sou-eu/regras.test.ts:1108` — `expect(resultado.estado.ordem).toEqual(['a','b','d'])`; `server/core/despacho.test.ts:274` — `expect(sala.config).toEqual(CONFIG_PADRAO)` com o campo removido no payload; `aoDescobrir` ausente de `shared/protocolo.ts:91-96` | ✅ PASS |
| `AJU-19` aceita qualquer valor entre 10s e 60min, além dos presets | 240 aceito; extremos `[10, 3600]` aceitos | `server/core/despacho.test.ts:322` — `expect(sala.config.tempoTurnoSeg).toBe(240)`; `:344` — `toEqual([10, 3_600])`; cliente `client/src/estado/turno.test.ts:11-12` | ✅ PASS |
| `AJU-20` fora da faixa recusa e mantém a anterior | `COMANDO_INVALIDO` + config anterior intacta | `despacho.test.ts:306` — `toEqual({ ok:false, erro:'COMANDO_INVALIDO' })` **e** `:307` `expect(sala.config).toEqual(CONFIG_PADRAO)`; `:359-360` mantém `90`; não inteiro `:393`; cliente `turno.test.ts:16,20,29-32` | ✅ PASS |
| `AJU-21` sala criada continua com os padrões de `CFG-05`, sem a opção removida | `{ ordemTurnos:'sorteada', tempoTurnoSeg:null }` | `server/core/despacho.test.ts:402` — `expect(salaEmLobby().config).toEqual({…})`; `shared/protocolo.ts:99-102` | ✅ PASS |

### P2 — Campos de texto

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-22` cada tecla aparece na hora, sem esperar o servidor | texto local imediato | `client/src/estado/notas.test.ts:12` — `expect(digitou('não é ator').texto).toBe('não é ator')`; `:22` `emEdicao` verdadeiro | ✅ PASS |
| `AJU-23` não reposiciona o cursor nem descarta caracteres | "descarta caractere" testável; posição do cursor não é definida como valor observável | `client/src/estado/notas.test.ts:18` — `expect(digitou(digitado).texto).toBe(digitado)` (nada descartado). Cláusula do cursor sem asserção — decorre do input controlado por estado local em `BlocoDeNotas.tsx:80,86` | ⚠️ Spec-precision gap (cláusula do cursor) |
| `AJU-24` envia depois da pausa, sem um envio por tecla | zero envios antes da pausa; um envio com o texto mais recente | `client/src/estado/notas.test.ts:83` — `expect(enviado).toEqual([])`; `:97` `toEqual(['não'])`; `:111` `toEqual(['primeira','segunda'])`; `:123` `liberar` | ✅ PASS |
| `AJU-25` projeção divergente não sobrescreve o campo em edição | texto local vence; fora de edição a projeção entra | `client/src/estado/notas.test.ts:30` — `expect(chegouDoServidor(rascunho,'nota antiga do servidor').texto).toBe('não é ato')`; `:36` segue em edição; `:42` aceita fora de edição; `:51` encerra a edição quando confirmado | ✅ PASS |
| `AJU-26` trava no campo (apelido 16, carta 60, chat 300, notas 2.000), servidor intacto | quatro limites no campo | `Inicio.tsx:127` `limite={MAX_APELIDO}` (16), `Escrita.tsx:135` `limite={CARTA_MAX}` (60), `Chat.tsx:118` `maxLength={LIMITE_DA_MENSAGEM}` (300), `BlocoDeNotas.tsx:82` `maxLength={LIMITE_DE_NOTAS}` (2000); truncagem em `CampoDeTexto.tsx:58` — L5, sem teste unitário | ✅ PASS |

**Validação de servidor intacta (exigência do T11), conferida item a item**: `roster.ts:63` (`APELIDO_MIN/MAX`), `regras.ts:166` (`CARTA_MAX_CARACTERES`), `chat.ts:26` (`CHAT_MAX_CARACTERES`), `despacho.ts:106` (`NOTAS_MAX_CARACTERES`). ✅ Nenhuma removida nem afrouxada.

### P2 — Cabeçalho e chat

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-27` cabeçalho alinhado entre os dois lados, em todas as larguras | spec não define critério observável de "alinhado" | `client/src/componentes/Shell.tsx:33-56` (mesma régua de altura `h-11`, margens negativas nas pontas) — L5, verificado no navegador | ⚠️ Spec-precision gap |
| `AJU-28` alternador como ícone (sol e lua) com rótulo acessível | ícone + rótulo acessível | `client/src/componentes/AlternadorDeTema.tsx:50` — `{proximo === 'escuro' ? <Lua/> : <Sol/>}`; `:42` `aria-label={\`Tema ${proximo}\`}`; `:43` `title` — L5 | ✅ PASS |
| `AJU-29` chat em altura limitada, rolagem própria, sem alongar a página | spec não define a altura | `client/src/componentes/Chat.tsx:66` — `max-h-[45vh] min-h-0 overflow-y-auto overscroll-contain` — L5, verificado no navegador | ⚠️ Spec-precision gap (valor da altura) |
| `AJU-30` rola para a mensagem nova só se já estava no fim | verdadeiro no fim e dentro da margem; falso para quem rolou para cima | `client/src/estado/rolagem.test.ts:6` — `expect(estaNoFim({scrollTop:600,scrollHeight:1000,clientHeight:400})).toBe(true)`; `:20` falso além da margem; `:26` falso no começo; `:30` conversa curta; consumo em `Chat.tsx:56,64` | ✅ PASS |

### P2 — Cronômetro

| Critério | Resultado definido no spec | `file:line` + asserção | Result |
| -------- | -------------------------- | ---------------------- | ------ |
| `AJU-31` turno de N segundos exibe no máximo N — nunca N+1 | restante limitado a `duracaoSeg*1000`; `0:30` num turno de 30s | `client/src/estado/relogio.test.ts:37` — `expect(restanteAte(1_000_031_000, 1_000_000_000, 30)).toBe(30_000)`; `:43` `expect(formatarTempo(restante ?? 0)).toBe('0:30')`; `:47` não mexe no que já cabe; `:51` preserva sem duração | ✅ PASS |
| `AJU-32` `0:01` até o vencimento; `0:00` só com restante zero | `formatarTempo(1)` e `(999)` ⇒ `'0:01'`; `(0)` ⇒ `'0:00'` | `client/src/estado/relogio.test.ts:76-77` — `expect(formatarTempo(1)).toBe('0:01')`, `expect(formatarTempo(999)).toBe('0:01')`; `:81` `expect(formatarTempo(0)).toBe('0:00')`; `:61` interação com o teto | ✅ PASS |

**Arredondamento preservado**: `relogio.ts:40` continua `Math.ceil` — a correção do `AJU-31` foi o teto (`:35`), como o spec manda. ✅

---

## Resumo dos ACs

| Situação | Contagem | Quais |
| -------- | -------- | ----- |
| ✅ PASS com asserção sobre o valor definido no spec | **36 / 40** | todos os demais |
| ⚠️ Spec-precision gap | **4** | `AJU-05`, `AJU-23` (cláusula do cursor), `AJU-27`, `AJU-29` |
| ❌ Sem evidência | **0** | — |

Nenhum critério ficou sem citação `file:line`. Os quatro ⚠️ são casos em que o **spec** não define um resultado preciso e observável (como indicar a reconexão, o que é "alinhado", qual altura é "limitada", posição do cursor), não casos de teste fraco. Estão sinalizados em vez de aprovados em silêncio.

**Cobertura por camada (matriz do `tasks.md`)**: L1/L2 com mapeamento 1:1 aos ACs; L3 com feliz + limite + erro em todas as rotas tocadas; L4 (`client/src/estado/*.ts`) com teste unitário em **todos** os seis módulos (`sessao`, `entrada`, `notas`, `relogio`, `rolagem`, `turno`) — nenhuma lógica extraída ficou sem teste; L5/L6 `Tests: none` por AD-008, cobertos por build gate + verificação no navegador.

**Regra do payload/conjunção**: as asserções checam valor e estado resultante, não que uma função foi chamada. Os pontos de maior risco usam `toEqual` sobre a tupla inteira do desfecho (`{fase, revelado, ordem, vezDe, prazos}` em `regras.test.ts:1225,1276`) e conjunção de persistência **e** projeção em `AJU-40` (`index.integration.test.ts:280-281`). ✅

---

## Sensor de discriminação

**Profundidade**: expandida — **8 mutações**, cobrindo os seis arquivos exigidos.
**Método**: mutação aplicada no arquivo real, suíte alvo executada, `git checkout --` imediato. `git status` limpo ao fim de cada ciclo e ao fim da rodada.

| # | Arquivo:linha | Mutação | AC alvo | Resultado |
| - | ------------- | ------- | ------- | --------- |
| 1 | `server/games/quem-sou-eu/regras.ts:300` | `estado.ordem.length <= 1` → `< 1` (regra do último jogador) | `AJU-10`, `AJU-11`, `AJU-12` | ✅ Morto — 3 falhas |
| 2 | `server/games/quem-sou-eu/regras.ts:440` | `prazos: { turno: null }` → `prazos: {}` no ramo "sobrou um" | `AJU-11` | ✅ Morto — 1 falha |
| 3 | `server/core/roster.ts:60` | `>= estado.limiteJogadores` → `>` (off-by-one da lotação) | `AJU-37` | ✅ Morto — 3 falhas |
| 4 | `server/core/roster.ts:35` | remove a guarda `pedido < MIN_JOGADORES` | `AJU-38` | ✅ Morto — 1 falha |
| 5 | `server/core/chat.ts:40` | `cor: autor.cor` → `cor: 'vermelho'` (valor errado no payload) | `AJU-15`, `AJU-16` | ✅ Morto — 4 falhas |
| 6 | `client/src/estado/relogio.ts:35` | remove o teto `Math.min(restante, duracaoSeg*1000)` | `AJU-31` | ✅ Morto — 2 falhas |
| 7 | `client/src/estado/sessao.ts:89` | `return { token, apelido }` → `apelido: ''` | `AJU-01`, `AJU-03` | ✅ Morto — 5 falhas |
| 8 | `client/src/estado/entrada.ts:121,123` | `MIN_JOGADORES` → literal `3` (reintroduz o defeito do `AJU-34`) | `AJU-06`, `AJU-34` | ✅ Morto — 3 falhas |

**Resultado**: **8/8 mortos, 0 sobreviventes** — ✅ PASS. A mutação 8 é a prova direta de que a armadilha que originou o `AJU-34` agora é detectada pela suíte.

---

## Verificação AD-011 — número mágico duplicado

Os três números que a AD-011 nomeia foram rastreados no cliente inteiro:

| Número | Fonte única | Importado pelo servidor | Importado pelo cliente | Literal repetido no cliente? |
| ------ | ----------- | ----------------------- | ---------------------- | --------------------------- |
| Mínimo de jogadores | `shared/protocolo.ts:31` `MIN_JOGADORES = 2` | `regras.ts:2,21` | `entrada.ts:13`, `Lobby.tsx:3`, `Inicio.tsx:2` | ✅ Não |
| Teto da sala | `shared/protocolo.ts:42` `MAX_JOGADORES = 20` | `roster.ts:3`, `index.ts`, `sala-do.ts` | `entrada.ts:12`, `Inicio.tsx:2` | ✅ Não |
| Faixa do tempo por turno | `shared/protocolo.ts:108-109` | `despacho.ts:13` | `turno.ts:11`, `Lobby.tsx:7-8` | ✅ Não |

`MINIMO_PARA_INICIAR` foi eliminado do `Lobby.tsx`. As ocorrências restantes de `20` no cliente são dimensão de SVG (`AlternadorDeTema.tsx:56-57`), classe Tailwind (`Inicio.tsx:104,210`) e comentário — nenhuma é o teto da sala. ✅ **Nenhum dos três está duplicado.**

**Achado adjacente (fora dos três enumerados, não bloqueante)**: o `AJU-26` introduziu quatro limites de caractere no cliente que espelham constantes de validação do servidor, com o mesmo formato de duplicação que originou o `AJU-34`:

| Limite | Cliente | Servidor |
| ------ | ------- | -------- |
| Apelido 16 | `client/src/estado/entrada.ts:19` `MAX_APELIDO` | `server/core/roster.ts:14` `APELIDO_MAX` |
| Carta 60 | `client/src/telas/Escrita.tsx:23` `CARTA_MAX` | `server/games/quem-sou-eu/regras.ts:15` `CARTA_MAX_CARACTERES` |
| Chat 300 | `client/src/componentes/Chat.tsx:7` `LIMITE_DA_MENSAGEM` | `server/core/chat.ts:4` `CHAT_MAX_CARACTERES` |
| Notas 2.000 | `client/src/componentes/BlocoDeNotas.tsx:10` `LIMITE_DE_NOTAS` | `server/core/despacho.ts:19` `NOTAS_MAX_CARACTERES` |

Consequência de uma divergência é **baixa** — o próprio `AJU-26` diz que a trava é conveniência e o servidor continua validando —, então isto **não reprova** a rodada. Mas é a mesma classe de defeito que a AD-011 existe para prevenir, e a AD-011 enumera só três números em vez de enunciar a regra geral.

**Mitigação escrita da AD-011**: avaliada e considerada **suficiente**. A decisão reconhece a tensão com AD-002, explica por que o custo é zero enquanto houver um jogo só, e aponta a saída correta para o segundo jogo (a projeção carregar a decisão pronta, conforme AD-008) em vez de multiplicar constantes em `shared/`. Não é dívida aberta.

---

## Edge cases do spec

- [x] Dois na sala e um sai durante o JOGO → rodízio segue — `regras.test.ts:1285` (`ordem:['b']`, `vezDe:'b'`, `turno:null`)
- [x] Último do rodízio se desconecta sem sair → a vez continua dele (`JOGO-11`) — `regras.ts:291` preservado, suíte `JOGO-11` verde
- [x] Tempo personalizado com partida em andamento é recusado (`CFG-04`) — `despacho.ts:148` `fase !== 'lobby'` ⇒ `FASE_INVALIDA`
- [x] Colar acima do limite trunca no campo; servidor continua validando — `CampoDeTexto.tsx:58` + validações do servidor listadas acima
- [x] Aba visível com socket aberto → nenhuma reconexão redundante — `sessao.test.ts:245`
- [x] Token de outra sala não é usado — `sessao.test.ts:202`
- [x] Mensagem de sistema continua sem autor — `chat.ts:49`, `shared/protocolo.ts:137`; suíte `CHAT-03` verde

---

## Qualidade de código

| Princípio | Status |
| --------- | ------ |
| Código mínimo, sem recurso além do pedido | ✅ |
| Mudanças cirúrgicas; só arquivos necessários | ✅ |
| Sem abstração especulativa | ✅ |
| Segue os padrões do projeto (AD-002, AD-008, AD-009, AD-010) | ✅ |
| Checagem ancorada no spec (valor asserido = valor do spec) | ✅ 36/40, 4 ⚠️ sinalizados |
| Expectativa de cobertura por camada atendida | ✅ |
| Todo teste em escopo mapeia a um AC, edge case ou "Done when" | ✅ sem testes órfãos |
| Testes removidos justificados por mudança de requisito | ✅ 3/3, com `AJU-*` citado |
| Diretrizes documentadas seguidas | ✅ `tasks.md` (matriz de cobertura + gates), `.specs/STATE.md` (AD-001…AD-011) |

**Observação sobre AD-008 (não é defeito)**: `client/src/telas/Jogo.tsx:45` deriva `sozinhoNoRodizio` de `jogo.ordem.length === 1`. É leitura de um campo já projetado, não recálculo de regra — mas é exatamente o ponto que a AD-011 aponta como direção futura (a projeção carregar a decisão pronta, ex.: `podeAvancarVez`). Anotado para a entrada do segundo jogo.

---

## Rastreabilidade de requisitos

| Requisitos | Status anterior | Novo status |
| ---------- | --------------- | ----------- |
| `AJU-01`…`AJU-04` | Pending | ✅ Verified |
| `AJU-05` | Pending | ⚠️ Verified com spec-precision gap |
| `AJU-06`…`AJU-22` | Pending | ✅ Verified |
| `AJU-23` | Pending | ⚠️ Verified com spec-precision gap (cursor) |
| `AJU-24`…`AJU-26` | Pending | ✅ Verified |
| `AJU-27` | Pending | ⚠️ Verified com spec-precision gap |
| `AJU-28` | Pending | ✅ Verified |
| `AJU-29` | Pending | ⚠️ Verified com spec-precision gap |
| `AJU-30`…`AJU-40` | Pending | ✅ Verified |

---

## Observações de processo (não bloqueiam)

1. **Tabela de cobertura do `tasks.md` ficou desatualizada.** A seção "Requirement Coverage" (`tasks.md:527-542`) ainda diz **"32 de 32 requisitos mapeados. Nenhum órfão."** O spec tem **40**. As tasks T16–T19 e os requisitos `AJU-33`…`AJU-40` nunca entraram na tabela, nem no "Phase Execution Map" (`tasks.md:459-469`), no "Task Granularity Check" nem no "Test Co-location Validation". A contagem fechada continuou dando a impressão de cobertura completa — a mesma armadilha que a própria lição registrada em `tasks.md:542` descreve. A cobertura **real** está completa (verificada AC a AC acima); o que está desatualizado é o documento de planejamento.

2. **Terceira ocorrência do mesmo padrão na rodada.** `AJU-12`, depois `AJU-19`, depois `AJU-06`/`AJU-01` tiveram a metade de servidor entregue e a metade de interface sem task, e em todas as três a tabela de cobertura fechou mesmo assim. Foi o que gerou T14/T15, depois T16/T17. Registrado como lição (ver abaixo).

3. **Publicação na Cloudflare** segue não executada por decisão do dono — contexto conhecido, fora de escopo desta validação.

---

## Conclusão

**Geral**: ✅ **Pronto**

**Checagem ancorada no spec**: 40/40 ACs com evidência `file:line`; 36 com asserção sobre o valor definido no spec; 4 spec-precision gaps sinalizados; 0 sem evidência.
**Gates**: 5 passaram, 0 falharam (430 unit + 78 integração + typecheck + lint + build).
**Sensor**: 8 mutações, 8 mortas, 0 sobreviventes.
**Verificações da rodada**: número mágico duplicado ✅ limpo nos três da AD-011; `AJU-40` ✅ sem caminho de alteração, confirmado por varredura própria; testes removidos ✅ 3/3 autorizados por mudança de requisito, nenhum por falha.

**Sem fix tasks.** Nada bloqueia a feature.

**Próximos passos sugeridos** (higiene, não correção):
1. Atualizar a "Requirement Coverage" do `tasks.md` para 40 requisitos e incluir T16–T19 nas quatro tabelas de conferência.
2. Considerar levar os quatro limites de caractere para `shared/protocolo.ts`, ou reescrever a AD-011 como regra geral em vez de lista de três números.
3. Ao entrar o segundo jogo, aplicar a direção já registrada na AD-011: a projeção carrega a decisão pronta.
