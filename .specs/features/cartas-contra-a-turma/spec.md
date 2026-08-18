# Cartas Contra a Turma Specification

## Problem Statement

O Resenha é um hub de party games. "Quem Sou Eu?" e "Espião" já estão jogáveis e entram pelo registro (`AD-013`). O terceiro jogo do roadmap é o Cartas Contra a Turma: uma frase com uma lacuna no meio da mesa, todo mundo joga a pior (melhor) resposta possível da própria mão, e um juiz rotativo escolhe a favorita. É o primeiro jogo do hub em que o sistema **guarda pontos** — o que exige rever `AD-003`.

## Goals

- [ ] Uma sala de 3+ jogadores joga uma partida completa: mão distribuída, rodadas com juiz rotativo, ponto por rodada vencida, placar visível e encerramento.
- [ ] O jogo entra no hub só por registro (`server/games/registro.ts`), sem tocar `core/despacho.ts` nem `core/sala-do.ts`.
- [ ] O conteúdo mora em dados (`shared/cartas-turma-dados.ts`), separado por tom, e cresce sem mudança de código.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Cartas-pergunta com duas lacunas ("jogue 2 cartas") | Dobra o desenho de mão, de pilha e de revelação por um ganho de variedade que o v1 não precisa. Fica pra rodada de conteúdo seguinte. |
| Ranking entre partidas, histórico, estatísticas | O placar é **da partida** (decisão do dono: "Placar da partida"). Nada atravessa o fim da sala — `AD-003` continua valendo pra isso. |
| Cartas customizadas persistentes (baralho da casa) | A carta em branco já cobre a vontade de escrever; um baralho editável e salvo é outro produto. |
| Descarte / troca de mão ("mulligan") | Mecânica extra do jogo original; não foi pedida. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O sistema pontua e aponta um campeão — contradiz `AD-003` ("não pontua e não decide vencedor", escopo "todos os jogos do hub") | Placar da partida, 1 ponto por rodada vencida. `AD-003` passa a ter exceção registrada (`AD-015`). | Escolha explícita do dono ("Placar da partida"). Diferente de Espião/Quem Sou Eu, aqui **quem julga é uma pessoa** — o sistema só conta o que um humano decidiu, não arbitra regra nenhuma. O espírito de `AD-003` (o sistema é tabuleiro, não juiz) segue intacto. | y |
| Mão: sorteada ou escolhida | Sorteada, 7 cartas, reposta ao fim de cada rodada. | Decisão do dono ("Mão sorteada"). 7 é o tamanho clássico e o que dá escolha real sem virar leitura longa no celular. | y (o 7 é padrão meu) |
| Carta em branco | Cada jogador tem 1. Ao gastar, volta 5 rodadas depois. | Literal do dono: "pode escrever uma vez a cada 5 rodadas — ao gastar, depois de 5 rodadas recebe de novo essa chance". | y |
| Juiz | Rotativo entre os jogadores ativos, na ordem de entrada, começando por um sorteado. | Único desenho que mantém todo mundo jogando (o juiz não é um espectador fixo) e não precisa de nova config. | n (padrão meu) |
| Fim da partida | Meta de pontos configurável, padrão 5; opção "sem meta" (só o host encerra). | Um placar sem linha de chegada nunca vira vitória; a opção "sem meta" preserva o encerramento manual que os outros jogos já têm. | n (padrão meu) |
| Jogador que não escolhe a tempo | Fica de fora **daquela rodada** (não entra na pilha, não pode ganhar o ponto). A rodada segue com quem jogou. | Mesma filosofia de `JOGO-10`: quem some não trava a mesa. Sem isso um AFK congela a partida inteira. | n (padrão meu) |
| Tempo de escolha | Configurável, padrão 90s, faixa 30–300s; permite "sem tempo". | Reaproveita o multiplexo de `prazos.turno` já usado no Espião (`AD-010`). | n (padrão meu) |
| Tom do conteúdo | Pacotes separados por tom: um leve e um pesado, escolhidos no lobby. | Decisão do dono ("Pacotes separados por tom"), igual ao que os pacotes de local já fazem (`locais-sinistros`). | y |
| Anonimato das respostas | A pilha aparece embaralhada e sem autor pra todos; a autoria só é revelada depois da escolha do juiz. | É o jogo. Sem anonimato o juiz premia amizade, não a carta. | n (padrão meu) |

**Open questions:** nenhuma bloqueante. Os padrões marcados "n" são escolhas minhas registradas aqui pra que uma mudança de opinião do dono vire alteração de requisito, não conversa perdida.

---

## User Stories

### P1: Jogar uma partida completa ⭐ MVP

**User Story**: Como jogador, quero receber uma mão de cartas-resposta, jogar a minha na frase da rodada e ver um juiz humano escolher a favorita — pra rir com a mesa numa partida do início ao fim.

**Why P1**: É o jogo. Sem isso não existe nada.

**Acceptance Criteria**:

1. WHEN o host está no lobby de uma sala com jogo Cartas Contra a Turma THEN o sistema SHALL permitir configurar: pacote(s) de cartas, tempo de escolha (padrão 90s, ou "sem tempo") e meta de pontos (padrão 5, ou "sem meta")
2. WHEN o host clica "Começar" com menos de 3 jogadores ativos THEN o sistema SHALL recusar com o mesmo erro de jogadores insuficientes já usado nos outros jogos
3. WHEN o host clica "Começar" com jogadores e configuração válidos THEN o sistema SHALL sortear o juiz da primeira rodada, distribuir 7 cartas-resposta privadas pra cada jogador ativo e virar a primeira carta-pergunta
4. WHEN um jogador abre sua projeção durante a fase de escolha THEN o sistema SHALL mostrar a carta-pergunta pra todos e a mão **apenas pro dono dela**
5. WHEN o jogador da vez é o juiz THEN o sistema SHALL indicar que ele não joga nesta rodada e não SHALL revelar a mão dele como jogável
6. WHEN um jogador não-juiz escolhe uma carta da mão THEN o sistema SHALL registrar a escolha, removê-la da mão e mantê-la oculta de todos os outros até a pilha fechar
7. WHEN a fase de escolha está aberta THEN o sistema SHALL mostrar pra mesa quantos já jogaram e quem falta, sem revelar o conteúdo de nenhuma carta
8. WHEN todos os jogadores ativos não-juízes jogaram, OU o tempo de escolha esgota THEN o sistema SHALL fechar a fase de escolha e apresentar as respostas **embaralhadas e sem autor** pra todos
9. WHEN o tempo de escolha esgota com jogadores que não escolheram THEN o sistema SHALL seguir a rodada apenas com as cartas jogadas, deixando os ausentes de fora daquela rodada
10. WHEN a fase de escolha fecha com menos de 2 respostas na pilha THEN o sistema SHALL descartar a rodada e começar a próxima (nova pergunta, próximo juiz), sem ponto pra ninguém
11. WHEN a pilha está aberta THEN o sistema SHALL permitir que **somente o juiz** escolha uma resposta vencedora
12. WHEN o juiz escolhe a vencedora THEN o sistema SHALL segurar a revelação pela batida de suspense já usada no Espião e então revelar, pra todos, qual carta ganhou e **quem** a jogou
13. WHEN a vencedora é revelada THEN o sistema SHALL dar 1 ponto ao autor dela
14. WHEN a revelação da rodada termina THEN o sistema SHALL repor a mão de cada jogador até 7 cartas, passar o juiz pro próximo jogador ativo na ordem e virar uma nova carta-pergunta
15. WHEN uma carta (pergunta ou resposta) já foi usada na partida THEN o sistema SHALL NOT sorteá-la de novo enquanto houver cartas não usadas no pool; quando o pool acabar, SHALL reembaralhar as usadas
16. WHEN o host encerra a partida a qualquer momento THEN o sistema SHALL ir pra tela de revelação com o placar final
17. WHEN um jogador sai e os ativos caem abaixo de 3 THEN o sistema SHALL cancelar a partida e voltar a sala ao lobby, mesmo padrão dos outros jogos
18. WHEN o juiz da rodada sai da sala durante a rodada THEN o sistema SHALL descartar a rodada e passar o juiz pro próximo ativo

**Independent Test**: Sala com 3 jogadores, jogar duas rodadas completas — conferir que o juiz mudou, que a autoria só apareceu depois da escolha, e que o ponto foi pro autor certo.

---

### P2: A carta em branco

**User Story**: Como jogador, quero de vez em quando escrever a minha própria resposta em vez de usar a mão — porque a piada da mesa quase nunca está no baralho.

**Why P2**: Foi pedido explicitamente e é o que liga o jogo ao grupo. Não bloqueia a primeira partida.

**Acceptance Criteria**:

1. WHEN a partida começa THEN o sistema SHALL dar a cada jogador ativo 1 carta em branco disponível
2. WHEN um jogador com a carta em branco disponível está na fase de escolha THEN o sistema SHALL permitir que ele escreva um texto próprio e o jogue no lugar de uma carta da mão
3. WHEN o jogador tenta jogar uma carta em branco vazia ou só com espaços THEN o sistema SHALL recusar
4. WHEN o jogador escreve mais de 120 caracteres na carta em branco THEN o sistema SHALL recusar
5. WHEN a carta em branco é jogada THEN o sistema SHALL tratá-la como qualquer outra resposta — entra na pilha embaralhada, anônima, e pode vencer a rodada
6. WHEN a carta em branco é gasta na rodada N THEN o sistema SHALL deixá-la indisponível e devolvê-la no início da rodada N+5
7. WHEN a carta em branco está indisponível THEN o sistema SHALL mostrar ao dono em quantas rodadas ela volta

**Independent Test**: Gastar a carta em branco na rodada 1, confirmar que ela não aparece nas rodadas 2–5 e volta na 6.

---

### P3: O placar da partida

**User Story**: Como mesa, quero ver quem está ganhando e quem levou a partida — porque metade da graça é a disputa.

**Why P3**: Decisão explícita do dono, e a razão de `AD-015` existir.

**Acceptance Criteria**:

1. WHEN a partida está em andamento THEN o sistema SHALL mostrar pra todos o placar com os pontos de cada jogador ativo, ordenado do maior pro menor
2. WHEN um jogador ganha uma rodada THEN o sistema SHALL somar 1 ponto a ele e refletir isso no placar de todo mundo
3. WHEN o host configurou uma meta de pontos E um jogador atinge essa meta THEN o sistema SHALL encerrar a partida imediatamente após a revelação daquela rodada
4. WHEN a partida encerra THEN o sistema SHALL mostrar a tela de revelação com o placar final e o campeão em destaque, inclusive pra quem entrou depois de encerrada
5. WHEN a partida encerra com o host configurando "sem meta" THEN o sistema SHALL mostrar o mesmo placar final, com o campeão sendo quem tem mais pontos; havendo empate no topo, SHALL mostrar todos os empatados sem desempatar

**Independent Test**: Partida com meta 2 — conferir que ela encerra sozinha assim que alguém chega a 2, e que a tela final aponta o campeão certo.

---

### P4: Conteúdo separado por tom

**User Story**: Como host, quero escolher se a partida vai ser leve ou pesada — porque a mesma turma não joga igual com a família e com os amigos da madrugada.

**Why P4**: Decisão do dono ("Pacotes separados por tom"), mesmo padrão que os locais do Espião já seguem.

**Acceptance Criteria**:

1. WHEN o host abre a seleção de pacotes no lobby THEN o sistema SHALL mostrar ao menos dois pacotes — um de tom leve e um de tom pesado — com a descrição deixando o tom explícito
2. WHEN um pacote é selecionado THEN o sistema SHALL somar suas perguntas e respostas ao pool da partida, permitindo combinar pacotes
3. WHEN um novo pacote é adicionado a `shared/cartas-turma-dados.ts` THEN o sistema SHALL passar a oferecê-lo no lobby sem nenhuma outra mudança de código
4. WHEN o host começa a partida sem nenhum pacote selecionado THEN o sistema SHALL recusar

**Independent Test**: Selecionar só o pacote pesado e conferir que nenhuma carta do leve aparece na partida.

---

## Requirements Traceability

| ID | User Story | Source | Status |
| --- | --- | --- | --- |
| CCT-01 | P1: Partida completa | Specify | Pending |
| CCT-02 | P1: Partida completa | Specify | Pending |
| CCT-03 | P1: Partida completa | Specify | Pending |
| CCT-04 | P1: Partida completa | Specify | Pending |
| CCT-05 | P1: Partida completa | Specify | Pending |
| CCT-06 | P1: Partida completa | Specify | Pending |
| CCT-07 | P1: Partida completa | Specify | Pending |
| CCT-08 | P1: Partida completa | Specify | Pending |
| CCT-09 | P1: Partida completa | Specify | Pending |
| CCT-10 | P1: Partida completa | Specify | Pending |
| CCT-11 | P1: Partida completa | Specify | Pending |
| CCT-12 | P1: Partida completa | Specify | Pending |
| CCT-13 | P1: Partida completa | Specify | Pending |
| CCT-14 | P1: Partida completa | Specify | Pending |
| CCT-15 | P1: Partida completa | Specify | Pending |
| CCT-16 | P1: Partida completa | Specify | Pending |
| CCT-17 | P1: Partida completa | Specify | Pending |
| CCT-18 | P1: Partida completa | Specify | Pending |
| CCT-19 | P2: A carta em branco | Specify | Pending |
| CCT-20 | P2: A carta em branco | Specify | Pending |
| CCT-21 | P2: A carta em branco | Specify | Pending |
| CCT-22 | P2: A carta em branco | Specify | Pending |
| CCT-23 | P2: A carta em branco | Specify | Pending |
| CCT-24 | P2: A carta em branco | Specify | Pending |
| CCT-25 | P2: A carta em branco | Specify | Pending |
| CCT-26 | P3: O placar da partida | Specify | Pending |
| CCT-27 | P3: O placar da partida | Specify | Pending |
| CCT-28 | P3: O placar da partida | Specify | Pending |
| CCT-29 | P3: O placar da partida | Specify | Pending |
| CCT-30 | P3: O placar da partida | Specify | Pending |
| CCT-31 | P4: Conteúdo por tom | Specify | Pending |
| CCT-32 | P4: Conteúdo por tom | Specify | Pending |
| CCT-33 | P4: Conteúdo por tom | Specify | Pending |
| CCT-34 | P4: Conteúdo por tom | Specify | Pending |

**ID format:** `CCT-[NUMBER]`, mapeado em ordem às ACs de P1 (01–18), P2 (19–25), P3 (26–30) e P4 (31–34) acima.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 34 total, 0 implementados.

---

## Success Criteria

- [ ] Uma sala de 3+ jogadores completa uma partida do lobby até o placar final, pelos dois caminhos de encerramento (meta atingida e encerramento manual do host)
- [ ] O jogo entra no registro (`server/games/registro.ts`) sem alterar `core/despacho.ts`/`core/sala-do.ts`
- [ ] `AD-015` registrado: `AD-003` passa a admitir placar quando quem julga é uma pessoa
- [ ] Zero regressão nos testes unitários e de integração existentes
