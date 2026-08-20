# Redesign Bancada — o que ficou esperando você

Você respondeu os seis pontos abaixo e **todos já estão no código**, verificados
no navegador com três sessões (fluxo completo de Espião, 375px e 1280px). Este
arquivo fica como registro do que foi decidido e por quê.

## Respondidos e implementados

1. **Veredito da revelação** — a projeção do Espião ganhou `resultadoVotacao`
   (`ESP-29`…`ESP-33`): quem foi acusado, quantos votos teve, quantos precisava,
   se a mesa acertou, e o mapa completo de quem votou em quem. O mapa aparece
   **mesmo com `visibilidadeVoto: 'oculta'`** — o sigilo vale enquanto a votação
   corre, não depois. Encerrar na mão continua sem veredito (`ESP-34`): não houve
   aposta coletiva a julgar.
2. **Quem abriu a votação** — `votacaoAberta.abertaPor` (`ESP-27`). Sem gênero:
   "Bia abriu a votação". Quando é o relógio que abre, ninguém é citado.
3. **Relógio pausado com o valor congelado** — resolvido junto com a pausa
   (`ESP-35`): o servidor guarda o tempo que faltava e a faixa mostra `⏸ 4:37`,
   não mais `⏸ pausado`.
4. **"Voltar ao lobby"** — um botão só, que envia `novaPartida`. De lá a mesa
   decide se troca as regras, troca de jogo ou só começa de novo.
5. **Enigmas Sinistros** — entrou no catálogo como `emBreve`, atrás de terminar o
   Espião e o Cartas Contra a Turma.
6. **Papel do Espião** — o alternador foi pro fim da linha do rótulo (direita),
   onde o polegar já está no celular.

## O que veio junto, por decorrência

- A votação virou um momento fechado, no espírito do Among Us: abre com dono e
  relógio próprio (`config.espiao.tempoVotacaoSeg`, nova regra no lobby, padrão
  1min), fecha sozinha no tempo ou quando todo mundo já votou, mostra o
  resultado por uma janela curta e devolve a rodada com o relógio cheio.
- Os três relógios da partida (rodada, votação, resultado) são multiplexados no
  mesmo prazo `turno`, no espírito do `AD-010` — `TIPOS_DE_PRAZO` não mudou.
- `ContextoDeSala` ganhou `prazoTurno`: o jogo precisa saber quanto faltava pra
  poder congelar e devolver esse tempo, sem alcançar `sala.prazos` (`AD-009`).

## Ainda em aberto

Nada bloqueando. O que sobrou é escolha de conteúdo, não de contrato:

- A janela de resultado é fixa em 12s e **não** é configurável. Se na mesa real
  isso parecer curto pra ler o mapa de votos em voz alta, é um número só
  (`JANELA_DE_RESULTADO_MS`, em `shared/protocolo.ts`).
