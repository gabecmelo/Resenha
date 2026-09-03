# Espião — a expulsão que não acaba a partida

**Status**: Execute
**Branch**: `feat/poda-e-ajustes-de-mesa`

## O problema

Hoje toda expulsão decide a partida. Errar o alvo entrega o jogo aos espiões na
hora; acertar abre o chute do local e acaba ali de qualquer jeito. Na prática a
partida dura uma votação — a mesa tem uma bala, e depois de gastá-la não há mais
jogo, só resultado.

No jogo de mesa não é assim: expulsar alguém tira essa pessoa da rodada, e quem
ficou continua. Só a votação final decide.

Vale nos dois modos: o online e o passa e joga.

## Escopo

Duas configurações no Espião, e o estado de quem saiu da rodada.

Fora de escopo: uma `Situacao` nova no `core`. Sair da rodada é regra deste
jogo; uma terceira situação no protocolo obrigaria os outros quatro jogos a ter
opinião sobre ela (`AD-002`, `AD-014`).

## Critérios de aceite

| ID | Critério |
| --- | --- |
| `ESP-51` | Com `expulsarContinua` (padrão **ligado**), expulsar um inocente numa votação que a mesa chamou tira ele da rodada e a partida segue: sem vencedor, sem `encerrada`, com o relógio voltando de onde parou. |
| `ESP-51a` | Desligada, a expulsão de um inocente volta a entregar a partida aos espiões (`ESP-43`). |
| `ESP-51b` | Na **votação final** o erro custa a partida mesmo com a opção ligada: não há rodada pra continuar. |
| `ESP-51c` | A rodada só continua se sobrarem pelo menos `MIN_JOGADORES_ESPIAO` jogando **e** ao menos um não-espião. Sem isso a expulsão volta a encerrar. |
| `ESP-51d` | Quem foi expulso não vota, não é votado e não abre votação. Continua na sala vendo tudo. |
| `ESP-51e` | Toda contagem de mesa passa a ser sobre quem está na rodada: a votação seguinte fecha sozinha sem esperar o voto de quem saiu, e `totalAtivos` não conta expulsos. |
| `ESP-51f` | A mesa vê quem está fora, na tela de jogo. Quem foi expulso é público — ao contrário de quem é espião. |
| `ESP-52` | Com `chuteDoEspiaoPego` (padrão **desligado**), o espião expulso não tem última cartada: a mesa vence na hora e a partida encerra. |
| `ESP-52a` | Ligada, volta o comportamento de hoje: `chutePendente`, prazo de chute, e a partida se decide no chute (`ESP-44`, `ESP-45`). |
| `ESP-53` | As duas opções aparecem no formulário de regras nos dois modos e atravessam o `configurar` do servidor. |

## Os padrões mudam

**Esta é a única mudança de comportamento sem opt-in da feature, e é
deliberada** — o usuário pediu os padrões do jogo de mesa, não os de hoje:

- Expulsar inocente **não** acabava a partida antes desta versão? Acabava.
  Agora não acaba mais, por padrão.
- Pegar o espião abria o chute? Abria. Agora encerra na hora, por padrão.

Quem quiser o comportamento anterior liga um e desliga o outro.

## Rastreabilidade

| ID | Fase | Status |
| --- | --- | --- |
| ESP-51 | Execute | Verified |
| ESP-51a | Execute | Verified |
| ESP-51b | Execute | Verified |
| ESP-51c | Execute | Verified |
| ESP-51d | Execute | Verified |
| ESP-51e | Execute | Verified |
| ESP-51f | Execute | Verified |
| ESP-52 | Execute | Verified |
| ESP-52a | Execute | Verified |
| ESP-53 | Execute | Verified |

**Status values:** Pending → In Design → In Tasks → Implementing → Verified
