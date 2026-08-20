# Enigmas Sinistros Specification

## Problem Statement

O Resenha é um hub de party games. "Quem Sou Eu?", "Espião" e "Cartas Contra a Turma" já estão jogáveis e entram pelo registro (`AD-013`). O quarto e último jogo do roadmap é o Enigmas Sinistros: uma cena absurda no meio da mesa, um narrador que conhece a solução e responde só "sim", "não" ou "não importa", e a mesa deduzindo até alguém desatar o nó. É um jogo de conversa — o aplicativo é o tabuleiro que guarda a solução, o histórico e o placar, nunca o árbitro do raciocínio.

## Goals

- [ ] Uma sala de 3+ jogadores joga uma partida completa: enigma virado, perguntas respondidas, alguém desata, ponto contado, narrador rodando e encerramento.
- [ ] O jogo entra no hub só por registro (`server/games/registro.ts`), sem lógica de enigma vazando pro `core`.
- [ ] O conteúdo mora em dados (`shared/enigmas-dados.ts`), separado por tom, e cresce sem mudança de código.
- [ ] A solução nunca trafega pra quem não pode lê-la — não é a tela que esconde.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Relógio de enigma | Decisão do dono: "Sem tempo, o narrador conduz". Um cronômetro num jogo de conversa atropela a mesa em vez de organizá-la. |
| Eliminar quem erra a declaração | Errar num jogo de dedução é informação pra mesa toda, não punição. Quem erra continua jogando e o palpite vira histórico público. |
| Pistas automáticas / dicas do sistema | Quem conduz é uma pessoa (`AD-003`). O sistema dando pista viraria juiz do raciocínio. |
| Enigmas escritos pelos jogadores | Outro produto: exige moderação, persistência e um editor. O narrador rotativo já dá variedade. |
| Ranking entre partidas | O placar é **da partida**, igual ao Cartas. Nada atravessa o fim da sala. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como a mesa pergunta | Duas modalidades, escolhidas pelo host: **fila** (perguntas escritas que o narrador responde uma a uma) e **voz** (a mesa pergunta em voz alta, o narrador só bate sim/não/não importa). | Literal do dono: "Fila de perguntas e só em voz alta (ou seja, o host escolhe se vai usar o chat também ou apenas em voz)". | y |
| Como o enigma acaba | Alguém declara a solução por escrito, **só o narrador lê**, e o narrador julga. | Decisão do dono ("Alguém declara e o narrador julga"). A mesa lendo a tentativa antes do veredito entregaria o raciocínio de graça. | y |
| Pontuação | 1 ponto pra quem desata. Placar visível, narrador rotativo, meta de pontos configurável encerra a partida. | Decisão do dono ("Ponto pra quem desata"). Cabe em `AD-015`: quem julga é uma pessoa, o sistema só conta. | y |
| Tempo | Nenhum. Nem de pergunta, nem de enigma. | Decisão do dono ("Sem tempo, o narrador conduz"). | y |
| Enigma impossível / mesa travada | O narrador pode **entregar** a solução: a mesa lê, ninguém pontua, e o jogo segue. | Sem relógio e com narrador rotativo, um enigma que ninguém desata travaria a partida pra sempre. Escape necessário, não pedido — registrado aqui. | n (padrão meu) |
| Mínimo de jogadores | 2 ativos — um narrador e ao menos um pra deduzir; o catálogo recomenda 3. | Revisto em 19/08/2026 pelo dono: em dois o jogo funciona (um lê, o outro tenta descobrir), e travar a mesa que quer jogar assim é o sistema decidindo o que é diversão. Fica o aviso na tela, não a trava. | s (dono) |
| Uma pergunta por vez, por pessoa | Sim: quem já tem pergunta na fila espera a resposta antes de mandar outra. | Sem isso uma pessoa enfileira dez perguntas e a mesa vira monólogo. | n (padrão meu) |
| Uma declaração por vez | Sim: enquanto o narrador não julga, ninguém mais declara. | Duas declarações pendentes exigiriam ordem de chegada visível e desempate. Simples resolve. | n (padrão meu) |
| Tom do conteúdo | Pacotes separados por tom: um leve e dois pesados, escolhidos no lobby. | Mesmo padrão dos locais do Espião e das cartas do Cartas. | n (padrão meu) |

**Open questions:** nenhuma bloqueante. Os padrões marcados "n" são escolhas minhas registradas aqui pra que uma mudança de opinião do dono vire alteração de requisito, não conversa perdida.

---

## User Stories

### P1: Jogar uma partida de enigmas ⭐ MVP

**User Story**: Como mesa, quero uma cena estranha na tela e uma pessoa que conhece a solução respondendo às nossas perguntas — pra deduzir junto até alguém desatar.

**Why P1**: É o jogo. Sem isso não existe nada.

**Acceptance Criteria**:

1. WHEN o host está no lobby de uma sala com jogo Enigmas Sinistros THEN o sistema SHALL permitir configurar pacote(s) de enigmas, modo de pergunta (fila ou em voz alta) e meta de pontos (padrão 5, ou "sem meta")
2. WHEN o host clica "Começar" com menos de 2 jogadores ativos THEN o sistema SHALL recusar com o mesmo erro de jogadores insuficientes dos outros jogos, sem contar quem está aguardando; AND WHEN a mesa tem 2 ativos THEN o sistema SHALL deixar começar e SHALL avisar na barra de ação que o jogo rende mais a partir de 3
3. WHEN o host clica "Começar" com jogadores e configuração válidos THEN o sistema SHALL sortear a ordem de rotação dos narradores, montar o monte com os pacotes escolhidos e virar o primeiro enigma
4. WHEN um enigma está na mesa THEN o sistema SHALL mostrar a cena pra todos os jogadores, com o narrador nomeado
5. WHEN um enigma está em andamento THEN o sistema SHALL entregar a solução **apenas** ao narrador, e SHALL entregá-la a todos assim que o enigma é revelado ou a partida encerra; a solução SHALL NOT trafegar pra quem ainda não pode lê-la
6. WHEN um enigma começa THEN o sistema SHALL NOT agendar prazo nenhum — nem de pergunta, nem de enigma
7. WHEN o jogador é o narrador do enigma THEN o sistema SHALL NOT permitir que ele pergunte nem que declare a solução

**Independent Test**: Sala de 3, virar um enigma e conferir na tela de quem não narra que nenhum trecho da solução existe no DOM antes da revelação.

---

### P2: Perguntar e responder

**User Story**: Como jogador, quero perguntar coisas de sim-ou-não e ver a resposta colada na minha pergunta — porque o histórico é o tabuleiro do jogo.

**Why P2**: É o miolo da dedução. Sem histórico a mesa esquece o que já sabe e repete pergunta.

**Acceptance Criteria**:

1. WHEN o modo é fila E um jogador não-narrador manda uma pergunta escrita THEN o sistema SHALL colocá-la na fila do narrador; SHALL recusar pergunta vazia, só com espaços ou acima de 160 caracteres; e SHALL recusar uma segunda pergunta do mesmo jogador enquanto a primeira não for respondida
2. WHEN o narrador responde uma pergunta THEN o sistema SHALL aceitar somente "sim", "não" ou "não importa", SHALL recusar resposta de qualquer outro jogador e SHALL recusar responder duas vezes a mesma pergunta
3. WHEN qualquer pergunta é feita ou respondida THEN o sistema SHALL mostrar pra mesa inteira o histórico na ordem em que aconteceu, com autor, texto e o veredito junto
4. WHEN há perguntas esperando resposta THEN o sistema SHALL mostrar quantas estão na fila e SHALL indicar a cada jogador se a pergunta parada é a dele
5. WHEN um enigma está em andamento THEN o sistema SHALL manter o chat da sala disponível, como nos outros jogos
6. WHEN um jogador reconecta ou abre a sala com o enigma em andamento THEN o sistema SHALL entregar o estado corrente completo — cena, histórico, tentativas e placar — sem a solução se ele não for o narrador

**Independent Test**: Mandar uma pergunta, conferir que a segunda é recusada até o narrador responder, e que a resposta aparece colada na pergunta na tela de todo mundo.

---

### P3: Declarar, julgar e entregar

**User Story**: Como jogador, quero contar minha versão só pro narrador quando eu achar que desatei — porque se a mesa ler meu palpite antes do veredito, acabou a dedução dos outros.

**Why P3**: É como o enigma fecha. Sem isso ninguém pontua.

**Acceptance Criteria**:

1. WHEN um jogador não-narrador declara a solução THEN o sistema SHALL registrar a declaração como pendente, entregar o texto **apenas** ao narrador e a quem declarou, avisar a mesa de que alguém declarou, recusar declaração vazia ou acima de 400 caracteres, e recusar uma segunda declaração enquanto a primeira não for julgada
2. WHEN o narrador julga a declaração pendente THEN o sistema SHALL aceitar o veredito somente dele
3. WHEN o veredito é "acertou" THEN o sistema SHALL dar 1 ponto a quem declarou, revelar a solução pra mesa inteira e nomear quem desatou
4. WHEN o veredito é "não é essa" THEN o sistema SHALL registrar a tentativa no histórico público — com autor, texto e o veredito — e manter o enigma em andamento, sem eliminar ninguém
5. WHEN o narrador entrega a solução THEN o sistema SHALL revelar a solução pra mesa inteira sem dar ponto a ninguém, e SHALL recusar a entrega vinda de qualquer outro jogador

**Independent Test**: Declarar e conferir que o texto não existe na tela de quem não é narrador nem autor; errar e conferir que o enigma continua com o palpite no histórico.

---

### P4: A mesa segue

**User Story**: Como mesa, quero passar pro próximo enigma com outra pessoa narrando — porque quem já leu a solução não joga aquele enigma.

**Why P4**: Sem rotação o narrador vira espectador fixo, e sem controle de monte a mesa repete enigma.

**Acceptance Criteria**:

1. WHEN o enigma é revelado E o narrador avança THEN o sistema SHALL limpar perguntas, tentativas e declaração, passar a narração pro próximo jogador ativo na ordem sorteada e virar um enigma novo; a rotação SHALL passar por todos antes de repetir alguém
2. WHEN alguém que não é o narrador da rodada tenta avançar THEN o sistema SHALL recusar
3. WHEN um enigma é usado THEN o sistema SHALL NOT sorteá-lo de novo enquanto houver enigmas no monte; quando o monte esvazia, SHALL reembaralhar os usados em vez de acabar a partida
4. WHEN o host encerra a partida a qualquer momento THEN o sistema SHALL ir pra tela final com o placar que está de pé
5. WHEN um jogador sai THEN o sistema SHALL: descartar o enigma e passar a narração se quem saiu narrava; cancelar uma declaração pendente dele; e cancelar a partida de volta pro lobby se os ativos caírem abaixo de 3

**Independent Test**: Numa mesa de 3, avançar três enigmas e conferir que cada pessoa narrou uma vez e que nenhum enigma repetiu.

---

### P5: O placar da partida

**User Story**: Como mesa, quero ver quem já desatou mais enigmas e quem levou a partida — porque metade da graça é a disputa.

**Why P5**: Decisão explícita do dono ("Ponto pra quem desata"), amparada por `AD-015`.

**Acceptance Criteria**:

1. WHEN a partida está em andamento THEN o sistema SHALL mostrar pra todos o placar dos jogadores da partida, ordenado do maior pro menor
2. WHEN o host configurou uma meta de pontos E alguém a atinge THEN o sistema SHALL encerrar a partida assim que a revelação daquele enigma sair da tela
3. WHEN a partida encerra THEN o sistema SHALL mostrar o placar final com o campeão em destaque; havendo empate no topo, SHALL mostrar todos os empatados sem desempatar
4. WHEN um enigma acaba sem ninguém desatar — porque o narrador entregou — THEN o sistema SHALL NOT dar ponto a ninguém
5. WHEN um jogador abre a sala já encerrada THEN o sistema SHALL mostrar a ele a mesma tela final, com placar e solução do último enigma à vista
6. WHEN o host configurou "sem meta" THEN o sistema SHALL NOT encerrar a partida sozinho — só o encerramento manual acaba

**Independent Test**: Partida com meta 2 — conferir que ela encerra sozinha assim que alguém chega a 2, e que entregar a solução não move o placar.

---

### P6: Conteúdo e configuração

**User Story**: Como host, quero escolher o tom dos enigmas e se a mesa vai escrever as perguntas ou só falar — porque a mesma turma não joga igual na sala da família e na madrugada.

**Why P6**: Mesmo padrão dos outros jogos do hub, e a metade "em voz alta" da decisão do dono sobre perguntas.

**Acceptance Criteria**:

1. WHEN o host abre a seleção de pacotes no lobby THEN o sistema SHALL mostrar ao menos um pacote de tom leve e um de tom pesado, com a descrição deixando o tom explícito
2. WHEN mais de um pacote é selecionado THEN o sistema SHALL juntar os enigmas num baralho só, sem repetir cena
3. WHEN um novo pacote é adicionado a `shared/enigmas-dados.ts` THEN o sistema SHALL passar a oferecê-lo no lobby sem nenhuma outra mudança de código; cada pacote sozinho SHALL bastar pra uma partida inteira; e o sistema SHALL recusar começar sem nenhum pacote selecionado
4. WHEN o modo é "em voz alta" THEN o sistema SHALL esconder o campo de pergunta escrita, SHALL recusar perguntas escritas, e SHALL registrar no histórico a batida do narrador — a resposta dada em voz alta, sem texto de pergunta

**Independent Test**: Abrir uma sala em modo voz e conferir que o campo de pergunta não existe e que os três botões do narrador escrevem a batida no histórico da mesa.

---

## Requirements Traceability

| ID | User Story | Source | Status |
| --- | --- | --- | --- |
| ENIG-01 | P1: Partida de enigmas | Specify | Verified |
| ENIG-02 | P1: Partida de enigmas | Specify | Verified |
| ENIG-03 | P1: Partida de enigmas | Specify | Verified |
| ENIG-04 | P1: Partida de enigmas | Specify | Verified |
| ENIG-05 | P1: Partida de enigmas | Specify | Verified |
| ENIG-06 | P1: Partida de enigmas | Specify | Verified |
| ENIG-07 | P1: Partida de enigmas | Specify | Verified |
| ENIG-08 | P2: Perguntar e responder | Specify | Verified |
| ENIG-09 | P2: Perguntar e responder | Specify | Verified |
| ENIG-10 | P2: Perguntar e responder | Specify | Verified |
| ENIG-11 | P2: Perguntar e responder | Specify | Verified |
| ENIG-12 | P2: Perguntar e responder | Specify | Verified |
| ENIG-13 | P2: Perguntar e responder | Specify | Verified |
| ENIG-14 | P3: Declarar, julgar e entregar | Specify | Verified |
| ENIG-15 | P3: Declarar, julgar e entregar | Specify | Verified |
| ENIG-16 | P3: Declarar, julgar e entregar | Specify | Verified |
| ENIG-17 | P3: Declarar, julgar e entregar | Specify | Verified |
| ENIG-18 | P3: Declarar, julgar e entregar | Specify | Verified |
| ENIG-19 | P4: A mesa segue | Specify | Verified |
| ENIG-20 | P4: A mesa segue | Specify | Verified |
| ENIG-21 | P4: A mesa segue | Specify | Verified |
| ENIG-22 | P4: A mesa segue | Specify | Verified |
| ENIG-23 | P4: A mesa segue | Specify | Verified |
| ENIG-24 | P5: O placar da partida | Specify | Verified |
| ENIG-25 | P5: O placar da partida | Specify | Verified |
| ENIG-26 | P5: O placar da partida | Specify | Verified |
| ENIG-27 | P5: O placar da partida | Specify | Verified |
| ENIG-28 | P5: O placar da partida | Specify | Verified |
| ENIG-29 | P5: O placar da partida | Specify | Verified |
| ENIG-30 | P6: Conteúdo e configuração | Specify | Verified |
| ENIG-31 | P6: Conteúdo e configuração | Specify | Verified |
| ENIG-32 | P6: Conteúdo e configuração | Specify | Verified |
| ENIG-33 | P6: Conteúdo e configuração | Specify | Verified |

**ID format:** `ENIG-[NUMBER]`, mapeado em ordem às ACs de P1 (01–07), P2 (08–13), P3 (14–18), P4 (19–23), P5 (24–29) e P6 (30–33) acima.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 33 total, 33 implementados — servidor coberto por 49 testes (regras e projeção) e o conteúdo por 9; o fluxo completo foi jogado numa mesa de 3 nos dois modos de pergunta, incluindo declaração certa, declaração errada, entrega da solução, rotação de narrador e encerramento.

---

## Success Criteria

- [x] Uma sala de 3+ jogadores completa uma partida do lobby até o placar final, pelos dois caminhos de encerramento (meta atingida e encerramento manual do host)
- [x] A solução e o texto de uma declaração pendente não trafegam pra quem não pode lê-los — verificado na projeção (`JSON.stringify` não contém o segredo) e no DOM ao vivo
- [x] O jogo entra no registro (`server/games/registro.ts`) sem que `core` conheça enigma nenhum
- [x] Zero regressão nos testes unitários e de integração existentes
