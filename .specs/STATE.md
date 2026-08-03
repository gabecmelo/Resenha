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

## Handoff

- **Feature**: `quem-sou-eu` — `.specs/features/quem-sou-eu/`
- **Phase / Task**: Execute — lotes 1, 2 e 3 completos (T1–T20). **Servidor inteiro pronto e verde.**
- **Completed**: Specify, Design, Tasks. T1–T20 com 20 commits atômicos, 251 testes unit + 64 de integração. O lote 3 foi interrompido no T19 por limite de gasto da conta e concluído inline pelo orquestrador (T19 e T20). Três correções pós-lote: `fdafd2b`, `85d9fb6`, `3beb637`. Spec em 81 requisitos (`DESC-10`, `DESC-11` nasceram de lacunas achadas pelos testes)
- **In-progress** (file:line): none
- **Next step**: Lote 4 (T21–T28). T21 e T22 (sessão e provider de conexão) **não** dependem de design e podem rodar já; T23 em diante precisa do handoff
- **Blockers**: `design/handoff/` ainda não existe — o usuário está gerando o design no Claude Design em paralelo. Bloqueia T23–T29
- **Uncommitted files**: none
- **Branch**: main
- **Dívida conhecida**: `design.md` está desatualizado em cinco pontos — `EstadoSala` genérico, `ResultadoReducer` com variante de falha e `promoverAguardando`, assinatura do `ModuloDeJogo` com `Ambiente`, `Carta` virou `string`, `Declaracao` sem `confirmadorId`. Reconciliar antes da validação final
