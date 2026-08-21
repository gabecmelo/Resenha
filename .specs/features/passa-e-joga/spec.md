# Passa e Joga Specification

## Problem Statement

Hoje toda partida do Resenha exige **um aparelho por pessoa**: o host cria a sala, manda o código, e cada um abre o link, escolhe apelido e entra. Numa mesa espalhada — gente em chamada de vídeo, gente em casa — isso é exatamente o certo, e é o que o produto faz bem.

Numa festa, é atrito puro. Oito pessoas entrando num link custa mais tempo do que a primeira rodada do jogo, e sempre tem alguém sem bateria, sem dados ou sem paciência. O jogo que ia começar em trinta segundos começa em cinco minutos, e às vezes não começa.

O **Passa e Joga** é o segundo caminho: um aparelho só, passando de mão em mão. Quem organiza abre o app, diz quem vai jogar e começa. Ninguém entra em link nenhum.

Quatro dos cinco jogos cabem nesse formato, porque o segredo deles é **pontual** — existe num instante da rodada, e um instante se resolve passando o aparelho. Cartas Contra a Turma fica de fora: lá cada jogador tem seis cartas privadas na mão o tempo inteiro, e passar o aparelho a cada jogada mataria o jogo.

## Goals

- [ ] Da tela inicial até a primeira carta na mesa **sem digitar código, sem link e sem rede**.
- [ ] Os quatro jogos rodam com **as mesmas regras** da sala multi-aparelho — o mesmo reducer, não uma segunda implementação.
- [ ] O que é segredo continua segredo: existe **uma** forma de passar o aparelho, e ela é a mesma nos quatro jogos.
- [ ] A partida sobrevive a um toque errado no botão de voltar ou a um recarregamento acidental.
- [ ] Adicionar um jogo novo ao Passa e Joga é escrever as telas dele, não reescrever a mecânica.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Cartas Contra a Turma | Mão privada de 6 cartas por jogador, o tempo todo. Passar o aparelho a cada jogada destrói o jogo. Se um dia couber, será com outra mecânica de mão, não com este modo. |
| Chat | A mesa está na mesma sala. O chat existe pra quem está longe. |
| Convite, código de sala, host, migração de host, reconexão | Não há sala. Nada disso tem sentido com um aparelho. |
| Entrar no meio pelo celular de outra pessoa | Quem chega depois entra na próxima partida, como já acontece. Mesclar os dois modos numa partida é outro produto. |
| Sincronizar a partida local com uma sala online | Idem. Um modo não vira o outro no meio. |
| Placar entre partidas | O placar é **da partida**, igual em todo o resto do produto (`AD-003`, `AD-015`). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde a partida roda | **No navegador**, sem sala e sem servidor. Os módulos de jogo saem de `server/games/` para `shared/jogos/` e passam a ser importados pelos dois lados. | Decisão do dono. As regras já são funções puras com `Ambiente` injetado — morar em `server/` era convenção, não necessidade. Sem rede o modo abre instantâneo e funciona no fundo do bar sem sinal. | y |
| Onde fica a entrada | Botão próprio **abaixo de "Criar uma sala"**, com `(?)` de dica, e página indexável própria. Não é um modo dentro da criação de sala. | Decisão do dono, com recomendação minha: sem código, link, host, chat nem limite de pessoas, metade do formulário de criação viraria campo morto. | y |
| Quem Sou Eu na vez | **Telefone virado pra mesa**: a carta aparece em letra grande pra quem está em volta, e nada pra quem está com o aparelho. | Decisão do dono. É literalmente o jogo físico, e evita uma tela de passagem por pergunta. | y |
| Escopo da primeira entrega | Os quatro jogos de uma vez. | Decisão do dono. | y |
| Como um segredo passa de mão | Uma **tela de passagem** única: "Passe pra Bruno" → toque de quem recebeu → conteúdo → "Pronto, passe adiante". Mesma tela nos quatro jogos. | Um único gesto pra aprender. Se cada jogo inventasse o seu, a mesa erraria o gesto justo no momento em que o erro custa o segredo. | n (padrão meu) |
| Quem são os jogadores | Uma lista de nomes digitada antes de começar ("Quem vai jogar?"), mínimo o do jogo, máximo 12. | Sem apelido não há como dizer "passe pro Bruno". 12 porque acima disso a fila de passagem fica mais longa que a rodada. | n (padrão meu) |
| Cor de cada jogador | Sorteada na criação da mesa, sem escolha. | Cor aqui serve pra distinguir a ficha na tela, não pra se identificar de longe: o dono do nome está do lado. Escolher cor seria mais um passo antes de jogar. | n (padrão meu) |
| Configurações que sobrevivem | Pacotes, dificuldade, meta de pontos, tempos, número de espiões, e tudo que descreve **o jogo**. | São as mesmas decisões de sempre; o aparelho não muda nenhuma delas. | n (padrão meu) |
| Configurações que somem | Ordem de turnos por dispositivo, limite de jogadores da sala, voto secreto/aberto do Dedo na Cara, visibilidade de voto do Espião. | Descrevem coordenação entre aparelhos. Num aparelho só, "voto secreto" é a tela de passagem, e a ordem de turnos é a ordem em que o aparelho circula. | n (padrão meu) |
| Persistência | A partida inteira mora no `localStorage` e é recuperada ao reabrir. | Um toque errado no "voltar" numa festa não pode custar a partida. Não há servidor pra guardar isso por nós. | n (padrão meu) |
| Ordem dos nomes | A mesa digita **na ordem da roda**, e essa é a ordem de passagem do aparelho. | Decisão do dono: nas voltas de revelação o aparelho só anda de vizinho pra vizinho, em vez de atravessar a mesa. | y |
| Quando o aparelho circula | Só nas voltas de segredo (revelar papel, escrever carta, votar). Com o relógio correndo, o aparelho fica parado na mesa. | Decisão do dono: durante o jogo qualquer um pergunta a qualquer um, perto ou longe — quem anda é a pergunta, em voz alta, não o aparelho. | y |
| Começo do Espião | Volta de revelação → tela de "todos prontos?" → toque em começar → relógio + anúncio de quem começa perguntando. | Fluxo descrito pelo dono. O relógio não pode começar a correr enquanto o aparelho ainda está dando a volta. | y |
| Sorteios (quem escreve pra quem, quem começa) | Sorteados pelo motor, anunciados na tela, sem escolha manual. | Foi o que o dono descreveu. Escolher manualmente é uma decisão a mais antes de jogar, e o sorteio é justamente o que ninguém quer fazer de cabeça. | n (padrão meu) |

**Open questions:** nenhuma bloqueante. Os padrões marcados "n" são escolhas minhas registradas aqui pra que uma mudança de opinião do dono vire alteração de requisito, não conversa perdida.

---

## User Stories & Acceptance Criteria

### P1: A porta de entrada

**User Story**: Como quem organiza a festa, quero abrir o app e começar um jogo no meu celular sem que ninguém precise entrar em link nenhum — porque a mesa já está aqui, do meu lado.

**Why P1**: Se a entrada não for óbvia, o modo não existe. É a única parte que compete com o caminho que já funciona.

**Acceptance Criteria**:

1. WHEN alguém abre a tela inicial THEN o sistema SHALL oferecer o Passa e Joga como segunda ação, abaixo de "Criar uma sala", nomeada de forma autoexplicativa ("Jogar num celular só")
2. WHEN a pessoa toca no `(?)` ao lado dessa ação THEN o sistema SHALL explicar em uma frase o que muda: um aparelho só, passando de mão em mão, sem link e sem código
3. WHEN o Passa e Joga abre THEN o sistema SHALL listar apenas os jogos que funcionam num aparelho só, e SHALL deixar claro por que os outros não estão ali
4. WHEN um jogo novo passar a suportar o modo THEN o sistema SHALL passar a listá-lo sem mudança nas telas do modo — a lista vem do catálogo
5. WHEN o Passa e Joga está aberto THEN o sistema SHALL ter um endereço próprio, indexável, descrevendo o modo

### P2: A mesa

**User Story**: Como quem organiza, quero dizer quem está jogando e como o jogo vai ser, e nada além disso — porque a mesa está esperando.

**Why P2**: É a única configuração que existe. Cada campo a mais aqui é meio minuto de festa parada.

**Acceptance Criteria**:

6. WHEN a pessoa escolhe um jogo THEN o sistema SHALL pedir os nomes de quem vai jogar, aceitando de N (o mínimo daquele jogo) a 12 jogadores
7. WHEN o sistema pede os nomes THEN o sistema SHALL orientar a mesa a digitá-los **na ordem da roda**, e SHALL usar essa ordem como a ordem de passagem — assim, nas voltas em que o aparelho circula, ele só anda de vizinho pra vizinho
8. WHEN a lista de nomes tem menos que o mínimo do jogo, ou tem nome repetido ou vazio THEN o sistema SHALL impedir o começo e dizer o que falta
9. WHEN a mesa está montada THEN o sistema SHALL oferecer as configurações **daquele jogo** que fazem sentido num aparelho (pacotes, dificuldade, meta, tempos, nº de espiões) e SHALL omitir as que descrevem coordenação entre aparelhos
10. WHEN a partida começa THEN o sistema SHALL sortear as cores dos jogadores e a ordem de circulação do aparelho, sem pedir nada disso a ninguém

### P3: O motor local

**User Story**: Como jogador, quero que o jogo seja o mesmo jogo — porque a regra que valeu na sala online tem que valer na festa.

**Why P3**: É o requisito que impede o modo de virar um segundo produto com as mesmas capas. Duas implementações da mesma regra divergem na primeira correção.

**Acceptance Criteria**:

11. WHEN uma partida do Passa e Joga roda THEN o sistema SHALL usar exatamente os mesmos `iniciarRodada`, `reduzir` e `projetar` que a sala online usa, sem reimplementar regra nenhuma no cliente
12. WHEN o motor local aplica o resultado de um comando THEN o sistema SHALL respeitar `faseSeguinte`, `prazos`, `eventos` e `promoverAguardando` com o mesmo significado que o servidor lhes dá
13. WHEN um comando é recusado pelo reducer THEN o sistema SHALL manter o estado anterior e dizer à mesa o que aconteceu, sem travar a partida
14. WHEN o jogo agenda um prazo THEN o sistema SHALL fazer o tempo correr no próprio aparelho e SHALL disparar o vencimento uma única vez, mesmo com a tela apagada e reaberta
15. WHEN o aparelho está sem internet THEN o sistema SHALL permitir jogar uma partida inteira do começo ao fim
16. WHEN o motor precisa da projeção de um jogador THEN o sistema SHALL projetar **para aquele jogador** e mostrar só isso na tela, do mesmo jeito que o servidor faria (`AD-008`)

### P4: A tela de passagem

**User Story**: Como jogador, quero receber o aparelho sabendo que o que é meu só eu vi — porque num aparelho só, quem protege o segredo é a tela.

**Why P4**: É o coração do modo. Sem isso, Espião e Quem Sou Eu não existem em um aparelho.

**Acceptance Criteria**:

17. WHEN o jogo precisa mostrar algo secreto a um jogador THEN o sistema SHALL exibir primeiro uma tela de passagem nomeando **quem** deve estar com o aparelho, sem nada do conteúdo à vista
18. WHEN quem recebeu confirma que está com o aparelho THEN o sistema SHALL revelar o conteúdo secreto e SHALL oferecer um único caminho adiante: esconder e passar
19. WHEN o conteúdo secreto é dispensado THEN o sistema SHALL voltar imediatamente à tela de passagem do próximo jogador, sem deixar o conteúdo anterior visível em nenhum quadro intermediário
20. WHEN o aplicativo é recarregado com um segredo à vista THEN o sistema SHALL reabrir na tela de passagem daquele jogador, nunca no conteúdo revelado
21. WHEN a rodada não tem segredo nenhum (Dedo na Cara, e os Enigmas depois da cena aberta) THEN o sistema SHALL manter o aparelho numa tela só, sem passagem obrigatória

### P5: Os quatro jogos

**User Story**: Como jogador, quero que cada jogo se comporte como ele é, e não como uma versão espremida dele — porque a adaptação boa é a que ninguém percebe.

**Why P5**: Cada jogo perde uma coisa diferente ao virar aparelho único. Genérico demais, todos ficam piores.

**Acceptance Criteria**:

22. WHEN a mesa joga **Dedo na Cara** THEN o sistema SHALL mostrar a carta pra mesa inteira numa tela só, SHALL contar até apontar, e SHALL registrar quem levou a carta por toque de quem está com o aparelho — nunca decidindo sozinho quem merecia (`AD-003`)
23. WHEN a mesa joga **Enigmas Sinistros** THEN o sistema SHALL manter o aparelho com quem narra, mostrando cena e solução, e SHALL registrar as respostas — o mesmo desenho do modo "só em voz alta" que já existe
24. WHEN o narrador dos Enigmas muda THEN o sistema SHALL usar a tela de passagem pra entregar o aparelho ao próximo narrador antes de revelar a solução nova
25. WHEN a mesa joga **Espião** THEN o sistema SHALL fazer uma volta de revelação na ordem da roda: para cada jogador, uma tela com o nome dele e um único botão "revelar" → o papel (o nome do lugar, ou "você é o espião") → "esconder e passar" → o próximo
26. WHEN o último jogador esconde o papel THEN o sistema SHALL parar numa tela de "todos prontos?" com um único botão de começar, e SHALL iniciar o relógio só quando alguém tocar nele
27. WHEN o relógio começa THEN o sistema SHALL anunciar quem começa perguntando, e a partir daí SHALL deixar o aparelho parado na mesa como relógio e painel — as perguntas correm em voz alta entre quaisquer dois jogadores, perto ou longe, sem o aparelho sair do lugar
28. WHEN a votação do Espião acontece THEN o sistema SHALL registrar o voto de cada jogador por toque no aparelho, uma pessoa de cada vez, com a mesma tela de passagem
29. WHEN a mesa joga **Quem Sou Eu?** THEN o sistema SHALL sortear quem escreve a carta de quem e SHALL usar a tela de passagem pra que cada um escreva a sua sem ninguém ver
30. WHEN chega a vez de alguém no Quem Sou Eu THEN o sistema SHALL exibir a carta em letra grande, pensada pra ser lida pela mesa com o aparelho virado, e SHALL manter escondido dela tudo que a entregaria
31. WHEN um jogo exige um mínimo de jogadores THEN o sistema SHALL cobrar o mesmo mínimo que a sala online cobra

### P6: O que sobrevive e o que acaba

**User Story**: Como quem organiza, quero poder mexer no celular sem medo de perder a partida — e quero encerrar quando a mesa cansar.

**Why P6**: Numa festa o aparelho cai, apaga, recebe ligação e volta. A partida não pode morrer por isso.

**Acceptance Criteria**:

32. WHEN a partida está em andamento e o aplicativo é fechado ou recarregado THEN o sistema SHALL reabrir na mesma partida, no mesmo ponto, respeitando `PJ-20`
33. WHEN a mesa quer parar THEN o sistema SHALL permitir encerrar a partida e mostrar o placar final, e SHALL pedir confirmação antes, porque não há volta
34. WHEN a partida termina THEN o sistema SHALL oferecer jogar de novo com a mesma mesa, sem redigitar nome nenhum
35. WHEN a pessoa sai do Passa e Joga com uma partida em andamento THEN o sistema SHALL avisar que a partida será perdida antes de descartá-la

---

## Requirements Traceability

| Requirement ID | User Story | Phase | Status |
| --- | --- | --- | --- |
| PJ-01 | P1: A porta de entrada | Tasks | In Tasks |
| PJ-02 | P1: A porta de entrada | Tasks | In Tasks |
| PJ-03 | P1: A porta de entrada | Tasks | In Tasks |
| PJ-04 | P1: A porta de entrada | Tasks | In Tasks |
| PJ-05 | P1: A porta de entrada | Tasks | In Tasks |
| PJ-06 | P2: A mesa | Tasks | In Tasks |
| PJ-07 | P2: A mesa | Tasks | In Tasks |
| PJ-08 | P2: A mesa | Tasks | In Tasks |
| PJ-09 | P2: A mesa | Tasks | In Tasks |
| PJ-10 | P2: A mesa | Tasks | In Tasks |
| PJ-11 | P3: O motor local | Tasks | In Tasks |
| PJ-12 | P3: O motor local | Tasks | In Tasks |
| PJ-13 | P3: O motor local | Tasks | In Tasks |
| PJ-14 | P3: O motor local | Tasks | In Tasks |
| PJ-15 | P3: O motor local | Tasks | In Tasks |
| PJ-16 | P3: O motor local | Tasks | In Tasks |
| PJ-17 | P4: A tela de passagem | Tasks | In Tasks |
| PJ-18 | P4: A tela de passagem | Tasks | In Tasks |
| PJ-19 | P4: A tela de passagem | Tasks | In Tasks |
| PJ-20 | P4: A tela de passagem | Tasks | In Tasks |
| PJ-21 | P4: A tela de passagem | Tasks | In Tasks |
| PJ-22 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-23 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-24 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-25 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-26 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-27 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-28 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-29 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-30 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-31 | P5: Os quatro jogos | Tasks | In Tasks |
| PJ-32 | P6: O que sobrevive e o que acaba | Tasks | In Tasks |
| PJ-33 | P6: O que sobrevive e o que acaba | Tasks | In Tasks |
| PJ-34 | P6: O que sobrevive e o que acaba | Tasks | In Tasks |
| PJ-35 | P6: O que sobrevive e o que acaba | Tasks | In Tasks |

**ID format:** `PJ-[NUMBER]`, mapeado em ordem às ACs de P1 (01–05), P2 (06–10), P3 (11–16), P4 (17–21), P5 (22–31), P6 (32–35) acima.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

---

## Notas de arquitetura para o Design

Três pontos que a implementação vai enfrentar, registrados aqui pra que a decisão seja tomada de propósito e não no meio de um arquivo:

**1. Os módulos de jogo mudam de casa.** `server/games/*/{regras,projecao,index}.ts` são funções puras que só importam de `shared/`. Passam para `shared/jogos/`, e `server/games/registro.ts` continua sendo o único lugar que nomeia jogos concretos (`AD-013`). O `core` continua sem importar jogo nenhum. É movimentação de arquivo com atualização de import — nenhuma regra muda de comportamento, e a suíte inteira serve de rede.

**2. O motor local não pode reimplementar o `core`.** Aplicar um `ResultadoReducer` (fase seguinte, prazos, eventos, promover quem aguarda) é lógica do `core`, e ela existe hoje dentro do Durable Object. O motor local precisa da mesma coisa. A saída boa é extrair essa aplicação para uma função pura compartilhada, usada pelos dois; a saída ruim é copiar. Se a extração se mostrar cara, o Design deve dizer por quê antes de duplicar uma linha.

**3. Prazo sem alarme.** No servidor, `reagendar` é o único caminho autorizado pro `setAlarm` (`AD-010`). No navegador não há alarme: o motor local marca o instante e compara com o relógio quando a tela acorda, disparando `venceuPrazoTurno` uma vez só. Aba em segundo plano não recebe `setTimeout` confiável — o vencimento tem que ser derivado do relógio, nunca contado por temporizador.
