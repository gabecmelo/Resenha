# Passa e Joga: ajustes de mesa — Validation

**Date**: 2026-08-23
**Spec**: `.specs/features/passa-e-joga-ajustes/spec.md`
**Diff range**: `f70b0ec..d586acd` (branch `feat/passa-e-joga` — 14 commits; T1–T20 + 1 conserto)
**Verifier**: sub-agente independente (autor ≠ verificador). A árvore real nunca foi modificada: as onze mutações e a sonda de alcançabilidade rodaram sobre cópias / arquivo descartável, com restauração e remoção imediatas, e `git status --porcelain` foi conferido vazio depois de cada lote.

**Veredito**: ✅ **PASS** (iteração 2) — a lacuna de `PJ2-10` foi fechada e **reverificada do zero contra o motor real**, não por relato. Portões verdes, sensor 9/9 nos módulos puros, e o modo sala provado **byte a byte** intacto.

**Histórico**: a iteração 1 devolveu ❌ FAIL por um critério — `PJ2-10` violado no rodapé da `Escrita` local, onde `ehHost` (que acompanha o aparelho) empilhava dois controles de host sobre o botão do jogador, um deles destrutivo. Fechado em `d586acd`.

---

## Task Completion

| Fase | Tarefas | Status |
| --- | --- | --- |
| 1 — moldura e porta | T1, T2, T3 | ✅ |
| 2 — pacotes | T4, T5 | ✅ |
| 3 — Quem Sou Eu em telas | T6, T7, T8, T9 | ✅ (T9 completada em `d586acd`) |
| 4 — Espião sem urna | T10, T11, T12 | ✅ |
| 5 — Dedo sem urna | T13, T14, T15 | ✅ |
| 6 — Enigmas | T16, T17, T18 | ✅ |
| 7 — lobby local | T19, T20 | ✅ |
| conserto it. 1 | `PJ2-10` no rodapé da Escrita | ✅ `d586acd` |

---

## Spec-Anchored Acceptance Criteria

Evidência-ou-zero. Regra de payload: campo de objeto só conta se a asserção olhar o **valor**.

### P1 — A moldura e a porta

| AC | Resultado que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| `PJ2-01` | o rótulo é "ir para o Passa e Joga", nome próprio | `client/src/telas/Inicio.tsx:329` — texto do botão `Ir para o Passa e Joga`; `:333` — `aria-label="O que é o Passa e Joga?"`; `:346` — `titulo="Passa e Joga"` no modal | ⚠️ verificado por leitura (sem harness de componente) |
| `PJ2-02` | código, botão de convite e disco **não existem no DOM** | `client/src/telas/tela.ts:72-73` — `molduraDaSala` devolve `{}` quando `codigo === ''`; `client/src/passaejoga/motor.ts:394` — a mesa local nasce com `codigo: ''`; `Shell.tsx:67` e `:81` — sem `codigo` não há disco nem `<CopiarConvite>`. As **11** telas que passavam `codigo` cru agora usam o helper (`CartasEncerrada:44`, `CartasJogo:116`, `DedoEncerrada:47`, `DedoJogo:94`, `Encerrada:37`, `EnigmasEncerrada:47`, `EnigmasJogo:102`, `Escrita:66`, `EspiaoEncerrada:58`, `EspiaoJogo:113`, `Jogo:131`). Os dois `codigo=` restantes (`EspiaoAguardando:49`, `Lobby.tsx:72,76`) são telas que o modo local **nunca monta** — `Partida.tsx:353-360` troca `EspiaoAguardando` por `EspiaoTodosProntos`/`EspiaoPapel`, e o lobby local é `Mesa.tsx:102`, com `<Shell>` sem código | ⚠️ leitura, mas **exaustiva** (grep fechado) |
| `PJ2-03` | a confirmação fala em configuração perdida; **não** em vaga, host ou sala | `Shell.tsx:48-52` — `SAIR_DA_MESA = { titulo: 'Sair da mesa?', descricao: 'A partida e os nomes que a mesa digitou se perdem…' }`, sem "vaga"/"host"/"código"; `:127` — `{...(codigo === undefined ? SAIR_DA_MESA : SAIR_DA_SALA)}`; `:91-92` — o próprio `aria-label` vira "Sair da mesa". Segunda confirmação, em `PassaEJoga.tsx:87-88`, também só fala em partida descartada | ⚠️ leitura |

### P2 — Os pacotes

| AC | Resultado que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| `PJ2-04` | a mesa abre com **nenhum** pacote marcado | `Mesa.tsx:254-256` — `configInicial()` devolve `{ ...CONFIG_PADRAO, pacoteIds: [] }`; `:51` — `useState<Config>(configInicial)` | ⚠️ leitura |
| `PJ2-05` | começar fica bloqueado **e** a tela diz o que falta, antes do toque | `Mesa.tsx:59-61` — `const motivo = motivoParaComecar(...) ?? pendenciasParaIniciar(...)[0]`, passado a `<Botao motivo={motivo}>` (`:200`); `Lobby.tsx:165-182` — a lista devolve "Escolha ao menos um pacote de cartas/enigmas" para `cartas`, `enigmas`, `dedo`, e "Escolha ao menos um pacote." para `modoPacote === 'pacote'`. O Espião cai nesta última porque `Lobby.tsx:1363-1365` força `modoPacote: 'pacote'` assim que o bloco de regras monta — **conferido de propósito**, porque o Espião não aparece por nome na lista e sem esse efeito o toque cairia em `PACOTE_NAO_ENCONTRADO` depois do clique (`motor.ts:440`), que é exatamente o que a AC proíbe | ⚠️ leitura |

### P3 — O Quem Sou Eu em telas

| AC | Resultado que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| `PJ2-06` | cada um escreve a carta do vizinho seguinte, fechando o círculo, na ordem digitada | `shared/jogos/quem-sou-eu/sorteio.test.ts:166` — `expect(alvos).toEqual({ j1: 'j2', j2: 'j3', j3: 'j4', j4: 'j1' })` (ciclo fechado, valor por valor); `:177` — `expect(consultas).toBe(0)` (não consulta o aleatório); `:185` — sem ponto fixo; **ponta a ponta pelo motor real**: `client/src/passaejoga/motor.test.ts:612-617` — `expect(alvos).toEqual([['j1','j2'],['j2','j3'],['j3','j4'],['j4','j1']])`, lido da projeção de cada jogador | ✅ PASS |
| `PJ2-07` | a carta aparece em letra grande, com aviso de que o dono não pode olhar, antes de o aparelho andar | `Partida.tsx:262-277` — o ramo abre `CartaDoVizinho` quando `volta?.mostraAoAgir === true && projecao.eu.cartaQueEscrevi !== undefined`, **antes** do `BarraDePassar`; `CartaDoVizinho.tsx:51-57` — `font-display text-[clamp(2rem,11vw,3.5rem)]` e `{dono.apelido} não pode ver`; `volta.ts:83` — `mostraAoAgir: true` na volta de escrita, asserido em `volta.test.ts:97-104` (`toEqual` do objeto inteiro, com `mostraAoAgir: true` e `comandoAoEsconder: { t: 'marcarPronto', pronto: true }`) | ⚠️ núcleo asserido; "letra grande" é spec-precision gap |
| `PJ2-08` | **uma** ação — passar adiante; nada de esconder, editar ou começar | `CartaDoVizinho.tsx:63-72` — a `BarraDeAcao` tem exatamente um `<Botao>` e um `<p>` explicativo; nenhum outro controle no arquivo; e `volta.test.ts:243` — `expect(acaoDaVolta(escrita, 0, 4)).toBeNull()` prova que a barra genérica de passar **não** aparece por cima | ✅ PASS (núcleo asserido + leitura fechada do arquivo) |
| `PJ2-09` | na última pessoa não se oferece passar; para-se numa tela de começar | `volta.test.ts:227` — `expect(acaoDaVolta(volta, 3, 4)).toEqual({ rotulo: 'Esconder' })`; `:233-237` — nas posições 0/1/2 o rótulo é `'Esconder e passar'`; `CartaDoVizinho.tsx:65` — `ultimo ? 'A mesa viu — todo mundo já escreveu' : 'Passar para …'`, com `ultimo` vindo de `Partida.tsx:272` (`passagem.posicao >= passagem.fila.length - 1`); a tela seguinte é a `Escrita` com `todosProntos`, cujo botão é "Começar a partida" (`Escrita.tsx:455-460`, ramo local) | ✅ PASS |
| `PJ2-10` | o rodapé oferece **somente** a ação daquela tela | Duas metades, ambas fechadas. **Barra de passar**: `volta.test.ts:243`, `:249`, `:253` — `acaoDaVolta` cala quando a volta tem tela própria, quando é entrega e quando não há volta. **Rodapé da tela**: `Escrita.tsx:421` — `souJogador && !(local && pronto) && (…)`; `:455-460` — `local ? (todosProntos && <Botao>Começar a partida</Botao>) : souHost ? (…)`. A alcançabilidade dos estados foi re-derivada contra o motor real (ver "Iteração 2") e dá **exatamente uma ação em todo estado alcançável** | ✅ PASS (comportamento provado por sonda; o JSX em si segue sem harness) |

### P4 — O Espião sem urna

| AC | Resultado que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| `PJ2-11` | nenhuma votação por toque de cada um; nenhuma contagem de votos | `volta.test.ts:130` — `expect(voltaDaFase(veja(mesa), mesa.aparelhoCom)).toBeNull()` com a votação **aberta** (o teste que antes exigia a volta `'Um voto que mais ninguém vê.'` foi substituído, não removido); `EspiaoJogo.tsx:243` — `) : modo === 'local' ? null : (<Votacao …>)`, que é onde morava o "1 de 5 votos" | ✅ PASS |
| `PJ2-12` | a acusação é registrada num toque, por quem segura o aparelho, numa tela que lista os jogadores | `EspiaoJogo.tsx:390-411` — `<EspiaoAcusacao>` monta-se com `modo === 'local' && (confirmandoVotacao \|\| votacao !== undefined)`; `EspiaoAcusacao.tsx:57-79` — `naRoda.map` desenha um botão por jogador ativo; `aoAcusar` faz `for (const jogador of ativos) enviarComo?.(jogador.id, { t: 'votar', alvoId })` (`EspiaoJogo.tsx:401`). O mecanismo dos **N comandos idênticos** está provado contra o reducer real em `volta.test.ts:59-68` (helper `espiaoAcusado`), que produz `chuteDoEspiao` na projeção | ⚠️ mecanismo asserido; a tela por leitura |
| `PJ2-13` | o chute do local é oferecido ao acusado, na mesma passagem, e o resultado é registrado | `volta.test.ts:139-144` — `expect(volta).toEqual({ fila: [chute.espiao.id], instrucao: 'A mesa acertou. O espião ainda pode salvar a rodada chutando o local.', escondeAoPassar: false })`, com `chute` lido da projeção real; `:150` — `expect(voltaDaFase(veja(mesa), chute.espiao.id)).toBeNull()` (não reabre quando já está com quem chuta) | ✅ PASS |
| `PJ2-14` | não se volta à volta de revelação de papéis em nenhum momento | `volta.ts:100` — o ramo de revelação exige `!espiao.rodadaIniciada`, e depois da acusação a rodada já iniciou; a prova positiva é `volta.test.ts:139` — a partir do estado **pós-acusação** a volta devolvida é a do chute (`fila: [espiao.id]`), não `{instrucao: 'O papel desta rodada…'}`. `Partida.tsx:353-360` distingue qual volta está aberta antes de escolher `EspiaoPapel` | ✅ PASS |
| `PJ2-15` | o placar da partida continua como hoje | `git diff f70b0ec..HEAD -- shared/jogos/espiao` é **vazio**: nenhuma regra, projeção ou sorteio do Espião foi tocado. Os testes de placar existentes seguem verdes nos portões | ✅ PASS (por ausência de diff + suíte pré-existente) |

### P5 — O Dedo na Cara sem urna

| AC | Resultado que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| `PJ2-16` | não se espera um toque de cada jogador | `volta.test.ts:186` — `expect(donoDoAparelho(veja(depoisDoPrimeiro), 'j1')).toBe('j1')` (o aparelho **não** anda mais atrás de dedos; antes desta rodada a mesma linha exigia `'j2'`); `motor.test.ts:627` — `expect(projetar(mesa).jogo?.dedo?.vencedor?.id).toBe('j2')` depois dos N `apontar`, inclusive em nome do próprio vencedor; `motor.ts:376` — `dedo: { …, votacao: 'aberta', autoVoto: true }`; `motor.test.ts:631` — `expect(CONFIG_PADRAO.dedo.autoVoto).toBe(false)` (o online não muda); `Lobby.tsx:1248-1260` — a linha "Apontar pra si mesmo" some no modo local | ✅ PASS |
| `PJ2-17` | um toque em quem levou, **seguido de confirmação**, e então a próxima carta | `DedoJogo.tsx:78-84` — no local o toque abre `setConfirmandoLevou(alvoId)` em vez de despachar; `:197-206` — `<Modal titulo={…levou essa?} rotuloConfirmar="Foi ele mesmo" aoConfirmar={() => registrarQuemLevou(confirmandoLevou)}>`; `:86-89` — `registrarQuemLevou` emite `apontar` em nome de todos os ativos. O fechamento da rodada por essa via está asserido em `motor.test.ts:627` | ⚠️ mecanismo asserido; a confirmação por leitura |
| `PJ2-18` | conta 3, 2, 1 antes da carta nova | `DedoJogo.tsx:162` — `onClick={() => (local ? setContando(true) : enviar({ t: 'proximaCarta' }))}`; `:209-216` — `<Contagem aoTerminar={…enviar({ t: 'proximaCarta' })}>`; `Contagem.tsx:16` — `useState(3)` decrescendo de 700 em 700 ms, com guarda de disparo único (`jaTerminou`) e pulável por toque | ⚠️ leitura; a spec não fixa duração (Open Question 1) |

### P6 — Os Enigmas

| AC | Resultado que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| `PJ2-19` | esconder a solução sem sair da tela, e mostrá-la de novo | `EnigmasJogo.tsx:521` — `const [escondida, setEscondida] = useState(false)`; `:553-563` — botão que alterna entre `'mostrar'` e `'esconder'` (só quando `!aberta`); `:565-571` — o texto da solução é substituído por "Guardada. A tela está livre…" enquanto escondida | ⚠️ leitura |
| `PJ2-20` | segunda confirmação antes de registrar quem desatou | `EnigmasJogo.tsx:180` — `aoRegistrar={setConfirmandoDesatou}` (antes disparava `declararSolucao` + `julgarDeclaracao` direto); `:319-340` — `<Modal titulo={…desatou?} rotuloConfirmar="Desatou mesmo" rotuloCancelar="Ainda não">` e só no `aoConfirmar` saem os dois comandos | ⚠️ leitura |
| `PJ2-21` | mesma contagem do Dedo | `EnigmasJogo.tsx:208-211` — `onClick={() => (local ? setContando(true) : enviar({ t: 'proximoEnigma' }))}`; `:344-351` — `<Contagem>`, o **mesmo** componente de `componentes/Contagem.tsx` | ⚠️ leitura |

### P7 — O lobby local

| AC | Resultado que a spec define | Evidência | Resultado |
| --- | --- | --- | --- |
| `PJ2-22` | o fim de partida oferece voltar ao lobby, **além** de jogar de novo | `FimDaPartida.tsx:28-38` — dois `<Botao>`: `DE_NOVO_NO_APARELHO.rotulo` e `'Voltar ao lobby da mesa'`; montado nas quatro encerradas do modo local: `Encerrada.tsx:118`, `DedoEncerrada.tsx:147`, `EnigmasEncerrada.tsx:147`, `EspiaoEncerrada.tsx:183`; `Partida.tsx:324-331` injeta `aoVoltarAoLobby` no `props` comum | ⚠️ leitura |
| `PJ2-23` | os nomes já digitados continuam, na mesma ordem | `PassaEJoga.tsx:51-56` — `setNomes(partida.sala.jogadores.map((j) => j.apelido))` (ordem da projeção = ordem digitada, `volta.test.ts:87`); `Mesa.tsx:44-51` — `nomesIniciais` semeia o `useState` dos nomes, completando com campos vazios se o jogo novo exigir mais gente | ⚠️ leitura |
| `PJ2-24` | trocar de jogo sem redigitar nome nenhum | `Mesa.tsx:176-183` — "← trocar de jogo" chama `aoVoltar`; `PassaEJoga.tsx:81` — `aoVoltar={() => setJogoId(null)}` volta à `Porta` **sem** mexer em `nomes`, e a `Mesa` remonta com `nomesIniciais` | ⚠️ leitura |
| `PJ2-25` | trocar de jogo reseta as regras do anterior | A troca passa obrigatoriamente pela `Porta` (`PassaEJoga.tsx:76-82`), o que **desmonta** a `Mesa`; ao remontar, `useState<Config>(configInicial)` (`Mesa.tsx:51`) roda o inicializador de novo e devolve `{ ...CONFIG_PADRAO, pacoteIds: [] }`. É o mesmo efeito do `novaPartida`/reset do lobby online | ⚠️ leitura |

**Placar**: ✅ **9** com evidência que bate com o resultado que a spec define (`PJ2-06`, `08`, `09`, `10`, `11`, `13`, `14`, `15`, `16`) · ⚠️ **16** verificados por leitura ou com o núcleo asserido e a metade de tela lida (limitação estrutural: o projeto não tem harness de componente — `tasks.md`, Test Coverage Matrix) · ❌ **0** violados.

`PJ2-07` conta como parcial pela cláusula "letra grande", que não tem número na spec. `PJ2-10` entra em ✅ pelo comportamento — os estados alcançáveis do rodapé foram enumerados contra o motor real —, não por asserção sobre o JSX, que segue fora de alcance.

---

## Iteração 2 — o conserto de `PJ2-10`, re-derivado do zero

**Commit**: `d586acd`. Duas mudanças em `client/src/telas/Escrita.tsx` (mais o newline final de `volta.ts`, que era registro cosmético da iteração 1):

- `:149` — `local={modo === 'local'}` desce para `AcoesDaFase`, que ganha a prop em `:374` / `:389`.
- `:421` — o ramo do jogador ganha `!(local && pronto) &&`: na mesa local quem já entregou não recebe "Desmarcar e editar".
- `:455-460` — `{local ? (todosProntos && <Botao>Começar a partida</Botao>) : souHost ? (…) : (…)}`. "Cancelar e voltar ao lobby" deixa de existir no modo local.

### O que eu verifiquei, e como

Não aceitei o relato do coordenador. Rodei uma **sonda descartável** (`client/src/passaejoga/zzsonda.test.ts`, criada, executada e **removida**; `git status --porcelain` conferido depois) que dirige o **motor real** exatamente como `Partida.tsx` dirige — mesma ordem de `voltaDaFase` → `criarPassagem` → `revelar` → `escreverCarta`+`marcarPronto` → `comandoAoEsconder`+`avancar` — e imprime, em cada ponto de render, quem está com o aparelho, `eu.pronto`, `prontos/total` e o rodapé que as condições de `AcoesDaFase` produziriam.

Mesa local de 3 (Ana/Bruno/Carla), Quem Sou Eu, do início ao `fase=jogo`:

```
[Escrita]        com=j1 emVolta=true  pronto=false prontos=0/3 escreveu=false  rodapé=[Pronto]
[CartaDoVizinho] com=j1 ultimo=false
[Escrita]        com=j2 emVolta=true  pronto=false prontos=1/3 escreveu=false  rodapé=[Pronto]
[CartaDoVizinho] com=j2 ultimo=false
[Escrita]        com=j3 emVolta=true  pronto=false prontos=2/3 escreveu=false  rodapé=[Pronto]
[CartaDoVizinho] com=j3 ultimo=true
[Escrita]        com=j3 emVolta=false pronto=true  prontos=3/3 escreveu=true   rodapé=[Começar a partida]
fase=jogo volta=null — FIM
```

Sete pontos de render, **uma ação em cada**. A sonda tinha um `expect(botoes.length).toBe(1)` em cada passagem pela `Escrita`, e passou.

### O estado de rodapé vazio que você mandou procurar: **inalcançável**, e provei por que

`local && pronto && !todosProntos` renderizaria um rodapé sem nenhum botão. Ele não é alcançável, e a razão não é a ordem dos toques — é o próprio reducer:

1. **`pronto ⇒ carta escrita`.** Sonda adversarial: `enviar(mesa, { t: 'marcarPronto', pronto: true })` numa mesa recém-montada é **recusado** com `CARTA_INVALIDA`. Não existe estado com `eu.pronto === true` e `cartaQueEscrevi === undefined`.
2. **Logo, enquanto a volta está aberta, `pronto` implica `CartaDoVizinho`.** `Partida.tsx:262-277` intercepta antes da `Escrita` sempre que `emVolta && passagem.revelado && volta.mostraAoAgir && cartaQueEscrevi !== undefined`, e `mostraAoAgir` é `true` em toda a fase de escrita (`volta.ts:83`). Então a `Escrita` só renderiza com `pronto === false` — rodapé `[Pronto]`.
3. **Com a volta encerrada, `prontos === total` por construção.** A fila é `ativos(projecao)`, que no modo local é a mesa inteira, e passar adiante despacha `comandoAoEsconder: { t: 'marcarPronto', pronto: true }` (`volta.ts:90`) para cada um. Esgotar a fila implica todo mundo pronto — `todosProntos` verdadeiro, rodapé `[Começar a partida]`.
4. **Não há terceira porta.** A fase local nasce em `escrita` (nunca em `lobby` — sonda), `novaPartida` a partir da fase `jogo` é recusado com `FASE_INVALIDA`, e `marcarPronto(false)` — que o reducer ainda aceita e levaria a `prontos=2/3` — **não tem botão que o dispare no modo local**, porque `!(local && pronto)` removeu o único (`Escrita.tsx:421`). E mesmo se tivesse: o resultado seria `pronto === false`, ou seja, rodapé `[Pronto]`, não vazio.

**Conclusão**: o rodapé da `Escrita` local tem **exatamente uma ação em todo estado alcançável**. `PJ2-10` está cumprido, e o conserto não abriu buraco novo.

### O modo sala não mudou — byte a byte

Extraí o bloco `souHost ? ( … )` de `8e123fe` (antes) e de `d586acd` (depois), do abre ao `{confirmandoCancelamento && (`, e comparei por igualdade de string: **idênticos, 920 bytes contra 920 bytes**. Dentro dele seguem intactos o `motivo` `"Faltam … marcarem pronto. Forçar início não existe."` e o botão `"Cancelar e voltar ao lobby"` (1 ocorrência cada, antes e depois).

A outra mudança, `!(local && pronto)`, é **no-op provado** no modo sala: com `local === false`, `!(false && pronto)` é `true` para qualquer `pronto`, então a condição é literalmente a de antes. Nenhum outro ponto do arquivo foi tocado (`git diff 8e123fe..d586acd -- client/src/telas/Escrita.tsx` tem 3 hunks: a prop, a guarda, e o ramo novo).

---

## Discrimination Sensor

Nove mutações de comportamento, cada uma aplicada a uma cópia do arquivo, com os três arquivos de teste alvo (`sorteio.test.ts`, `volta.test.ts`, `motor.test.ts` — 99 testes) rodados e o arquivo restaurado em seguida.

| # | `file:line` | Mutação | Resultado |
| --- | --- | --- | --- |
| M1 | `shared/jogos/quem-sou-eu/sorteio.ts:25` | o ramo `'roda'` embaralha mesmo assim (`pares === 'roda' ? [...ids] : embaralhar(…)` → `embaralhar(…)`) | ✅ Morto (4 falhas) |
| M2 | `shared/jogos/quem-sou-eu/sorteio.ts:20` | o padrão vira `'roda'` (vazaria pro online) | ✅ Morto (2 falhas) |
| M3 | `client/src/passaejoga/volta.ts:66` | `acaoDaVolta` devolve sempre `{ rotulo: 'Esconder e passar' }` | ✅ Morto (1 falha) |
| M4 | `client/src/passaejoga/volta.ts:66` | `posicao >= total - 1` → `posicao > total - 1` (off-by-one da última pessoa) | ✅ Morto (1 falha) |
| M5 | `client/src/passaejoga/volta.ts:119` | a volta do chute do espião some (guarda tornada inalcançável) | ✅ Morto (1 falha) |
| M6 | `client/src/passaejoga/volta.ts:65` | `mostraAoAgir` ignorado pela `acaoDaVolta` | ✅ Morto (1 falha) |
| M7 | `client/src/passaejoga/motor.ts:228` | a guarda do relógio em trânsito removida | ✅ Morto (1 falha) |
| M8 | `client/src/passaejoga/motor.ts:376` | `autoVoto` volta a `false` no modo local | ✅ Morto (1 falha) |
| M9 | `client/src/passaejoga/motor.ts:365` | `paresDeEscrita` volta a `'sorteados'` no modo local | ✅ Morto (1 falha) |
| M10 | `client/src/telas/Escrita.tsx:421` | a guarda `!(local && pronto)` removida (volta "Desmarcar e editar" na mesa local) | ❌ **Sobreviveu** |
| M11 | `client/src/telas/Escrita.tsx:456` | `todosProntos &&` → `!todosProntos &&` no ramo local | ❌ **Sobreviveu** |

**Profundidade**: lightweight ampliada (11 mutações; as 9 primeiras cobrem todos os ramos novos dos três módulos puros, e as duas últimas miram o conserto da iteração 2).
**Resultado nos módulos puros**: **9/9 mortos** — ✅. Reexecutados no HEAD `d586acd`, não herdados da iteração 1.
**Resultado no conserto**: **0/2** — e isso era previsível, não é notícia. M10 e M11 vivem dentro de um `.tsx`, e o projeto não tem harness de componente (`tasks.md`, Test Coverage Matrix). A diferença em relação aos sobreviventes da rodada anterior (`N7`/`N9`/`N11`, provados **inalcançáveis**) é importante e deve ser dita: **M10 e M11 são alcançáveis** — mudam o que a mesa vê. O que os cobre hoje é a sonda de alcançabilidade descrita acima mais a conferência ao vivo no DOM, não a suíte. Se um dia entrar harness de componente no projeto, estes dois são a primeira asserção a escrever.
**Higiene**: `git status --porcelain` vazio depois do lote (só o `validation.md` não rastreado); nenhum arquivo da árvore alterado.

---

## As afirmações do implementador, checadas com ceticismo

| Afirmação | Veredito |
| --- | --- |
| "Nenhuma regra de jogo mudou de comportamento; em `shared/` há exatamente duas edições" | ✅ **Confirmado.** `git diff f70b0ec..HEAD -- shared` toca **4** arquivos e nada mais: `protocolo.ts` (`Config.paresDeEscrita` + o valor `'sorteados'` em `CONFIG_PADRAO`), `quem-sou-eu/sorteio.ts` (parâmetro novo com padrão), `quem-sou-eu/regras.ts` (uma linha, passando `ctx.config.paresDeEscrita`) e `quem-sou-eu/sorteio.test.ts` (só testes). O padrão preserva o online byte a byte, e isso é **asserido**, não suposto: `sorteio.test.ts:194` — `expect(semDizer).toEqual(dizendoSorteados)`, com `:195` provando que `'roda'` de fato difere. M2 morre, então a suíte pega uma troca de padrão. |
| "A acusação do Espião e o registro do Dedo são N comandos idênticos pelo `reduzir` de sempre" | ✅ **Confirmado.** Nenhum `Comando` novo entrou em `shared/protocolo.ts` (o diff do arquivo é só o campo de config). `EspiaoJogo.tsx:401` emite `{ t: 'votar', alvoId }` por jogador ativo; `DedoJogo.tsx:88` emite `{ t: 'apontar', alvoId }` por jogador ativo. Ambos por `enviarComo`, que já existia. Nenhuma apuração paralela no cliente. |
| "`dedo.autoVoto: true` não vaza pro online" | ✅ **Confirmado.** Escrito só em `configLocal` (`motor.ts:376`), função privada do motor local; `CONFIG_PADRAO.dedo.autoVoto` segue `false`, asserido em `motor.test.ts:631`, e o mutante M8 morre. |
| "A tela de acusação cobre o relógio abrindo a votação sozinho (`ESP-49`)" | ✅ **Confirmado.** `EspiaoJogo.tsx:390` — a condição é `modo === 'local' && (confirmandoVotacao \|\| votacao !== undefined)`: com a votação aberta pelo relógio, sem ninguém tocar, a tela aparece do mesmo jeito. E o rótulo de saída muda de sentido (`:398`): `votacao === undefined ? 'Ainda não decidimos' : 'Não acusar ninguém'`, com o segundo caso despachando `{ t: 'votar', alvoId: null }` por jogador (`:408`) — a mesa não fica presa numa urna sem porta. |
| "A guarda do relógio em trânsito não trava prazos pra sempre" | ✅ **Confirmado.** `motor.ts:228` — `if (mesa.passagem !== null && !mesa.passagem.revelado && !acabou(mesa.passagem)) return mesa`. As três condições são conjuntas e todas transitórias: `revelar` liga `revelado` no toque de quem recebe (`passagem.ts`), e `acabou` (`passagem.ts:38-40` — `posicao >= fila.length`) libera a volta terminada. Os três estados têm teste: `motor.test.ts:643` (em trânsito → `toBe(emTransito)`, mesma referência), `:653` (revelado → `not.toBe(naMao)`), `:661` (sem volta → `not.toBe(mesa)`). M7 morre. |
| "`PJ2-10` vale" (iteração 1) | ❌ **Refutado** na iteração 1 — dois controles de host empilhados sobre o botão do jogador. ✅ **Fechado** em `d586acd` e reverificado por sonda contra o motor real (iteração 2). |
| "Nenhuma das 4 telas de encerramento quebrou no modo sala" | ✅ **Confirmado.** `typecheck` (dois projetos) e `build` passam, o que exclui JSX órfão. Reli os quatro diffs: em cada uma o ramo `modo === 'local'` monta `<FimDaPartida>` e o `else` reconstrói **o botão e o parágrafo originais do modo sala**, com o texto de `aguardando.length > 0 ? 'Voltar ao lobby com N' : 'Voltar ao lobby'` intacto (`Encerrada.tsx:120-130`, `DedoEncerrada:150-160`, `EnigmasEncerrada:150-160`, `EspiaoEncerrada:186-196`). Nenhum condicional morto. O único resíduo é cosmético: o `<>…</>` que envolvia dois filhos agora envolve um só, nas quatro. |

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — a única alteração em `shared/` é um parâmetro com padrão preservador e um campo de config |
| Sem escopo além do pedido | ✅ |
| Não "melhorou" código não relacionado | ✅ |
| Segue os padrões existentes | ✅ — o que decide comportamento entrou em `volta.ts`/`motor.ts`/`sorteio.ts`; `Contagem` segue o molde do `PainelDaResenha` (decisão de modo dentro do componente) |
| Checagem ancorada na spec | ⚠️ — 9 ✅, 16 por leitura/parciais, 0 ❌ |
| Cobertura por camada: domínio 1:1 com ACs | ✅ |
| Cobertura por camada: telas | ⚠️ limitação estrutural aceita e declarada na Test Coverage Matrix |
| Todo teste mapeia uma AC — sem testes órfãos | ✅ — os 17 testes novos citam `PJ2-xx` no título ou no `describe` |
| Limite de dois ramos de `modo` por tela (`tela.ts:24-27`) | ⚠️ — `EspiaoJogo.tsx` passou a **5** sítios de `modo` (`:113`, `:243`, `:327-331`, `:342-344`, `:389`). O gatilho documentado manda partir a tela em duas; não foi feito nem registrado como decisão |
| `AD-002` (regra fora do `core`/borda) | ✅ — a tradução de gesto mora na tela; a apuração segue no `reduzir` |
| `AD-003` (o sistema é tabuleiro, não juiz) | ✅ — nenhum alvo é escolhido pelo código; todo comando nasce de um toque |
| `AD-008` (projeção manda) | ✅ — `Partida.tsx:263-267` decide a `CartaDoVizinho` pela projeção, não por estado de tela |
| `AD-013`/`AD-014` (config aninhada, jogo por registro) | ✅ — `paresDeEscrita` entrou no topo de `Config`, como `ordemTurnos`, por ser do "Quem Sou Eu"; é a mesma tensão já registrada em `AD-013`, não uma nova violação |

---

## Edge Cases

- [x] Recarregar no meio da carta à vista — `Partida.tsx:263-267` reabre pela projeção (`eu.cartaQueEscrevi`), não por estado de tela
- [x] Jogo novo com mínimo maior que a roda que voltou — `Mesa.tsx:47-50` completa com campos vazios em vez de recusar
- [x] Votação aberta pelo relógio, sem ninguém tocar — `EspiaoJogo.tsx:390`, com saída "Não acusar ninguém"
- [x] Aparelho parado em trânsito por dez minutos — `motor.test.ts:643`
- [x] Contagem 3-2-1 tocada duas vezes — `Contagem.tsx:20-25`, `jaTerminou` garante um disparo só
- [x] Espião local sem pacote marcado — o efeito de `Lobby.tsx:1363` força `modoPacote: 'pacote'` e a pendência aparece antes do toque
- [ ] Trocar de jogo pela `Porta` com uma partida gravada no depósito — `voltarAoLobby` chama `descartar()` (`PassaEJoga.tsx:54`), mas não há teste que prove que o depósito ficou vazio
- [x] Última pessoa da roda **desmarcar** pronto depois de a roda fechar — o botão deixou de existir no modo local (`Escrita.tsx:421`); o comando segue aceito pelo reducer, mas sem porta na tela
- [x] Rodapé vazio em `local && pronto && !todosProntos` — **inalcançável**, provado pela recusa `CARTA_INVALIDA` do reducer somada à interceptação de `Partida.tsx:262-277` (ver Iteração 2)

---

## Gate Check

- **Comando**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- **Executado em**: `d586acd` (iteração 2), do zero — não herdado da iteração 1
- **typecheck**: ✅ exit 0 (dois projetos)
- **lint**: ✅ 0 erros, 2 warnings `react-hooks/exhaustive-deps` em `Jogo.tsx:96` e `:107` — **pré-existentes**, idênticos à linha de base
- **test:unit**: ✅ **42 arquivos, 1042 testes, 1042 passaram**, 0 falharam, 0 pulados
- **test:integration**: ✅ **6 arquivos, 88 testes, 88 passaram**
- **build**: ✅ exit 0

**Integridade de testes**: linha de base da rodada 1025 → **1042** (`+17`): `+4` em `sorteio.test.ts`, `+6` em `motor.test.ts`, `+7` em `volta.test.ts`. A iteração 2 não somou nem removeu teste nenhum (o conserto é `.tsx`, sem harness) — 1042 antes e depois de `d586acd`. Nenhum teste apagado na rodada: o teste de `PJ-28` ("Um voto que mais ninguém vê") foi **substituído** pelo de `PJ2-11` no mesmo lugar, o que é mudança de requisito, não perda de cobertura. Nenhuma asserção enfraquecida: `volta.test.ts:97-104` ficou **mais** estrita (passou a exigir `mostraAoAgir` e `comandoAoEsconder` no `toEqual`).

---

## Spec-precision gaps

1. **`PJ2-07` "letra grande"** — sem número. Implementado como `clamp(2rem,11vw,3.5rem)` (`CartaDoVizinho.tsx:51`). Mesmo gap que `PJ-30` já tinha na rodada anterior.
2. **`PJ2-18`/`PJ2-21` "contar 3, 2, 1"** — a spec não fixa duração nem resolve a Open Question 1 (pulável ou não). Implementado a 700 ms por passo e **pulável** (`Contagem.tsx:4`, `:38`). A Open Question segue aberta no `spec.md`, apesar de a implementação já ter escolhido.
3. **`PJ2-17` "seguido de uma confirmação"** e **`PJ2-20` "segunda confirmação"** — sem texto nem gesto definidos. Implementados com `Modal` nos dois.
4. **`PJ2-15` "manter o placar como já faz hoje"** — não define resultado; verificável só por ausência de diff.

Nenhum bloqueia. Ficam registrados para que uma mudança futura seja alteração de requisito, e não conversa perdida.

---

## Registros que não são tarefa

| Item | Severidade | Recomendação |
| --- | --- | --- |
| `EspiaoJogo.tsx` em **6** sítios de `modo` (`:212`, `:243`, `:327`, `:342`, `:390`, `:416`), contra o limite de 2 de `tela.ts:24-27` | Minor | **Concordo em não partir a tela** — argumento em "Sobre os 6 sítios de `modo`", abaixo. Registrar a exceção no `STATE.md`, com a distinção que a torna útil |
| ~~`volta.ts` sem newline no fim do arquivo~~ | Cosmético | ✅ Corrigido em `d586acd` |
| Sair da partida no modo local pede **duas** confirmações (`Shell.tsx:127` e `PassaEJoga.tsx:86`) | Minor | Pré-existente ao range; as duas frases agora dizem a verdade (`PJ2-03` cumprido), mas uma delas basta |
| `volta.test.ts:181` — o título de Dedo com fixture de Dedo agora **está** correto (a ressalva da rodada anterior caducou) | — | Nada a fazer |

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| `PJ2-06`, `PJ2-08`, `PJ2-09`, `PJ2-11`, `PJ2-13`, `PJ2-14`, `PJ2-15`, `PJ2-16` | Implementing | ✅ **Verified** |
| `PJ2-01`, `PJ2-02`, `PJ2-03`, `PJ2-04`, `PJ2-05`, `PJ2-07`, `PJ2-12`, `PJ2-17`, `PJ2-18`, `PJ2-19`, `PJ2-20`, `PJ2-21`, `PJ2-22`, `PJ2-23`, `PJ2-24`, `PJ2-25` | Implementing | ⚠️ **Verified com evidência parcial** (tela pura ou núcleo asserido; limitação estrutural declarada) |
| `PJ2-10` | ❌ Needs Fix (it. 1) | ✅ **Verified** (`d586acd`) |

---

## Sobre os 6 sítios de `modo` em `EspiaoJogo.tsx` — o argumento, não a regra

Você pediu que eu discordasse com argumento se fosse discordar. **Não discordo: não parta a tela.** Mas a exceção só vale a pena se for registrada de um jeito que ainda deixe a regra morder alguém no futuro, e a formulação "o limite não se aplica ao Espião" não deixa.

O argumento a favor de não partir é mais forte do que o "80% idêntico". Sob `AD-008` a tela é uma **função pura da projeção**: ela lê `espiao.*` e devolve JSX e comandos. Duas cópias dessa função são duas leituras da mesma projeção que precisam concordar para sempre — é a mesma doença que `AD-008` nomeia entre regra e projeção, e a mesma que a extração do `FimDaPartida` acabou de curar em quatro telas de encerramento. Trocar seis condicionais por duas cópias de ~600 linhas que compartilham papel, relógio, dica, resultado, chute, placar e menu é pagar caro em risco de divergência para comprar barato em legibilidade.

O que eu acrescento, e que é a razão de eu não simplesmente concordar e calar: **os seis sítios não são seis decisões.** Recontei — são `:212`, `:243`, `:327`, `:342`, `:390`, `:416`. Dois deles (`:327`, `:342`) só escolhem **texto**. Os outros quatro são estruturais, e três (`:243` esconder a `Votacao`, `:390` montar a `EspiaoAcusacao`, `:416` suprimir o modal de abrir votação) são **a mesma decisão dita três vezes**: "no aparelho só não há urna". É por isso que a contagem estourou — não porque a tela faça duas coisas, mas porque uma decisão está espalhada.

Então a exceção que eu recomendaria registrar no `STATE.md` não é "`EspiaoJogo` está dispensada", e sim a distinção que a torna verificável no próximo caso:

> Sítios de `modo` que só **selecionam cópia** não contam para o limite; contam os que selecionam **estrutura**. Uma tela que passe de dois sítios estruturais deve primeiro tentar **unificar a decisão** (extrair o bloco de um modo para um componente próprio, como `EspiaoAcusacao` e `FimDaPartida`) e só depois considerar partir-se em duas.

Sob essa régua o Espião fica em 4 sítios estruturais — ainda acima de 2, e portanto com uma dívida nomeada e um caminho barato (unificar as três metades do "não há urna" atrás de uma seam só), em vez de uma dispensa que apaga o sinal. Se você preferir registrar a dispensa simples, também não bloqueia nada: é Minor, e nenhuma AC depende disso.

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored check**: 9/25 com evidência que bate com o resultado que a spec define · 16 verificados por leitura ou parcialmente asseridos (limitação estrutural declarada) · **0 violados** · 4 spec-precision gaps, nenhum bloqueante
**Sensor**: **9/9 mortos** nos módulos puros, reexecutados no HEAD · 2 sobreviventes no `.tsx` do conserto, alcançáveis mas fora do alcance da suíte por falta de harness — cobertos por sonda contra o motor real e por conferência ao vivo
**Gate**: typecheck 0 · lint 0 erros / 2 warnings pré-existentes · unit **1042 (42 arquivos)** · integration **88** · build 0
**Iterações**: 1 de 3 usadas. Nenhuma pendência.

**O que a iteração 2 fechou.** O rodapé da `Escrita` local passou a oferecer uma ação e só uma. Não aceitei o relato: dirigi o motor real pelo mesmo caminho que `Partida.tsx` dirige e enumerei os sete pontos de render de uma mesa de três — `[Pronto]`, `[Pronto]`, `[Pronto]`, `[Começar a partida]`, com as telas de carta no meio. O estado de rodapé vazio que você mandou procurar (`local && pronto && !todosProntos`) é **inalcançável**, e não por sorte de ordenação: o reducer recusa `marcarPronto` sem carta (`CARTA_INVALIDA`), então `pronto` implica carta escrita, e carta escrita com a volta aberta implica `CartaDoVizinho` interceptando antes da `Escrita`. Com a volta esgotada, todo mundo passou e portanto todo mundo está pronto. Não há terceira porta: a fase local nasce em `escrita`, `novaPartida` na fase `jogo` é recusado, e o único botão que mandava `marcarPronto(false)` deixou de existir no modo local.

**O modo sala.** O bloco `souHost` do online é **byte a byte** o de antes — 920 bytes contra 920, igualdade de string —, com o `motivo` de "faltam X marcarem pronto" e o "Cancelar e voltar ao lobby" intactos. A outra mudança, `!(local && pronto)`, é no-op provado quando `local` é `false`.

**O que continua fora de alcance**, e é o mesmo limite de sempre: presença no DOM, posicionamento e cópia. As duas mutações que injetei dentro de `Escrita.tsx` sobreviveram porque não há harness de componente neste projeto. Registrado como limite conhecido da suíte — e, ao contrário dos sobreviventes inalcançáveis da rodada anterior, estes dois **são** alcançáveis: são a primeira asserção a escrever no dia em que entrar harness.

**Next steps**: nenhum bloqueante. A feature pode ser dada como concluída. Fica um registro Minor para o `STATE.md` (os sítios de `modo` do `EspiaoJogo`, com a formulação sugerida acima).
