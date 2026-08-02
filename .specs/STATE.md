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

## Handoff

- **Feature**: `quem-sou-eu` — `.specs/features/quem-sou-eu/`
- **Phase / Task**: Specify — spec.md e context.md escritos, aguardando aprovação do usuário
- **Completed**: levantamento de requisitos (2 rodadas), sweep de dimensões implícitas, discussão de 5 áreas cinzentas
- **In-progress** (file:line): none
- **Next step**: Usuário aprova `spec.md`; em seguida entrar na fase Design (arquitetura, design-brief.md e design-prompts.md para o Claude Design)
- **Blockers**: none
- **Uncommitted files**: `.specs/STATE.md`, `.specs/features/quem-sou-eu/spec.md`, `.specs/features/quem-sou-eu/context.md`
- **Branch**: main
