# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grupos de amigos (2–20 pessoas) que querem jogar party games juntos. Dois cenários de uso igualmente comuns:
1. **Remotamente**: em chamada de voz (Discord, WhatsApp, Google Meet) usando o app como tabuleiro digital compartilhado.
2. **Presencialmente**: usando o celular como suporte, com a comunicação acontecendo ao vivo entre os jogadores.

## Product Purpose

Plataforma web de jogos de festa (party games) para jogar com amigos. Não exige instalação, login ou cadastro — basta criar uma sala, compartilhar o código de 5 letras e jogar. O primeiro jogo disponível é o "Quem Sou Eu?" (adivinhe o personagem/objeto na sua carta fazendo perguntas de sim/não).

O Resenha vai receber vários jogos de festa no futuro; a arquitetura já prevê isso com módulos de jogo injetáveis (`ModuloDeJogo<E>`).

## Positioning

Jogo de festa sem fricção: sem app nativo, sem cadastro, sem paywall. Cola de grupo para amigos que querem diversão rápida — presencial ou à distância.

## Operating Context

- O host cria a sala e configura as regras (modo de jogo, pacotes de cartas, tempo por turno, ordem dos turnos).
- Jogadores entram pelo código de 5 letras ou link direto.
- O jogo é **falado** — perguntas e respostas acontecem em voz alta (presencial) ou na call (remoto). O chat dentro do app é suporte secundário.
- Turnos são rotativos com timer opcional. O jogador da vez faz perguntas de sim/não ao grupo.
- Duráveis Objects (Cloudflare) mantêm o estado: reconexão automática, migração de host, expiração por ociosidade.

## Capabilities and Constraints

- **Sem autenticação**: identidade é um token local (cookie/localStorage).
- **Sem persistência de conta**: se o token se perder, o jogador não volta à sala.
- **Multiplayer real-time** via WebSocket (Durable Objects com Hibernation API).
- **Limite técnico**: 20 jogadores por sala.
- **Mínimo para jogar**: 2 jogadores.
- **Pacotes de cartas**: temas pré-definidos (filmes, anime, futebol, etc.) armazenados no Cloudflare KV. Pacotes personalizados planejados mas ainda indisponíveis.
- **Deploy**: manual via `npm run deploy` (build + wrangler deploy), sem CI/CD.

## Brand Commitments

- **Nome**: Resenha
- **Tom de voz**: informal, descontraído, humorístico. Usar linguagem brasileira coloquial (PT-BR). Exemplo: "Chame a galera", "Quem escolhe é fulano, que criou a sala."
- **Paleta**: dark-mode-first com acento esmeralda (`#6fd3a8` dark / `#2a7a5e` light). 20 cores distintas para jogadores.
- **Tipografia**: Inter (UI) + monospace para badges e contadores.

## Evidence on Hand

- Codebase funcional e deployed. Primeiro jogo (Quem Sou Eu) completo e jogável.
- Feedback real de sessão de jogo com amigos (8 ago 2026): lista de bugs e melhorias de UX coletadas em uso real.
- Nenhum logo formal, apenas o emoji 🍻 usado no favicon/título.

## Product Principles

1. **Zero fricção**: Entrar no jogo deve levar segundos, não minutos. Sem downloads, sem cadastros, sem confirmações de email.
2. **O jogo é falado**: O app é o tabuleiro, não o mediador. A diversão acontece na conversa entre amigos — o app apenas organiza.
3. **Mobile-first, desktop-ready**: A maioria dos jogadores estará no celular. Todo botão, texto e layout deve funcionar perfeitamente em telas pequenas primeiro.
4. **Feedback instantâneo**: O estado do jogo deve ser claro a todo momento. Quem está jogando, de quem é a vez, quanto tempo falta — tudo visível sem esforço.
5. **Resiliência social**: Conexão caiu? Host saiu? Alguém fechou o app? O jogo se recupera sozinho sempre que possível.

## Accessibility & Inclusion

- Touch targets mínimos de 44px (já implementado).
- Respeitar `prefers-reduced-motion` (já implementado).
- Cores de jogadores com contraste suficiente para daltonismo (necessita validação).
- Sem requisito formal de WCAG, mas as bases devem estar sólidas.
