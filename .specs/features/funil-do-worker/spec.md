# Funil no Worker — Spec

**Status**: Execute
**Branch**: `feat/funil-do-worker`, a partir de `main` (`d000355`)

## O problema

Duas semanas de produção (20/ago a 03/set de 2026) deram **120 visitas e 130
pageviews**, todas diretas — zero referência de busca ou rede social. O produto
está rápido (LCP P75 de 1,5 s) e as salas funcionam: quatro códigos distintos
foram abertos por gente, um deles ~20 vezes.

O que **não** dá para saber: se quem abre a home cria sala, se a sala criada
recebe uma segunda pessoa, se a mesa montada chega a jogar. O `replaceState` de
[`App.tsx:132`](../../../client/src/App.tsx) troca o endereço sem gerar pageview
novo — e é deliberado, porque o app não tem histórico para o botão voltar
percorrer. Então o funil é invisível pelo Web Analytics, e continuaria invisível
num pico de mil visitas.

Isto existe para que a divulgação ensine alguma coisa. É instrumento de medida,
não de produto: nenhuma tela muda.

## Escopo

Quatro eventos, escritos pelo servidor, no Workers Analytics Engine.

Cinco eventos, contando o `partida_abandonada` que o Verifier mostrou faltar.

Fora de escopo: identificar pessoa, sessão ou dispositivo; qualquer coisa que
exija banner de consentimento; painel de leitura (a consulta é SQL na mão, e no
volume atual isso basta).

## Critérios de aceite

| ID | Critério |
| --- | --- |
| `FUN-01` | Sala criada com sucesso emite `sala_criada` com o `jogoId`. Colisão de código (409) não emite: sala que não nasceu não conta. |
| `FUN-02` | Entrada aceita emite `jogador_entrou` com a posição na ordem de chegada — 1 para quem cria a sala. Entrada recusada (sala cheia, apelido repetido, banido) não emite. |
| `FUN-03` | A transição de fase `lobby` → `escrita` ou `lobby` → `jogo` emite `partida_iniciada` com quantos jogadores havia. |
| `FUN-04` | A transição de qualquer fase para `encerrada` emite `partida_encerrada` com quantos jogadores havia. |
| `FUN-05` | Nenhum evento carrega apelido, id de jogador, token, IP, código de sala ou qualquer campo do chat. A sala é identificada pelo **id opaco do Durable Object**, que não serve para entrar em sala nenhuma. |
| `FUN-06` | A escrita é fire-and-forget. Telemetria que falha ou demora nunca derruba, atrasa ou altera um comando de jogo. |
| `FUN-07` | Sem o binding configurado — `wrangler dev` de quem clona o repo, testes, qualquer ambiente sem o dataset — tudo funciona igual e nada é escrito. |
| `FUN-11` | A sala que expira por inatividade **com partida em andamento** emite `partida_abandonada` com quantos jogadores havia. Lobby que expira sem partida não emite: nunca virou mesa, e isso já se vê em `sala_criada` sem `partida_iniciada`. |
| `FUN-08` | O beta escreve num dataset separado do de produção, como já acontece com o KV e o Durable Object. |
| `FUN-09` | A decisão de **qual** transição vira evento e **o que** vai dentro dele mora em módulo puro, testável sem Worker e sem rede. |
| `FUN-10` | O `core` continua sem conhecer jogo concreto (`AD-002`): o `jogoId` atravessa como string opaca. |

## Por que Analytics Engine e não contador próprio

Verificado na documentação em 03/09/2026: está no **plano Free** — 100 mil
pontos escritos por dia e 10 mil consultas por dia, retenção de três meses, teto
de 250 pontos por invocação. O volume de hoje é de dezenas de eventos por dia.

A alternativa era contador no KV que já existe. Perde para o Analytics Engine em
três coisas: exigiria desenhar chave e agregação à mão, não guarda série
temporal (só o total corrente), e escrita em KV é uma operação que pode falhar
no caminho do jogo — enquanto `writeDataPoint` é `void` e não bloqueia nada.

## Rastreabilidade

| ID | Fase | Status |
| --- | --- | --- |
| FUN-01 | Execute | Verified |
| FUN-02 | Execute | Verified |
| FUN-03 | Execute | Verified |
| FUN-04 | Execute | Verified |
| FUN-05 | Execute | Verified |
| FUN-06 | Execute | Verified |
| FUN-07 | Execute | Verified |
| FUN-08 | Execute | Verified |
| FUN-11 | Execute | Verified |
| FUN-09 | Execute | Verified |
| FUN-10 | Execute | Verified |

**Status values:** Pending → In Design → In Tasks → Implementing → Verified
