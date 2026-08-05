# Ajustes de uso real — Specification

**Feature:** `ajustes-uso-real`
**Feature pai:** `.specs/features/quem-sou-eu/` (MVP, validação PASS)
**Criado:** 2026-08-05
**Status:** aguardando aprovação
**Escopo (auto-sizing):** Large — muda requisitos existentes e o contrato compartilhado, mas não introduz arquitetura nova. Design fica inline; sem `design.md` próprio.

---

## Problem Statement

O MVP foi jogado de verdade pela primeira vez. Onze problemas apareceram — nenhum deles visível em teste automatizado, porque quase todos só existem quando gente de verdade usa celular de verdade: a tela apaga e a pessoa é expulsa da sala, o bloco de notas come letras enquanto se digita, o chat empurra a página para baixo sem parar, o cronômetro mostra 31 num turno de 30.

Junto vieram quatro mudanças de regra que só a experiência revela: 3 jogadores é um mínimo alto demais, a opção "continua jogando" não faz sentido, o tempo por turno precisa de valores fora dos presets, e a última pessoa com carta deveria poder continuar tentando em vez de a partida encerrar sozinha.

## Goals

- [ ] Desligar a tela do celular ou trocar de aba não tira ninguém da sala
- [ ] Os campos de texto se comportam como campos de texto
- [ ] Duas pessoas conseguem jogar
- [ ] A última pessoa com carta decide quando parar — não o software

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| Manter o WebSocket vivo com a tela apagada | Impossível: o navegador móvel suspende a aba em segundo plano. O que se controla é o **retorno** ser transparente |
| Notificação, som ou vibração | Não pedido |
| Editar mensagem enviada no chat | Não pedido |
| Persistir sala entre deploys | Salas são efêmeras por design (`CONN-07`, `CONN-08`) |

---

## Assumptions & Open Questions

| Assumption | Default escolhido | Rationale | Confirmed? |
| ---------- | ----------------- | --------- | ---------- |
| Faixa do tempo personalizado | 10 segundos a 60 minutos | Abaixo de 10s o turno não cabe numa pergunta; acima de 60min "sem limite" já resolve | n |
| Timer quando sobra **uma** pessoa no rodízio | Não corre. O prazo de turno é limpo | Cronômetro existe para passar a vez; sem para quem passar, ele só pressionaria sem função | n |
| "Pular a vez" do host quando sobra uma pessoa | Não é oferecido | Pular para a mesma pessoa é operação sem efeito | n |
| Entrada automática na sala | Só quando o código está na URL **e** existe token para aquele código | Entrar sozinho a partir da raiz do site seria surpreendente. O link de convite sempre carrega o código | n |
| Apelido guardado | Sim, junto do token, por sala | Sem isso a reentrada automática não teria o que exibir antes da primeira projeção | n |
| Configuração de sala já criada quando "continua jogando" some | Salas vivas passam a se comportar como "sai do rodízio" | Salas duram no máximo 6h e não sobrevivem a deploy; migração não se justifica | n |
| Mensagens de chat antigas, sem apelido gravado | Não existem — o chat morre com a sala | Não há histórico a migrar | y |

**Open questions:** none.

---

## User Stories

### P1: Voltar para a sala sozinho ⭐

**User Story**: Como jogador no celular, quero que apagar a tela ou trocar de aba não me tire da sala, para não ter que digitar código e apelido no meio da partida.

**Why P1**: É o problema que mais atrapalha o jogo. Party game no celular significa tela apagando o tempo todo.

**Acceptance Criteria**:

1. `AJU-01` — WHEN o cliente abre uma URL que contém código de sala e existe token guardado para **aquele** código THEN o sistema SHALL reconectar direto, sem exibir a tela de apelido
2. `AJU-02` — WHEN a aba volta a ficar visível e o socket está fechado THEN o sistema SHALL reconectar imediatamente, sem esperar o backoff
3. `AJU-03` — WHEN o cliente guarda a sessão THEN o sistema SHALL guardar também o apelido daquela sala, para exibi-lo antes da primeira projeção chegar
4. `AJU-04` — WHEN o token guardado é recusado pelo servidor (vaga liberada, sala expirada, jogador expulso) THEN o sistema SHALL descartá-lo e exibir a tela de entrada com o motivo
5. `AJU-05` — WHEN a reconexão automática está em andamento THEN o sistema SHALL indicar isso, e SHALL NOT exibir formulário de entrada nesse intervalo
6. `AJU-33` — WHEN um jogador entra numa sala por qualquer caminho — criando, digitando o código ou pelo link de convite — THEN o sistema SHALL refletir o código da sala na URL, para que a reentrada automática de `AJU-01` valha para todos e não só para quem chegou pelo convite

**Independent Test**: Entrar numa sala pelo celular, apagar a tela, esperar, reacender — voltar direto ao jogo sem digitar nada.

---

### P1: Jogar em dois ⭐

**User Story**: Como grupo pequeno, quero jogar com 2 pessoas, para não depender de uma terceira.

**Why P1**: Regra do produto; hoje o mínimo é 3 e trava o uso.

**Acceptance Criteria**:

1. `AJU-06` — WHEN a sala está em LOBBY com 2 ou mais jogadores ativos THEN o sistema SHALL habilitar a ação "Iniciar" ao host — **substitui `HOST-01`**, que exigia 3
2. `AJU-07` — WHEN uma redistribuição durante a ESCRITA deixaria menos de 2 ativos THEN o sistema SHALL cancelar a partida e devolver ao LOBBY — **substitui `ESCR-08`**, que usava 3
3. `AJU-08` — WHEN o sorteio ocorre com exatamente 2 jogadores THEN o sistema SHALL produzir o ciclo A→B→A, sem ponto fixo
4. `AJU-34` — WHEN a interface precisa do mínimo de jogadores THEN o sistema SHALL obtê-lo do contrato compartilhado, e SHALL NOT repetir o número no cliente — a duplicação é o que fez o servidor aceitar 2 enquanto a tela continuava exigindo 3

**Independent Test**: Criar sala, entrar com 2 pessoas, iniciar e jogar até o fim.

---

### P1: A última pessoa continua jogando ⭐

**User Story**: Como último jogador sem descobrir, quero continuar perguntando, para ter a chance de acertar em vez de o jogo revelar tudo na minha cara.

**Why P1**: Muda o desfecho da partida. Hoje o software encerra sozinho e tira a graça.

**Acceptance Criteria**:

1. `AJU-09` — WHEN a confirmação de "Descobri!" deixa **exatamente um** jogador no rodízio THEN o sistema SHALL manter a partida em JOGO com esse jogador — **substitui `DESC-08`**, que encerrava automaticamente
2. `AJU-10` — WHEN resta um único jogador no rodízio THEN o sistema SHALL manter a vez com ele indefinidamente e SHALL NOT avançar o rodízio
3. `AJU-11` — WHEN resta um único jogador no rodízio THEN o sistema SHALL limpar o prazo de turno e SHALL NOT agendar novo prazo
4. `AJU-12` — WHEN resta um único jogador no rodízio THEN o sistema SHALL oferecer a ele apenas "Descobri!", sem "Passei a vez", e SHALL NOT oferecer "Pular a vez" ao host
5. `AJU-13` — WHEN a declaração do último jogador é confirmada THEN o sistema SHALL revelar todas as cartas a todos e mover a sala para ENCERRADA
6. `AJU-14` — WHEN o rodízio fica **vazio** por saída de jogadores THEN o sistema SHALL encerrar a partida, preservando `FIM-05`

**Independent Test**: Com 3 jogadores, dois descobrem; o terceiro continua com a vez, sem cronômetro e sem botão de passar, até declarar.

---

### P1: Chat que não perde o nome de quem saiu ⭐

**User Story**: Como jogador, quero ver quem escreveu cada mensagem mesmo depois da pessoa sair, para o histórico continuar fazendo sentido.

**Why P1**: Hoje o histórico vira "quem saiu", o que apaga a conversa retroativamente.

**Acceptance Criteria**:

1. `AJU-15` — WHEN uma mensagem de jogador é registrada THEN o sistema SHALL gravar nela o apelido e a cor do autor no momento do envio — **estende `CHAT-01`**
2. `AJU-16` — WHEN o autor de uma mensagem sai da sala THEN o sistema SHALL continuar exibindo o apelido e a cor gravados na mensagem
3. `AJU-17` — WHEN um jogador troca de estado (desconecta, é expulso, vira host) THEN o sistema SHALL NOT alterar mensagens já registradas

**Independent Test**: Enviar mensagem, sair da sala, e ver o nome preservado no chat de quem ficou.

---

### P1: O host define o tamanho da sala ⭐

**User Story**: Como quem cria a sala, quero definir quantas pessoas cabem, para fechar a sala no tamanho que o grupo combinou.

**Why P1**: Hoje o teto é fixo em 20 para todo mundo. Um grupo de 5 não tem como impedir que a sala aceite mais gente.

**Acceptance Criteria**:

1. `AJU-35` — WHEN um visitante cria uma sala THEN o sistema SHALL permitir escolher o limite máximo de jogadores, entre o mínimo da partida e 20
2. `AJU-36` — WHEN a tela de criação é exibida THEN o sistema SHALL já trazer o limite preenchido com o padrão de 20, de modo que quem não quiser mexer crie a sala sem nenhum passo a mais
3. `AJU-37` — WHEN a sala atinge o limite escolhido THEN o sistema SHALL recusar novas entradas informando que a sala está cheia — **substitui o teto fixo de `SALA-05`**, que valia 20 para todas as salas
4. `AJU-38` — WHEN o limite informado não é inteiro ou está fora da faixa permitida THEN o sistema SHALL recusar a criação da sala
5. `AJU-39` — WHEN a lotação é exibida THEN o sistema SHALL mostrar o limite **daquela sala**, não o teto global
6. `AJU-40` — WHEN uma sala já existe THEN o sistema SHALL NOT permitir alterar o limite dela — a escolha vale para a sala inteira, feita na criação

**Independent Test**: Criar sala com limite 3, entrar com 3 pessoas e ver a quarta receber "sala cheia".

---

### P2: Configurações que fazem sentido

**User Story**: Como host, quero definir qualquer tempo por turno e não quero uma opção que não uso, para a configuração refletir como o grupo joga.

**Acceptance Criteria**:

1. `AJU-18` — WHEN a sala é configurada THEN o sistema SHALL NOT oferecer a escolha entre "continua jogando" e "sai do rodízio" — **remove `CFG-02` e `DESC-07`**; quem descobre sempre sai do rodízio (`DESC-06`)
2. `AJU-19` — WHEN o host define o tempo por turno THEN o sistema SHALL aceitar, além dos presets, qualquer valor entre **10 segundos e 60 minutos** — **estende `CFG-03`**
3. `AJU-20` — WHEN o host informa um tempo fora dessa faixa THEN o sistema SHALL recusar a configuração e manter a anterior
4. `AJU-21` — WHEN uma sala é criada THEN o sistema SHALL continuar aplicando os padrões de `CFG-05`, sem a opção removida

**Independent Test**: Definir 4 minutos por turno e ver o cronômetro respeitar isso.

---

### P2: Campos de texto que se comportam como campos de texto

**User Story**: Como jogador, quero digitar sem que o campo coma letras ou pule o cursor.

**Why P2**: O jogo funciona, mas escrever é desagradável — e o bloco de notas existe justamente para ser usado durante a partida.

**Acceptance Criteria**:

1. `AJU-22` — WHEN o jogador digita no bloco de notas THEN o sistema SHALL refletir cada tecla imediatamente na tela, sem depender de resposta do servidor
2. `AJU-23` — WHEN o jogador digita no bloco de notas THEN o sistema SHALL NOT reposicionar o cursor nem descartar caracteres
3. `AJU-24` — WHEN o jogador para de digitar THEN o sistema SHALL enviar o conteúdo ao servidor, sem um envio por tecla
4. `AJU-25` — WHEN chega uma projeção com notas diferentes do que está sendo digitado THEN o sistema SHALL preservar o texto local enquanto o campo estiver em edição
5. `AJU-26` — WHEN um campo tem limite de caracteres THEN o sistema SHALL impedir a digitação além do limite no próprio campo (apelido 16, carta 60, chat 300, notas 2.000), **mantendo intacta a validação do servidor** — a trava é conveniência, não regra

**Independent Test**: Digitar rápido um parágrafo no bloco de notas e ver o texto sair exatamente como digitado.

---

### P2: Cabeçalho e chat com o layout certo

**User Story**: Como jogador, quero um cabeçalho alinhado e um chat que não empurre a página.

**Acceptance Criteria**:

1. `AJU-27` — WHEN o cabeçalho é exibido THEN o sistema SHALL alinhar seus elementos de forma consistente entre os dois lados, em todas as larguras
2. `AJU-28` — WHEN o alternador de tema é exibido THEN o sistema SHALL apresentá-lo como ícone (sol e lua), com rótulo acessível
3. `AJU-29` — WHEN o chat é exibido THEN o sistema SHALL mantê-lo em altura limitada, com rolagem própria, sem alongar a página
4. `AJU-30` — WHEN chega mensagem nova e o chat está no fim THEN o sistema SHALL rolar para a mensagem nova; WHEN o jogador rolou para cima THEN o sistema SHALL NOT arrastá-lo de volta

**Independent Test**: Encher o chat de mensagens e ver a página manter a altura, com rolagem dentro do painel.

---

### P2: Cronômetro que mostra o tempo certo

**Acceptance Criteria**:

1. `AJU-31` — WHEN um turno de N segundos começa THEN o sistema SHALL exibir no máximo N — nunca N+1
2. `AJU-32` — WHEN resta menos de um segundo THEN o sistema SHALL continuar exibindo `0:01` até o vencimento, sem mostrar `0:00` antes de o servidor avançar a vez

**Causa conhecida**: `formatarTempo` arredonda para cima (`Math.ceil`), o que é correto para `AJU-32`. Como a projeção traz o instante absoluto de vencimento, qualquer defasagem positiva entre o relógio do cliente e o do servidor faz o restante passar de N segundos e o arredondamento exibir N+1. A correção é limitar ao teto da duração configurada — não trocar o arredondamento, que quebraria `AJU-32`.

---

## Edge Cases

- WHEN dois jogadores estão na sala e um sai durante o JOGO THEN o rodízio segue com o que restou, conforme `AJU-09`
- WHEN o último jogador do rodízio se desconecta sem sair THEN a vez continua sendo dele (`JOGO-11`), e o host encerra se quiser
- WHEN o host define tempo personalizado com a partida em andamento THEN a configuração é recusada (`CFG-04` mantém a sala em somente leitura fora do lobby)
- WHEN o jogador cola texto acima do limite num campo travado THEN o campo SHALL truncar no limite, e o servidor continua validando
- WHEN a aba volta a ficar visível e o socket ainda está aberto THEN nada acontece — nenhuma reconexão redundante
- WHEN existe token guardado para uma sala e o jogador abre a URL de **outra** sala THEN o token da outra sala não é usado
- WHEN uma mensagem de sistema é registrada THEN ela continua sem autor — `AJU-15` vale só para mensagem de jogador

---

## Requirement Traceability

| Requirement ID | Story | Substitui / estende | Status |
| -------------- | ----- | ------------------- | ------ |
| AJU-01 … AJU-05 | Voltar para a sala sozinho | estende `CONN-01`, `CONN-02` | Pending |
| AJU-06 … AJU-08 | Jogar em dois | **substitui** `HOST-01`, `ESCR-08` | Pending |
| AJU-09 … AJU-14 | A última pessoa continua | **substitui** `DESC-08` | Pending |
| AJU-15 … AJU-17 | Chat preserva o autor | estende `CHAT-01` | Pending |
| AJU-18 … AJU-21 | Configurações | **remove** `CFG-02`, `DESC-07`; estende `CFG-03` | Pending |
| AJU-22 … AJU-26 | Campos de texto | estende `NOTA-01`, `VIS-01` | Pending |
| AJU-27 … AJU-30 | Cabeçalho e chat | estende `VIS-01`, `CHAT-04` | Pending |
| AJU-31 … AJU-32 | Cronômetro | corrige `JOGO-07` | Pending |

| AJU-33 | Voltar para a sala sozinho | fecha buraco de `AJU-01` | Pending |
| AJU-34 | Jogar em dois | fecha buraco de `AJU-06` | Pending |
| AJU-35 … AJU-40 | O host define o tamanho da sala | **substitui** `SALA-05` | Pending |

**40 requisitos.** `AJU-33` e `AJU-34` nasceram durante o Execute: a metade de servidor de `AJU-01` e `AJU-06` foi entregue e a metade de interface não tinha task, então o comportamento não chegava ao usuário. O spec pai `quem-sou-eu/spec.md` é atualizado em conjunto: `HOST-01`, `ESCR-08`, `DESC-08`, `CFG-02`, `CFG-03`, `DESC-07` e `CHAT-01` passam a apontar para os ACs desta rodada.

---

## Success Criteria

- [ ] Uma partida inteira no celular sem ninguém cair por apagar a tela
- [ ] Duas pessoas jogam do início ao fim
- [ ] A última pessoa com carta continua tentando até declarar, sem cronômetro correndo
- [ ] O histórico do chat preserva o nome de quem saiu
- [ ] Digitar no bloco de notas é indistinguível de digitar num campo comum
- [ ] Um turno de 30s começa mostrando `0:30`
