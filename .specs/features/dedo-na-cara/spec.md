# Dedo na Cara Specification

## Problem Statement

O Resenha é um hub de party games com quatro jogos jogáveis, todos entrando pelo registro (`AD-013`). O quinto é o Dedo na Cara: uma pergunta vai ao meio da mesa — "quem aqui é mais capaz de sumir do rolê sem avisar?" — e todo mundo aponta pra alguém. Quem levar mais dedos leva a carta. Quem juntar a meta de cartas leva a noite.

É o mais simples dos cinco de propósito: não tem papel secreto, não tem narrador, não tem o que deduzir. A graça inteira está em olhar pra mesa e escolher — e em ver quem apontou pra quem. O aplicativo é o baralho e o contador de dedos, nunca o juiz de quem merecia a carta.

**Sobre a inspiração.** A mecânica vem do gênero de "quem é mais provável", popularizado no Brasil pelo *Amigos de Merda*, da Buró. Mecânica de jogo não é protegida; **nome e conteúdo são**. Por isso o jogo tem nome próprio e **todas as cartas são escritas do zero** — nada de texto da Buró entra aqui, pelo mesmo critério que já valeu pro Black Stories nos Enigmas.

## Goals

- [ ] Uma sala de 3+ jogadores joga uma partida completa: carta virada, mesa apontando, apuração à vista, ponto contado e encerramento na meta.
- [ ] O jogo entra no hub só por registro (`server/games/registro.ts`), sem lógica de votação vazando pro `core`.
- [ ] O conteúdo mora em dados (`shared/dedo-dados.ts`), separado por tom, e cresce sem mudança de código.
- [ ] Nenhum voto trafega pra quem não pode vê-lo enquanto a votação está aberta — não é a tela que esconde.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Relógio de carta | Mesmo critério dos Enigmas: a votação fecha sozinha quando todos os conectados apontaram. Um cronômetro num jogo de 15 segundos por carta só atrapalha. |
| Justificar o voto por escrito | A justificativa é a risada na mesa (`AD-003`). Um campo de texto por voto transformaria 20 segundos de jogo em dois minutos de digitação. |
| Cartas escritas pelos jogadores | Outro produto: exige moderação e persistência. Fica pra depois, se pedirem. |
| Ranking entre partidas | O placar é **da partida**, igual a todos os outros. Nada atravessa o fim da sala. |
| Passar a vez / abster-se | Apontar é o jogo inteiro. Quem não quer apontar em ninguém está dizendo que não quer jogar esta carta, e isso trava a mesa. Ver `ADR` do empate abaixo. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quem lê a carta | Ninguém. A carta aparece igual pra mesa inteira e todo mundo vota. | Decisão do dono ("Todos veem, ninguém narra"). É o mais próximo do jogo de mesa, onde a carta vai ao meio. | y |
| Como a mesa aponta | **Configurável**: `secreta` (cada um escolhe, revela junto) ou `aberta` (o dedo aparece assim que a pessoa toca). Padrão `secreta`. | Decisão do dono ("mantenha como opção configurável ambas"). O padrão é `secreta` porque na mesa física ninguém vê o dedo do outro antes de apontar — os dedos sobem juntos. | y |
| Apontar pra si mesmo | **Configurável**, padrão **não pode**. | Decisão do dono: "as regras do jogo original é que não pode apontar pra si mesmo, então ela fica como padrão, mas dá pra mudar". | y |
| Empate na apuração | Ninguém leva a carta. A mesa vê o empate e a carta vai pro descarte. | Mesmo critério do Espião (`apurar` devolve `empatou` e nada acontece). Dar o ponto a todos os empatados faria a meta virar corrida de sorte numa mesa par. | n (padrão meu) |
| Fim da partida | Meta de cartas configurável, padrão 5. | 5 é a coroa do jogo de mesa que inspirou. Mesma faixa e mesmo controle de meta dos outros jogos. | n (padrão meu) |
| Quando a votação fecha | Quando todos os jogadores **ativos e conectados** apontaram. | Mesmo critério do `ESP-12`: quem caiu não trava a mesa. | n (padrão meu) |
| Mínimo de jogadores | 3 ativos. | Com 2, "quem dos dois" só tem uma resposta possível que não seja você mesmo — e com auto-voto ligado, cada um aponta pra si e empata sempre. O jogo não existe em dupla. | n (padrão meu) |
| Tom do conteúdo | Pacotes separados por tom, um leve e os outros pesados, escolhidos no lobby. | Mesmo padrão dos locais do Espião, das cartas do Cartas e dos enigmas. O jogo original é 18+; a sala da família precisa poder escolher não ser. | n (padrão meu) |

**Open questions:** nenhuma bloqueante. Os padrões marcados "n" são escolhas minhas registradas aqui pra que uma mudança de opinião do dono vire alteração de requisito, não conversa perdida.

---

## User Stories & Acceptance Criteria

### P1: A carta na mesa

**User Story**: Como jogador, quero ver a pergunta da rodada ao mesmo tempo que todo mundo — porque o jogo começa quando a mesa lê junto e já olha pros lados.

**Why P1**: Sem carta não há rodada. É o único objeto que a mesa inteira compartilha.

**Acceptance Criteria**:

1. WHEN o host inicia a partida com pelo menos 3 jogadores ativos e ao menos um pacote THEN o sistema SHALL montar o baralho dos pacotes escolhidos, embaralhar, virar a primeira carta e abrir a votação
2. WHEN a partida começa sem pacote nenhum selecionado, ou com menos de 3 ativos THEN o sistema SHALL recusar iniciar
3. WHEN uma carta está na mesa THEN o sistema SHALL projetar o texto dela igual pra todo jogador da sala, inclusive pra quem está aguardando vaga
4. WHEN o monte acaba THEN o sistema SHALL reembaralhar o descarte e seguir, sem terminar a partida por falta de carta

**Independent Test**: Abrir uma sala de 3, começar, e conferir que os três leem a mesma pergunta.

### P2: Apontar

**User Story**: Como jogador, quero apontar pra alguém da mesa e mudar de ideia enquanto a votação está aberta — porque o dedo só vale quando sobe junto com o dos outros.

**Why P2**: É o único gesto do jogo.

**Acceptance Criteria**:

1. WHEN um jogador ativo aponta para outro jogador ativo THEN o sistema SHALL registrar o voto dele, substituindo o voto anterior se houver
2. WHEN a configuração é `autoVoto: false` e alguém aponta para si mesmo THEN o sistema SHALL recusar com `CARTA_INVALIDA`; WHEN é `true` THEN SHALL aceitar
3. WHEN alguém que está aguardando vaga, ou não está na sala, tenta apontar THEN o sistema SHALL recusar com `JOGADOR_AGUARDANDO` ou `SEM_AUTORIDADE`
4. WHEN a votação é `secreta` THEN o sistema SHALL projetar, enquanto ela está aberta, **apenas quem já votou** — nunca em quem —, e SHALL projetar o próprio voto de volta só pra quem o fez
5. WHEN a votação é `aberta` THEN o sistema SHALL projetar cada voto pra mesa inteira assim que ele chega
6. WHEN todos os jogadores ativos e conectados já apontaram THEN o sistema SHALL fechar a votação e apurar, sem esperar quem está desconectado

**Independent Test**: Em sala `secreta`, votar com dois dos três e conferir que a projeção do terceiro mostra "2 de 3 apontaram" e nenhum alvo.

### P3: A apuração

**User Story**: Como mesa, quero ver de uma vez quem apontou pra quem — porque é aí que a risada acontece, e não no resultado.

**Why P3**: A revelação é o produto. O ponto é só o placar.

**Acceptance Criteria**:

1. WHEN a votação fecha THEN o sistema SHALL revelar à mesa inteira o voto de cada jogador, inclusive nas salas `secreta`
2. WHEN alguém teve estritamente mais votos que qualquer outro THEN o sistema SHALL dar a carta a essa pessoa, somar 1 ponto e anunciar no chat da sala
3. WHEN duas ou mais pessoas empatam no topo THEN o sistema SHALL não dar a carta a ninguém, SHALL anunciar o empate e SHALL seguir a partida
4. WHEN a apuração termina THEN o sistema SHALL manter a mesa na revelação até alguém pedir a próxima carta — sem relógio
5. WHEN qualquer jogador ativo pede a próxima carta THEN o sistema SHALL descartar a carta atual, virar a próxima e reabrir a votação

**Independent Test**: Três jogadores, dois votam no mesmo alvo, e conferir que o alvo levou 1 ponto e que a mesa vê os três votos.

### P4: O placar e o fim

**User Story**: Como host, quero uma meta que encerre a partida — porque sem fim declarado a mesa joga até alguém desistir.

**Why P4**: Mesmo padrão do Cartas e dos Enigmas.

**Acceptance Criteria**:

1. WHEN a partida está em andamento THEN o sistema SHALL projetar o placar do maior pro menor, com o nome de cada jogador ativo
2. WHEN alguém alcança a meta de pontos THEN o sistema SHALL encerrar a partida na revelação daquela carta e SHALL anunciar quem levou
3. WHEN a meta é `null` THEN o sistema SHALL seguir sem fim automático, e só o host encerra
4. WHEN dois jogadores batem a meta na mesma carta THEN o sistema SHALL declarar os dois campeões

**Independent Test**: Meta 2, forçar dois pontos no mesmo jogador e conferir o encerramento.

### P5: Configuração e conteúdo

**User Story**: Como host, quero escolher o tom das cartas, se o voto é secreto e se dá pra apontar pra si mesmo — porque a mesma turma não joga igual na ceia de Natal e na madrugada.

**Why P5**: Mesmo padrão de configuração dos outros quatro.

**Acceptance Criteria**:

1. WHEN o host abre a seleção de pacotes no lobby THEN o sistema SHALL mostrar ao menos um pacote de tom leve e um de tom pesado, com a descrição deixando o tom explícito
2. WHEN mais de um pacote é selecionado THEN o sistema SHALL juntar as cartas num baralho só, sem repetir pergunta
3. WHEN um novo pacote é adicionado a `shared/dedo-dados.ts` THEN o sistema SHALL passar a oferecê-lo no lobby sem nenhuma outra mudança de código; e cada pacote sozinho SHALL bastar pra uma partida inteira
4. WHEN o host muda `votacao` ou `autoVoto` no lobby THEN o sistema SHALL aplicar a mudança à próxima partida, e SHALL NOT permitir mudança com a partida em andamento

**Independent Test**: Selecionar dois pacotes e conferir que o baralho traz cartas dos dois, sem repetição.

---

## Requirements Traceability

| ID | User Story | Source | Status |
| --- | --- | --- | --- |
| DEDO-01 | P1: A carta na mesa | Specify | Pending |
| DEDO-02 | P1: A carta na mesa | Specify | Pending |
| DEDO-03 | P1: A carta na mesa | Specify | Pending |
| DEDO-04 | P1: A carta na mesa | Specify | Pending |
| DEDO-05 | P2: Apontar | Specify | Pending |
| DEDO-06 | P2: Apontar | Specify | Pending |
| DEDO-07 | P2: Apontar | Specify | Pending |
| DEDO-08 | P2: Apontar | Specify | Pending |
| DEDO-09 | P2: Apontar | Specify | Pending |
| DEDO-10 | P2: Apontar | Specify | Pending |
| DEDO-11 | P3: A apuração | Specify | Pending |
| DEDO-12 | P3: A apuração | Specify | Pending |
| DEDO-13 | P3: A apuração | Specify | Pending |
| DEDO-14 | P3: A apuração | Specify | Pending |
| DEDO-15 | P3: A apuração | Specify | Pending |
| DEDO-16 | P4: O placar e o fim | Specify | Pending |
| DEDO-17 | P4: O placar e o fim | Specify | Pending |
| DEDO-18 | P4: O placar e o fim | Specify | Pending |
| DEDO-19 | P4: O placar e o fim | Specify | Pending |
| DEDO-20 | P5: Configuração e conteúdo | Specify | Pending |
| DEDO-21 | P5: Configuração e conteúdo | Specify | Pending |
| DEDO-22 | P5: Configuração e conteúdo | Specify | Pending |
| DEDO-23 | P5: Configuração e conteúdo | Specify | Pending |

**ID format:** `DEDO-[NUMBER]`, mapeado em ordem às ACs de P1 (01–04), P2 (05–10), P3 (11–15), P4 (16–19) e P5 (20–23) acima.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified
