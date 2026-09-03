# Quem Sou Eu? na mesa — Spec

**Status**: Execute
**Branch**: `feat/poda-e-ajustes-de-mesa`

## O problema

Num aparelho só, o "Quem Sou Eu?" ainda finge ser a sala online: há vez, há
relógio de turno, há "Descobri!" com um confirmador escolhido pelo sistema, e o
aparelho tem de fugir de quem está na vez (`PJ-30`) porque a projeção dela
esconde justamente a carta que a mesa precisa ler.

Nada disso existe no jogo de papel. Com a mesa toda em volta de um celular, a
vez é da pessoa que está falando, o confirmador é quem estiver olhando, e a
carta na testa é uma folha que se levanta quando alguém quer relembrar. A
mecânica de turno não organiza nada aqui — só empurra o aparelho de mão em mão
e cobra toques que a mesa já resolveu em voz alta.

**Isto vale só para o modo local.** A sala online continua exatamente como está:
lá a vez, o relógio e a declaração são o que impede seis pessoas em seis
aparelhos de falarem por cima umas das outras.

## Escopo

Uma tela própria do modo local para a fase `jogo` do "Quem Sou Eu?", com o
tabuleiro de cartas viradas e uma saída.

Fora de escopo: mudar `shared/jogos/quem-sou-eu/**`. As regras continuam as
mesmas — a vez continua existindo no estado, e a tela local simplesmente não a
usa. O que o modo local muda é configuração e apresentação, como já fazia em
`PJ2-06` e `PJ2-16`.

## Critérios de aceite

| ID | Critério |
| --- | --- |
| `QSE-01` | Na fase `jogo` num aparelho só, todas as cartas aparecem viradas. Nenhuma vez, nenhum relógio, nenhum "Descobri!", nenhum "Passei a vez", nenhum "Pular a vez". |
| `QSE-02` | Cada carta tem um botão que a mostra; a carta aberta tem um botão que a esconde de volta. |
| `QSE-03` | Só uma carta fica aberta por vez: abrir a segunda fecha a primeira. |
| `QSE-04` | A carta de **qualquer** pessoa da roda pode ser aberta, inclusive a de quem está com o aparelho — a projeção esconde a carta do portador, então mostrar a dela move o aparelho para o vizinho seguinte antes de abrir. |
| `QSE-05` | O aparelho **não** persegue mais a vez (`PJ-30` deixa de valer): fora das voltas de segredo ele fica parado com quem está. |
| `QSE-06` | A partida acaba por "Encerrar partida", com confirmação — é a única saída da fase `jogo`, e ela revela tudo como já revelava. |
| `QSE-07` | Num aparelho só o "Tempo por turno" não aparece no formulário de regras e a partida nasce sem relógio de turno (`tempoTurnoSeg: null`), como `PJ-09` já faz com a ordem dos turnos. |
| `QSE-08` | A fase de escrita não muda: cada um continua escrevendo a carta do vizinho na volta do aparelho (`PJ-29`, `PJ2-07`). |
| `QSE-09` | A decisão de para quem o aparelho vai para abrir a carta de alguém mora em função pura, testável sem React. |

## Rastreabilidade

| ID | Fase | Status |
| --- | --- | --- |
| QSE-01 | Execute | Verified |
| QSE-02 | Execute | Verified |
| QSE-03 | Execute | Verified |
| QSE-04 | Execute | Verified |
| QSE-05 | Execute | Verified |
| QSE-06 | Execute | Verified |
| QSE-07 | Execute | Verified |
| QSE-08 | Execute | Verified |
| QSE-09 | Execute | Verified |

**Status values:** Pending → In Design → In Tasks → Implementing → Verified
