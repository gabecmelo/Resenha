# Espião Specification

## Problem Statement

O Resenha é um hub de party games; "Quem Sou Eu?" é o primeiro jogo, e o hub de seleção (`hub-selecao-jogos`, concluído) já está pronto pra receber um segundo jogo pelo registro (`AD-013`). O Espião (Spyfall) é esse segundo jogo: um local secreto é sorteado e visto por todos os jogadores, exceto o(s) espião(ões), que tentam descobrir o local através das perguntas dos outros sem se denunciar — enquanto o resto do grupo tenta identificar quem é o espião.

## Goals

- [ ] Uma sala consegue jogar uma rodada completa de Espião do início (lobby, configuração) ao fim (revelação de local e espiões), com 3+ jogadores.
- [ ] O jogo entra no hub só por registro (`server/games/registro.ts`), sem tocar `core/despacho.ts` nem `core/sala-do.ts` além do que `AD-013` já generalizou.

## Out of Scope

| Feature | Reason |
| --- | --- |
| ~~Espião "chuta" o local pra vencer na hora~~ | **Entrou em P7 (`ESP-44`, `ESP-45`)**, numa forma mais fechada que a original: o chute não é um botão disponível a qualquer hora, é a última cartada de quem foi pego pela votação. |
| Papel/profissão além do local (ex.: "você é o médico do hospital") | Confirmado: v1 só tem o local, sem papéis. |
| Estatísticas, placar entre partidas, ranking | Mesma decisão de `AD-003` — o sistema é tabuleiro, não árbitro; vale pra todos os jogos do hub. |
| Múltiplos pacotes temáticos de locais completos (Natureza, Assustador, Cidade, Antiguidade...) | MVP entra com pelo menos um pacote jogável; os demais temas são conteúdo incremental, mesmo padrão das rodadas de conteúdo que já expandiram os pacotes de "Quem Sou Eu" (`pacotes-avancados`). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| `Config` de sala hoje é 100% moldado em cima de "Quem Sou Eu" (`ordemTurnos`, `pacoteIds`, `dificuldades`, `modoDistribuicao`) e é compartilhado por toda sala, independente do jogo (`shared/protocolo.ts`). Espião precisa de campos de configuração próprios (nº de espiões, espiões se veem, visibilidade do voto, tempo de rodada) que não fazem sentido pra "Quem Sou Eu". | Resolver na fase de Design — provável nova decisão de arquitetura (`AD-014`), não decidida aqui. | É exatamente o momento que `AD-011`/`AD-012` já previam ("reavaliar quando o segundo jogo chegar"); a fase de Specify capta o requisito, não a forma de implementar. | n (deferido pro Design) |
| `MIN_JOGADORES` hoje é uma constante única e compartilhada (`shared/protocolo.ts`, valor 2) usada por "Quem Sou Eu". Espião precisa de mínimo 3. | Resolver na fase de Design junto com o item acima — mesma tensão, mesma origem. | Mínimo de jogadores é regra de jogo (quantas perguntas cabem, quão fácil é achar o espião), não do `core`. | n (deferido pro Design) |
| Empate na votação (dois ou mais jogadores empatados em 1º lugar) ou maioria em "pular" | Tratado como "não acertou" — a votação fecha sem terminar a partida, o jogo continua. | Único critério de sucesso claro e sem ambiguidade: só termina a partida quando UM jogador tem maioria absoluta de votos E é de fato espião. | y |
| Validação do nº de espiões configurado pelo host | Deve deixar pelo menos 2 jogadores ativos não-espiões (`espiões ≤ ativos - 2`) | Sem isso a votação não tem sentido (não sobra "grupo" pra investigar) e o mínimo de 3 jogadores já é curto. | y |
| Jogador que sai da sala durante uma rodada de Espião | Mesmo padrão de "Quem Sou Eu": se os ativos restantes caem abaixo do mínimo (3), a partida é cancelada e a sala volta ao lobby. Se o espiao que saiu era o único e ainda sobram ativos suficientes, a partida segue sem revalidar o nº configurado de espiões (não redistribui papéis no meio da rodada — mesma filosofia de `JOGO-10`, a carta/atribuição de quem sai simplesmente some). | Consistência com o padrão já estabelecido em "Quem Sou Eu" pra saída de jogador em partida — evita reinventar uma regra nova sem necessidade. | y |
| Tempo de rodada (`tempoTurnoSeg`-equivalente) — padrão e faixa configurável | Padrão 5 minutos (300s); faixa de configuração a definir no Design (provavelmente reaproveita `TEMPO_TURNO_MIN_SEG`/`TEMPO_TURNO_MAX_SEG` como ponto de partida). | Único valor numérico confirmado explicitamente pelo dono nesta conversa. | y |
| Visibilidade do voto (oculta até todos votarem vs. tempo real) | Configurável pelo host; padrão = oculta até todos votarem (ou o host encerrar a votação manualmente). | Dono confirmou que é configurável; o padrão "oculto" evita voto em cadeia (todo mundo esperando ver no que os outros votam antes de decidir) — mesmo raciocínio já usado em jogos de dedução social. | y |

**Open questions:** nenhuma sem resposta — as duas primeiras linhas acima são deliberadamente deferidas pro Design (não são ambiguidade de requisito, são decisão de arquitetura).

---

## User Stories

### P1: Jogar uma rodada completa de Espião ⭐ MVP

**User Story**: Como host, quero configurar e iniciar uma partida de Espião na minha sala, e como jogador, quero receber o local (ou saber que sou espião), fazer perguntas livremente, votar em quem acho que é o espião, e ver o resultado — pra jogar uma rodada completa do início ao fim.

**Why P1**: Sem isso não existe o jogo. É o núcleo que já cobre a promessa do roadmap ("Espião jogável").

**Acceptance Criteria**:

1. WHEN o host está no lobby de uma sala com jogo Espião THEN o sistema SHALL permitir configurar: nº de espiões (padrão 1), pacote(s) de locais, tempo de rodada (padrão 5 min)
2. WHEN o host clica "Começar" com um nº de espiões configurado que não deixa ao menos 2 jogadores ativos não-espiões THEN o sistema SHALL recusar com o mesmo erro de jogadores insuficientes (validado no início da rodada, não na configuração — número de jogadores ativos muda enquanto a sala está no lobby, então validar só na configuração ficaria obsoleto; decisão de precisão tomada no Design, mesmo padrão que `JOGADORES_INSUFICIENTES` já usa para o total de jogadores)
3. WHEN o host clica "Começar" com menos de 3 jogadores ativos THEN o sistema SHALL recusar com o mesmo erro de jogadores insuficientes já usado em "Quem Sou Eu"
4. WHEN o host clica "Começar" com jogadores e configuração válidos THEN o sistema SHALL sortear: um local dentre o(s) pacote(s) selecionados, quais jogadores são espiões (respeitando o nº configurado), e quem "começa perguntando"
5. WHEN a rodada começa THEN o sistema SHALL mostrar uma tela informando quem começa perguntando, com um botão PRONTO por jogador
6. WHEN todos os jogadores ativos marcam PRONTO THEN o sistema SHALL liberar o timer da rodada e trocar pra tela padrão do jogo (local ou "você é espião", bloco de notas, botão de dica de pergunta)
7. WHEN um jogador não-espião abre sua projeção durante a rodada THEN o sistema SHALL mostrar o local secreto
8. WHEN um jogador espião abre sua projeção durante a rodada THEN o sistema SHALL mostrar que ele é espião, sem revelar o local
9. WHEN qualquer jogador ativo aciona "abrir votação" durante a fase de jogo THEN o sistema SHALL abrir a fase de votação pra todos
10. WHEN o timer da rodada esgota sem ninguém ter aberto votação THEN o sistema SHALL abrir a votação automaticamente
11. WHEN a votação está aberta THEN o sistema SHALL permitir que cada jogador ativo vote em um único jogador (qualquer um, inclusive outro espião) ou "pular", uma vez por votação
12. WHEN todos os jogadores ativos votaram, OU o host encerra a votação manualmente THEN o sistema SHALL fechar a votação e revelar o resultado (contagem de votos) pra todos
13. ~~WHEN a votação fecha com um único jogador tendo maioria absoluta de votos E esse jogador é de fato espião THEN o sistema SHALL encerrar a partida, revelando o local e todos os espiões~~ — **substituído por P7 (`ESP-41`…`ESP-45`)**: a maioria passou a ser simples, e acertar o espião abre o chute em vez de encerrar direto
14. ~~WHEN a votação fecha sem essa condição (empate, maioria errada, ou maioria em "pular") THEN o sistema SHALL manter a partida em andamento, reabrindo o timer da rodada~~ — **substituído por P7 (`ESP-40`…`ESP-43`)**: só empate e "pular" devolvem a rodada, e ela volta com o tempo congelado em vez de reaberto
15. WHEN o host encerra a partida manualmente a qualquer momento da fase de jogo THEN o sistema SHALL revelar o local e todos os espiões, encerrando a partida
16. WHEN a partida está encerrada THEN o sistema SHALL mostrar a tela de revelação (local + quem eram os espiões) pra todos os jogadores, inclusive quem entrou depois de encerrada

**Independent Test**: Criar uma sala com Espião, 3 jogadores, 1 espião configurado; completar uma rodada até a revelação final por dois caminhos — votação certeira e encerramento manual do host — e conferir que o local e os espiões aparecem certos nos dois casos.

---

### P2: Ajustes de configuração e qualidade de vida

**User Story**: Como host, quero ajustar detalhes de como a rodada se comporta (espiões se veem, visibilidade do voto), e como jogador, quero uma dica de pergunta pra travar menos e um bloco de notas privado — pra jogar rodadas melhor calibradas pro meu grupo.

**Why P2**: Não bloqueia a primeira partida jogável, mas é o que o dono já descreveu como parte do desenho original do jogo.

**Acceptance Criteria**:

1. WHEN há 2+ espiões numa rodada E o host configurou "espiões se veem" (padrão: sim) THEN o sistema SHALL mostrar a cada espião quem são os outros espiões da mesma partida
2. WHEN há 2+ espiões numa rodada E o host configurou "espiões não se veem" THEN o sistema SHALL mostrar a cada espião apenas que ele mesmo é espião
3. WHEN o host configura a visibilidade do voto como "tempo real" THEN o sistema SHALL mostrar a contagem de votos atualizando conforme cada jogador vota, em vez de ocultar até o fim
4. WHEN um jogador clica no botão de dica de pergunta durante a fase de jogo THEN o sistema SHALL mostrar uma pergunta genérica sorteada de uma lista fixa embutida (não ligada ao local, mantendo `AD-003`)
5. WHEN um jogador escreve no bloco de notas durante a rodada THEN o sistema SHALL persistir a nota, privada pra ele, no mesmo padrão de `NOTA-*` de "Quem Sou Eu"

**Independent Test**: Rodada com 2 espiões e "espiões se veem" ligado — confirmar que cada espião vê o outro; desligar a config e confirmar que não vê mais. Clicar dica de pergunta e ver uma pergunta aparecer.

---

### P3: Conteúdo — pacotes temáticos de locais

**User Story**: Como jogador, quero variedade de temas de locais (não só um pacote fixo), pra rodadas não ficarem repetitivas.

**Why P3**: Conteúdo incremental — o mesmo padrão que "Quem Sou Eu" já seguiu (pacote inicial → rodada de conteúdo expandindo pra mais pacotes depois).

**Acceptance Criteria**:

1. WHEN o host abre a seleção de pacotes de locais no lobby de Espião THEN o sistema SHALL mostrar ao menos um pacote temático jogável, num formato que aceita novos pacotes sem mudança de código (só conteúdo em `shared/locais-dados.ts`) — a expansão para vários temas (Natureza, Assustador, Cidade...) é rodada de conteúdo incremental, conforme a tabela de Out of Scope acima

---

### P4: Acertos de UX levantados no review

**User Story**: Como jogador, quero que o lobby e a entrada digam a verdade sobre o que vai acontecer, pra não clicar em algo que o servidor recusa depois.

**Why P4**: Regras combinadas em conversa que não chegaram ao código na primeira rodada — ficaram fora do spec e por isso nenhum gate as protegia. Ficam aqui pra que uma regressão futura seja pega.

**Acceptance Criteria**:

1. WHEN o host escolhe `numEspioes: 'auto'` (padrão) E a rodada inicia THEN o sistema SHALL sortear 1 espião com até 6 jogadores ativos e 2 a partir de 7, resolvido no início da rodada contra o número de ativos — e um número fixo escolhido pelo host SHALL vencer o automático
2. WHEN o lobby mostra o mínimo de jogadores ou o motivo de espera THEN o sistema SHALL usar o mínimo do jogo da sala (`minJogadores` do catálogo, 3 no Espião) e não o mínimo global do produto, de modo que o botão nunca ofereça iniciar uma partida que o servidor recusaria
3. WHEN alguém abre a tela de entrada por link de convite THEN o sistema SHALL omitir o seletor de jogo — o jogo é do host e quem entra não escolhe nada
4. WHEN um jogador entra na fase de jogo, a votação abre, o tempo entra na reta final ou a partida é revelada THEN o sistema SHALL dar retorno sonoro, no mesmo padrão de `FBK-*` de "Quem Sou Eu"

**Independent Test**: Lobby de Espião com 1 pessoa mostra "Precisa de pelo menos 3 pessoas"; trocar o jogo pra "Quem Sou Eu" volta pra 2. Abrir `/CODIGO` direto não mostra "Escolha o jogo". Mesa de 7 com "Auto" sorteia 2 espiões.

---

### P5: A votação vira um momento da mesa (estilo Among Us)

**User Story**: Como jogador, quero que abrir a votação pare a rodada, dê um tempo fechado pra todo mundo decidir e depois **revele quem votou em quem e o veredito**, pra que a acusação seja um momento coletivo e não um clique que some sem resposta.

**Why P5**: Fechar a votação hoje devolve a mesa direto pra rodada sem contar o que aconteceu — quem não estava olhando a tela não fica sabendo nem quem foi acusado. A revelação também não conseguia dizer se a mesa acertou, porque o resultado não sobrevivia na projeção.

**Acceptance Criteria**:

1. WHEN alguém abre a votação THEN o sistema SHALL registrar quem abriu e SHALL mostrar isso a toda a mesa — quando a votação abre sozinha pelo fim do relógio da rodada, SHALL registrar que foi o relógio, sem atribuir a ninguém
2. WHEN a votação abre THEN o sistema SHALL iniciar um relógio próprio de votação, com a duração de `config.espiao.tempoVotacaoSeg` (padrão 60s), e SHALL fechar a votação sozinho quando ele vencer — sem depender de ninguém apertar nada
3. WHEN todos os jogadores ativos conectados já votaram THEN o sistema SHALL fechar a votação na hora, sem esperar o relógio vencer
4. WHEN a votação fecha THEN o sistema SHALL revelar a toda a mesa **quem votou em quem**, inclusive quando `visibilidadeVoto` é `'oculta'` — o sigilo vale enquanto a votação corre, não depois dela
5. WHEN a votação fecha THEN o sistema SHALL informar, junto dos votos, quem foi acusado (se alguém alcançou maioria absoluta dos ativos), quantos votos essa pessoa teve, quantos eram necessários, e se a mesa acertou — sendo "acertou" a acusação com maioria em cima de alguém que era de fato espião, **contando o voto do próprio espião**
6. WHEN a votação fecha sem acertar THEN o sistema SHALL manter o resultado visível por uma janela curta e SHALL voltar a rodada a correr quando ela vencer, retomando o relógio da rodada do zero
7. WHEN a votação fecha acertando THEN o sistema SHALL encerrar a partida e SHALL manter o resultado da votação disponível na revelação, para que ela mostre o veredito e o mapa de votos
8. WHEN a partida é encerrada pelo host sem uma votação decisiva THEN o sistema SHALL revelar local e espiões sem veredito nenhum — não houve aposta coletiva a julgar

**Independent Test**: Mesa de 3, um espião. Abrir a votação → todo mundo vê "Fulano abriu a votação" e um relógio de 60s. Dois votam no espião → a votação fecha na hora, a mesa vê o mapa de votos e "a mesa acertou", e a partida termina mostrando o mesmo veredito na revelação. Repetir votando em quem não é espião → o resultado aparece, some sozinho e a rodada volta a correr.

---

### P6: Pausar a rodada

**User Story**: Como quem comanda a mesa, quero pausar a rodada quando a resenha para (alguém foi buscar bebida, chegou gente), pra que o relógio não corra contra ninguém enquanto ninguém está jogando.

**Why P6**: O relógio da rodada é o que empurra a partida. Sem pausa, a única saída de uma interrupção real é encerrar a partida.

**Acceptance Criteria**:

1. WHEN o host pausa a rodada THEN o sistema SHALL congelar o tempo restante e SHALL informar a toda a mesa que a rodada está pausada e por quem
2. WHEN o host retoma a rodada THEN o sistema SHALL voltar a contar exatamente do tempo que restava, e não do tempo cheio
3. WHEN a rodada está pausada THEN o sistema SHALL recusar abrir votação, votar e qualquer outra ação de rodada — pausado é pausado pra todo mundo, inclusive o host
4. WHEN alguém que não é host tenta pausar ou retomar THEN o sistema SHALL recusar com `SEM_AUTORIDADE`, e a ação SHALL NOT existir na tela dessa pessoa (`VIS-04`)
5. WHEN a rodada não tem relógio (`tempoRodadaSeg: null`) THEN o sistema SHALL ainda assim aceitar a pausa, que continua valendo como "a mesa parou" para as demais ações

**Independent Test**: Host pausa com 3:20 no relógio, espera 30s reais e retoma — o relógio volta em 3:20, não em 2:50 nem em 5:00. Com a rodada pausada, "Abrir votação" recusa.

---

### P7: A votação decide a partida ⭐

**User Story**: Como mesa, quero que abrir a votação tenha peso de verdade — que a acusação decida quem ganha, que o espião pego ainda tenha uma cartada, e que o relógio da rodada seja um teto e não um botão de reset.

**Why P7**: Rodada de calibragem depois de jogar de verdade. O desenho original ("só termina quando UM jogador tem maioria absoluta E é espião, senão a rodada continua") tornava a votação quase inconsequente: o relógio reiniciava a cada votação perdida e a partida não acabava nunca. As regras abaixo **substituem** `ESP-13` e `ESP-14`.

**Acceptance Criteria**:

1. WHEN uma votação abre THEN o sistema SHALL congelar o tempo que faltava da rodada e, quando a rodada voltar a correr, devolvê-lo exatamente — o tempo de rodada é o **teto da partida**, não um relógio que reinicia a cada votação
2. WHEN uma votação fecha THEN o sistema SHALL acusar quem recebeu **estritamente mais votos que qualquer outra opção**, sem exigir maioria absoluta — um único voto basta se ninguém mais recebeu nenhum
3. WHEN a votação fecha com dois ou mais alvos empatados no topo, OU com "pular" recebendo estritamente mais votos que qualquer jogador THEN o sistema SHALL não acusar ninguém e devolver a rodada com o tempo congelado
4. WHEN a votação acusa alguém que **não** é espião THEN o sistema SHALL encerrar a partida com vitória dos espiões
5. WHEN a votação acusa alguém que **é** espião THEN o sistema SHALL abrir a fase de chute: só o espião acusado age, escolhendo um local dentre os do pool da partida
6. WHEN o espião acusado acerta o local THEN o sistema SHALL encerrar a partida com vitória dos espiões
7. WHEN o espião acusado erra o local, OU deixa o prazo do chute vencer sem escolher THEN o sistema SHALL encerrar a partida com vitória da mesa
8. WHEN o host configura o limite de votações THEN o sistema SHALL permitir 1, 2, 3 ou ilimitado (padrão 2), contando apenas as votações **abertas pela mesa**
9. WHEN o limite de votações se esgota THEN o sistema SHALL recusar novas aberturas e a tela SHALL dizer o motivo, sem esconder o botão
10. WHEN o relógio da rodada vence THEN o sistema SHALL abrir a **votação final** — ela não consome o limite de `ESP-47` e é a última votação da partida
11. WHEN a votação final fecha sem acusar ninguém THEN o sistema SHALL encerrar a partida com vitória dos espiões: o tempo acabou e a mesa não achou ninguém
12. WHEN a partida encerra por qualquer um destes caminhos THEN a revelação SHALL dizer **quem venceu e por quê**, além do local e dos espiões, incluindo o chute quando houve

**Independent Test**: Mesa de 3 com 1 espião. (a) Abrir votação, 1 voto num aldeão e 2 pulos — ninguém acusado, a rodada volta com o relógio de onde parou, não do começo. (b) Abrir votação, 1 voto no aldeão e nada mais — ele é expulso e os espiões vencem. (c) Acusar o espião, ele chuta o local certo — espiões vencem; repetir com chute errado — a mesa vence.

---

## Edge Cases

- WHEN um jogador sai da sala durante a fase de "aguardando prontos" ou "jogo" e os ativos restantes ficam abaixo de 3 THEN o sistema SHALL cancelar a partida e voltar a sala ao lobby (mesmo padrão de "Quem Sou Eu")
- WHEN o espião que saiu da sala era o único espião e ainda sobram jogadores suficientes THEN o sistema SHALL deixar a partida seguir sem espião algum (não redistribui papéis no meio da rodada)
- WHEN um jogador entra na sala durante uma rodada de Espião em andamento THEN o sistema SHALL colocá-lo como `aguardando`, sem lugar na rodada corrente (mesmo padrão `SALA-10`/`ESCR-10` de "Quem Sou Eu")
- WHEN um jogador desconecta durante uma votação aberta THEN o sistema SHALL considerar a votação "todos votaram" contando apenas jogadores ativos conectados, sem travar esperando por quem caiu
- WHEN um jogador tenta votar mais de uma vez na mesma votação THEN o sistema SHALL substituir o voto anterior dele, não somar um segundo voto
- WHEN a votação fecha com 0 votos válidos (todos escolheram "pular" ou ninguém votou e o host encerrou) THEN o sistema SHALL tratar como "não acertou" (mesma regra do empate)
- WHEN a votação fecha e a janela de resultado está aberta THEN o sistema SHALL recusar abrir outra votação até a rodada voltar a correr
- WHEN o host pausa a rodada durante uma votação aberta THEN o sistema SHALL congelar o relógio da votação do mesmo jeito, sem fechar a votação nem descartar os votos já dados
- WHEN um jogador sai da sala durante a janela de resultado THEN o sistema SHALL manter o resultado como foi apurado — ele é um retrato do que aconteceu, não um cálculo que se refaz

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ESP-01 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-02 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-03 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-04 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-05 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-06 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-07 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-08 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-09 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-10 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-11 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-12 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-13 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-14 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-15 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-16 | P1: Jogar uma rodada completa | Tasks | Verified |
| ESP-17 | P2: Ajustes de configuração | Tasks | Verified |
| ESP-18 | P2: Ajustes de configuração | Tasks | Verified |
| ESP-19 | P2: Ajustes de configuração | Tasks | Verified |
| ESP-20 | P2: Ajustes de configuração | Tasks | Verified |
| ESP-21 | P2: Ajustes de configuração | Tasks | Verified |
| ESP-22 | P3: Conteúdo — pacotes temáticos | Tasks | Verified |
| ESP-23 | P4: Acertos de UX do review | Review | Verified |
| ESP-24 | P4: Acertos de UX do review | Review | Verified |
| ESP-25 | P4: Acertos de UX do review | Review | Verified |
| ESP-26 | P4: Acertos de UX do review | Review | Verified |
| ESP-27 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-28 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-29 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-30 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-31 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-32 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-33 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-34 | P5: A votação vira um momento da mesa | Tasks | Verified |
| ESP-35 | P6: Pausar a rodada | Tasks | Verified |
| ESP-36 | P6: Pausar a rodada | Tasks | Verified |
| ESP-37 | P6: Pausar a rodada | Tasks | Verified |
| ESP-38 | P6: Pausar a rodada | Tasks | Verified |
| ESP-39 | P6: Pausar a rodada | Tasks | Verified |
| ESP-40 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-41 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-42 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-43 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-44 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-45 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-46 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-47 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-48 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-49 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-50 | P7: A votação decide a partida | Tasks | Implementing |
| ESP-51 | P7: A votação decide a partida | Tasks | Implementing |

**ID format:** `ESP-[NUMBER]`, mapeado em ordem às ACs de P1 (01–16), P2 (17–21), P3 (22), P4 (23–26), P5 (27–34), P6 (35–39) e P7 (40–51) acima. `ESP-13` e `ESP-14` estão riscados: P7 os substituiu.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 51 total — 37 verificados, 2 substituídos (`ESP-13`, `ESP-14`), 12 em implementação (P7).

---

## Success Criteria

- [ ] Uma sala de 3+ jogadores completa uma rodada de Espião do lobby até a revelação final, pelos dois caminhos de encerramento (votação certeira e encerramento manual do host)
- [ ] O jogo entra no registro (`server/games/registro.ts`) sem alterar `core/despacho.ts`/`core/sala-do.ts` além do que `AD-013` já preparou (registro por `jogoId`)
- [ ] Zero regressão nos 495 testes unitários + 86 de integração existentes
