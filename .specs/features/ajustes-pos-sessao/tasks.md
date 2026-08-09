# Tasks: ajustes-pos-sessao — Fases 1 e 2

Total de tasks: 9 (Fase 1: 5 tasks, Fase 2: 4 tasks)
Batch plan: Worker 1 → Fase 1 (T1–T5, ~5 tasks); Worker 2 → Fase 2 (T6–T9, ~4 tasks)

## Test Coverage Matrix

| AC | Task | Arquivo de Teste | Tipo |
|----|------|-----------------|------|
| AC-01, AC-02, AC-03 | T1 | server/games/quem-sou-eu/regras.test.ts | unit |
| AC-04, AC-05, AC-06, AC-07 | T2 | server/games/quem-sou-eu/regras.test.ts | unit |
| AC-08 – AC-12 | T3 | server/games/quem-sou-eu/regras.test.ts | unit |
| AC-13 – AC-18 | T4 | server/games/quem-sou-eu/regras.test.ts | unit |
| AC-19 – AC-22 | T5 | server/core/sala-do.test.ts + shared/protocolo.ts | unit + types |
| AC-23 – AC-28 | T6 | client/src/sons.test.ts (vitest, JSDOM mock de AudioContext) | unit |
| AC-29 – AC-31 | T7 | client/src/App.test.tsx | unit |
| AC-32 – AC-38 | T8 | client/src/telas/Jogo.test.tsx | unit |
| AC-39 – AC-41 | T9 | client/src/componentes/Chat.test.tsx | unit |

## Gate Check Commands
```bash
npm run typecheck
npm run test:unit      # ou: npx vitest run
npm run test:integration
```

---

## Fase 1 — Correções de Regras

### T1: Restringir declararDescobri ao jogador da vez

**Spec**: REG-01 (AC-01, AC-02, AC-03)

**Arquivos a modificar**:
- `server/games/quem-sou-eu/regras.ts` — função `declararDescobri` (~L454)
- `server/games/quem-sou-eu/regras.test.ts` — adicionar/corrigir testes

**Implementação**:
1. Na função `declararDescobri`, antes das validações existentes, adicionar:
   ```typescript
   if (ctx.autorId !== estado.vezDe) return { ok: false, erro: 'SEM_AUTORIDADE' }
   ```
2. No arquivo de testes, adicionar describe `'declararDescobri — somente na vez (REG-01)'`:
   - `'retorna SEM_AUTORIDADE quando não é a vez do jogador'`
   - `'permite declarar quando é a vez do jogador'`
3. Revisar testes existentes que chamam `declararDescobri` fora do turno — corrigir para usar `autorId === vezDe`

**Gate**: `npm run test:unit` passa sem falhas

**Commit**: `fix: declararDescobri restrito ao jogador da vez`

---

### T2: Negar declaração avança a vez

**Spec**: REG-02 (AC-04, AC-05, AC-06, AC-07)

**Arquivos a modificar**:
- `server/games/quem-sou-eu/regras.ts` — função `responderDeclaracao` (~L480)
- `server/games/quem-sou-eu/regras.test.ts`

**Implementação**:
1. Na função `responderDeclaracao`, no bloco `if (!aceita)`:
   - Após limpar `declaracaoPendente`, chamar `comVezAvancada(novo, ctx, ambiente)` para avançar o turno
   - Emitir evento: `"Não era essa — a vez foi para {apelido do próximo}."`
   - Retornar o resultado de `comVezAvancada` (incluindo `prazos` para reset do timer)
2. Adicionar testes em describe `'responderDeclaracao — negar (REG-02)'`:
   - `'negar avança a vez para o próximo jogador'`
   - `'negar reseta o timer do turno'`
   - `'negar emite evento de sistema com nome do próximo'`
   - `'confirmar continua funcionando como antes'`

**Gate**: `npm run test:unit` passa sem falhas

**Commit**: `fix: negar declaracao avanca a vez do turno`

---

### T3: Auto-skip de jogador desconectado

**Spec**: REG-03 (AC-08, AC-09, AC-10, AC-11, AC-12)

**Arquivos a modificar**:
- `server/games/quem-sou-eu/regras.ts` — nova função + integração em `comVezAvancada`
- `server/games/quem-sou-eu/regras.test.ts`

**Implementação**:
1. Verificar em `protocolo.ts` se `ContextoDeSala.jogadores` expõe `conectado: boolean`. Se não, verificar se `JogadorPublico` tem esse campo ou se precisamos receber `sala.jogadores` separadamente.
2. Criar função `pularDesconectados(estado, ctx, ambiente, tentativas = 0)`:
   ```typescript
   // Se vezDe está desconectado e há conectados, avança. Limita recursão ao tamanho da ordem.
   ```
3. Chamar `pularDesconectados` ao final de `comVezAvancada` e em `venceuPrazoTurno`
4. Adicionar testes em describe `'auto-skip de desconectados (REG-03)'`:
   - `'pula automaticamente jogador desconectado ao avançar vez'`
   - `'pula múltiplos desconectados consecutivos'`
   - `'não entra em loop se todos estão desconectados'`
   - `'emite evento de sistema para cada pulo'`

**Gate**: `npm run test:unit` passa sem falhas

**Commit**: `fix: pular jogador desconectado automaticamente na sua vez`

---

### T4: Expulsar na escrita preserva cartas dos outros

**Spec**: REG-04 (AC-13, AC-14, AC-15, AC-16, AC-17, AC-18)

**Arquivos a modificar**:
- `server/games/quem-sou-eu/regras.ts` — bloco `saiuJogador` fase `escrita` (~L627)
- `server/games/quem-sou-eu/sorteio.ts` — verificar `sortearAlvos` para reuso parcial
- `server/games/quem-sou-eu/regras.test.ts`

**Implementação**:
1. No bloco `ctx.fase === 'escrita'` de `saiuJogador`:
   - Remover a chamada a `estadoVazio()` quando `jogadoresAtivos >= MIN_JOGADORES`
   - Implementar lógica de reatribuição cirúrgica:
     a. Deletar `novo.atribuicoes[jogadorId]` (atribuição do expulso)
     b. Deletar `novo.cartas[jogadorId]` (carta escrita pelo expulso)
     c. Deletar `novo.notas[jogadorId]`
     d. Encontrar quem tinha o expulso como alvo: `Object.entries(novo.atribuicoes).find(([_, alvo]) => alvo === jogadorId)`
     e. Reatribuir esse jogador para o próximo alvo válido (alguém ainda ativo, que não seja ele mesmo, e que não tenha mais de um escritor)
2. Adicionar testes em describe `'expulsar na escrita preserva estado (REG-04)'`:
   - `'preserva cartas de quem não tinha o expulso como alvo'`
   - `'reatribui quem tinha o expulso como alvo'`
   - `'descarta a carta escrita pelo expulso'`
   - `'preserva notas dos restantes'`
   - `'cancela o jogo se ficar com menos de MIN_JOGADORES'`
   - `'na fase jogo, expulsar não afeta outros jogadores'`

**Gate**: `npm run test:unit` passa sem falhas

**Commit**: `fix: expulsar na escrita preserva cartas dos outros jogadores`

---

### T5: Sincronização de timer via offset de relógio

**Spec**: REG-05 (AC-19, AC-20, AC-21, AC-22)

**Arquivos a modificar**:
- `shared/protocolo.ts` — adicionar `agoraServidor: number` em `Projecao`
- `server/core/sala-do.ts` — incluir `agoraServidor` na projeção
- `client/src/componentes/IndicadorDeVez.tsx` (ou onde `useRestante` está) — aplicar offset

**Implementação**:
1. Em `protocolo.ts`, no tipo `Projecao`, adicionar: `agoraServidor: number`
2. Em `sala-do.ts`, na função que monta a projeção antes de enviar: adicionar `agoraServidor: Date.now()`
3. Em `IndicadorDeVez.tsx` (ou hook `useRestante`):
   - Receber `agoraServidor` como prop (ou via contexto da projeção)
   - Na inicialização do hook: `const offset = agoraServidor - Date.now()`
   - Usar `offset` ao calcular `restante`: `const restante = prazoTurno - (Date.now() + offset)`
4. Verificar que `Jogo.tsx` passa `agoraServidor` para o componente

**Gate**: `npm run typecheck` passa. Testar offset manualmente se possível.

**Commit**: `feat: sincroniza timer do turno com offset de relogio do servidor`

---

## Fase 2 — Sistema de Áudio

### T6: Engine de áudio com Web Audio API

**Spec**: SOM-01 (AC-23 – AC-28)

**Arquivos a criar**:
- `client/src/sons.ts`
- `client/src/sons.test.ts`

**Implementação**:
```typescript
// sons.ts — estrutura geral
let ctx: AudioContext | null = null
let somAtivo = localStorage.getItem('resenha:som') !== 'false'

export function inicializarAudio() { /* lazy init AudioContext */ }
export function ativarSom(ativo: boolean) { /* salva em localStorage */ }
export function somEstaAtivo(): boolean { return somAtivo }

// Sons individuais
export function tocarSuaVez() { /* C5 → E5, sine, ~300ms */ }
export function tocarVezDoOutro() { /* A4, sine, ~150ms, prefers-reduced-motion: skip */ }
export function tocarTempoAcabando() { /* E5 bip bip, triangle, ~400ms */ }
export function tocarDeclaracaoAceita() { /* C5→E5→G5, sine, ~400ms */ }
export function tocarDeclaracaoNegada() { /* G3→E3, sine, ~300ms */ }
export function tocarChatMensagem() { /* C6, sine, ~80ms, prefers-reduced-motion: skip */ }
export function tocarPartidaIniciou() { /* C4→E4→G4, triangle, ~500ms */ }
export function tocarPartidaEncerrou() { /* G4→C4, sine, ~400ms */ }
```

Para testes: mockar `AudioContext`, `OscillatorNode` e `GainNode` no setup do vitest (JSDOM).

**Gate**: `npm run test:unit` passa. `npm run typecheck` passa.

**Commit**: `feat: cria engine de audio programatico com Web Audio API`

---

### T7: Toggle de som no header da aplicação

**Spec**: SOM-02 (AC-29 – AC-31)

**Arquivos a modificar**:
- `client/src/App.tsx` — inicializar AudioContext + botão toggle
- Possivelmente `client/src/componentes/Shell.tsx` ou componente de header

**Implementação**:
1. Em `App.tsx`, adicionar `useEffect` que escuta o primeiro `click` ou `touchstart` no `document` e chama `inicializarAudio()` (remover listener após primeiro evento)
2. Adicionar botão toggle visível no header (dentro do `<Shell>` ou header global):
   - Ícone: 🔊 quando ativo, 🔇 quando inativo
   - `onClick`: `ativarSom(!somEstaAtivo())`
   - Persistência via `localStorage`
3. Adicionar testes de integração simples verificando que o botão existe e alterna estado

**Gate**: `npm run typecheck` passa. Toggle funciona manualmente.

**Commit**: `feat: adiciona toggle de som no header`

---

### T8: Integração de sons na tela de jogo

**Spec**: SOM-03 (AC-32 – AC-38)

**Arquivos a modificar**:
- `client/src/telas/Jogo.tsx`

**Implementação**:
Adicionar `useEffect` hooks rastreando mudanças nas props da projeção:
1. `useEffect(() => { if (ehMinhaVez) tocarSuaVez() }, [ehMinhaVez])` — só quando vira true
2. `useEffect(() => { if (!ehMinhaVez && jogo?.vezDe) tocarVezDoOutro() }, [jogo?.vezDe])` — quando muda e não é minha vez
3. `useEffect(() => { /* detectar restante < 6 e tocar uma vez */ }, [restante])` — com ref para evitar tocar múltiplas vezes
4. Detectar resolução de `declaracaoPendente`:
   - Se era pendente e sumiu E o declarante entrou em `descobriram`: `tocarDeclaracaoAceita()`
   - Se era pendente e sumiu E declarante NÃO entrou em `descobriram`: `tocarDeclaracaoNegada()`
5. `useEffect` para `sala.fase`:
   - `'jogo'` → `tocarPartidaIniciou()`
   - `'encerrada'` → `tocarPartidaEncerrou()`

Usar `useRef` para guardar valores anteriores onde necessário.

**Gate**: `npm run typecheck` passa. Verificar manualmente na partida local.

**Commit**: `feat: integra sons de turno e partida em Jogo.tsx`

---

### T9: Som de mensagem no chat

**Spec**: SOM-04 (AC-39 – AC-41)

**Arquivos a modificar**:
- `client/src/componentes/Chat.tsx`

**Implementação**:
1. Em `<Historico>`, adicionar `useEffect` que observa `mensagens`:
   ```typescript
   useEffect(() => {
     if (mensagens.length === 0) return
     const ultima = mensagens[mensagens.length - 1]
     if (ultima.tipo === 'jogador' && ultima.jogadorId !== euId) {
       tocarChatMensagem()
     }
   }, [mensagens.length])
   ```
2. O componente `Chat` precisa receber `euId` (o ID do jogador local) para distinguir mensagens próprias. Verificar se já tem essa informação ou se precisa ser passada como prop.

**Gate**: `npm run typecheck` passa.

**Commit**: `feat: toca som ao receber mensagem de outro jogador no chat`

---

## Fase 3 — UI/UX (Ajustes Visuais)

### T10: Botão "Passar a vez" com destaque e pulso
**Spec**: VIS-01 (AC-42, AC-43, AC-44)
**Arquivos a modificar**:
- `client/src/telas/Jogo.tsx` (Botão de passar/chutar/perguntar)
- `client/src/index.css` (para definir o keyframe de pulso)
**Implementação**:
1. Criar keyframe `pulse-attention` no css.
2. Aplicar a classe se `ehMinhaVez` for `true`. Condicionar animação a não ter `prefers-reduced-motion` global.
3. Certificar que o botão use uma cor de destaque (ex: verde primary).
**Gate**: `npm run typecheck`
**Commit**: `feat: destaca botao de passar a vez com animacao de pulso`

### T11: Card do jogador da vez aceso
**Spec**: VIS-02 (AC-45, AC-46)
**Arquivos a modificar**:
- `client/src/telas/Jogo.tsx` (lista de jogadores / cards)
**Implementação**:
1. Adicionar estilo/classe condicional no card da lista de jogadores quando `jogador.id === jogo.vezDe`.
2. Pode usar um `ring-2 ring-green-500` e um leve `bg-green-50/10` para destacar.
**Gate**: `npm run typecheck`
**Commit**: `feat: destaca card do jogador da vez na lista`

### T12: Pacotes visíveis no lobby para todos
**Spec**: VIS-03 (AC-47, AC-48, AC-49, AC-50)
**Arquivos a modificar**:
- `client/src/telas/Lobby.tsx`
**Implementação**:
1. Se não for host, ou mesmo para o host (numa visualização clara), mostrar o pacote atual selecionado.
2. Mostrar também o "tempo personalizado" configurado.
3. Se não houver pacote selecionado, mostrar de forma agradável "Nenhum pacote selecionado".
**Gate**: `npm run typecheck`
**Commit**: `feat: exibe configuracoes e pacotes selecionados para todos no lobby`

---

## Fase 4 — UX Notas (Bloco de Notas Fixo)

### T13: Bloco de Notas em Modal
**Spec**: NOT-01 (AC-51, AC-52, AC-53)
**Arquivos a modificar**:
- `client/src/telas/Jogo.tsx`
- `client/src/componentes/BlocoDeNotas.tsx`
**Implementação**:
1. Remover `BlocoDeNotas` do fluxo do chat (que empurra o layout).
2. Adicionar um botão "Anotações" flutuante (ou próximo às ações) que abre o componente `<Modal>`.
3. Renderizar `<BlocoDeNotas>` dentro desse modal.
**Gate**: `npm run typecheck`
**Commit**: `feat: move bloco de notas para um modal fixo`

---

## Fase 5 — Motion / Animate (Impeccable Animate)

### T14: Animações de transição de estado
**Spec**: ANI-01 (AC-54, AC-55, AC-56, AC-57, AC-58)
**Arquivos a modificar**:
- `client/src/telas/Jogo.tsx`
- `client/src/index.css`
**Implementação**:
1. Usar referências do `impeccable animate`.
2. Adicionar transições suaves de opacity nos cards de jogador.
3. Flash de declaração: quando `declaracaoPendente` muda, um leve `animate-flash` no card do declarante.
**Gate**: `npm run typecheck`
**Commit**: `feat: adiciona micro-animacoes de transicao e flash no jogo`

---

## Fase 6 — Documentação e Setup

### T15: Documentação (README e SETUP)
**Spec**: DOC-01 (AC-59, AC-60)
**Arquivos a modificar/criar**:
- `README.md`
- `SETUP.md`
**Implementação**:
1. Escrever `README.md` apresentando o Resenha, badge open source.
2. Escrever `SETUP.md` com instruções de execução local.
**Gate**: Markdown válido.
**Commit**: `docs: cria README.md e SETUP.md`

### T16: Licença (GPL v3)
**Spec**: DOC-01 (AC-61)
**Arquivos a criar**:
- `LICENSE`
**Implementação**:
1. Incluir o texto completo da GPL v3.
**Gate**: Arquivo presente.
**Commit**: `chore: adiciona licenca GPL v3.0`
