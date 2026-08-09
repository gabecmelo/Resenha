# STATE

## Decisions

### AD-001
- **Decision**: O produto é um hub de party games chamado **Resenha**; "Quem Sou Eu?" é o primeiro jogo, não o produto.
- **Reason**: O usuário pretende adicionar outros party games (Espião etc.). Sala, jogadores, apelido, host, reconexão, chat, código de sala e rodízio de turnos são idênticos entre eles — separar em projetos distintos obrigaria a reescrever essa base a cada jogo.
- **Trade-off**: O primeiro jogo carrega o custo de nomear e posicionar uma marca de hub, e exige disciplina para não vazar regra de jogo para dentro do `core`.
- **Scope**: Todo o projeto — nome, domínio, navegação, estrutura de pastas.
- **Date**: 2026-08-02
- **Status**: active

### AD-002
- **Decision**: Fronteira interna obrigatória entre `core` (sala, jogadores, host, reconexão, chat, motor de turnos, transporte WebSocket) e `games/<jogo>` (regras específicas). Nada específico de "Quem Sou Eu?" pode residir no `core`.
- **Reason**: É a fronteira que permite adicionar o segundo jogo de forma aditiva, sem migração.
- **Trade-off**: Exige uma camada de indireção desde o dia 1. Mitigação: **nenhuma abstração especulativa** — implementa-se um único jogo concreto e a fronteira é apenas de localização/dependência, não um framework de jogos genérico.
- **Scope**: Estrutura de código do cliente e do servidor.
- **Date**: 2026-08-02
- **Status**: active

### AD-003
- **Decision**: O sistema é o **tabuleiro**, não o juiz. Perguntas e respostas sim/não acontecem fora do sistema (voz, presencial). O sistema não registra perguntas, não valida respostas, não pontua e não decide vencedor.
- **Reason**: As regras variam de grupo para grupo; modelar regras no software engessaria o jogo e multiplicaria requisitos sem valor.
- **Trade-off**: Abre mão de estatísticas, ranking e automação de regras. A autoridade de arbitragem fica com o host (encerrar partida, pular vez, confirmar "Descobri!", expulsar).
- **Scope**: Todos os jogos do hub.
- **Date**: 2026-08-02
- **Status**: active

### AD-004
- **Decision**: Stack — front em **React + Vite + TypeScript + Tailwind** (SPA, sem SSR); back em **Cloudflare Workers + Durable Objects**, com **uma sala = um Durable Object** e transporte WebSocket usando a **Hibernation API**.
- **Reason**: O app vive atrás de um código de sala, não tem necessidade de SEO/SSR (por isso não Next). O modelo "um objeto isolado e single-threaded por sala" do Durable Object é um encaixe direto no domínio (estado de sala isolado, serialização natural de eventos concorrentes) e o free tier da Cloudflare cobre o uso previsto sem hibernação de serviço/cold start.
- **Trade-off**: Modelo de programação menos convencional que Node + Socket.IO, e acoplamento à plataforma Cloudflare.
- **Scope**: Todo o projeto.
- **Date**: 2026-08-02
- **Status**: active

### AD-005
- **Decision**: O estado da sala é **persistido no storage do próprio Durable Object** a cada mutação — não vive apenas em memória. Não há banco de dados central.
- **Reason**: Com WebSocket Hibernation, a memória JS do Durable Object é descartada quando a sala fica ociosa (e em cada deploy), embora as conexões permaneçam. Estado só em memória perderia a sala em pleno jogo.
- **Trade-off**: Cada mutação paga uma escrita no storage do DO. Aceitável no volume previsto e coberto pelo free tier.
- **Scope**: Servidor, camada `core`.
- **Date**: 2026-08-02
- **Status**: active

### AD-006
- **Decision**: Sem contas de usuário. A identidade do jogador é um **token opaco de sessão gerado no servidor e guardado no navegador**; ele é a única credencial de reconexão e de autoria de ações.
- **Reason**: Zero atrito para entrar (o produto é "manda o link e joga"). O token também é o que dá autoridade às ações — só o dono do token age em nome do jogador.
- **Trade-off**: Trocar de navegador, dispositivo ou usar aba anônima significa entrar como jogador novo. Aceito explicitamente pelo usuário.
- **Scope**: Todo o projeto.
- **Date**: 2026-08-02
- **Status**: active

### AD-007
- **Decision**: Idioma único: **português do Brasil**, em toda a interface e conteúdo. Sem infraestrutura de i18n no MVP.
- **Reason**: Público-alvo é brasileiro; o próprio jogo depende de referências culturais locais.
- **Trade-off**: Internacionalizar depois exigirá extrair strings. Aceito — o custo de i18n prematuro não se paga.
- **Scope**: Todo o projeto.
- **Date**: 2026-08-02
- **Status**: active

### AD-008
- **Decision**: O servidor é autoritativo e envia **projeções por jogador** — um objeto de estado montado especificamente para cada destinatário. O cliente não contém regra de jogo; ele renderiza a projeção recebida.
- **Reason**: Torna estrutural a regra de que informação secreta não trafega para quem não pode vê-la: o segredo não é filtrado do payload, ele nunca é construído nele. Também elimina a duplicação da máquina de estados entre cliente e servidor e torna a reconexão trivial (basta enviar a projeção).
- **Trade-off**: Mais bytes por evento (uma serialização por jogador conectado) e custo de CPU linear no número de jogadores. Irrelevante na ordem de grandeza do produto (salas de até 20, estado de poucos KB).
- **Scope**: Protocolo cliente-servidor de todos os jogos do hub.
- **Date**: 2026-08-02
- **Status**: active

### AD-009
- **Decision**: O contrato entre `core` e um jogo é uma interface de **três funções puras** (`iniciarRodada`, `reduzir`, `projetar`). O jogo devolve estado e efeitos descritos; quem executa efeito é sempre o `core`.
- **Reason**: É a fronteira mínima que cumpre AD-002 sem virar framework de jogos. Funções puras também tornam todos os critérios de aceite testáveis sem rede, storage ou plataforma.
- **Trade-off**: Um jogo futuro com necessidade genuína de efeito próprio (chamada externa, temporizador exótico) exigirá estender o contrato. Aceito — estender sob demanda é melhor que generalizar por antecipação.
- **Scope**: `core` e todo módulo em `games/`.
- **Date**: 2026-08-02
- **Status**: active

### AD-010
- **Decision**: Todos os prazos da sala são multiplexados por um **agendador próprio** sobre o alarme único do Durable Object. Um único componente tem permissão de chamar `setAlarm()`.
- **Reason**: Um Durable Object admite apenas um alarme por vez e `setAlarm()` preserva somente a chamada mais recente. Agendar prazos direto da regra de negócio cancelaria outros prazos silenciosamente — falha invisível e difícil de reproduzir.
- **Trade-off**: Uma indireção a mais entre a regra e a plataforma.
- **Scope**: Servidor, camada `core`; vale para qualquer jogo do hub que precise de tempo.
- **Date**: 2026-08-02
- **Status**: active

### AD-011
- **Decision**: Constantes que o cliente precisa para desenhar a interface — mínimo de jogadores, faixa do tempo por turno, limite da sala — vivem em `shared/protocolo.ts` e são importadas **tanto** pelo servidor **quanto** pelo cliente. Nenhum desses números pode ser repetido no cliente.
- **Reason**: A duplicação já causou um defeito real: o servidor passou a aceitar partida com 2 jogadores enquanto `Lobby.tsx` mantinha `MINIMO_PARA_INICIAR = 3` fixo, e a funcionalidade não chegou ao usuário. Um número que existe em dois lugares é um número que vai divergir.
- **Trade-off**: Cria uma tensão real com AD-002. `MIN_JOGADORES` é regra de "Quem Sou Eu?", e `shared/` passa a hospedar uma constante de jogo. `shared/` não é `core`, então a letra do AD-002 não é violada — mas o espírito é esticado: com um segundo jogo, o contrato compartilhado acumularia constantes de cada um.
- **Mitigação e direção futura**: Enquanto houver um jogo só, o custo é zero. Quando o segundo entrar, a saída correta **não** é multiplicar constantes em `shared/` — é a projeção passar a carregar a decisão pronta (ex.: `podeIniciar` com o motivo), que é o que AD-008 já manda: o cliente renderiza, não calcula. Reavaliar nesse momento.
- **Scope**: `shared/protocolo.ts`, cliente e regras de jogo.
- **Date**: 2026-08-05
- **Status**: active

### AD-012
- **Decision**: Conteúdo de jogo que precisa ser conhecido nos dois lados sem round-trip de rede (ex.: as cartas de um pacote) vive em `shared/`, junto das constantes de protocolo — mesmo sendo dado específico de um jogo, não do `core`.
- **Reason**: É a mesma tensão que `AD-011` já registrou para constantes de configuração, agora aplicada a conteúdo de jogo. "Ver pacote" (`PKT2-11`) precisa mostrar até 750 cartas combinadas sem esperar uma resposta de rede a cada toggle de dificuldade — só é possível se cliente e servidor importam o mesmo dado.
- **Trade-off**: `shared/` deixa de ser só "protocolo + constantes" e passa a hospedar conteúdo de jogo completo. Se um segundo jogo (Espião) repetir esse padrão para seus `locais`, `shared/` cresce em proporção ao número de jogos do hub, não ao tamanho do protocolo.
- **Scope**: Conteúdo estático de "Quem Sou Eu" (`shared/pacotes-dados.ts`, `shared/pacotes.ts`). Não se aplica a estado de partida, que continua em `server/games/<jogo>/`.
- **Date**: 2026-08-09
- **Status**: active — reavaliar junto com `AD-011` quando o Espião definir sua própria necessidade de conteúdo compartilhado (`shared/games/<jogo>/` é o candidato natural se o padrão se repetir)

## Handoff

- **Feature em andamento**: `pacotes-avancados` — `.specs/features/pacotes-avancados/` (`spec.md` e `design.md` Approved; `tasks.md` com 18 tasks, T1–T5 **concluídas e commitadas**, T6–T18 pendentes). Branch: **`feat/pacotes-avancados`** (checked out, não é a `main`). Primeira de três rodadas combinadas do roadmap: `pacotes-avancados` → hub de seleção de jogos → jogo Espião → (futuro) Cartas Contra a Turma. Roadmap completo e decisões de processo (usar `/impeccable shape` em vez de Claude Design nesta fase; usuário também usa Antigravity no mesmo repo) estão na memória pessoal do Claude Code deste usuário, arquivos `resenha-roadmap-jogos`, `resenha-design-iteracao-ao-vivo`, `resenha-ferramentas-externas-quebram-disciplina`, `resenha-gamificacao-feedback-expressivo` — **ler essa memória ao retomar**, ela não está no repo.
- **O que T1–T5 já entregaram** (todas com commit próprio, nesta ordem):
  - `T1` (`1cc366a`): `vitest.config.ts` passa a incluir `shared/**/*.test.ts`.
  - Antes da T1, dois consertos de débito pré-existente (não fazem parte das 18 tasks, mas eram bloqueio real): `18d9e72` corrige mock de `AudioContext` em `client/src/sons.test.ts`; `94f1acb` remove um teste de `regras.test.ts` que contradizia o próprio spec (`DESC-01` não restringe "Descobri!" a quem está na vez).
  - `T2` (`8135cea`): `shared/pacotes-dados.ts` (movido de `server/games/quem-sou-eu/`), `cartas` virou `{texto, dificuldade}[]`. Import sites corrigidos em `despacho.ts` **e** `sala-do.ts` (achado durante a task — havia dois lugares importando o arquivo antigo, não só um). Bridge temporário em `despacho.ts` (`estatico.cartas.map(c => c.texto)`, marcado `SPEC_DEVIATION`) mantém o build verde até T7 rewire de verdade.
  - `T3` (`1919a53`): `shared/pacotes.ts` com `montarPoolDeCartas` (pura, união+filtro+dedupe) + `shared/pacotes.test.ts` (8 testes).
  - `T4` (`c3b5165`): `shared/protocolo.ts` — `Config.pacoteId`→`pacoteIds: string[]`, novo `Config.dificuldades`, `Projecao.sala.pacote`→`pacotesSelecionados`. **Deliberadamente deixa `npm run typecheck` vermelho** em `despacho.ts`, `projecao.ts`/`projecao.test.ts` (servidor) e `Lobby.tsx`, `Jogo.tsx`, `Encerrada.tsx` (cliente) — documentado no próprio commit e no `Done when` da T4/T9/T15. **Isso é esperado até T9 (servidor) e T15 (cliente) rodarem.**
  - `T5` (`3f42d72`): as 150 cartas × 10 pacotes (50/50/50 por dificuldade), aprovado pelo dono após uma rodada de recalibração — vários itens do nível `dificil` (e alguns do `medio`) estavam "expert de quadrinho/série de nicho" em vez de "difícil pro público geral" (ex.: Homem-Absorvente, Lockheed, Sinestro, Girls5eva, Daxter, e um `Kratos (Ragnarök)` que era duplicata conceitual do `Kratos` já no fácil). Recalibrado nos pacotes `super-herois`, `series` e `personagens-jogos`. Validado com um script descartável (contagem 150/50/50/50 + dedupe por texto) antes de cada commit — **não existe mais no repo**, era `shared/_valida-temp.mjs`, apagado após uso.
  - `AD-012` registrado (acima, nesta seção de Decisions): conteúdo de jogo compartilhado vive em `shared/` — extensão da tensão já registrada em `AD-011`.
- **Próximo passo**: dispatch de 2 batch sub-agents (usuário já aprovou usar sub-agents nesta rodada) — **Batch A = Fase 3, T6–T9** (servidor: `despacho.ts` busca N pacotes, `regras.ts` usa `montarPoolDeCartas`, validação de `configurar`, `projecao.ts` projeta `pacotesSelecionados` — isso fecha o typecheck do servidor), **Batch B = Fase 4+5, T10–T18** (cliente: `Modal.tsx` largura, grid CSS 2/3/5, multi-seleção de pacote, seletor de dificuldade, "Ver pacote", badge múltiplo, sons de clique/entrada, `Botao.tsx` — isso fecha o typecheck do cliente). Depois das duas batches: o Verifier automático roda (author ≠ verifier, sensor de discriminação, `validation.md`).
- **In-progress** (file:line): none — T5 foi a última task fechada antes desta pausa.
- **Uncommitted files**: none — árvore de trabalho limpa na branch `feat/pacotes-avancados`.
- **Branch**: `feat/pacotes-avancados` (não `main`).
- **Estado esperado do `npm run typecheck` agora**: **vermelho**, de propósito (ver T4 acima). `npm run test:unit` está **verde** (460 testes). Não confundir um com o outro ao retomar.
- **Dívida conhecida desta rodada**:
  - `pacotes-de-cartas` (`.specs/features/pacotes-de-cartas/`) está implementada em produção mas foi feita fora do fluxo do skill (outra ferramenta — Antigravity —, branch própria, PR #1, sem Verifier, `tasks.md` com checkboxes vazias). `pacotes-avancados` estende essa base tratando o **código**, não o `tasks.md` antigo, como fonte de verdade. Considerar validação retroativa se o tempo permitir.
  - Bridge temporário em `despacho.ts` (linha ~218, comentário `SPEC_DEVIATION`) precisa desaparecer quando T6/T7 reescreverem o bloco de busca de pacotes para múltiplos ids.

---

- **Feature**: `ajustes-uso-real` — `.specs/features/ajustes-uso-real/` (rodada concluída, **PASS**). Feature anterior: `quem-sou-eu` (MVP, PASS)
- **Rodada de ajustes**: 19 tasks, 40 requisitos `AJU-*`, todos com evidência. **430 testes unit + 78 de integração**. Sensor de discriminação: 8 mutações, 8 mortas. Origem: os 11 problemas que o dono trouxe da primeira partida real
- **Publicação**: `npm run deploy` **já foi executado pelo dono** — o site está no ar em `https://resenha.resenhaa.workers.dev`. O critério "uma partida completa roda no ambiente publicado" está fechado.
- **Feature pai**: `quem-sou-eu` — `.specs/features/quem-sou-eu/`
- **Phase / Task**: Execute — **T1–T30 completos** + rodada de correção do Verifier. Servidor e cliente prontos e publicados
- **Completed**: Specify, Design, Tasks e todas as 30 tasks, em commits atômicos. **314 testes unit + 65 de integração**. Spec em 81 requisitos (`DESC-10`, `DESC-11` nasceram de lacunas achadas pelos testes). O lote 6 (T27–T30) verificou as seis telas no navegador em 360px, 390px, 768px e 1280px, nos dois temas, com uma sala real de 20 jogadores. O Verifier independente reprovou por três lacunas de cobertura (`DESC-10` sem teste — mutante sobrevivente —, `FIM-04` cláusula do chat, `CHAT-02` cláusula do aviso ao autor); as três foram corrigidas em `04c1faf`, `c5d3b6b` e `8710507`, cada uma com prova de mutante. Nenhum comportamento de produção foi alterado
- **Dívida conhecida**:
  - `design.md` está desatualizado em cinco pontos — `EstadoSala` genérico, `ResultadoReducer` com variante de falha e `promoverAguardando`, assinatura do `ModuloDeJogo` com `Ambiente`, `Carta` virou `string`, `Declaracao` sem `confirmadorId`. Reconciliar antes da validação final
  - **Lacuna de protocolo**: a `Projecao` não diz **quem** é o confirmador de uma declaração pendente, só se sou eu (`eu.souConfirmador`). Quem não confirma nem declarou não tem como nomear quem está decidindo, então o anúncio na tela de partida diz "a mesa está conferindo" em vez de citar a pessoa, como o handoff desenhou. Resolver exigiria um `confirmadorId` na projeção
  - **Lacuna de protocolo**: o handoff mostra "descobriu na 5ª", "rodada 4" e "chat · 3 novas". A projeção não carrega número de perguntas, número de rodada nem mensagens não lidas; as telas usam o que existe (só "descobriu", e o total do chat)
  - `BannerDeConexao` (T23) ficou sem uso: o handoff desenhou reconexão e sala fechada como **telas inteiras**, não como faixa sobre o jogo, e foi assim que `EstadosGlobais.tsx` implementou
  - Logo do hub (duas cartas sobrepostas, opção "1e" do turno de design) implementada em `client/src/componentes/LogoResenha.tsx` + `client/public/favicon.svg`, usando os tokens `var(--acento)`/`var(--texto)`/`var(--fundo)`
