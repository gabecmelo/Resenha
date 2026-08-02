# Resenha — Prompts para o Claude Design

Cole em ordem, na **mesma conversa**. O Prompt 1 cria o sistema de design; os demais dizem "use o sistema
que você já criou". Depois do 1, os prompts 2–6 podem vir em qualquer ordem. Direção estética travada:
**clean e minimalista, mobile-first, uma cor de acento, hierarquia por tipografia e não por caixas**,
tema claro **e** escuro obrigatórios.

---

## Prompt 1 — Fundação e sistema de design

```
Você vai desenhar um site chamado Resenha: um hub de party games para jogar com amigos pelo navegador. A interface é em português do Brasil. O primeiro jogo é "Quem Sou Eu?" — cada pessoa recebe uma carta com um nome (personagem, filme, livro, série, pessoa real) que TODOS veem menos ela, e vai fazendo perguntas de sim/não até adivinhar quem é.

Detalhe fundamental que define o produto: as perguntas e respostas acontecem FORA do site, por voz ou presencialmente. O site é o TABULEIRO, não o juiz. Não existe placar, ranking, pontuação, vencedor, gamificação ou confete. A interface nunca compete com a conversa — ela responde em silêncio a três perguntas: qual é a carta de cada um, de quem é a vez, e o que eu faço agora.

Estética: CLEAN E MINIMALISTA de verdade. Muito espaço em branco, UMA cor de acento só, tipografia sans-serif de leitura fácil, hierarquia construída por tamanho e peso de fonte em vez de caixas, bordas e sombras.

EVITE o visual do Gartic Phone: ele é referência de fluxo (entra com código, escolhe apelido, joga), NÃO de aparência. Nada de roxo e amarelo saturados, molduras grossas, sombras duras ou ilustração escrachada. Evite também o extremo oposto: dashboard corporativo cinza está igualmente errado — isso é uma brincadeira entre amigos, não uma ferramenta de trabalho.

MOBILE-FIRST. Projete para 360px de largura primeiro; depois verifique em 390px, 768px e 1280px. No desktop, use o espaço horizontal de verdade — não entregue um mobile esticado. Nenhuma tela pode ter rolagem horizontal.

Comece criando o SISTEMA DE DESIGN completo, com tema claro E escuro (os dois de primeira classe, não derive um do outro).

Defina e mostre:

1. Tokens: paleta, tipografia, escala de espaçamento, raios e sombras.

2. Uma PALETA DE JOGADORES separada da paleta da interface: 20 cores distinguíveis entre si, que funcionem nos dois temas, usadas para identificar cada jogador na lista, nas cartas e no chat. Requisito rígido: a cor NUNCA pode ser o único diferenciador entre dois jogadores — o apelido sempre aparece junto, e o design precisa continuar legível para quem tem daltonismo. Mostre as 20 lado a lado nos dois temas.

3. Estes componentes compartilhados, cada um com TODOS os seus estados:
   - CARTA (o componente mais importante do produto): mostra o nome que outra pessoa escreveu. Estados: carta de outro jogador (texto legível, é o estado normal); A SUA CARTA, OCULTA; a sua carta revelada; carta de um jogador que já descobriu. A sua carta oculta precisa parecer um espaço que o jogo GUARDA para você, deliberadamente vazio — jamais um erro de carregamento ou um dado faltando. Esse é o coração do produto, capriche.
   - Ficha de jogador: apelido + cor. Estados: normal; "você"; host; desconectado; já descobriu; pronto; é a vez dele.
   - Indicador de vez: é a SUA vez; é a vez de outra pessoa; com contagem regressiva correndo; contagem quase no fim; sem limite de tempo.
   - Chat: mensagem de jogador (com a cor do autor) e mensagem de sistema (visualmente distinta, é um aviso do jogo). Estados: com mensagens; vazio.
   - Bloco de notas pessoal: vazio; com texto; recolhido.
   - Campo de texto com contador de caracteres: vazio; preenchido; no limite; acima do limite.
   - Modal de confirmação: padrão e destrutivo (expulsar alguém, encerrar a partida).
   - Banner de conexão: reconectando; desconectado; sala expirada.
   - Botão: primário, secundário, destrutivo e DESABILITADO. Regra rígida: botão desabilitado sempre mostra o motivo ao lado ou abaixo. "Iniciar" apagado sem explicação é o jeito mais fácil de travar um grupo de amigos.

4. O shell do site: marca "Resenha", indicação da sala em que você está e o código dela, e uma forma de sair. O shell é mínimo — quase toda a tela pertence ao jogo.

Entregue o design system e o shell antes de partir para telas específicas.
```

---

## Prompt 2 — Início e entrada na sala

```
Usando o sistema de design que você acabou de criar, desenhe a tela de INÍCIO.

É a porta de entrada do site. Duas ações apenas: CRIAR UMA SALA ou ENTRAR EM UMA SALA com um código de 5 letras. Quem chega por link compartilhado já vem com o código preenchido e só precisa digitar o apelido. Do clique no link até estar dentro da sala devem existir no máximo 2 interações — otimize essa tela para isso.

O apelido tem de 2 a 16 caracteres. Não existe cadastro, senha, e-mail ou login em lugar nenhum do produto.

Desenhe TODOS estes estados (cada um é obrigatório):
- Inicial, sem nada preenchido.
- Chegando por link, com o código já preenchido e o foco no apelido.
- Digitando o código manualmente (5 letras maiúsculas, sem as letras I e O e sem os números 0 e 1, porque o código é ditado em voz alta).
- Erro: "sala não encontrada" — precisa oferecer criar uma sala nova ali mesmo.
- Erro: sala cheia (o limite é 20 jogadores).
- Erro: apelido curto ou longo demais.
- Erro: "esse apelido já está na sala".
- Erro: "você foi removido desta sala".
- Erro: "esta sala expirou".
- Carregando / conectando.

Tema claro e escuro.
```

---

## Prompt 3 — Lobby

```
Usando o mesmo sistema, desenhe o LOBBY — a sala antes da partida começar.

Conteúdo:
- O código da sala em destaque (ele é ditado em voz alta) e um botão que copia o link de convite.
- A lista de jogadores presentes, cada um com seu apelido e sua cor. De 3 a 20 pessoas.
- As configurações da partida, que SÓ o host altera: ordem dos turnos (sorteada ou por ordem de entrada); quem descobre "continua jogando" ou "sai do rodízio"; tempo por turno (sem limite, 30s, 60s, 90s, 2min). Quem não é host vê as mesmas configurações em modo somente leitura — precisa ficar claro que são as regras da partida, não controles quebrados.
- Ações do host: Iniciar, expulsar um jogador, passar o comando para outro jogador.
- Chat.

REGRA RÍGIDA: ações de host NÃO aparecem para quem não é host. Não ficam desabilitadas nem acinzentadas — não existem na tela dele.

Desenhe TODOS estes estados:
- Só o host na sala, esperando gente chegar (é o primeiro estado que qualquer criador de sala vê — trate como onboarding, ele precisa entender que deve compartilhar o link).
- 2 jogadores: ainda não dá para iniciar. O botão Iniciar está desabilitado E diz que precisa de pelo menos 3.
- 3 jogadores: mínimo atingido, Iniciar liberado.
- 20 jogadores em tela de 360px — este é o caso de estresse do layout, resolva ele de verdade.
- A mesma sala vista por quem NÃO é host.
- Um jogador desconectado na lista (ele nunca perde a vaga, só aparece marcado).
- Modal de confirmação de expulsar, nomeando a pessoa.

Tema claro e escuro.
```

---

## Prompt 4 — Escrita das cartas

```
Usando o mesmo sistema, desenhe a fase de ESCRITA — o momento em que as cartas são criadas.

Como funciona: o sistema sorteia, tipo amigo secreto, quem escreve para quem. Cada jogador recebe UMA pessoa como alvo e escreve a carta dela — o nome que aquela pessoa vai ter que adivinhar. Ninguém escreve para si mesmo. A carta tem até 60 caracteres e pode ser qualquer coisa: personagem, pessoa real, filme, livro, série, música.

Quando termina, o jogador marca PRONTO. A partida só começa quando TODOS marcaram — não existe forçar início. O host pode Cancelar e voltar ao lobby a qualquer momento.

Conteúdo da tela: o apelido do seu alvo em destaque, o campo da carta, o botão PRONTO, o progresso do grupo ("5 de 8 prontos", sem revelar nenhum conteúdo), o chat e o bloco de notas.

Desenhe TODOS estes estados:
- Campo vazio, com o alvo em destaque — deixe absolutamente claro PARA QUEM você está escrevendo, é o erro mais fácil de cometer aqui.
- Campo preenchido, ainda não marcado como pronto.
- Erro: passou de 60 caracteres.
- Marcado como PRONTO: o campo trava, mas continua existindo um jeito óbvio de desmarcar e editar enquanto a partida não começou.
- Esperando os outros: você pronto, faltando gente. Mostre quem falta.
- Todos prontos, visto pelo HOST: o botão "Começar" liberado.
- Todos prontos, visto por quem NÃO é host: esperando o host começar.
- Aviso ao host de que alguém entrou na sala e está aguardando a próxima partida, com a informação de que "Cancelar" volta ao lobby e permite incluir a pessoa.
- Aviso de que um jogador saiu e as cartas foram REDISTRIBUÍDAS: todo mundo recebeu um alvo novo e precisa escrever de novo. Este estado precisa ser impossível de ignorar, porque a pessoa vai achar que já tinha terminado.
- Visão de quem entrou depois e está apenas aguardando a próxima partida.

Tema claro e escuro.
```

---

## Prompt 5 — A partida (tela principal)

```
Usando o mesmo sistema, desenhe a tela de PARTIDA. É a tela mais importante do produto — passe mais tempo nela do que em todas as outras juntas.

Conceito: é o papelzinho na testa de todo mundo. Você vê a carta de TODOS os outros jogadores, e a SUA aparece oculta. Ninguém precisa virar o celular para ninguém — funciona igual jogando por chamada de voz ou com todo mundo na mesma mesa.

Conteúdo:
- A lista de jogadores com suas cartas. É o elemento dominante da tela.
- A SUA carta, oculta. Ela precisa parecer um espaço que o jogo guarda para você — deliberadamente vazio, nunca um erro.
- De quem é a vez, mais a contagem regressiva quando há tempo configurado.
- Botão "Passei a vez" (só para quem é da vez) e botão "Descobri!".
- Ações do host: pular a vez de quem travou, encerrar a partida.
- Chat e bloco de notas pessoal (onde a pessoa anota as perguntas que já fez e o que descartou).

Sobre o "Descobri!": o jogador fala o palpite em voz alta e clica no botão. O sistema anuncia para todos que ele declarou ter descoberto, mas NÃO revela nada ainda — o host precisa confirmar ou negar. Só depois de confirmado é que a carta é revelada para ele. Isso existe para que um clique acidental não queime a partida da pessoa.

Desenhe TODOS estes estados:
- É a SUA vez, com tempo configurado correndo.
- É a SUA vez, sem limite de tempo.
- É a vez de outra pessoa.
- Contagem regressiva quase acabando (quando o tempo esgota, a vez passa sozinha).
- Sua carta oculta — o estado normal, e o mais importante da tela.
- Sua carta já revelada, depois de você ter descoberto.
- Um jogador que já descobriu, visto pelos outros.
- Você acabou de clicar em "Descobri!" e está esperando o host confirmar.
- A MESMA situação vista pelo HOST: ele precisa decidir Confirmar ou Negar, identificando quem declarou.
- A mesma situação vista pelos DEMAIS jogadores: eles veem o anúncio, mas não decidem nada.
- Sua declaração foi negada — sem punição, você pode declarar de novo.
- 20 jogadores em tela de 360px: este é o caso de estresse do produto inteiro. Todas as 20 cartas precisam ser legíveis e a sua precisa ser encontrável no meio delas.
- 3 jogadores em tela de 1280px: o problema oposto, pouca informação em muito espaço. Não pode virar uma tela vazia e estranha.
- Um jogador desconectado (a vez continua sendo dele; o host pula se precisar).
- Visão de quem entrou no meio e está apenas aguardando a próxima partida.
- Modal de confirmação de "Encerrar partida", visto pelo host.

Tema claro e escuro.
```

---

## Prompt 6 — Fim de partida e estados globais

```
Usando o mesmo sistema, desenhe o encerramento e os estados de sistema.

1. TELA DE ENCERRAMENTO: quando o host encerra, TODAS as cartas são reveladas para todo mundo ao mesmo tempo. É o clímax do jogo — a hora em que cada um finalmente descobre o que estava na própria testa. Trate como um momento, não como uma tabela de resultados: não existe vencedor, colocação nem pontuação. Estados: revelação de todas as cartas; a mesma tela vista pelo host, com a ação "Nova partida"; a mesma vista por quem não é host; uma sala em que há gente aguardando, que vai entrar na próxima partida.

2. ESTADOS DE CONEXÃO: conectando pela primeira vez; reconectando depois de uma queda (a pessoa nunca perde a vaga — a mensagem precisa tranquilizar, não assustar); offline; sala expirada, com o caminho de volta para o início. Lembre que isso é um celular no meio de uma resenha: a tela bloqueia, a rede oscila, o app vai para segundo plano. Reconectar é o caminho comum, não a exceção.

3. ESTADO VAZIO DO CHAT e primeira mensagem de sistema.

Tema claro e escuro.
```

---

## Como usar

- **Ordem importa.** O Prompt 1 vem primeiro; todos os outros dependem do sistema que ele cria.
- **Se o resultado fugir do sistema:** cole *"Mantenha exatamente os tokens, cores e componentes que você
  definiu no design system inicial — não crie um novo estilo."*
- **Três restrições que valem repetir** se o Claude Design escorregar:
  1. A sua carta oculta é um espaço guardado, não um erro de carregamento.
  2. 20 jogadores em 360px é o caso de estresse real — se ele só resolveu para 4 pessoas, peça de novo.
  3. Ação de host não existe na tela de quem não é host (não é "desabilitada").
- **Se quiser testar outra direção estética:** peça uma variação do Prompt 1 com *"papel e tinta: off-white,
  um acento único bem saturado, tipografia com mais personalidade"* — combina com a metáfora do papelzinho,
  mas verifique se sobrevive ao tema escuro antes de adotar.
- **O resultado exportado vai para `design/handoff/`** na raiz do repositório.
