# Quem Sou Eu? — Context

**Gathered:** 2026-08-02
**Spec:** `.specs/features/quem-sou-eu/spec.md`
**Status:** Ready for design

---

## Feature Boundary

O MVP do **Resenha**: a base de sala compartilhada (`core`) mais o jogo "Quem Sou Eu?" no modo único "amigo escreve", jogável de ponta a ponta por 3 a 20 pessoas, sem cadastro, no celular ou no desktop. Tudo que não estiver no `spec.md` está fora — em especial baralhos, contas, histórico, áudio/vídeo e outros jogos.

---

## Implementation Decisions

### O sistema é o tabuleiro, não o juiz

Decisão fundadora do usuário, registrada como AD-003. Consequências concretas que valem para toda decisão de design:

- Perguntas e respostas sim/não acontecem por voz. O sistema não tem campo para elas, não as registra e não as valida.
- Não há pontuação, vencedor, nem histórico. Não existe tela de resultado com colocação.
- Quando surgir dúvida do tipo "o sistema deveria impedir X?", a resposta padrão é **não — o host resolve**. Os poderes do host (expulsar, pular a vez, encerrar, confirmar "Descobri!") são deliberadamente a válvula de escape para tudo que o software não arbitra.
- Exceção única e explícita: a confirmação do "Descobri!" (ver abaixo). O usuário optou por essa validação porque o custo do erro é irreversível dentro da partida.

### Fase de escrita das cartas

- Não existe "forçar início". A partida só começa quando **todos** os jogadores ativos marcaram PRONTO. Se alguém enrola, o host expulsa ou cancela — arbitragem humana.
- São dois comandos distintos do host: **"Iniciar"** (LOBBY → ESCRITA, dispara o sorteio) e **"Começar"** (ESCRITA → JOGO, só habilita com todos PRONTO).
- Se um jogador ativo sai durante a ESCRITA, **redistribui tudo**: novo sorteio, todas as cartas descartadas, todos os PRONTO zerados. O usuário foi explícito — cada um escreve para uma pessoa nova.
- A escrita **já é a partida**. Quem entra a partir da ESCRITA fica aguardando a próxima rodada. Não existe entrar no meio — mas entrar **não** dispara redistribuição, e o host é avisado de que pode Cancelar para voltar ao lobby e encaixar a pessoa nova, se quiser.
- Progresso visível para todos como "N de M prontos", sem revelar conteúdo.
- Quem marcou PRONTO pode desmarcar e editar enquanto a partida não começou.

### "Descobri!" com confirmação do host

- O jogador se declara; o sistema **anuncia a todos** e coloca a declaração em estado pendente.
- O **host confirma ou nega**. Só a confirmação revela a carta ao jogador.
- Motivo: sem isso, o botão é um atalho para espiar a resposta, e um miss-click queima a partida da pessoa de forma irreversível. O anúncio sozinho (pressão social) não desfaz o dano do clique acidental.
- Quando quem declara é o próprio host, a confirmação vai para o jogador conectado há mais tempo entre os demais — ninguém confirma a si mesmo. *(assumption, ver spec)*
- Negar não pune: o jogador pode declarar de novo.

### Host e autoridade

- Host = criador da sala. Poderes: iniciar, cancelar, começar, pular a vez, expulsar, confirmar/negar "Descobri!", encerrar, nova partida, alterar configurações.
- Migração automática após 30s de desconexão, para o jogador conectado há mais tempo. Migração manual disponível a qualquer momento.
- Ex-host que volta é jogador comum — sem "devolução" automática do comando.
- Expulsar é definitivo na sala: o token expulso não entra de novo.

### Identidade, conexão e vida da sala

- Token opaco no navegador é a identidade (AD-006). Outro dispositivo ou aba anônima = jogador novo. O usuário aceitou explicitamente esse trade-off.
- Ninguém perde a vaga por desconexão — aparece marcado como desconectado e a vez continua sendo dele (o host pula se precisar).
- Sala morre com 30 min sem nenhuma conexão, ou 6h sem nenhuma ação.
- Apelidos duplicados são bloqueados na entrada; 2 a 16 caracteres; sem filtro de conteúdo.

### Turnos

- Avança quem é da vez (botão "Passei a vez") **ou** o host (botão "Pular a vez"). Mais ninguém.
- Timer, quando configurado, **avança sozinho** ao expirar — é o propósito dele existir.
- Ordem: sorteada ou por ordem de entrada, escolha do host no lobby.
- Quem descobriu e saiu do rodízio continua vendo tudo, com chat e notas — só não recebe mais a vez.

### Referência visual

- Clean e minimalista, na linha do **Gartic Phone**, porém **mais minimalista e com outra paleta** — não copiar as cores nem o tom "escrachado" do Gartic.
- Mobile-first, funcionando bem também no desktop.
- Cada jogador tem uma cor própria, sorteada e única na sala, usada de forma consistente na lista de jogadores, nas cartas e no chat — é o principal recurso de leitura rápida com muita gente na tela.
- A tela de partida com 20 jogadores é o caso de estresse do layout, não a de 3.

### Agent's Discretion

- Estrutura interna de pastas, nomes de módulos, formato do protocolo WebSocket, e organização dos componentes React.
- Escolha da paleta concreta, tipografia e microinterações, dentro do direcionamento "clean, minimalista, não-Gartic".
- Estratégia de testes e ferramentas.
- Algoritmo do sorteio sem ponto fixo (derangement), desde que atenda `ESCR-01`.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área cinzenta foi recusada — as cinco levantadas foram todas discutidas. As lacunas que sobraram estão registradas na tabela **Assumptions & Open Questions** do `spec.md` com o default escolhido e a razão: confirmador quando o host se declara, jogador que sai durante o JOGO, sala esvaziada no JOGO, edição após PRONTO, limites de tamanho de carta/chat/notas, rate limit do chat, formato do código de sala, observabilidade.

---

## Specific References

- **Gartic Phone** — referência de tom e simplicidade de entrada em sala (código, apelido, joga). Explicitamente **não** é referência de paleta nem de densidade visual: o usuário quer mais minimalista.
- **"Papelzinho na testa"** — a metáfora física que o produto substitui. A tela de partida é literalmente "as testas de todo mundo, e a sua em branco".
- **Amigo secreto** — o modelo mental do sorteio de quem escreve para quem.

---

## Deferred Ideas

- **Baralhos prontos** (celebridades, personagens, futebol, filmes) e **criação de baralho próprio** — segundo modo de carta, evolução natural pós-MVP.
- **Espião** e demais party games do hub — a fronteira `core` / `games` do AD-002 existe para eles.
- **Toggle "exigir confirmação do host"** — no MVP a confirmação é sempre obrigatória; virar opção é refinamento futuro.
- **Histórico de partidas e estatísticas** — depende de contas, fora do MVP.
- **Trancar a sala** (impedir novas entradas sem expulsar) — não pedido, mas adjacente ao poder de expulsar.
