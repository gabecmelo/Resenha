# Pacotes Avançados e Feedback Expressivo — Especificação

**Feature base:** `.specs/features/pacotes-de-cartas/` (`PKT-01`…`PKT-33`). Esta rodada estende o sistema de pacotes já em produção — não o substitui. IDs novos usam os prefixos `PKT2-` (pacotes) e `FBK-` (feedback sonoro/visual).

> **Nota de auditoria encontrada durante o scan de contexto:** `pacotes-de-cartas` está implementado e em produção (10 pacotes, seleção no lobby, distribuição automática/escolha, badge, KV com fallback estático — tudo confirmado lendo o código atual), mas `.specs/features/pacotes-de-cartas/tasks.md` nunca teve uma checkbox marcada e `.specs/STATE.md` (Handoff) nunca menciona essa feature. Ela foi implementada fora da disciplina do `tlc-spec-driven` (branch própria, PR #1, sem Verifier). Não é bloqueante para esta rodada, mas fica registrado — vale corrigir o `STATE.md` numa passada de memória.

## Problem Statement

O sistema de pacotes atual tem três limitações que apareceram no uso real: (1) cada pacote tem só 40 cartas de dificuldade única, esgotando rápido em grupos que jogam seguidas vezes; (2) o host só vê o **nome** dos pacotes ao escolher, nunca o conteúdo, e não pode combinar temas; (3) o modal de seleção de pacotes está preso a uma largura de mobile mesmo em desktop, forçando rolagem desnecessária. Paralelamente, o produto está revisando sua postura de "sem gamificação" — agora quer som e feedback visual em quase toda interação, sem virar exagero.

## Goals

- [ ] Cada um dos 10 pacotes existentes passa de 40 para 150 cartas, divididas em 50 fácil / 50 médio / 50 difícil
- [ ] Host escolhe quais níveis de dificuldade entram na partida (1, 2 ou os 3)
- [ ] Host pode combinar mais de um pacote na mesma partida
- [ ] Botão "Ver pacote" mostra a lista completa de cartas possíveis (do que está selecionado), para todos
- [ ] Grid de seleção/visualização de pacotes usa 5 colunas em desktop, sem alterar o mobile
- [ ] Cliques em botões e entrada de jogador na sala ganham som e micro-feedback visual

## Out of Scope

| Feature | Razão |
| ------- | ----- |
| Pacotes personalizados (criados pelo host) | Já é "Em breve" em `PKT-04`; fora desta rodada |
| Migração de dados de salas existentes para o novo formato de config | Salas expiram em até 6h (`AD-005`/`SALA_OCIOSA_MS`) — não há estado de sala vivo o suficiente para justificar migração |
| Reescrever o pipeline de KV/seed dos pacotes | Fora do escopo — conteúdo continua no arquivo estático `pacotes-dados.ts`, mesmo padrão de hoje |
| Auditoria de som/feedback no Espião | Feature própria, ainda não especificada (`resenha-roadmap-jogos`) |
| Corrigir `STATE.md`/`tasks.md` da feature `pacotes-de-cartas` | Sinalizado acima; ação de memória, não desta spec |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Racional | Confirmada? |
| ------------------- | ------------------ | --------- | ----------- |
| Formato de `dificuldade` por carta | Cada carta do pacote ganha um campo `dificuldade: 'facil' \| 'medio' \| 'dificil'` | É a unidade mínima que permite o host filtrar por nível sem precisar de sub-pacotes | ✅ |
| Ao menos uma dificuldade sempre selecionada | Sim — desmarcar a última dificuldade ativa é bloqueado, com motivo visível (`Botao.motivo`) | Mesma regra de "botão desabilitado sempre diz por quê" já usada em todo o produto | ✅ |
| Default de dificuldade ao entrar em modo Pacote | Todas as três marcadas | Preserva o comportamento de hoje (todas as cartas disponíveis) sem host precisar configurar nada | ✅ |
| `Config.pacoteId: string \| null` vira `Config.pacoteIds: string[]` | Sim, campo renomeado (array vazio = nenhum pacote) | Mudança de protocolo é inevitável para suportar múltiplos pacotes; como salas são efêmeras (ver Out of Scope), não há migração a fazer | ✅ |
| Pool de cartas ao combinar pacotes | União das cartas dos pacotes selecionados, filtradas pelas dificuldades ativas, **deduplicadas por texto exato** | Dois pacotes diferentes podem repetir um nome próprio (ex.: "Harry Potter" em Livros e em Personagens de Filmes) — sem dedupe, duas pessoas poderiam receber a mesma carta | ✅ |
| Onde "Ver pacote" aparece para o host | Dois lugares: dentro do modal de seleção (pré-visualiza qualquer pacote candidato, mesmo antes de confirmar) e no lobby (mostra o que está de fato selecionado) | Foi a resposta explícita do dono — quer opinar antes de escolher, não só depois | ✅ |
| Onde "Ver pacote" aparece para não-host | Só no lobby, sobre a seleção já confirmada | Não-host não tem acesso ao modal de seleção (é ação de host, `VIS-04`) | ✅ |
| Conteúdo das 1500 cartas novas (150 × 10 pacotes) | Gerado por mim em uma task própria, com checkpoint de revisão do dono antes de entrar no código | Pedido explícito do dono — não gerar tudo de uma vez sem ele ver o formato primeiro | ✅ |
| Largura do modal de pacotes em desktop | `Modal` ganha uma variante de largura (ex. `tamanho="largo"`) usada só nos modais de seleção/visualização de pacote; o modal padrão (confirmação, destrutivo) continua em 420px | Alargar o `Modal` global mudaria a proporção de modais de confirmação, que devem continuar compactos | ✅ |
| Breakpoint do grid de pacotes | 3 faixas: mobile `<640px` = 2 colunas, tablet `640–1023px` = 3 colunas, desktop `≥1024px` = 5 colunas | Especificado diretamente pelo dono. Muda o mobile de 1 para 2 colunas em relação ao que existe hoje (`grid-cols-1`) — mudança deliberada, não um efeito colateral | ✅ |
| Escopo do som/feedback nesta rodada | Som de clique em todo botão habilitado (`Botao.tsx`, ponto único), e som de entrada de jogador na sala. Feedback visual: micro-interação de toque (`active:scale`) no `Botao.tsx` | `sons.ts` hoje só cobre turno, chat e contagem — clique e entrada não existem. Escolhido o `Botao` como ponto único porque cobre todos os botões do Quem Sou Eu (e do Espião, no futuro) de uma vez | ✅ |
| Limite de exagero do feedback | Sem confete, sem partículas; tons curtos (Web Audio, como já existe) e transform discreto | Instrução direta do dono: "reage, mas não distrai" | ✅ |

**Open questions:** nenhuma — todas resolvidas ou assumidas acima. Duas assunções (default de dificuldade, breakpoint exato) estão marcadas para confirmação explícita do dono antes do Design.

---

## User Stories

### P1: Dificuldade por carta ⭐ MVP

**User Story**: Como host, quero escolher quais níveis de dificuldade entram na partida, para calibrar o desafio ao grupo que está jogando.

**Why P1**: É o pedido central desta rodada — sem isso, os 150 itens por pacote viram só "mais do mesmo", sem controle.

**Acceptance Criteria**:

1. `PKT2-01` WHEN o host está com "Pacotes" selecionado THEN o sistema SHALL exibir um seletor de dificuldade com três opções (Fácil, Médio, Difícil), múltipla escolha, todas marcadas por padrão.
2. `PKT2-02` WHEN o host desmarca uma dificuldade THEN o sistema SHALL remover as cartas daquele nível do pool usado para sortear/distribuir, refletido imediatamente na projeção de todos os jogadores.
3. `PKT2-03` WHEN apenas uma dificuldade está marcada e o host tenta desmarcá-la THEN o sistema SHALL manter o botão daquela dificuldade desabilitado com o motivo "Pelo menos um nível precisa estar marcado".
4. `PKT2-04` WHEN um jogador não-host está no lobby THEN o sistema SHALL exibir as dificuldades selecionadas em modo somente-leitura (mesmo padrão de `PKT-06`).

**Independent Test**: Selecionar pacote "Filmes", desmarcar "Difícil", ver o pool cair para 100 cartas (50 fácil + 50 médio) refletido em "Ver pacote". Tentar desmarcar as duas restantes uma a uma — a última fica bloqueada.

---

### P1: Múltiplos pacotes na mesma partida ⭐ MVP

**User Story**: Como host, quero combinar mais de um pacote temático na mesma partida, para não travar o grupo em um tema só.

**Why P1**: Pedido explícito — "deixa em aberto pras pessoas usarem, ela pode selecionar um ou mais pacotes".

**Acceptance Criteria**:

5. `PKT2-05` WHEN o host está no modal de seleção de pacotes THEN o sistema SHALL permitir marcar mais de um pacote (checkbox, não seleção única).
6. `PKT2-06` WHEN dois ou mais pacotes estão marcados THEN o sistema SHALL construir o pool de cartas como a união das cartas de todos os pacotes selecionados, filtrada pelas dificuldades ativas, com cartas de texto idêntico entre pacotes diferentes contadas uma única vez.
7. `PKT2-07` WHEN a partida está em fase `jogo` ou `encerrada` com múltiplos pacotes THEN o sistema SHALL exibir todos os pacotes usados no badge (emoji + nome de cada um), não apenas o primeiro.
8. `PKT2-08` WHEN o host desmarca um pacote previamente selecionado THEN o sistema SHALL remover as cartas daquele pacote do pool exibido em "Ver pacote", refletido antes mesmo de iniciar a partida.
9. `PKT2-09` WHEN nenhum pacote está marcado e o host tenta iniciar a partida THEN o sistema SHALL recusar com o mesmo motivo de hoje quando `pacoteId` é nulo (`PKT-01`/lobby): "Escolha ao menos um pacote".

**Independent Test**: Marcar "Filmes" + "Personagens de Filmes" (ambos têm "Harry Potter"), abrir "Ver pacote", confirmar que "Harry Potter" aparece uma única vez na lista combinada.

---

### P1: Ver pacote ⭐ MVP

**User Story**: Como jogador (host ou não), quero ver a lista completa de cartas possíveis do pacote selecionado, para saber o que pode aparecer e opinar na escolha.

**Why P1**: Pedido explícito do dono, presente nos dois lugares onde a seleção acontece.

**Acceptance Criteria**:

10. `PKT2-10` WHEN o host abre o modal de seleção de pacotes THEN o sistema SHALL permitir expandir "Ver cartas" em qualquer pacote da lista (mesmo não selecionado), mostrando as cartas daquele pacote filtradas pelas dificuldades atualmente marcadas.
11. `PKT2-11` WHEN qualquer jogador (host ou não) está no lobby com ao menos um pacote confirmado THEN o sistema SHALL exibir um botão "Ver pacote" que abre a lista completa do pool combinado atual (todos os pacotes × dificuldades selecionados).
12. `PKT2-12` WHEN o modo é "Livre" ou nenhum pacote está selecionado ainda THEN o sistema SHALL não exibir o botão "Ver pacote" (nada para mostrar).
13. `PKT2-13` WHEN a lista de "Ver pacote" é exibida THEN o sistema SHALL nunca indicar quem tem qual carta na partida atual — é sempre a lista de possibilidades, nunca o estado da rodada em curso.

**Independent Test**: No lobby, com "Filmes" (fácil+médio) selecionado, clicar "Ver pacote" e contar 100 itens. Trocar para incluir "Difícil", reabrir e contar 150.

---

### P1: Grid de pacotes em desktop ⭐ MVP

**User Story**: Como host jogando no desktop, quero ver vários cards de pacote por linha, para escolher sem precisar rolar a tela inteira.

**Why P1**: Bug de layout confirmado pelo dono em uso real.

**Acceptance Criteria**:

14. `PKT2-14` WHEN o modal de seleção de pacotes (`PKT-02`) ou o modal de "Ver pacote" é exibido em viewport ≥ 1024px THEN o sistema SHALL organizar os cards em grid de 5 colunas por linha.
15. `PKT2-15` WHEN o mesmo modal é exibido entre 640px e 1023px THEN o sistema SHALL organizar os cards em grid de 3 colunas por linha.
16. `PKT2-16` WHEN o mesmo modal é exibido em viewport < 640px THEN o sistema SHALL organizar os cards em grid de 2 colunas por linha (mudança em relação ao `grid-cols-1` atual — decisão deliberada do dono, não uma correção só de desktop).
17. `PKT2-17` WHEN o modal de seleção/visualização de pacotes é aberto em qualquer viewport THEN o sistema SHALL manter a altura da janela do modal limitada à tela, com rolagem interna apenas na lista de cards — nunca rolagem horizontal (`VIS-01` já estabelecido para o produto).

**Independent Test**: Abrir o modal de seleção em 1280px, contar 5 cards por linha. Redimensionar para 768px, contar 3. Redimensionar para 375px, contar 2.

---

### P2: Conteúdo expandido dos pacotes

**User Story**: Como jogador, quero pacotes com mais variedade, para não repetir as mesmas cartas partida após partida.

**Why P2**: Depende das stories P1 acima (dificuldade, multi-seleção) para fazer sentido — sem elas, 150 cartas soltas não trazem o benefício de calibração.

**Acceptance Criteria**:

18. `PKT2-18` Cada um dos 10 pacotes existentes (`PKT-21`) SHALL ter exatamente 150 cartas: 50 marcadas `facil`, 50 `medio`, 50 `dificil`.
19. `PKT2-19` Dentro de um mesmo pacote, nenhuma carta SHALL se repetir, independentemente da dificuldade atribuída.
20. `PKT2-20` O conteúdo novo SHALL ser gerado como uma task própria, entregue para revisão do dono antes de ser commitado — nunca os 10 pacotes de uma vez sem checkpoint.

**Independent Test**: Contar `PACOTES.find(p => p.id === 'filmes').cartas.length === 150` e a distribuição por dificuldade em 50/50/50, depois de o dono aprovar o conteúdo.

---

### P1: Feedback sonoro e visual em interações ⭐ MVP

**User Story**: Como jogador, quero que cliques e entradas na sala reajam com som e um toque visual, para o jogo parecer mais vivo sem virar uma distração.

**Why P1**: Mudança de postura confirmada pelo dono — ver `resenha-gamificacao-feedback-expressivo` na memória do projeto.

**Acceptance Criteria**:

21. `FBK-01` WHEN qualquer botão habilitado (`Botao.tsx`, qualquer variante) é clicado THEN o sistema SHALL tocar um som de clique curto (se som ativo) e aplicar uma micro-transição visual de toque (ex.: leve redução de escala) que desfaz em menos de 150ms.
22. `FBK-02` WHEN um botão está desabilitado (`motivo` presente) THEN o sistema SHALL não tocar som nem aplicar a micro-transição de clique.
23. `FBK-03` WHEN um jogador entra na sala (própria conexão bem-sucedida) THEN o sistema SHALL tocar um som de entrada distinto dos demais sons existentes (turno, chat, contagem).
24. `FBK-04` WHEN o som está desativado (`somEstaAtivo() === false`) THEN nenhum som novo desta rodada SHALL tocar — mesma regra que já vale para os sons existentes.
25. `FBK-05` WHEN `prefers-reduced-motion: reduce` está ativo THEN a micro-transição visual de clique SHALL ser suprimida, mantendo o som (mesmo padrão já usado em `tocarChatMensagem`/`motionReduzido()` para efeitos visuais, não sonoros).

**Independent Test**: Com som ativo, clicar em "Iniciar partida" habilitado e ouvir o clique + ver o botão encolher levemente. Clicar em um botão desabilitado — nada toca. Desativar som — clique fica mudo mas a micro-transição visual continua.

---

## Edge Cases

- `PKT2-21` WHEN o pool combinado (pacotes × dificuldades) tem menos cartas que jogadores ativos THEN o sistema SHALL recusar o início com a mesma mensagem de `PKT-09`, mas contando o pool combinado, não um pacote isolado.
- `PKT2-22` WHEN o host desmarca todos os pacotes enquanto o modo ainda é "Pacotes" THEN o sistema SHALL tratar como equivalente a `pacoteIds: []` — sem cartas, sem permitir iniciar.
- `PKT2-23` WHEN dois pacotes selecionados têm a mesma carta em dificuldades diferentes (ex.: "Goku" fácil em um pacote hipotético e difícil em outro) THEN o sistema SHALL manter apenas uma entrada no pool, com a dificuldade da primeira ocorrência encontrada (ordem de `pacoteIds`) — caso de baixa probabilidade dado que os pacotes atuais não se sobrepõem por tema, registrado para não deixar comportamento indefinido.
- `FBK-06` WHEN vários cliques acontecem em sequência rápida (double-click acidental, múltiplos jogadores) THEN o sistema SHALL permitir sons sobrepostos sem travar ou acumular atraso — mesmo comportamento de sobreposição que `tocarAcertou`/`tocarTempoAcabando` já têm hoje.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --------------- | ----- | ------ | ------ |
| PKT2-01 | P1: Dificuldade | Specify | Pending |
| PKT2-02 | P1: Dificuldade | Specify | Pending |
| PKT2-03 | P1: Dificuldade | Specify | Pending |
| PKT2-04 | P1: Dificuldade | Specify | Pending |
| PKT2-05 | P1: Multi-pacote | Specify | Pending |
| PKT2-06 | P1: Multi-pacote | Specify | Pending |
| PKT2-07 | P1: Multi-pacote | Specify | Pending |
| PKT2-08 | P1: Multi-pacote | Specify | Pending |
| PKT2-09 | P1: Multi-pacote | Specify | Pending |
| PKT2-10 | P1: Ver pacote | Specify | Pending |
| PKT2-11 | P1: Ver pacote | Specify | Pending |
| PKT2-12 | P1: Ver pacote | Specify | Pending |
| PKT2-13 | P1: Ver pacote | Specify | Pending |
| PKT2-14 | P1: Grid desktop | Specify | Pending |
| PKT2-15 | P1: Grid desktop | Specify | Pending |
| PKT2-16 | P1: Grid desktop | Specify | Pending |
| PKT2-17 | P1: Grid desktop | Specify | Pending |
| PKT2-18 | P2: Conteúdo | Specify | Pending |
| PKT2-19 | P2: Conteúdo | Specify | Pending |
| PKT2-20 | P2: Conteúdo | Specify | Pending |
| FBK-01 | P1: Feedback | Specify | Pending |
| FBK-02 | P1: Feedback | Specify | Pending |
| FBK-03 | P1: Feedback | Specify | Pending |
| FBK-04 | P1: Feedback | Specify | Pending |
| FBK-05 | P1: Feedback | Specify | Pending |
| PKT2-21 | Edge Case | Specify | Pending |
| PKT2-22 | Edge Case | Specify | Pending |
| PKT2-23 | Edge Case | Specify | Pending |
| FBK-06 | Edge Case | Specify | Pending |

**ID format:** `PKT2-NN` (extensão de pacotes), `FBK-NN` (feedback sonoro/visual)

**Coverage:** 29 total, 0 mapped to tasks, 29 unmapped ⚠️ (esperado nesta fase — mapeamento acontece em Tasks)

---

## Success Criteria

- [ ] Os 10 pacotes têm 150 cartas cada, 50/50/50 por dificuldade, revisadas pelo dono antes do merge
- [ ] Host filtra por dificuldade e combina pacotes; pool reflete a combinação corretamente (união + dedupe)
- [ ] "Ver pacote" funciona nos dois lugares (modal de seleção do host, lobby de todos) sem vazar quem tem qual carta
- [ ] Grid de 5 colunas em desktop (≥1024px), mobile inalterado
- [ ] Todo botão habilitado tem som de clique + micro-transição; desabilitado não tem nenhum dos dois
- [ ] Som de entrada de jogador na sala existe e respeita a preferência de som
- [ ] Todos os testes existentes continuam passando (regressão zero) — inclui a suíte de `pacotes-de-cartas` mesmo sem `validation.md` prévio
