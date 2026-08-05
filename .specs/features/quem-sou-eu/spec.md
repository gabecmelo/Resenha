# Resenha — "Quem Sou Eu?" (MVP) — Specification

**Feature:** `quem-sou-eu`
**Criado:** 2026-08-02
**Status:** aguardando aprovação
**Escopo (auto-sizing):** Complex — greenfield, domínio novo, tempo real, concorrência e máquina de estados

---

## Problem Statement

"Quem sou eu?" é um jogo de papelzinho na testa que só funciona presencialmente e depende de papel, caneta e todo mundo na mesma sala. Grupos de amigos que jogam por chamada de voz não têm como distribuir e esconder as cartas, e mesmo presencialmente o papel se perde, gruda mal e denuncia a resposta. Falta um "tabuleiro" digital que resolva exatamente a parte que o papel resolve mal — esconder a sua carta de você e mostrá-la para todos os outros — sem tentar automatizar as regras, que variam de grupo para grupo.

**Resenha** é o hub de party games que abriga esse jogo. Este spec cobre o MVP: a base de sala compartilhada (`core`) mais o jogo "Quem Sou Eu?" completo.

## Goals

- [ ] Um grupo de 3 a 20 amigos consegue jogar uma partida inteira de ponta a ponta pelo site, sem cadastro, sem instalar nada
- [ ] Entrar em uma sala leva no máximo 2 passos a partir do link: digitar apelido e entrar
- [ ] O jogo funciona igual remoto (voz por fora) e presencial, sem modo separado
- [ ] Uma queda de conexão nunca elimina o jogador nem quebra a partida
- [ ] A base de sala (`core`) fica pronta para receber um segundo jogo sem reescrita

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Reason |
| ------- | ------ |
| Contas de usuário, login, perfil | Atrito direto contra o goal de "manda o link e joga". Identidade é token de navegador (AD-006). |
| Histórico de partidas, estatísticas, ranking | O sistema não é juiz (AD-003) — não há vencedor a registrar. |
| Baralhos prontos e criação de baralho próprio | Evolução pós-MVP já prevista. O modo "amigo escreve" é o que o usuário quer validar primeiro. |
| Áudio e vídeo dentro do site | Grupos já usam Discord/Meet ou estão presencialmente juntos. |
| Registro de perguntas e respostas sim/não | Decorre de AD-003 — acontece boca a boca. |
| Outros jogos do hub (Espião etc.) | Features futuras. Este spec só garante a fronteira `core` / `games` (AD-002). |
| Internacionalização | Só PT-BR (AD-007). |
| Moderação, filtro de palavrão, denúncia | Salas são privadas por código, entre amigos. |
| App nativo / instalável (PWA) | Web responsivo cobre o caso de uso. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Quem confirma o "Descobri!" quando quem clica é o próprio host | O jogador conectado há mais tempo, excluindo o host | Preserva o princípio de que ninguém confirma a si mesmo, sem inventar um segundo papel de autoridade. Alternativa considerada e recusada: exigir confirmação de todos os jogadores — invasiva demais para o ganho | y |
| Jogador sai **durante o Jogo** (não durante a Escrita) | Sem redistribuição — a carta dele some da lista e o rodízio segue sem ele | Redistribuir no meio do jogo invalidaria tudo que já foi perguntado. A redistribuição existe só na Escrita, onde nada foi jogado ainda | y |
| Sala fica sem nenhum jogador ativo (todos saíram durante o Jogo) | A partida é encerrada automaticamente e a sala volta ao Lobby | Não existe partida com zero jogadores; forçar o host a encerrar uma sala vazia é ruído | y |
| Alguém marca PRONTO e depois quer trocar a carta | Pode desmarcar PRONTO, editar e marcar de novo, enquanto a partida não começou | A troca antes de começar já é requisito; o PRONTO não deve virar uma armadilha | y |
| Jogador aguardando (entrou no meio) durante a Escrita | Não recebe alvo e não entra no sorteio da rodada corrente; o host pode Cancelar para incluí-lo (`ESCR-10`) | Decorre de "a escrita já é a partida", sem tirar do host a opção de reabrir o lobby | y |
| Tamanho máximo da carta | 60 caracteres | A carta não é só nome de personagem — pode ser filme, livro, série, música. 60 acomoda títulos longos sem quebrar a lista | y |
| Tamanho máximo da mensagem de chat | 300 caracteres | Chat é auxiliar, não é o canal principal | y |
| Tamanho máximo do bloco de notas | 2.000 caracteres | Suficiente para uma partida inteira de anotações | y |
| Limite de envio de mensagens de chat | 5 mensagens por 5 segundos por jogador | Evita que um flood trave a sala; generoso o bastante para nunca incomodar uso normal | y |
| Formato do código de sala | 5 letras maiúsculas, alfabeto sem caracteres ambíguos (A–Z sem I e O = 24 letras) | Fácil de ditar em voz alta. 24⁵ = **7.962.624** combinações — suficiente contra colisão e contra varredura casual | y |
| Observabilidade | Logs de erro no Worker via dashboard da Cloudflare; sem métricas, tracing ou alertas | Projeto pessoal, sem SLA. Adicionar telemetria agora é custo sem retorno | y |
| Dependências externas | N/A — o sistema não chama nenhum serviço de terceiros | Todo o estado é local ao Durable Object | y |
| Autenticação / autorização | N/A — não há contas. Autoridade = token de sessão (AD-006) + flag de host | Decorre de AD-006 | y |

**Open questions:** none — tudo resolvido ou registrado acima.

---

## Máquina de Estados da Sala

Referência normativa para os requisitos abaixo.

```
                 [host: Iniciar]        [todos PRONTO + host: Começar]
   ┌────────┐ ───────────────────▶ ┌─────────┐ ─────────────────────▶ ┌──────┐
   │ LOBBY  │                      │ ESCRITA │                        │ JOGO │
   └────────┘ ◀─────────────────── └─────────┘                        └──────┘
        ▲       [host: Cancelar]                                          │
        │                                                    [host: Encerrar]
        │                                                                 │
        │                    [host: Nova partida]                         ▼
        └──────────────────────────────────────────────────────── ┌───────────┐
                                                                  │ ENCERRADA │
                                                                  └───────────┘
```

- **LOBBY** — jogadores entram e saem livremente; host ajusta configurações. Todo mundo que entra é jogador ativo.
- **ESCRITA** — alvos sorteados; cada um escreve a carta do seu alvo e marca PRONTO. Já conta como partida em andamento: quem entrar daqui em diante fica **aguardando**.
- **JOGO** — rodízio de turnos ativo.
- **ENCERRADA** — todas as cartas reveladas; sala viva aguardando "Nova partida".

---

## User Stories

### P1: Criar e entrar em uma sala ⭐ MVP

**User Story**: Como amigo do grupo, quero criar uma sala e mandar um link, para que todo mundo entre em segundos sem se cadastrar.

**Why P1**: Sem sala não existe nada. É a porta de entrada de todos os outros requisitos.

**Acceptance Criteria**:

1. `SALA-01` — WHEN um visitante cria uma sala THEN o sistema SHALL gerar um código de 5 letras maiúsculas (alfabeto sem I, O, 0, 1), criar a sala no estado LOBBY e tornar o criador o host
2. `SALA-02` — WHEN um visitante abre o link de uma sala existente THEN o sistema SHALL pedir apenas um apelido antes de entrar
3. `SALA-03` — WHEN um visitante informa um apelido com menos de 2 ou mais de 16 caracteres THEN o sistema SHALL recusar a entrada e exibir o motivo
4. `SALA-04` — WHEN um visitante informa um apelido já usado por um jogador presente na sala, comparando **sem distinguir maiúsculas de minúsculas** e ignorando espaços nas pontas, THEN o sistema SHALL recusar a entrada e exibir "esse apelido já está na sala"
5. `SALA-05` — ⚠️ **substituído por `AJU-37`** (o limite passou a ser escolhido pelo host na criação, entre o mínimo e 20) — WHEN um visitante tenta entrar em uma sala que já atingiu **o limite daquela sala** THEN o sistema SHALL recusar a entrada e exibir que a sala está cheia
6. `SALA-06` — WHEN um visitante tenta entrar com um código que não corresponde a nenhuma sala viva THEN o sistema SHALL exibir "sala não encontrada" e oferecer criar uma nova
7. `SALA-07` — WHEN um jogador entra na sala THEN o sistema SHALL atribuir a ele uma cor ainda não usada na sala e exibir essa cor consistentemente na lista de jogadores, nas cartas e no chat
8. `SALA-08` — WHEN um jogador está na sala THEN o sistema SHALL exibir o código da sala e um botão que copia o link de convite
9. `SALA-09` — WHEN a sala está em LOBBY e um visitante entra THEN o sistema SHALL adicioná-lo como jogador ativo
10. `SALA-10` — WHEN a sala está em ESCRITA, JOGO ou ENCERRADA e um visitante entra THEN o sistema SHALL adicioná-lo como **aguardando**, sem alvo e fora do rodízio, e SHALL torná-lo ativo na próxima partida

**Independent Test**: Criar sala em um navegador, copiar o link, abrir em outro navegador, entrar com apelido e ver os dois jogadores na lista com cores diferentes nas duas telas.

---

### P1: Comandar a sala como host ⭐ MVP

**User Story**: Como host, quero controlar o andamento e resolver problemas (quem travou, quem atrapalha), para que o grupo não fique refém do software.

**Why P1**: Decorre de AD-003 — a autoridade de arbitragem é humana. Sem os poderes do host, uma partida travada não tem saída.

**Acceptance Criteria**:

1. `HOST-01` — ⚠️ **substituído por `AJU-06`** (mínimo passou de 3 para 2 jogadores ativos) — WHEN a sala está em LOBBY com no mínimo 2 jogadores ativos THEN o sistema SHALL habilitar ao host a ação "Iniciar"; com menos de 2, SHALL manter a ação desabilitada e informar o mínimo
2. `HOST-02` — WHEN o host aciona "Expulsar" sobre um jogador THEN o sistema SHALL removê-lo da sala imediatamente e SHALL impedir que ele entre novamente na mesma sala com o mesmo token de sessão
3. `HOST-03` — WHEN o host transfere o comando a outro jogador THEN o sistema SHALL torná-lo host e remover os poderes do anterior, sem interromper a partida
4. `HOST-04` — WHEN o host está desconectado há 30 segundos ininterruptos THEN o sistema SHALL transferir o comando automaticamente ao jogador que está **na sala** há mais tempo entre os conectados (antiguidade de entrada, preservada por quem caiu e voltou) e SHALL anunciar a troca a todos
5. `HOST-05` — WHEN o ex-host reconecta após uma migração automática THEN o sistema SHALL mantê-lo como jogador comum
6. `HOST-06` — WHEN qualquer jogador que não é host tenta executar uma ação de host THEN o sistema SHALL rejeitar a ação e não alterar o estado da sala
7. `HOST-07` — WHEN o host aciona "Encerrar partida" THEN o sistema SHALL pedir confirmação antes de executar

**Independent Test**: Com 3 jogadores, host expulsa um e ele não consegue voltar pelo link; host transfere o comando e os botões de host migram de tela.

---

### P1: Sortear alvos e escrever as cartas ⭐ MVP

**User Story**: Como jogador, quero escrever a carta de um amigo sorteado pelo sistema, para que ninguém fique sem carta e ninguém escolha a própria.

**Why P1**: É o modo único de carta do MVP e o coração do jogo.

**Acceptance Criteria**:

1. `ESCR-01` — WHEN o host aciona "Iniciar" no LOBBY THEN o sistema SHALL sortear uma permutação sem ponto fixo entre os jogadores ativos (ninguém escreve para si mesmo), atribuir a cada jogador exatamente um alvo, e mover a sala para ESCRITA
2. `ESCR-02` — WHEN a sala entra em ESCRITA THEN o sistema SHALL exibir a cada jogador o apelido do seu alvo e um campo para escrever a carta dele
3. `ESCR-03` — WHEN um jogador escreve uma carta com mais de 60 caracteres ou apenas espaços em branco THEN o sistema SHALL recusar e exibir o motivo
4. `ESCR-04` — WHEN um jogador marca PRONTO THEN o sistema SHALL registrar sua carta e refletir o progresso "N de M prontos" para todos, sem revelar o conteúdo de nenhuma carta
5. `ESCR-05` — WHEN um jogador que já marcou PRONTO desmarca THEN o sistema SHALL permitir editar a carta e marcar PRONTO novamente, enquanto a sala estiver em ESCRITA; WHEN ele tenta editar a carta **sem** desmarcar THEN o sistema SHALL recusar a edição
6. `ESCR-06` — WHEN todos os jogadores ativos estão PRONTO THEN o sistema SHALL habilitar ao host a ação "Começar"; enquanto houver qualquer pendente, SHALL mantê-la desabilitada
7. `ESCR-07` — WHEN um jogador ativo sai ou é expulso durante a ESCRITA THEN o sistema SHALL descartar todas as cartas escritas, sortear novos alvos entre os jogadores ativos restantes e zerar todos os PRONTO
8. `ESCR-08` — ⚠️ **substituído por `AJU-07`** (mínimo passou de 3 para 2) — WHEN a redistribuição de `ESCR-07` deixaria menos de 2 jogadores ativos THEN o sistema SHALL cancelar a partida e devolver a sala ao LOBBY, informando o motivo
9. `ESCR-09` — WHEN o host aciona "Cancelar" durante a ESCRITA THEN o sistema SHALL descartar as cartas, devolver a sala ao LOBBY e promover a **ativo** todo jogador que estava aguardando — no LOBBY não existe jogador aguardando (`SALA-09`)
10. `ESCR-10` — WHEN um jogador entra na sala durante a ESCRITA THEN o sistema SHALL NOT redistribuir os alvos, e SHALL informar ao host que há jogador aguardando e que "Cancelar" devolve a sala ao LOBBY para incluí-lo

**Independent Test**: Com 3 jogadores, iniciar e verificar que cada um vê um alvo diferente e nenhum vê a si mesmo; um sai e os outros dois recebem novos alvos com os PRONTO zerados.

---

### P1: Jogar a partida ⭐ MVP

**User Story**: Como jogador, quero ver a carta de todos menos a minha e saber de quem é a vez, para que o jogo aconteça sem papel e sem confusão de ordem.

**Why P1**: É a tela principal do produto — o "tabuleiro".

**Acceptance Criteria**:

1. `JOGO-01` — WHEN a sala está em JOGO THEN o sistema SHALL exibir a cada jogador a lista de todos os jogadores ativos com suas cartas, e SHALL exibir a própria carta do jogador como oculta
2. `JOGO-02` — WHEN a sala está em JOGO THEN o sistema SHALL NOT enviar ao cliente de um jogador o conteúdo da carta dele, em nenhuma mensagem, até que ela seja revelada por `DESC-04` ou `FIM-02`
3. `JOGO-03` — WHEN a sala entra em JOGO THEN o sistema SHALL definir a ordem do rodízio conforme a configuração escolhida (sorteada ou ordem de entrada) e SHALL indicar a todos de quem é a vez
4. `JOGO-04` — WHEN o jogador da vez aciona "Passei a vez" THEN o sistema SHALL avançar para o próximo jogador ativo da ordem que ainda está no rodízio
5. `JOGO-05` — WHEN o host aciona "Pular a vez" THEN o sistema SHALL avançar a vez independentemente de quem é o jogador atual
6. `JOGO-06` — WHEN um jogador que não é o da vez nem o host tenta avançar a vez THEN o sistema SHALL rejeitar a ação
7. `JOGO-07` — WHEN a configuração define um tempo por turno e esse tempo se esgota THEN o sistema SHALL avançar a vez automaticamente
8. `JOGO-08` — WHEN a configuração define "sem limite" THEN o sistema SHALL NOT avançar a vez por tempo
9. `JOGO-09` — WHEN o rodízio chega ao fim da ordem THEN o sistema SHALL voltar ao primeiro jogador ainda no rodízio
10. `JOGO-10` — WHEN o jogador da vez sai da sala THEN o sistema SHALL avançar a vez automaticamente
11. `JOGO-11` — WHEN um jogador está desconectado no momento em que chegaria a vez dele THEN o sistema SHALL manter a vez com ele — a vaga nunca é perdida por desconexão, e o host pode pular

**Independent Test**: Com 3 jogadores, verificar que cada tela mostra 2 cartas legíveis e a própria oculta, e que "Passei a vez" avança o indicador na tela dos três.

---

### P1: Declarar "Descobri!" com confirmação do host ⭐ MVP

**User Story**: Como jogador, quero avisar que descobri quem sou e ter isso confirmado, para que o clique acidental ou a espiada indevida não estraguem minha própria partida.

**Why P1**: É o desfecho individual do jogo. Sem confirmação, o botão revelaria a resposta a quem simplesmente clicasse.

**Acceptance Criteria**:

1. `DESC-01` — WHEN um jogador ativo aciona "Descobri!" THEN o sistema SHALL anunciar a todos que ele declarou ter descoberto e SHALL colocar a declaração em estado pendente, sem revelar a carta
2. `DESC-02` — WHEN existe uma declaração pendente THEN o sistema SHALL apresentar ao host as ações "Confirmar" e "Negar" identificando o jogador
3. `DESC-03` — WHEN quem declarou é o próprio host THEN o sistema SHALL direcionar a confirmação ao jogador que está **na sala** há mais tempo entre os demais que estão conectados **e ativos na rodada** — quem apenas aguarda a próxima partida não confirma (mesmo critério de antiguidade de `HOST-04`)
4. `DESC-04` — WHEN a declaração é confirmada THEN o sistema SHALL revelar a carta ao jogador que declarou, marcá-lo como "descobriu" para todos e anunciar a confirmação
5. `DESC-05` — WHEN a declaração é negada THEN o sistema SHALL descartá-la sem revelar a carta, anunciar a negativa, e SHALL permitir que o jogador declare novamente
6. `DESC-06` — WHEN a declaração é confirmada THEN o sistema SHALL remover o jogador da ordem de turnos, mantendo o acesso dele à lista de cartas, ao chat e às notas *(a configuração que permitia continuar no rodízio foi removida por `AJU-18`)*
7. `DESC-07` — ❌ **removido por `AJU-18`**. Não existe mais a opção "continua jogando": quem descobre sempre sai do rodízio
8. `DESC-08` — ⚠️ **substituído por `AJU-09`…`AJU-13`**. A partida **não** encerra mais sozinha quando sobra um jogador no rodízio — ele continua jogando até declarar ou até o host encerrar
9. `DESC-09` — WHEN um jogador com declaração pendente ou já confirmada aciona "Descobri!" novamente THEN o sistema SHALL ignorar a ação sem alterar o estado
10. `DESC-10` — WHEN já existe uma declaração pendente e **outro** jogador aciona "Descobri!" THEN o sistema SHALL recusar a segunda declaração — só uma fica pendente por vez
11. `DESC-11` — WHEN o jogador que declarou sai da sala com a declaração ainda pendente THEN o sistema SHALL descartar a declaração sem revelar a carta

**Independent Test**: Jogador B clica "Descobri!", os três veem o anúncio, só o host vê Confirmar/Negar; ao confirmar, só B passa a ver a própria carta.

---

### P1: Encerrar, revelar e jogar de novo ⭐ MVP

**User Story**: Como host, quero encerrar a partida e revelar tudo, e começar outra com o mesmo grupo, para que a rodada termine com graça e a próxima comece sem ninguém sair e voltar.

**Why P1**: A revelação final é o clímax do jogo, e "mais uma?" é o comportamento normal do grupo.

**Acceptance Criteria**:

1. `FIM-01` — WHEN o host confirma "Encerrar partida" THEN o sistema SHALL mover a sala para ENCERRADA
2. `FIM-02` — WHEN a sala entra em ENCERRADA THEN o sistema SHALL revelar a carta de todos os jogadores ativos a todos os presentes, incluindo os aguardando
3. `FIM-03` — WHEN a sala está em ENCERRADA e o host aciona "Nova partida" THEN o sistema SHALL devolver a sala ao LOBBY, promover todos os jogadores aguardando a ativos, limpar cartas, alvos, marcações de "descobriu" e notas privadas
4. `FIM-04` — WHEN a sala volta ao LOBBY por "Nova partida" THEN o sistema SHALL preservar os jogadores, seus apelidos, suas cores, o histórico do chat e as configurações da partida anterior
5. `FIM-05` — WHEN todos os jogadores ativos saem durante o JOGO, ou com a partida já ENCERRADA, THEN o sistema SHALL encerrar a partida automaticamente e devolver a sala ao LOBBY, promovendo a ativo quem estava aguardando

**Independent Test**: Encerrar com 3 jogadores e ver as 3 cartas em todas as telas; acionar "Nova partida" e verificar que o quarto jogador que estava aguardando aparece como ativo no LOBBY.

---

### P1: Configurar a partida ⭐ MVP

**User Story**: Como host, quero ajustar as poucas regras que o sistema realmente controla, para que a partida siga o costume do meu grupo.

**Why P1**: Sem isso, o sistema imporia um estilo de jogo — o oposto de AD-003.

**Acceptance Criteria**:

1. `CFG-01` — WHEN a sala está em LOBBY THEN o sistema SHALL permitir ao host definir a ordem dos turnos como "sorteada" ou "ordem de entrada"
2. `CFG-02` — ❌ **removido por `AJU-18`**. A escolha entre "continua jogando" e "sai do rodízio" não existe mais
3. `CFG-03` — ⚠️ **estendido por `AJU-19`** — WHEN a sala está em LOBBY THEN o sistema SHALL permitir ao host definir o tempo por turno entre "sem limite", os presets (30s, 60s, 90s, 2min) e **qualquer valor personalizado de 10 segundos a 60 minutos**
4. `CFG-04` — WHEN a sala não está em LOBBY THEN o sistema SHALL exibir as configurações em modo somente leitura para todos
5. `CFG-05` — WHEN uma sala é criada THEN o sistema SHALL aplicar os padrões: ordem sorteada e sem limite de tempo *(o padrão "sai do rodízio" virou regra fixa em `AJU-18`)*
6. `CFG-06` — WHEN o host altera uma configuração THEN o sistema SHALL refletir a mudança na tela de todos os jogadores

**Independent Test**: Host muda o tempo para 30s no lobby e os outros jogadores veem a mudança; durante o jogo os controles aparecem travados.

---

### P1: Nunca perder a vaga por conexão ⭐ MVP

**User Story**: Como jogador, quero que uma queda de internet ou um refresh não me tire do jogo, para que a partida não seja arruinada por um tropeço técnico.

**Why P1**: Party game em celular = tela bloqueando, app trocando, sinal oscilando. É o modo de falha mais provável do produto.

**Acceptance Criteria**:

1. `CONN-01` — WHEN um jogador entra em uma sala THEN o sistema SHALL emitir um token de sessão opaco e o cliente SHALL persistí-lo no navegador
2. `CONN-02` — WHEN um cliente reconecta apresentando um token válido para aquela sala THEN o sistema SHALL devolvê-lo à mesma vaga, com o mesmo apelido, cor, papel de host, alvo, carta, notas e posição no rodízio
3. `CONN-03` — WHEN um jogador perde a conexão THEN o sistema SHALL marcá-lo como desconectado para todos e SHALL preservar sua vaga enquanto a sala existir
4. `CONN-04` — WHEN um cliente apresenta um token de um jogador expulso THEN o sistema SHALL recusar a entrada (`HOST-02`)
5. `CONN-05` — WHEN o Durable Object da sala hiberna ou é reiniciado THEN o sistema SHALL restaurar o estado completo da sala a partir do storage, sem perda de partida em andamento
6. `CONN-06` — WHEN um jogador sai deliberadamente pelo botão "Sair" THEN o sistema SHALL liberar a vaga e invalidar o token daquela sala
7. `CONN-07` — WHEN a sala fica 30 minutos sem nenhuma conexão ativa THEN o sistema SHALL destruí-la e liberar o código
8. `CONN-08` — WHEN a sala fica 6 horas sem nenhuma ação de jogador THEN o sistema SHALL destruí-la, mesmo com conexões abertas

**Independent Test**: No meio de uma partida, dar refresh na aba e voltar exatamente no mesmo estado, com a mesma carta oculta e a mesma posição no rodízio.

---

### P2: Chat da sala

**User Story**: Como jogador, quero um chat de texto na sala, para combinar coisas e reagir sem sair do site.

**Why P2**: A partida é jogável sem chat (a conversa é por voz), mas ele é o canal onde os anúncios do sistema aparecem — por isso entra no MVP, logo depois da fatia vertical.

**Acceptance Criteria**:

1. `CHAT-01` — ⚠️ **estendido por `AJU-15`** (o apelido e a cor passam a ser **gravados na mensagem**, não resolvidos na lista de jogadores) — WHEN um jogador envia uma mensagem de 1 a 300 caracteres, desconsiderados os espaços nas pontas, THEN o sistema SHALL entregá-la a todos na sala com o apelido e a cor do autor; WHEN a mensagem é vazia ou formada apenas por espaços THEN o sistema SHALL recusá-la sem registrá-la
2. `CHAT-02` — WHEN um jogador envia mais de 5 mensagens em 5 segundos THEN o sistema SHALL descartar as excedentes e avisar apenas o autor
3. `CHAT-03` — WHEN um evento de partida ocorre (início, PRONTO de todos, troca de vez, declaração de "Descobri!", confirmação ou negativa, migração de host, encerramento) THEN o sistema SHALL registrá-lo no chat como mensagem de sistema, visualmente distinta das mensagens de jogador
4. `CHAT-04` — WHEN um jogador reconecta THEN o sistema SHALL entregar o histórico de chat da sala
5. `CHAT-05` — WHEN o histórico de chat ultrapassa 200 mensagens THEN o sistema SHALL descartar as mais antigas

**Independent Test**: Enviar mensagem em uma tela e vê-la nas outras; provocar uma troca de vez e ver o registro de sistema aparecer no chat.

---

### P2: Bloco de notas privado

**User Story**: Como jogador, quero anotar as perguntas que já fiz e o que descartei, para não me perder no raciocínio.

**Why P2**: Melhora muito a experiência, mas o jogo funciona sem — dá para anotar no papel.

**Acceptance Criteria**:

1. `NOTA-01` — WHEN a sala está em ESCRITA, JOGO ou ENCERRADA THEN o sistema SHALL oferecer a cada jogador um bloco de notas de texto livre de até 2.000 caracteres
2. `NOTA-02` — WHEN um jogador escreve no bloco de notas THEN o sistema SHALL NOT expor esse conteúdo a nenhum outro jogador
3. `NOTA-03` — WHEN um jogador reconecta THEN o sistema SHALL restaurar o conteúdo do bloco de notas dele
4. `NOTA-04` — WHEN uma nova partida começa THEN o sistema SHALL limpar o bloco de notas de todos os jogadores

**Independent Test**: Escrever notas, dar refresh e ver o texto de volta; iniciar nova partida e ver o bloco vazio.

---

### P2: Interface responsiva e clean

**User Story**: Como jogador, quero jogar confortavelmente pelo celular ou pelo computador, para que ninguém do grupo fique de fora por causa do dispositivo.

**Why P2**: A funcionalidade existe sem isso, mas o produto não se sustenta — a maioria vai jogar pelo celular.

**Acceptance Criteria**:

1. `VIS-01` — WHEN a tela tem 360px de largura ou mais THEN o sistema SHALL exibir todas as ações da partida sem rolagem horizontal
2. `VIS-02` — WHEN a sala tem 20 jogadores THEN o sistema SHALL manter a lista de cartas legível e navegável em tela de celular
3. `VIS-03` — WHEN é a vez do jogador THEN o sistema SHALL destacar esse estado de forma inequívoca na tela dele
4. `VIS-04` — WHEN uma ação de host é apresentada a um não-host THEN o sistema SHALL NOT exibi-la

**Independent Test**: Abrir uma sala de 20 jogadores simulados em viewport de 360px e conseguir ler todas as cartas e achar o botão da vez.

---

## Edge Cases

- WHEN dois jogadores enviam a mesma ação de host simultaneamente THEN o sistema SHALL processar a primeira e rejeitar a segunda como inválida para o estado resultante (serialização garantida pelo Durable Object)
- WHEN o sorteio de alvos é executado com 3 jogadores THEN o sistema SHALL produzir um ciclo válido sem ponto fixo — o algoritmo nunca pode falhar por falta de opção
- WHEN um jogador reconecta durante a ESCRITA THEN o sistema SHALL restaurar o alvo e a carta parcialmente escrita, sem redistribuir
- WHEN o último jogador que faltava marcar PRONTO se desconecta sem sair THEN o sistema SHALL manter a partida aguardando — o host resolve pulando ou expulsando
- WHEN o código de sala gerado colide com uma sala existente THEN o sistema SHALL gerar outro
- WHEN o apelido contém apenas espaços THEN o sistema SHALL recusá-lo (`SALA-03`)
- WHEN um jogador tenta entrar duas vezes na mesma sala pelo mesmo navegador THEN o sistema SHALL tratar a segunda aba como a mesma sessão, não como um novo jogador
- WHEN a carta escrita contém quebras de linha THEN o sistema SHALL normalizá-la para uma única linha
- WHEN um jogador aguardando aciona qualquer ação de partida THEN o sistema SHALL rejeitá-la — inclusive confirmar ou negar uma declaração (`DESC-03`)
- WHEN o alvo de um jogador sai da sala durante o JOGO THEN o sistema SHALL descartar também a atribuição órfã, de modo que quem escrevia para ele deixe de ver "a carta que escrevi"
- WHEN o host aciona "Passei a vez" sem ser o jogador da vez THEN o sistema SHALL aceitar, com o mesmo efeito de "Pular a vez" (`JOGO-05`, `JOGO-06`)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SALA-01 … SALA-10 | P1: Criar e entrar em uma sala | Design | Pending |
| HOST-01 … HOST-07 | P1: Comandar a sala como host | Design | Pending |
| ESCR-01 … ESCR-10 | P1: Sortear alvos e escrever as cartas | Design | Pending |
| JOGO-01 … JOGO-11 | P1: Jogar a partida | Design | Pending |
| DESC-01 … DESC-11 | P1: Declarar "Descobri!" | Design | Pending |
| FIM-01 … FIM-05 | P1: Encerrar, revelar e jogar de novo | Design | Pending |
| CFG-01 … CFG-06 | P1: Configurar a partida | Design | Pending |
| CONN-01 … CONN-08 | P1: Nunca perder a vaga por conexão | Design | Pending |
| CHAT-01 … CHAT-05 | P2: Chat da sala | Design | Pending |
| NOTA-01 … NOTA-04 | P2: Bloco de notas privado | Design | Pending |
| VIS-01 … VIS-04 | P2: Interface responsiva e clean | Design | Pending |

**ID format:** `[CATEGORIA]-[NÚMERO]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 81 requisitos totais (`DESC-10` e `DESC-11` acrescentados durante o Execute, a partir de lacunas achadas pelos testes), todos mapeados para tasks — ver `tasks.md`

---

## Success Criteria

- [ ] Um grupo de 3+ pessoas joga uma partida completa (criar → entrar → escrever → jogar → descobrir → encerrar → nova partida) sem intervenção técnica
- [ ] Do clique no link até estar dentro da sala: menos de 15 segundos, 2 interações
- [ ] Nenhum jogador consegue ver a própria carta antes de `DESC-04` ou `FIM-02` — verificável inspecionando o tráfego WebSocket, não só a interface
- [ ] Refresh, troca de rede ou tela bloqueada em qualquer estado da sala devolve o jogador exatamente ao mesmo ponto
- [ ] Uma sala com 20 jogadores permanece utilizável em tela de 360px
- [ ] O código do jogo "Quem Sou Eu?" não tem nenhuma referência dentro de `core`, e `core` não importa nada de `games/` (AD-002)
