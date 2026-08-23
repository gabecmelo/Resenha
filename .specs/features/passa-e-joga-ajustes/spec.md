# Passa e Joga: ajustes de mesa — Specification

## Problem Statement

O Passa e Joga foi construído reaproveitando as telas da sala online, e essa foi a decisão certa: um reducer só, uma projeção só, nenhuma segunda implementação das regras. Mas o preço apareceu ao jogar de verdade numa mesa.

O modo online supõe **um aparelho por pessoa e todo mundo tocando ao mesmo tempo**. Quase toda fricção desta rodada vem de herdar essa suposição num aparelho só:

- A **votação do Dedo na Cara** espera que cada um toque no próprio celular. Com um aparelho, isso vira uma fila de N toques pra decidir uma coisa que a mesa já decidiu em voz alta — o jogo trava.
- A **votação do Espião** espera o mesmo, e é pior: a tela mostra "1 de 5 votos" e fica esperando um relógio vencer que ninguém quer esperar.
- O **Quem Sou Eu** manda o aparelho circular pra escrever e depois cai direto no jogo, com um rodapé de "esconder e passar" que não diz o que está acontecendo — e que continua aparecendo na última pessoa, quando não há mais ninguém pra quem passar.
- O **fim de partida** só oferece "jogar de novo" com a mesma configuração. Trocar de jogo na mesma mesa exige sair, perder tudo e redigitar os nomes.
- A **moldura da sala** — código, botão de copiar convite, avisos de "sua vaga será liberada" — aparece num modo onde não existe sala, vaga nem convite.

O eixo desta rodada é um só: **num aparelho só, quem julga é a mesa; o aparelho registra** (`AD-003`, `AD-015`). Onde o online precisa de votação porque as pessoas estão longe, o local precisa de um toque só, dado por quem está segurando o celular, porque as pessoas estão à vista uma da outra.

## Goals

- [ ] Nenhuma tela do modo local espera **mais de uma pessoa tocar** pra avançar.
- [ ] Uma tela, uma coisa: em nenhum momento o rodapé oferece uma ação que não é a ação daquela tela.
- [ ] A mesa troca de jogo **sem redigitar os nomes**.
- [ ] Nada que só existe em sala online — código, convite, vaga, host — aparece no modo local.
- [ ] As regras online continuam **byte a byte** as de hoje: toda mudança de comportamento é do modo local ou de config que o online não liga.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Cartas Contra a Turma | Continua fora do Passa e Joga, pelo mesmo motivo de sempre: mão privada o tempo todo. |
| Mudar o comportamento da sala online | Nenhum item desta rodada é queixa do modo online. Onde uma config nova aparece, o valor padrão é o de hoje. |
| Placar entre partidas | Segue sendo da partida. |
| Harness de teste de componente | Segue não existindo; o que precisa de prova continua morando em módulo puro. |
| Renomear Enigmas Sinistros | Fila separada, com redirect. Não se mistura com esta rodada. |

## Requirements

### P1: A moldura e a porta

1. WHEN a tela inicial oferece o modo de um aparelho só THEN o sistema SHALL chamá-lo pelo nome próprio — "ir para o Passa e Joga" — e não descrevê-lo como uma opção de jogar
2. WHEN qualquer tela roda no modo local THEN o sistema SHALL omitir a moldura da sala inteira: o código, o botão de copiar convite e o disco de sala não SHALL existir no DOM
3. WHEN a mesa toca em sair no modo local THEN o sistema SHALL confirmar apenas o que é verdade ali — que a configuração da mesa se perde — e SHALL NOT falar em vaga liberada, host ou sala

### P2: Os pacotes

4. WHEN a mesa entra no modo de jogo por pacotes THEN o sistema SHALL começar com **nenhum** pacote marcado
5. WHEN nenhum pacote está marcado THEN o sistema SHALL impedir o começo da partida e SHALL dizer o que falta, em vez de recusar com erro depois do toque

### P3: O Quem Sou Eu em telas

6. WHEN a partida de Quem Sou Eu monta os pares no modo local THEN o sistema SHALL fazer cada um escrever a carta do **vizinho seguinte na roda**, fechando o círculo — a ordem digitada é a ordem de escrita e a ordem de passagem
7. WHEN alguém termina de escrever a carta do vizinho THEN o sistema SHALL mostrar essa carta em letra grande, com o aviso de que o dono dela não pode olhar, antes de o aparelho andar
8. WHEN a carta está à vista da mesa THEN o sistema SHALL oferecer **uma** ação — passar adiante — e SHALL NOT oferecer esconder, editar ou começar na mesma tela
9. WHEN a última pessoa da roda termina de escrever THEN o sistema SHALL NOT oferecer passar o aparelho a ninguém, e SHALL parar numa tela de começar a partida
10. WHEN o rodapé de uma tela do modo local é desenhado THEN o sistema SHALL oferecer somente a ação daquela tela

### P4: O Espião sem urna

11. WHEN a rodada de Espião corre no modo local THEN o sistema SHALL NOT abrir votação por toque de cada jogador, e SHALL NOT exibir contagem de votos
12. WHEN a mesa decide acusar alguém THEN o sistema SHALL registrar a acusação num toque só, dado por quem está com o aparelho, numa tela que lista os jogadores
13. WHEN a pessoa acusada é o espião THEN o sistema SHALL oferecer o chute do local a ela, na mesma passagem de aparelho, e SHALL registrar o resultado
14. WHEN a acusação é registrada THEN o sistema SHALL NOT voltar à volta de revelação de papéis em nenhum momento
15. WHEN a rodada de Espião termina THEN o sistema SHALL manter o placar da partida como já faz hoje

### P5: O Dedo na Cara sem urna

16. WHEN a carta do Dedo na Cara está na mesa no modo local THEN o sistema SHALL NOT esperar um toque de cada jogador
17. WHEN a mesa decide quem levou a carta THEN o sistema SHALL registrar num toque só quem foi, seguido de uma confirmação, e SHALL então avançar pra próxima carta
18. WHEN a próxima carta vai entrar THEN o sistema SHALL contar 3, 2, 1 antes de mostrá-la

### P6: Os Enigmas

19. WHEN quem narra um enigma quer escrever as perguntas THEN o sistema SHALL permitir esconder a solução sem sair da tela, e SHALL permitir mostrá-la de novo
20. WHEN alguém toca em quem desatou o enigma THEN o sistema SHALL pedir uma segunda confirmação antes de registrar
21. WHEN o próximo enigma vai entrar THEN o sistema SHALL contar 3, 2, 1, com a mesma contagem do Dedo na Cara

### P7: O lobby local

22. WHEN uma partida local termina THEN o sistema SHALL oferecer **voltar ao lobby da mesa**, além de jogar de novo
23. WHEN a mesa volta ao lobby local THEN o sistema SHALL manter os nomes já digitados, na mesma ordem
24. WHEN a mesa está no lobby local THEN o sistema SHALL permitir trocar de jogo sem redigitar nome nenhum
25. WHEN a mesa troca de jogo no lobby local THEN o sistema SHALL resetar as regras do jogo anterior, como o lobby online já faz

## Requirements Traceability

| ID | Block | Phase | Status |
| --- | --- | --- | --- |
| PJ2-01 | P1: A moldura e a porta | Design | In Design |
| PJ2-02 | P1: A moldura e a porta | Design | In Design |
| PJ2-03 | P1: A moldura e a porta | Design | In Design |
| PJ2-04 | P2: Os pacotes | Design | In Design |
| PJ2-05 | P2: Os pacotes | Design | In Design |
| PJ2-06 | P3: O Quem Sou Eu em telas | Design | In Design |
| PJ2-07 | P3: O Quem Sou Eu em telas | Design | In Design |
| PJ2-08 | P3: O Quem Sou Eu em telas | Design | In Design |
| PJ2-09 | P3: O Quem Sou Eu em telas | Design | In Design |
| PJ2-10 | P3: O Quem Sou Eu em telas | Design | In Design |
| PJ2-11 | P4: O Espião sem urna | Design | In Design |
| PJ2-12 | P4: O Espião sem urna | Design | In Design |
| PJ2-13 | P4: O Espião sem urna | Design | In Design |
| PJ2-14 | P4: O Espião sem urna | Design | In Design |
| PJ2-15 | P4: O Espião sem urna | Design | In Design |
| PJ2-16 | P5: O Dedo na Cara sem urna | Design | In Design |
| PJ2-17 | P5: O Dedo na Cara sem urna | Design | In Design |
| PJ2-18 | P5: O Dedo na Cara sem urna | Design | In Design |
| PJ2-19 | P6: Os Enigmas | Design | In Design |
| PJ2-20 | P6: Os Enigmas | Design | In Design |
| PJ2-21 | P6: Os Enigmas | Design | In Design |
| PJ2-22 | P7: O lobby local | Design | In Design |
| PJ2-23 | P7: O lobby local | Design | In Design |
| PJ2-24 | P7: O lobby local | Design | In Design |
| PJ2-25 | P7: O lobby local | Design | In Design |

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

## Confirmed Assumptions

| # | Assumption | Confirmed by |
| --- | --- | --- |
| 1 | A volta de escrita do Quem Sou Eu mostra a carta de **quem vai receber o aparelho**: Ana escreve a do Bruno, a mesa vê a carta do Bruno, o aparelho vai pro Bruno, que escreve a da Carla. O sorteio vira uma cadeia pela ordem da roda. | Resposta direta do usuário |
| 2 | No Espião o aparelho continua sendo relógio, e a acusação e o chute do local acontecem por toque de quem segura o aparelho — não por votação de todos. O placar continua. | Escolha "Relógio + acusação e chute por toque de quem segura" |
| 3 | Toda mudança vale **só no modo local**. Onde uma config nova for necessária, o valor padrão preserva o comportamento online de hoje. | Nenhum item da lista é queixa do modo online |

## Open Questions

| # | Question | Blocking? |
| --- | --- | --- |
| 1 | A contagem 3-2-1 é pulável por toque, ou sempre corre inteira? Assumindo **pulável**: uma mesa que já está pronta não deve esperar o app. | Não |
