# Hub de Seleção de Jogos Specification

## Problem Statement

O Resenha nasceu como hub de party games (`AD-001`), mas nada na arquitetura escolhe um jogo: `SalaDurableObject` (`server/index.ts`) nasce com `quemSouEu` fixo no construtor, e a tela Início cria uma sala com um único botão, sem escolha nenhuma. Antes de o Espião existir, é preciso que uma sala saiba **qual** jogo ela roda — sem essa base, o Espião entraria como uma reescrita, não uma adição.

## Goals

- [ ] Uma sala nasce vinculada a um jogo (`jogoId`), escolhido antes de criar, e a escolha é reconstruída na reconexão via projeção.
- [ ] O host pode trocar o jogo da sala enquanto ela está no lobby, sem precisar criar outra sala.
- [ ] O servidor recusa qualquer `jogoId` que não exista no registro do hub — cliente nenhum consegue forçar um jogo inexistente.
- [ ] A infraestrutura (registro de jogos, protocolo, telas) já está pronta para o Espião entrar como uma segunda entrada no registro, sem mexer nesta base de novo.

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature                                            | Reason                                                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| O jogo Espião em si (regras, telas, conteúdo)        | Feature própria, na sequência do roadmap. Este hub só prepara o lugar onde ele vai entrar.                       |
| Espião aparecer no seletor, mesmo desabilitado       | Decidido em discuss: só entra no seletor quando existir de verdade — nada de placeholder "em breve".             |
| Trocar jogo durante a partida ou depois de encerrada | Decidido em discuss: a troca só é válida em lobby; mudar de jogo no meio ou depois de uma partida não faz sentido — o caminho ali é `encerrar` e criar de novo. |
| Preservar configuração entre jogos diferentes        | Decidido em discuss: trocar de jogo sempre reseta para o padrão do jogo novo — não há tentativa de reaproveitar campo por campo. |
| Múltiplos jogos simultâneos por sala                 | Fora do modelo do produto — uma sala = uma partida de um jogo por vez (`AD-001`, `AD-003`).                      |

---

## Assumptions & Open Questions

Toda ambiguidade foi resolvida em `discuss` (nesta própria sessão, sem `context.md` separado por serem poucas perguntas). Registradas aqui para rastreabilidade:

| Assumption / decision                                                        | Chosen default                                                                 | Rationale                                                                                                   | Confirmed? |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| Onde a pessoa escolhe o jogo                                                  | Na tela Início (antes de criar) **e** dentro do lobby via "Mudar jogo" (host)    | Cobre os dois momentos naturais: decidir junto com a criação, ou mudar de ideia depois de já estar na sala.       | y          |
| Troca de jogo depois de criada a sala                                        | Permitida, só host, só em fase `lobby`                                          | Evita ter que recriar a sala (perder código, jogadores teriam que reentrar) por uma decisão que pode mudar cedo.  | y          |
| Espião no seletor antes de existir                                            | Não aparece — só quando o módulo do jogo existir de verdade                     | Evita placeholder morto na UI; o seletor já funciona igual quando o segundo jogo entrar, sem gambiarra a remover. | y          |
| Seletor de jogo aparece já, mesmo com 1 jogo só disponível                    | Sim — Início e "Mudar jogo" já mostram o fluxo completo, com 1 card             | Valida o fluxo de ponta a ponta agora; a chegada do Espião só acrescenta um card, não muda a navegação.           | y          |
| Configuração ao trocar de jogo                                               | Reseta para o padrão do jogo novo (`CONFIG_PADRAO` do jogo escolhido)            | Cada jogo tem sua própria config; carregar pacotes/dificuldade do Quem Sou Eu pro Espião não faz sentido nenhum.  | y          |
| Trocar de jogo para o **mesmo** jogo já ativo (só 1 jogo existe nesta rodada) | Idempotente — não reseta config à toa                                           | Reabrir o seletor e confirmar o mesmo jogo não deveria apagar pacotes escolhidos por acidente de navegação.       | y (inferido — ver nota abaixo) |
| `jogoId` desconhecido chega no servidor (criação ou troca)                   | Recusa (`JOGO_INVALIDO`), sala não muda                                         | Mesmo padrão de todo comando inválido do `core` — nunca aceita um estado que o servidor não sabe operar.          | y (inferido) |

**Nota sobre os dois itens "inferido":** não foram perguntas literais em `discuss`, mas decorrem diretamente de respostas já dadas (idempotência: consequência de "reseta pro padrão" + "não faz sentido resetar à toa"; validação: mesmo padrão de todo outro comando do `core`, já coberto por `COMANDO_INVALIDO`/`FASE_INVALIDA` existentes). Sinalizados aqui para o dono confirmar ou corrigir antes do Design avançar.

**Open questions:** nenhuma sem resposta — tudo acima está resolvido ou assumido com racional.

---

## User Stories

### P1: Escolher o jogo ao criar a sala ⭐ MVP

**User Story**: Como quem vai criar uma sala, eu quero escolher qual jogo jogar antes de criar a sala, para que a sala já nasça pronta para aquele jogo.

**Why P1**: Sem isso não existe hub — hoje toda sala nasce presa ao Quem Sou Eu por acidente de código, não por escolha.

**Acceptance Criteria**:

1. WHEN a pessoa abre a tela Início THEN o sistema SHALL mostrar os jogos disponíveis para escolher, com o Quem Sou Eu pré-selecionado (hoje, o único).
2. WHEN a pessoa confirma a criação da sala THEN o sistema SHALL enviar o `jogoId` escolhido no pedido de criação.
3. WHEN o servidor recebe um pedido de criação com um `jogoId` que não existe no registro do hub THEN o sistema SHALL recusar a criação sem abrir a sala.
4. WHEN o servidor recebe um pedido de criação sem `jogoId` nenhum THEN o sistema SHALL criar a sala com o jogo padrão do hub (Quem Sou Eu).
5. WHEN a sala é criada com sucesso THEN o sistema SHALL persistir o `jogoId` escolhido como parte do estado da sala, para toda a vida dela.

**Independent Test**: Criar uma sala pela tela Início, confirmar (via projeção/estado) que ela nasceu com `jogoId: 'quem-sou-eu'`; tentar criar via API direta com um `jogoId` inventado e confirmar recusa.

---

### P2: Trocar o jogo da sala no lobby

**User Story**: Como host de uma sala que ainda não começou a partida, eu quero trocar o jogo da sala, para não precisar criar uma sala nova só porque mudei de ideia.

**Why P2**: Não é o caminho mínimo pra validar a arquitetura (P1 já prova isso), mas é a segunda metade combinada em `discuss` e o que faz o hub parecer um hub de verdade, não só uma escolha de largada.

**Acceptance Criteria**:

1. WHEN o host está no lobby THEN o sistema SHALL mostrar um controle "Mudar jogo" que reabre o seletor de jogos.
2. WHEN alguém que não é host está no lobby THEN o sistema SHALL mostrar o nome do jogo atual e SHALL permitir abrir o catálogo em leitura — a lista dos jogos e o "como jogar" de cada um —, sem nenhum controle de troca (`VIS-04` proíbe a **ação** de host na tela de quem não pode fazê-la; ler o catálogo não mexe na sala).
3. WHEN o host confirma a troca para um jogo diferente do atual THEN o sistema SHALL mudar o `jogoId` da sala e resetar `config` para o padrão do jogo novo.
4. WHEN o host confirma a troca para o **mesmo** jogo que já está ativo THEN o sistema SHALL manter a `config` como estava (não resetar à toa).
5. WHEN alguém que não é host tenta trocar o jogo (comando direto, fora da UI) THEN o sistema SHALL recusar com o mesmo erro de autoridade usado em toda ação host-only.
6. WHEN a sala não está na fase `lobby` (partida em andamento ou encerrada) THEN o sistema SHALL recusar qualquer tentativa de trocar de jogo.
7. WHEN a troca de jogo é aceita THEN o sistema SHALL refletir o novo `jogoId` e a `config` resetada na projeção de todos os jogadores conectados, imediatamente.

**Independent Test**: Com uma sala em lobby e pacotes configurados, mandar o comando de trocar jogo como host, confirmar que `config` volta ao padrão e a projeção de outro jogador conectado atualiza sozinha; repetir como não-host e confirmar recusa.

---

### P3: Registro do hub pronto para o segundo jogo

**User Story**: Como pessoa desenvolvendo o Espião na sequência, eu quero que adicionar um jogo ao hub seja registrar um módulo novo, para não precisar tocar de novo em `core`, protocolo ou nas telas de seleção.

**Why P3**: É consequência de P1+P2 bem implementados, não uma entrega própria — existe como critério de qualidade da arquitetura, verificável só quando o Espião (fora desta feature) for de fato registrado.

**Acceptance Criteria**:

1. WHEN um novo módulo de jogo é adicionado ao registro do servidor THEN o sistema SHALL passar a aceitá-lo em criação e troca sem exigir mudança em `core/despacho.ts` ou `core/sala-do.ts`.
2. WHEN um novo jogo é adicionado ao registro do cliente THEN o sistema SHALL passar a listá-lo no seletor (Início e "Mudar jogo") sem exigir mudança de estrutura nas duas telas.

**Independent Test**: Não testável isoladamente com dados reais nesta rodada (não há segundo módulo ainda) — verificado por revisão de código no Design/Execute: o ponto de registro é único e documentado, e nenhuma lógica de seleção depende do nome literal `'quem-sou-eu'` fora do próprio registro.

---

## Edge Cases

- WHEN o registro do hub tem apenas um jogo (estado atual) THEN o seletor SHALL mostrar exatamente um card, já selecionado, sem impedir a criação da sala.
- WHEN o host abre "Mudar jogo" e cancela sem confirmar THEN o sistema SHALL manter o jogo e a config exatamente como estavam.
- WHEN um jogador entra numa sala já existente (reconexão ou link) THEN a projeção SHALL informar o `jogoId` atual da sala, para o cliente saber que tela de jogo renderizar.
- WHEN o `jogoId` de uma sala existente não está mais no registro do servidor (jogo removido/renomeado) THEN o sistema SHALL recusar novas trocas para esse estado, mas isso é cenário operacional (deploy), não caminho de usuário — não modelado como erro de comando.

---

## Requirement Traceability

| Requirement ID | Story                          | Phase  | Status    |
| --------------- | ------------------------------- | ------ | --------- |
| HUB-01           | P1: Escolher jogo ao criar      | Design | Verified  |
| HUB-02           | P1: Escolher jogo ao criar      | Design | Verified  |
| HUB-03           | P1: Escolher jogo ao criar      | Design | Verified  |
| HUB-04           | P1: Escolher jogo ao criar      | Design | Verified  |
| HUB-05           | P1: Escolher jogo ao criar      | Design | Verified  |
| HUB-06           | P2: Trocar jogo no lobby        | Design | Verified  |
| HUB-07           | P2: Trocar jogo no lobby        | Design | Verified  |
| HUB-08           | P2: Trocar jogo no lobby        | Design | Verified  |
| HUB-09           | P2: Trocar jogo no lobby        | Design | Verified  |
| HUB-10           | P2: Trocar jogo no lobby        | Design | Verified  |
| HUB-11           | P2: Trocar jogo no lobby        | Design | Verified  |
| HUB-12           | P2: Trocar jogo no lobby        | Design | Verified  |
| HUB-13           | P3: Registro pronto pro Espião  | Design | Verified  |
| HUB-14           | P3: Registro pronto pro Espião  | Design | Verified  |

**ID format:** `HUB-[NUMBER]`, mapeado em ordem às ACs de P1 (01–05), P2 (06–12) e P3 (13–14) acima.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, cobertos em `design.md` (registro `jogoId → JogoDaSala<unknown>`, comando `trocarJogo`, catálogo `shared/`), 0 mapped to tasks — próxima fase é Tasks.

---

## Success Criteria

- [ ] Criar sala pela UI escolhe o jogo e a sala nasce com o `jogoId` certo.
- [ ] Host troca de jogo no lobby sem sair da sala, config reseta, todo mundo vê a mudança na hora.
- [ ] Não-host nunca vê controle de troca, só o jogo atual.
- [ ] `jogoId` inválido é recusado tanto na criação quanto na troca.
- [ ] Nenhum teste ou tela depende do literal `'quem-sou-eu'` fora do ponto único de registro (verificável por grep no Design/Execute).
