# Resenha — Design Brief

**Spec:** `.specs/features/quem-sou-eu/spec.md`
**Prompts:** `.specs/features/quem-sou-eu/design-prompts.md`
**Handoff esperado em:** `design/handoff/`

## Produto & Tom

**Resenha** é um hub de party games para jogar com amigos pelo navegador. O primeiro jogo é "Quem Sou Eu?" — cada pessoa recebe uma carta que todos veem menos ela, e vai fazendo perguntas de sim/não até adivinhar. As perguntas e respostas acontecem **fora do site**, por voz ou presencialmente: o site é o tabuleiro, não o juiz.

O tom é o de um amigo organizado no meio da bagunça. A interface nunca compete com a conversa — ela responde em silêncio às três perguntas que aparecem o tempo todo: *qual é a carta de cada um? de quem é a vez? o que eu faço agora?* Sem gamificação, sem placar, sem confete. A graça está na mesa, não na tela.

## Direção estética

- **Buscar:** clean e minimalista de verdade — muito espaço em branco, uma cor de acento só, tipografia sans-serif de leitura fácil, hierarquia feita por tamanho e peso em vez de caixas e bordas.
- **Evitar:** o visual do Gartic Phone. Ele é a referência de **fluxo** (entra com código, escolhe apelido, joga), não de aparência: nada de roxo/amarelo saturado, molduras grossas, sombras duras ou ilustração escrachada. Também evitar o extremo oposto — dashboard corporativo cinza é igualmente errado, o produto é uma brincadeira entre amigos.
- **Referência conceitual:** o papelzinho na testa. A tela de partida é literalmente "as testas de todo mundo, e a sua em branco".

## Restrições

| Restrição | Valor |
| --------- | ----- |
| Temas | Claro e escuro, ambos de primeira classe |
| Viewports | Mobile-first em 360px; verificar em 390px, 768px e 1280px |
| Idioma | Português do Brasil |
| Densidade | Mobile é o caso principal; desktop usa o espaço horizontal, não é um mobile esticado |
| Caso de estresse | **20 jogadores em tela de 360px** — é esse layout que precisa funcionar, não o de 3 |

## Inventário de telas

| Tela | Propósito | Origem (ACs) |
| ---- | --------- | ------------ |
| Início | Criar sala ou entrar com código + apelido | `SALA-01`…`SALA-06` |
| Lobby | Reunir o grupo, configurar a partida, iniciar | `SALA-07`…`SALA-09`, `HOST-01`…`HOST-03`, `CFG-01`…`CFG-06` |
| Escrita | Ver seu alvo, escrever a carta dele, marcar PRONTO | `ESCR-02`…`ESCR-10` |
| Jogo | O tabuleiro: cartas de todos, vez, timer, Descobri! | `JOGO-01`…`JOGO-11`, `DESC-01`…`DESC-09` |
| Encerrada | Revelação geral e nova partida | `FIM-01`…`FIM-04` |
| Estados globais | Conectando, reconectando, sala expirada, erro | `CONN-03`, `CONN-05`, `CONN-07`, `CONN-08` |

## Componentes compartilhados

| Componente | Estados obrigatórios |
| ---------- | -------------------- |
| **Carta** (o componente herói) | carta de outro jogador (texto legível); **a sua, oculta**; a sua, revelada; carta de quem já descobriu |
| Ficha de jogador | normal; você; host; desconectado; descobriu; pronto; é a vez dele |
| Indicador de vez | é sua vez; é a vez de outro; com timer correndo; timer acabando; sem limite de tempo |
| Chat | mensagem de jogador (com cor do autor); mensagem de sistema (visualmente distinta); vazio |
| Bloco de notas | vazio; com texto; recolhido |
| Campo de texto | vazio; preenchido; com contador de caracteres; erro de limite |
| Modal de confirmação | padrão; destrutivo (expulsar, encerrar) |
| Banner de conexão | reconectando; desconectado; sala expirada |
| Botão | primário; secundário; destrutivo; desabilitado **com o motivo visível** |

## Inegociáveis

1. **A sua carta oculta é o coração da tela de partida** (`JOGO-01`). Ela precisa parecer deliberadamente vazia — um espaço que o jogo guarda para você — e não um erro de carregamento ou um dado faltando.
2. **20 jogadores em 360px** (`VIS-02`). Se a lista de cartas só funciona com 4 pessoas, o design falhou. Nenhuma rolagem horizontal em nenhuma tela (`VIS-01`).
3. **Cada jogador tem uma cor única** (`SALA-07`) e ela é o principal recurso de leitura rápida. A paleta precisa suportar **20 cores distinguíveis** que funcionem nos dois temas — inclusive para quem tem daltonismo, o que exige que a cor nunca seja o único diferenciador.
4. **Botão desabilitado sempre diz por quê** (`HOST-01`, `ESCR-06`). "Iniciar" apagado sem explicação é o jeito mais fácil de travar um grupo de amigos.
5. **Ação de host não aparece para quem não é host** (`VIS-04`) — não fica desabilitada, não fica cinza: não existe.
