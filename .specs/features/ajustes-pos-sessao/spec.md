# Spec: ajustes-pos-sessao — Fases 1 e 2

Feature: Correções de bugs e sistema de áudio pós-sessão real.
Branch: feat/pacote-de-cartas (em andamento) ou nova branch.

---

## Fase 1 — Correções de Regras (Bugs Críticos)

### REG-01: Declarar "Descobri!" só é permitido no próprio turno

**Comportamento atual**: Qualquer jogador ativo pode declarar `declararDescobri` em qualquer momento (fora do turno).

**Comportamento novo**: `declararDescobri` retorna `SEM_AUTORIDADE` se `ctx.autorId !== estado.vezDe`. A declaração só pode acontecer se for o seu turno.

**Critérios de aceite**:
- AC-01: `declararDescobri` de quem não é `vezDe` retorna `{ ok: false, erro: 'SEM_AUTORIDADE' }` — estado não muda
- AC-02: `declararDescobri` de quem é `vezDe` continua funcionando normalmente
- AC-03: Testes existentes de `declararDescobri` que assumem declaração fora do turno são corrigidos para usar o jogador da vez

---

### REG-02: Negar declaração avança a vez

**Comportamento atual**: `responderDeclaracao(aceita: false)` limpa `declaracaoPendente` e mantém o turno no mesmo jogador.

**Comportamento novo**: Como o declarante só pode declarar no seu turno (REG-01), ao negar a declaração, a vez avança para o próximo jogador (equivalente a passar a vez após chutar errado).

**Critérios de aceite**:
- AC-04: `responderDeclaracao(false)` avança `vezDe` para o próximo da `ordem`
- AC-05: O timer do turno é resetado após negar (novo prazo para o próximo jogador)
- AC-06: Evento de sistema emitido: `"Não era essa — a vez foi para {apelido}."`
- AC-07: `responderDeclaracao(true)` continua funcionando como antes (remove declarante da ordem, avança turno)

---

### REG-03: Auto-skip de jogador desconectado quando chega sua vez

**Comportamento atual**: Se `vezDe` é um jogador desconectado, o turno fica parado até o timer expirar (ou travado se sem timer).

**Comportamento novo**: Após qualquer avanço de turno (`comVezAvancada`, transições), se `vezDe` aponta para um jogador com `conectado === false`, avançar imediatamente para o próximo.

**Critérios de aceite**:
- AC-08: Após `passarVez`/`pularVez`/`venceuPrazoTurno`, se o próximo jogador está desconectado, avança novamente
- AC-09: Múltiplos desconectados consecutivos são pulados até encontrar alguém conectado
- AC-10: Se TODOS os jogadores na ordem estão desconectados, **não** avançar (para evitar loop infinito) — manter `vezDe` no atual e não emitir evento de pulo
- AC-11: Para cada jogador desconectado pulado, emitir evento: `"{apelido} está desconectado — vez pulada automaticamente."`
- AC-12: `ctx.jogadores` (ou `sala.jogadores` passado ao contexto) fornece o campo `conectado` — se não estiver disponível, a função não pula (fail-safe)

---

### REG-04: Expulsar preserva cartas dos outros (fase escrita)

**Comportamento atual**: Na fase `escrita`, `saiuJogador` chama `estadoVazio()` quando ficam `>= MIN_JOGADORES` jogadores ativos — apagando as cartas já escritas de todo mundo.

**Comportamento novo**: Na fase `escrita`, ao expulsar um jogador, preservar as cartas e notas dos outros jogadores. Reatribuir apenas o alvo de quem tinha o expulso como alvo.

**Critérios de aceite**:
- AC-13: Ao expulsar jogador B durante `escrita`, a carta de A (que não tinha B como alvo) é preservada
- AC-14: O jogador C que tinha B como alvo recebe novo alvo (outro jogador ainda ativo, sem ser ele mesmo)
- AC-15: A carta escrita por B (para seu alvo) é descartada
- AC-16: Notas dos jogadores restantes são preservadas
- AC-17: Se restar `< MIN_JOGADORES` após expulsão, cancelar o jogo normalmente (comportamento existente mantido)
- AC-18: Na fase `jogo`, o comportamento atual (expulsar remove só o expulso) é preservado sem alteração

---

### REG-05: Sincronização de timer com offset de relógio

**Comportamento atual**: Servidor envia `prazoTurno` como timestamp absoluto. Cliente calcula `prazoTurno - Date.now()`. Se os relógios divergirem, o timer exibe errado.

**Comportamento novo**: A projeção inclui `agoraServidor: number` (timestamp do servidor no momento da projeção). O cliente calcula `offset = agoraServidor - Date.now()` e ajusta o timer.

**Critérios de aceite**:
- AC-19: `Projecao` em `protocolo.ts` inclui campo `agoraServidor: number`
- AC-20: Cada projeção enviada ao cliente inclui `agoraServidor: Date.now()` do servidor
- AC-21: O hook `useRestante` (ou equivalente) aplica o offset ao calcular `restante`
- AC-22: Um offset de ±5 segundos não produz exibição incorreta de timer > 1 segundo no cliente

---

## Fase 2 — Sistema de Áudio

### SOM-01: Motor de áudio com Web Audio API

**Critérios de aceite**:
- AC-23: Módulo `client/src/sons.ts` existe e exporta funções para cada som listado abaixo
- AC-24: AudioContext é inicializado de forma lazy (só após o primeiro gesto do usuário), para compatibilidade mobile
- AC-25: Todos os sons são gerados programaticamente via OscillatorNode + GainNode (sem arquivos .mp3/.wav)
- AC-26: Um toggle global `ativarSom(ativo: boolean)` salva a preferência em `localStorage` sob a chave `resenha:som`
- AC-27: Se `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, sons não-essenciais (chatMensagem, vezDoOutro) são silenciados
- AC-28: Sons de alta importância (suaVez, declaracaoAceita, declaracaoNegada) tocam mesmo com `prefers-reduced-motion` pois são feedback de estado crítico

**Sons a implementar**:

| ID | Nome | Descrição | Tipo |
|----|------|-----------|------|
| S1 | `suaVez` | Tom ascendente alegre, 2 notas (ex: C5→E5), ~300ms | Alta importância |
| S2 | `vezDoOutro` | Tom neutro curto, 1 nota (ex: A4), ~150ms | Baixa |
| S3 | `tempoAcabando` | 2 bips rápidos urgentes (ex: E5 repetido), ~400ms | Alta |
| S4 | `declaracaoAceita` | 3 notas ascendentes (ex: C5→E5→G5), ~400ms | Alta |
| S5 | `declaracaoNegada` | 1 nota baixa descendente (ex: G3→E3), ~300ms | Alta |
| S6 | `chatMensagem` | Pop suave quase imperceptível (ex: C6, ~80ms) | Baixa |
| S7 | `partidaIniciou` | Fanfarra curta 3 notas (ex: C4→E4→G4), ~500ms | Alta |
| S8 | `partidaEncerrou` | Tom conclusivo (ex: G4→C4), ~400ms | Alta |

---

### SOM-02: Toggle de som na UI

**Critérios de aceite**:
- AC-29: `App.tsx` ou header global exibe botão toggle de som (ícone 🔊 / 🔇)
- AC-30: O toggle persiste estado em localStorage e inicializa corretamente na próxima sessão
- AC-31: O AudioContext é inicializado no primeiro click/touch qualquer no documento (não no click do toggle)

---

### SOM-03: Integração na tela de jogo

**Critérios de aceite**:
- AC-32: Quando `ehMinhaVez` muda de `false → true`: tocar `suaVez`
- AC-33: Quando `vezDe` muda e não é minha vez: tocar `vezDoOutro`
- AC-34: Quando `restante` cruza abaixo de 6 segundos (uma única vez por turno): tocar `tempoAcabando`
- AC-35: Quando `jogo.declaracaoPendente` é resolvida com `aceita = true` (inferido por mudança de estado): tocar `declaracaoAceita`
- AC-36: Quando declaração é negada (declarante sai da pendência sem entrar em `descobriram`): tocar `declaracaoNegada`
- AC-37: Quando `sala.fase` muda para `'jogo'`: tocar `partidaIniciou`
- AC-38: Quando `sala.fase` muda para `'encerrada'`: tocar `partidaEncerrou`

---

### SOM-04: Integração no chat

**Critérios de aceite**:
- AC-39: Quando uma nova mensagem do tipo `'jogador'` chega de outro jogador (não do próprio `eu`): tocar `chatMensagem`
- AC-40: Mensagens do sistema (`tipo === 'sistema'`) não disparam `chatMensagem`
- AC-41: A própria mensagem enviada pelo usuário não dispara `chatMensagem`

---

## Notas de Implementação

### Sobre REG-03 (auto-skip desconectados)
`ctx.jogadores` no contexto da regra contém `JogadorPublico[]`. Verificar se `conectado` está exposto nesse tipo em `protocolo.ts`. Se não estiver (pois é info de `sala.jogadores`), a função `saiuJogador` e `comVezAvancada` precisam receber `sala.jogadores` para consultar `conectado`. Preferir passar `sala.jogadores` ao invés de mudar a interface do `ContextoDeSala`.

### Sobre REG-04 (expulsar na escrita)
A lógica de atribuição de alvos (`sortearAlvos`) precisa ser chamada apenas para o jogador C que ficou sem alvo. Verificar se `sortearAlvos` aceita um subconjunto de jogadores ou se precisa de adaptação.

### Sobre SOM (Web Audio API)
Todos os sons usam ADSR envelope curto:
- Attack: 0.01s, Decay: 0.05s, Sustain: 0.7, Release: 0.1s
- Osciladores: `sine` para tons suaves, `triangle` para alertas
- GainNode de volume global: 0.3 (não intrusivo)

### Commits atômicos (PT-BR, sem co-autoria)
Exemplos de mensagem esperados:
- `fix: declararDescobri restrito ao jogador da vez`
- `fix: negar declaracao avanca a vez do turno`
- `fix: pular jogador desconectado automaticamente`
- `fix: expulsar na escrita preserva cartas dos outros`
- `feat: sincronizacao de timer via offset de relogio`
- `feat: cria engine de audio com Web Audio API`
- `feat: adiciona toggle de som no header`
- `feat: integra sons na tela de jogo`
- `feat: integra som de mensagem no chat`

---

## Fase 3 — UI/UX (Ajustes Visuais)

### VIS-01: Botão "Passar a vez" com destaque e pulso

**Critérios de aceite**:
- AC-42: O botão de "Passar a vez" (ou chutar/perguntar, dependendo de como é rotulado) deve ter cor primária forte (verde ou azul vibrante) quando for a vez do jogador atual.
- AC-43: Adicionar uma animação de pulso (scale + opacity) no botão para chamar atenção continuamente.
- AC-44: A animação de pulso não deve tocar se `prefers-reduced-motion` estiver ativo.

### VIS-02: Card do jogador da vez destacado

**Critérios de aceite**:
- AC-45: Na lista de jogadores durante a fase de jogo, o card do jogador atual (`vezDe`) deve ter um contorno iluminado (glow) ou mudança de background sutil em verde/azul.
- AC-46: O texto "perguntando..." (ou similar) fica mais visível, possivelmente usando a mesma cor do glow.

### VIS-03: Pacotes visíveis no lobby para todos

**Critérios de aceite**:
- AC-47: Atualmente, apenas o host vê a seleção de pacote. Agora, não-hosts (ou todos, incluindo quando não estão editando) devem ver um card informativo (read-only) com o pacote selecionado.
- AC-48: O componente exibe o nome e a descrição do pacote atual escolhido.
- AC-49: Opcional: botão/modal para ver uma lista de termos do pacote, se aplicável, porém a prioridade é tornar visível qual é o pacote.
- AC-50: Tempo personalizado configurado também deve aparecer para todos.

---

## Fase 4 — UX Notas (Bloco de Notas Fixo)

### NOT-01: Bloco de Notas em Modal

**Critérios de aceite**:
- AC-51: O `BlocoDeNotas` deixa de ser um accordion que empurra o layout do chat.
- AC-52: Passa a ser exibido através do componente `Modal`, disparado por um botão flutuante ou um botão no cabeçalho/área principal do jogo.
- AC-53: O modal de notas não fecha acidentalmente e permite ao jogador escrever, mantendo o conteúdo da nota.

---

## Fase 5 — Motion / Animate (Impeccable Animate)

### ANI-01: Animações de transição de estado

**Critérios de aceite**:
- AC-54: Implementar micro-animações baseadas na diretriz `impeccable`.
- AC-55: Transição suave de turno (fade-in no card destacado).
- AC-56: "Flash de declaração" (quando alguém declara "Descobri!", tela ou card ganha um flash rápido para chamar atenção).
- AC-57: Respeitar `prefers-reduced-motion` em todas as animações (desativar transições se ativo).
- AC-58: Nenhuma animação deve bloquear a interatividade (usar CSS transitions preferencialmente).

---

## Fase 6 — Documentação e Setup

### DOC-01: Documentação Open Source

**Critérios de aceite**:
- AC-59: Arquivo `README.md` reformulado com logo/nome, o que é o jogo, badge Open Source (GPL v3), e link para contribuição.
- AC-60: Criar arquivo `SETUP.md` detalhado (clonar, `npm install`, `npm run dev`, configuração do wrangler).
- AC-61: Arquivo `LICENSE` com a licença GPL v3.0 completa.
