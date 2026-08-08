# Pacotes de Cartas — Especificação

## Problem Statement

No "Quem Sou Eu?" atual, a única forma de atribuir cartas é o **modo livre**: cada jogador digita manualmente o nome/personagem/coisa para outro jogador. Isso funciona, mas limita a experiência:

- Grupos com pouca criatividade ou que jogam seguidas vezes esgotam ideias.
- Não há garantia de equilíbrio — alguém pode escolher algo impossível.
- Grupos que querem jogar com uma temática (filmes, anime, futebol) dependem de combinação verbal prévia.

**Pacotes de cartas** resolvem isso: o host pode escolher entre jogar no modo livre (como hoje), usar um dos pacotes temáticos pré-definidos (Filmes, Animes, Futebol etc.), ou — no futuro — um pacote personalizado criado por ele. O pacote fornece as cartas; o jogador pode simplesmente jogar ou participar da escolha.

## Goals

- [ ] O host pode selecionar o modo de jogo no lobby: Livre, Pacote pré-definido, ou Personalizado (em breve)
- [ ] 10 pacotes temáticos pré-definidos com 40–60 cartas cada, armazenados no Cloudflare KV
- [ ] Dois modos de distribuição com pacote: automático (sistema sorteia) ou escolha (jogador escolhe 1 de 5)
- [ ] O pacote escolhido é visível durante toda a partida para todos os jogadores
- [ ] Placeholder visual para pacote personalizado (indisponível, "Em breve")
- [ ] Preservar o modo/pacote selecionado ao clicar "Nova Partida"

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Razão |
|---------|-------|
| Criação/edição de pacotes personalizados | Marcado como "Em breve" — será uma feature separada |
| CRUD de pacotes pelo navegador | Depende do personalizado; por enquanto são estáticos |
| Imagens/thumbnails para cartas individuais | Cartas são texto puro, como no modo livre |
| Pesquisa/filtro dentro de um pacote | Desnecessário com 40-60 cartas |
| Pacotes compartilhados entre salas | Cada sala escolhe independente, não há persistência entre salas |
| Estatísticas de uso de pacotes | Sem banco central (AD-007) |
| Internacionalização dos pacotes | PT-BR fixo (AD-007), nomes próprios podem estar em qualquer idioma |

---

## Assumptions & Open Questions

Toda ambiguidade foi resolvida ou registrada aqui — nada ficou silenciosamente indefinido.

| Assunção / decisão | Default escolhido | Racional | Confirmada? |
|---------------------|-------------------|----------|-------------|
| Número de opções no modo "escolha" | 5 opções fixas por jogador | Equilibra variedade e velocidade; configurável seria over-engineering agora | ✅ |
| Re-sort no modo "escolha" | 1 vez por jogador (botão "Sortear outras") | Dá uma segunda chance sem abrir brecha para pescar indefinidamente | ✅ |
| Opções exclusivas entre jogadores | Sim — nenhuma carta aparece como opção para mais de um jogador | Evita conflitos e revelação indireta | ✅ |
| Repetição entre partidas | Permitida — exclusividade só dentro da mesma partida | Pacotes de 40-60 cartas se esgotariam rápido se vedasse entre partidas | ✅ |
| Storage dos pacotes | Cloudflare KV (free tier: 100k leituras/dia, 1k escritas/dia) | Escala para pacotes personalizados e outros jogos no futuro | ✅ |
| Modo livre continua como default | Sim — a sala começa em "Livre" e o host muda se quiser | Retrocompatível com o comportamento atual | ✅ |
| Pacote preservado no "Nova Partida" | Sim — volta pro lobby com o mesmo modo/pacote pré-selecionado | Conveniência; o host muda se quiser | ✅ |
| Pacote visível durante o jogo | Sim — todos veem "Pacote: Animes" durante toda a partida | Faz parte da graça saber a categoria pra formular perguntas | ✅ |
| No modo automático, escrita é pulada | Sim — o sistema sorteia N cartas únicas do pacote e vai direto para `'jogo'` | O host clica "Iniciar partida" e o jogo começa sem escrita manual | ✅ |
| Config "distribuição" só aparece com pacote | Sim — no modo Livre não existe essa opção (sempre manual) | Evita complexidade desnecessária | ✅ |
| Ícones dos pacotes são emojis | Sim — cada pacote tem um emoji representativo (🎥, ⚽, 🎮 etc.) | Simples, sem assets extras, funciona em todos os dispositivos | ✅ |
| Pacotes têm descrição curta | Sim — uma linha abaixo do nome ("Adivinhe personagens icônicos de anime e mangá") | Ajuda o host a escolher | ✅ |
| Quantidade de cartas visível no card | Sim — mostra "50 cartas" no card do pacote | Informação útil pro host decidir | ✅ |
| Idioma das cartas | PT-BR para nomes de pacotes; nomes próprios no idioma original (Harry Potter, Goku) | AD-007 + faz sentido cultural | ✅ |

**Open questions:** nenhuma — todas resolvidas acima.

---

## User Stories

### P1: Configuração de Modo de Jogo no Lobby ⭐ MVP

**User Story**: Como host, quero escolher entre modo Livre, um Pacote pré-definido, ou ver que Pacote Personalizado está "Em breve", para que eu possa definir a temática da partida.

**Why P1**: Sem a seleção de modo, o pacote não chega ao jogador.

**Acceptance Criteria**:

1. `PKT-01` WHEN o host está no lobby THEN o sistema SHALL exibir uma seção "Modo de jogo" com três opções: "Livre" (default selecionado), "Pacotes" e "Personalizado".
2. `PKT-02` WHEN o host seleciona "Pacotes" THEN o sistema SHALL exibir a lista de pacotes disponíveis com emoji, nome, descrição curta e quantidade de cartas.
3. `PKT-03` WHEN o host seleciona um pacote da lista THEN o sistema SHALL destacar visualmente o pacote selecionado e exibir uma sub-configuração "Distribuição" com opções "Aleatória" (default) e "Cada um escolhe".
4. `PKT-04` WHEN o host seleciona "Personalizado" THEN o sistema SHALL exibir um card com estilo outline/fantasma com texto "Crie seu pacote — Em breve" e ícone de cadeado, não permitindo seleção.
5. `PKT-05` WHEN o host seleciona "Livre" THEN o sistema SHALL manter o comportamento atual (sem sub-configurações de distribuição).
6. `PKT-06` WHEN um jogador não-host está no lobby THEN o sistema SHALL exibir o modo e pacote escolhidos em modo somente-leitura (como já faz com as demais configurações).
7. `PKT-07` WHEN o host altera o modo de jogo ou o pacote selecionado THEN o sistema SHALL propagar a mudança via projeção para todos os jogadores conectados em tempo real.

**Independent Test**: Criar uma sala, ver as 3 opções, selecionar "Pacotes", ver a lista de 10 pacotes, selecionar um, ver a sub-configuração de distribuição aparecer. Outro jogador na sala vê a seleção.

---

### P1: Distribuição Automática (Modo Pacote + Aleatória) ⭐ MVP

**User Story**: Como host, quero que ao selecionar distribuição "Aleatória" com um pacote, o sistema distribua cartas automaticamente ao iniciar, pulando a fase de escrita, para que o jogo comece rapidamente.

**Why P1**: É o modo de distribuição padrão e o mais rápido de jogar.

**Acceptance Criteria**:

8. `PKT-08` WHEN o host clica "Iniciar partida" com modo Pacote + distribuição Aleatória THEN o sistema SHALL sortear N cartas únicas do pacote (N = número de jogadores ativos), atribuí-las aleatoriamente, e transicionar diretamente para a fase `'jogo'` (pulando `'escrita'`).
9. `PKT-09` WHEN o pacote tem menos cartas do que jogadores ativos THEN o sistema SHALL impedir o início e exibir motivo: "Pacote tem X cartas, mas há Y jogadores — escolha um pacote maior ou reduza a sala".
10. `PKT-10` WHEN a partida inicia em modo automático THEN o sistema SHALL nunca atribuir a mesma carta a dois jogadores na mesma partida.

**Independent Test**: Criar sala com 4 jogadores, selecionar pacote "Filmes" + Aleatória, iniciar. Todos vão direto pro jogo, cada um com uma carta diferente do pacote. Nenhum jogador vê tela de escrita.

---

### P1: Distribuição com Escolha (Modo Pacote + Cada Um Escolhe) ⭐ MVP

**User Story**: Como jogador, quero escolher uma carta entre 5 opções sorteadas do pacote para colocar no meu alvo, para que eu possa adaptar a dificuldade ao conhecimento de cada pessoa.

**Why P1**: Modo que mantém a agência do jogador dentro da temática do pacote.

**Acceptance Criteria**:

11. `PKT-11` WHEN o host clica "Iniciar partida" com modo Pacote + distribuição "Cada um escolhe" THEN o sistema SHALL transicionar para a fase `'escrita'` e, para cada jogador, sortear 5 opções únicas do pacote para seu alvo.
12. `PKT-12` WHEN o jogador está na fase de escrita com pacote THEN o sistema SHALL exibir 5 cards de opção (em vez do campo de texto livre) com o texto de cada carta, permitindo selecionar uma.
13. `PKT-13` WHEN as 5 opções são sorteadas THEN o sistema SHALL garantir que nenhuma carta aparece como opção para mais de um jogador (opções exclusivas entre jogadores).
14. `PKT-14` WHEN o jogador seleciona uma opção THEN o sistema SHALL preencher a carta do alvo com o texto selecionado e permitir que marque "Pronto" (fluxo análogo ao modo livre).
15. `PKT-15` WHEN o jogador não gosta das 5 opções THEN o sistema SHALL permitir clicar "Sortear outras" uma vez, gerando 5 novas opções exclusivas do mesmo pacote.
16. `PKT-16` WHEN o jogador já usou o "Sortear outras" THEN o sistema SHALL desabilitar o botão com motivo "Você já sorteou uma vez" (não pode re-sortear de novo).
17. `PKT-17` WHEN todos os jogadores marcarem "Pronto" THEN o sistema SHALL transicionar para a fase `'jogo'` (idêntico ao comportamento atual do modo livre).

**Independent Test**: Criar sala com 3 jogadores, selecionar pacote "Animes" + "Cada um escolhe", iniciar. Cada jogador vê 5 cards de opção, seleciona um, marca pronto. Jogo começa quando todos estão prontos. Verificar que as opções não se repetem entre jogadores.

---

### P1: Pacotes Pré-definidos no Cloudflare KV ⭐ MVP

**User Story**: Como sistema, preciso armazenar e carregar 10 pacotes temáticos com 40-60 cartas cada no Cloudflare KV, para que estejam disponíveis nas salas.

**Why P1**: Sem os pacotes armazenados, não há dados para distribuir.

**Acceptance Criteria**:

18. `PKT-18` WHEN a sala é criada e o host seleciona "Pacotes" THEN o sistema SHALL carregar a lista de pacotes (id, emoji, nome, descrição, quantidade de cartas) do KV e exibi-los na projeção.
19. `PKT-19` WHEN o host confirma um pacote e inicia a partida THEN o sistema SHALL carregar as cartas completas do pacote selecionado do KV.
20. `PKT-20` WHEN o KV não contém o pacote solicitado THEN o sistema SHALL recusar o início com erro `PACOTE_NAO_ENCONTRADO`.
21. `PKT-21` O sistema SHALL armazenar 10 pacotes no KV: Filmes (`filmes`), Personagens de Anime (`anime`), Personagens de Filmes (`personagens-filmes`), Livros (`livros`), Jogadores de Futebol (`futebol`), Jogos (`jogos`), Personagens de Jogos (`personagens-jogos`), Séries de TV (`series`), Cantores/Bandas (`musica`), Super-heróis (`super-herois`).
22. `PKT-22` Cada pacote SHALL ter entre 40 e 60 cartas, com nomes em PT-BR ou nomes próprios no idioma original.

**Independent Test**: Script de seed no KV. Verificar que `wrangler kv:key list` retorna os 10 pacotes. Uma sala carrega e exibe a lista.

---

### P1: Visibilidade do Pacote Durante o Jogo ⭐ MVP

**User Story**: Como jogador, quero ver o nome do pacote (ex: "Pacote: Animes") durante toda a partida, para que eu saiba a categoria e possa formular perguntas melhores.

**Why P1**: Informação essencial para a dinâmica de jogo com pacotes.

**Acceptance Criteria**:

23. `PKT-23` WHEN a partida está em fase `'jogo'` com um pacote selecionado THEN o sistema SHALL exibir um badge/indicador com o emoji e nome do pacote visível para todos os jogadores.
24. `PKT-24` WHEN a partida está em fase `'encerrada'` THEN o sistema SHALL continuar exibindo o pacote utilizado.
25. `PKT-25` WHEN a partida está em modo "Livre" THEN o sistema SHALL não exibir indicador de pacote.

**Independent Test**: Iniciar partida com pacote, verificar o badge visível na tela de jogo e na tela de encerrada. Iniciar em modo livre, verificar ausência.

---

### P1: Nova Partida Preserva Configuração ⭐ MVP

**User Story**: Como host, quero que ao clicar "Nova Partida" o modo e pacote selecionado sejam preservados, para não ter que reconfigurar a cada rodada.

**Why P1**: Conveniência essencial para sessões seguidas.

**Acceptance Criteria**:

26. `PKT-26` WHEN o host clica "Nova Partida" na fase `'encerrada'` THEN o sistema SHALL retornar ao lobby com o mesmo modo de jogo, pacote e modo de distribuição pré-selecionados.
27. `PKT-27` WHEN o host retorna ao lobby após "Nova Partida" THEN o sistema SHALL permitir alterar o modo, pacote e distribuição normalmente.

**Independent Test**: Jogar com pacote "Filmes" + Aleatória, encerrar, "Nova Partida". Verificar que o lobby mostra "Filmes" + "Aleatória" selecionados. Mudar para "Jogos", iniciar — funciona.

---

## Edge Cases

- `PKT-28` WHEN o pacote selecionado tem exatamente N cartas (N = jogadores ativos) e a distribuição é "Cada um escolhe" THEN o sistema SHALL distribuir todas as cartas como opções (cada jogador recebe menos de 5 opções se necessário), garantindo que nenhuma carta fique sem opção.
- `PKT-29` WHEN um jogador desconecta durante a fase de escrita com pacote (modo "Cada um escolhe") THEN o sistema SHALL redistribuir os alvos (como no modo livre) e re-sortear as opções de cada jogador para o novo alvo.
- `PKT-30` WHEN o host muda de "Pacotes" para "Livre" no lobby THEN o sistema SHALL limpar o pacote selecionado e a configuração de distribuição.
- `PKT-31` WHEN a leitura do KV falha (timeout, indisponibilidade) THEN o sistema SHALL recusar o início com erro `PACOTE_INDISPONIVEL` e mensagem explicativa.
- `PKT-32` WHEN o host tenta iniciar com pacote mas não há jogadores suficientes THEN o sistema SHALL aplicar a mesma validação existente (`JOGADORES_INSUFICIENTES`), independente do modo.
- `PKT-33` WHEN a distribuição é "Cada um escolhe" e o jogador clica "Sortear outras" THEN o sistema SHALL garantir que as 5 novas opções são diferentes das 5 anteriores (se o pacote permitir; caso contrário, sorteia o máximo possível de novas).

---

## Requirement Traceability

Cada requisito tem um ID único para rastreamento entre design, tasks e validação.

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| PKT-01 | P1: Config Lobby | Specify | Pending |
| PKT-02 | P1: Config Lobby | Specify | Pending |
| PKT-03 | P1: Config Lobby | Specify | Pending |
| PKT-04 | P1: Config Lobby | Specify | Pending |
| PKT-05 | P1: Config Lobby | Specify | Pending |
| PKT-06 | P1: Config Lobby | Specify | Pending |
| PKT-07 | P1: Config Lobby | Specify | Pending |
| PKT-08 | P1: Distrib. Auto | Specify | Pending |
| PKT-09 | P1: Distrib. Auto | Specify | Pending |
| PKT-10 | P1: Distrib. Auto | Specify | Pending |
| PKT-11 | P1: Distrib. Escolha | Specify | Pending |
| PKT-12 | P1: Distrib. Escolha | Specify | Pending |
| PKT-13 | P1: Distrib. Escolha | Specify | Pending |
| PKT-14 | P1: Distrib. Escolha | Specify | Pending |
| PKT-15 | P1: Distrib. Escolha | Specify | Pending |
| PKT-16 | P1: Distrib. Escolha | Specify | Pending |
| PKT-17 | P1: Distrib. Escolha | Specify | Pending |
| PKT-18 | P1: KV Storage | Specify | Pending |
| PKT-19 | P1: KV Storage | Specify | Pending |
| PKT-20 | P1: KV Storage | Specify | Pending |
| PKT-21 | P1: KV Storage | Specify | Pending |
| PKT-22 | P1: KV Storage | Specify | Pending |
| PKT-23 | P1: Visibilidade | Specify | Pending |
| PKT-24 | P1: Visibilidade | Specify | Pending |
| PKT-25 | P1: Visibilidade | Specify | Pending |
| PKT-26 | P1: Nova Partida | Specify | Pending |
| PKT-27 | P1: Nova Partida | Specify | Pending |
| PKT-28 | Edge Case | Specify | Pending |
| PKT-29 | Edge Case | Specify | Pending |
| PKT-30 | Edge Case | Specify | Pending |
| PKT-31 | Edge Case | Specify | Pending |
| PKT-32 | Edge Case | Specify | Pending |
| PKT-33 | Edge Case | Specify | Pending |

**Coverage:** 33 total, 0 mapped to tasks, 33 unmapped ⚠️

---

## Success Criteria

Como sabemos que o feature foi implementado com sucesso:

- [ ] Host pode alternar entre Livre / Pacote / Personalizado(em breve) no lobby
- [ ] 10 pacotes carregam do KV e são exibidos com emoji, nome, descrição e contagem
- [ ] Distribuição automática pula escrita e distribui cartas únicas do pacote
- [ ] Distribuição "Cada um escolhe" mostra 5 opções exclusivas por jogador com re-sort único
- [ ] Badge do pacote visível durante jogo e encerrada
- [ ] "Nova Partida" preserva modo, pacote e distribuição
- [ ] Placeholder "Personalizado — Em breve" com estilo fantasma/cadeado
- [ ] Todos os testes existentes continuam passando (regressão zero)
- [ ] Pacotes funcionam com 2 a 20 jogadores
