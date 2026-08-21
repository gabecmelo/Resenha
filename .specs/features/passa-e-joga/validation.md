# Passa e Joga — Validation

**Date**: 2026-08-21
**Spec**: `.specs/features/passa-e-joga/spec.md`
**Diff range**: `de88520..8f79742` (branch `feat/passa-e-joga` — 23 tasks, 2 correções, 4 commits da iteração 1 de conserto)
**Verifier**: sub-agente independente (autor ≠ verificador). Nada da árvore real foi modificado; as mutações rodaram sobre cópias com restauração imediata e `git status` verificado vazio depois de cada lote.

**Veredito**: ✅ **PASS** — a iteração 1 fechou as lacunas Major. Portões verdes, sensor 17/20 com os 3 sobreviventes provados **inalcançáveis**, 24/35 ACs com asserção que bate com o resultado que a spec define, 9 parciais e 2 registrados como limitação aceita.

**Histórico**: a iteração 0 devolveu ⚠️ PASS COM RESSALVAS — 4 ACs sem evidência nenhuma, 1 mutante sobrevivente, 1 contradição dentro da spec, e o limite de ramos de `modo` estourado em 6 telas. A iteração 1 fechou os quatro itens.

---

## Iteração 1 — o que fechou e o que ficou

| Item da iteração 0 | Commit | Estado agora |
| --- | --- | --- |
| **Fix 1** (Major) — `PJ-21`, `PJ-22`, `PJ-24`, `PJ-29`, `PJ-30` presas em funções não exportadas de `Partida.tsx` | `d032e09` | ✅ **Fechado.** `voltaDaFase`, `ativos` e `donoDoAparelho` mudaram para `client/src/passaejoga/volta.ts`, exportadas; `volta.test.ts` traz 13 testes que dirigem o **motor real**, sem `Projecao` montada à mão. |
| **Fix 2** (Minor) — limite de dois ramos de `modo` estourado em 6 telas | `8f79742` | ✅ **Fechado**, com uma ressalva de contagem — ver "Ramos de `modo`" abaixo. |
| **Fix 3** (Minor) — `PJ-10` mandava sortear a ordem da roda, contra `PJ-07` | `e150d06` | ✅ **Fechado.** `spec.md:85` agora diz "sortear as cores … e SHALL **manter** a ordem de circulação do aparelho como a mesa a digitou (`PJ-07`)". A contradição some e `PJ-10` passa a ter resultado verificável. |
| **Fix 4** (Minor) — mutante M7 sobrevivente na segunda tranca de `PJ-20` | `30d9649` | ✅ **Fechado.** `guarda.test.ts:113-122` grava `revelado: true` direto no depósito e exige `false` na leitura. M7 reexecutado: **morto**. |
| `PJ-01`, `PJ-02` sem evidência automatizada | — | ⚠️ **Limitação aceita, não pendência.** Ver abaixo. |

### Limitação aceita: `PJ-01` e `PJ-02`

`PJ-01` (o botão "Jogar num celular só" abaixo de "Criar uma sala") e `PJ-02` (o `(?)` que explica o modo em uma frase) são **tela pura**, em `client/src/telas/Inicio.tsx:294, 317, 340-346`. O projeto não tem harness de teste de componente — zero `*.test.tsx`, nenhuma testing-library em `package.json` — e montar um só para dois critérios de posicionamento e cópia custaria mais do que protege. Ficam **verificados por leitura**, e é assim que este relatório os conta: não são gap em aberto, são o limite conhecido da suíte. Se um dia entrar harness de componente no projeto, são os dois primeiros da fila.

---

## Item 1 — os 9 critérios, reverificados com a mesma régua

Evidência-ou-zero, e a regra de payload: campo de objeto só conta se a asserção olhar o **valor**.

| AC | Resultado que a spec define | `file:line` + asserção | Antes | Agora |
| --- | --- | --- | --- | --- |
| **PJ-21** rodada sem segredo fica numa tela só | `voltaDaFase` devolve `null` | `volta.test.ts:146` — `expect(voltaDaFase(veja(mesa), mesa.aparelhoCom)).toBeNull()` para o Dedo; `:140` — idem para os Enigmas com o aparelho já em quem narra. Cobre as duas metades do parêntese da spec. | ⚠️ | ✅ |
| **PJ-22** registra por toque de quem está com o aparelho | o próximo toque é de quem ainda não apontou | `volta.test.ts:156` — `expect(donoDoAparelho(veja(depoisDoPrimeiro), 'j1')).toBe('j2')` depois de j1 apontar; somado a `motor.test.ts:328-343`, que já provava vencedor `'j2'` e placar `{id:'j2', apelido:'Bruno', pontos:1}` a partir de três toques explícitos (`AD-003` — o sistema não decide sozinho). | ⚠️ | ✅ |
| **PJ-23** aparelho fica com quem narra | volta nenhuma quando o aparelho já está com o narrador | `volta.test.ts:140` — `expect(voltaDaFase(veja(mesa), narrador)).toBeNull()`. **Uma das três cláusulas.** "mostrando cena e solução" e "registrar as respostas" (o caminho `enviarComo`, `Partida.tsx:166-177`) seguem só em tela. | ❌ | ⚠️ |
| **PJ-24** passagem antes de revelar a solução nova | volta de um item, aparelho **fica** com quem recebeu | `volta.test.ts:129-133` — `toEqual({fila:[narrador], instrucao:'Quem receber narra este enigma — a solução é só de quem narra.', escondeAoPassar:false})`. Objeto inteiro, valor por valor. | ❌ | ✅ |
| **PJ-25** volta de revelação na ordem da roda | fila = roda; esconder é marcar pronto | `volta.test.ts:95-100` — `toEqual({fila:['j1','j2','j3','j4'], instrucao:'O papel desta rodada — o local, ou ser o espião.', escondeAoPassar:true, comandoAoEsconder:{t:'marcarPronto', pronto:true}})`; somado a `motor.test.ts:442` (prontos contados enquanto o aparelho anda). | ⚠️ | ✅ |
| **PJ-27** aparelho parado na mesa depois que o relógio começa | a volta fecha; quem começa não é resorteado | `volta.test.ts:106-107` — `expect(veja(mesa).jogo?.espiao?.rodadaIniciada).toBe(true)` **e** `expect(voltaDaFase(...)).toBeNull()`; `motor.test.ts:503` — `comecaPerguntando.id` estável. A cláusula "o local não pode existir no DOM" segue verificada por leitura (`EspiaoJogo.tsx:211`). | ⚠️ | ⚠️ |
| **PJ-28** votação um de cada vez, mesma tela de passagem | volta com a roda inteira, escondendo a cada voto | `volta.test.ts:116-120` — `toEqual({fila:['j1','j2','j3','j4'], instrucao:'Um voto que mais ninguém vê.', escondeAoPassar:true})`; `motor.test.ts:517-518` já provava que o fechamento não fica retido e que o resultado aparece. | ✅ | ✅ |
| **PJ-29** cada um escreve a sua sem ninguém ver | volta de escrita pela roda inteira | `volta.test.ts:83-87` — `toEqual({fila:['j1','j2','j3','j4'], instrucao:'Uma carta que ninguém mais pode ver.', escondeAoPassar:true})`. O sorteio de quem escreve pra quem é do próprio jogo (`shared/jogos/quem-sou-eu/sorteio.test.ts`, inalterado) e aparece em `motor.test.ts:277` — `toEqual(['j2','j1'])`. | ⚠️ | ✅ |
| **PJ-30** aparelho nunca com quem está na vez | vai para o vizinho seguinte da roda | `volta.test.ts:169` — `expect(donoDoAparelho(veja(mesa), vezDe)).not.toBe(vezDe)`; `:178` — `toBe(vizinho)`, com `vizinho` derivado da roda projetada; `:187` — quem **não** está na vez não perde o aparelho (`toBe(outro)`). Três ângulos: sai, vai para o lugar certo, e não se move à toa. A cláusula "letra grande" segue sem número na spec (ver spec-precision). | ❌ | ✅ |

Reforço colateral: `volta.test.ts:73` — `expect(ativos(veja(mesa))).toEqual(mesa.sala.jogadores.map(j => j.id))` ancora `PJ-07` (a roda na ordem digitada) numa asserção própria, que antes só existia de forma indireta.

**Item 1: confirmado para 7 dos 9** — `PJ-21`, `PJ-22`, `PJ-24`, `PJ-25`, `PJ-28`, `PJ-29`, `PJ-30`. **Parcial para 2**: `PJ-23` fechou uma de três cláusulas, e `PJ-27` fechou a cláusula da volta mas não a do DOM. Nenhum dos dois é conserto pendente — o que falta em ambos é exatamente o tipo de asserção que exigiria harness de componente, a mesma limitação aceita de `PJ-01`/`PJ-02`.

### Uma observação sobre um teste

`volta.test.ts:159` chama-se "não move o aparelho enquanto o **Dedo** não abre a votação", mas monta `mesaDe('quem-sou-eu', 4)`. Na fase `escrita` do Quem Sou Eu o ramo tomado é o do QSE (`volta.ts:128`), que devolve `atual` porque `vezDe` ainda não existe — **o caminho do Dedo nunca é exercido por este teste**. A asserção é verdadeira e o teste é legítimo (cobre o retorno neutro do ramo QSE), só está com o nome trocado. Cosmético; anotado para não virar falsa confiança numa leitura futura.

---

## Item 2 — Sensor, refeito por conta própria

Não confiei nos quatro mutantes relatados: reexecutei os quatro e acrescentei uma caça a sobreviventes mirando justamente as asserções novas de `toEqual` em objeto inteiro.

| # | `file:line` | Mutação | Resultado |
| --- | --- | --- | --- |
| N1 | `volta.ts:131-133` | `donoDoAparelho` devolve `atual` na vez do QSE (bloco do vizinho removido) | ✅ Morto (2 falhas) |
| N2 | `volta.ts:92` | guarda dos Enigmas vira `enigmas !== undefined`, sem comparar o narrador | ✅ Morto (1 falha) |
| N3 | `volta.ts:68` | `comandoAoEsconder` removido da volta do Espião | ✅ Morto (1 falha) |
| N4 | `volta.ts:139` | ramo do Dedo devolve sempre `atual` | ✅ Morto (1 falha) |
| N6 | `volta.ts:96` | Enigmas: `escondeAoPassar: false` → `true` | ✅ Morto (1 falha) |
| M7 | `guarda.ts:95` | `interpretar` confia no `revelado` gravado | ✅ **Morto (1 falha)** — era o sobrevivente da iteração 0 |
| N7 | `volta.ts:106` | `ativos` deixa de filtrar por `situacao === 'ativo'` | ❌ Sobreviveu |
| N9 | `volta.ts:78` | volta da votação: `quantosVotaram < total` → `<= total` | ❌ Sobreviveu |
| N11 | `volta.ts:128` | ramo do QSE perde a guarda `fase === 'jogo'` | ❌ Sobreviveu |

**Iteração 1: 6/9 mortos. Acumulado da feature: 17/20 mortos.**

### Os três sobreviventes são inalcançáveis — provado, não suposto

Rodei uma sonda descartável contra o motor real (criada, executada e removida; árvore verificada limpa) para não classificar por intuição:

- **N9** — depois do último voto o reducer do Espião fecha a votação: a sonda devolveu `votacaoAberta: undefined, temResultado: true`. Com `votacaoAberta` indefinido, a guarda anterior (`votacao !== undefined`) já corta, e `<` versus `<=` **não tem estado alcançável que os distinga**. A comparação é defesa em profundidade.
- **N11** — na fase `encerrada` do Quem Sou Eu a sonda devolveu `vezDe: null`, e `donoDoAparelho` já barra `vezDe !== null` uma linha adiante (`volta.ts:130`). A guarda de fase é redundante com a de `vezDe`.
- **N7** — no Passa e Joga ninguém é `aguardando`: `motor.ts:397` monta todo jogador como `'ativo'` e `promoverAguardando` só promove. O filtro é herança honesta da sala online, sem estado local que o exerça.

Nenhum dos três é teste fraco — são linhas sem estado que as distinga. **Recomendação: não consertar.** Escrever um teste que force `situacao: 'aguardando'` numa mesa local seria testar um estado que a própria spec põe fora de escopo ("Entrar no meio pelo celular de outra pessoa"). O risco real, e ele é hipotético: se o modo um dia ganhar espectador ou quem chega no meio, **N7 vira alcançável e nada na suíte o pega**. Fica registrado aqui como o gatilho, não como tarefa.

---

## Item 3 — A extração não mudou comportamento

Comparei `client/src/passaejoga/volta.ts:14-146` com `git show f616d98:client/src/telas/passaejoga/Partida.tsx | sed -n '343,475p'`, normalizando apenas o prefixo `export `. O `diff` saiu **vazio**: 133 linhas, byte a byte idênticas.

As únicas mudanças são **4 palavras `export`** (`VoltaDoAparelho`, `voltaDaFase`, `ativos`, `donoDoAparelho`) e o cabeçalho de comentário novo em `volta.ts:1-12`, fora do bloco comparado. `Partida.tsx` não guarda cópia nenhuma — `grep -nE "^(function|interface) (voltaDaFase|ativos|donoDoAparelho|VoltaDoAparelho)"` não casa nada — e passa a importar de `../../passaejoga/volta` (`Partida.tsx:19`).

✅ **Confirmado: refactor puro, sem espaço para regressão de comportamento.**

---

## Item 4 — `PainelDaResenha` no modo sala

Verificado por leitura, já que não há como pôr dois jogadores numa sala online a partir de um perfil só de navegador.

- **O componente só desaparece no local.** `client/src/componentes/PainelDaResenha.tsx:23` — `if (modo === 'local') return null`, e só então monta `<PainelRecolhivel rotulo="resenha" …><Chat …/></PainelRecolhivel>`. `modo` é `'sala' | 'local'` **obrigatório** (`:21`), não opcional: não existe terceiro caminho, e esquecer de passá-lo é erro de compilação, não painel sumido em silêncio.
- **Equivalência com o que saiu.** O código anterior era `{modo === 'sala' && (<PainelRecolhivel …>)}`. Sobre uma união fechada de dois valores, `modo === 'sala' && X` e `if (modo === 'local') return null; return X` são a mesma função. Nenhuma tela ficou sem chat no modo sala.
- **As cinco telas mantêm o padrão `'sala'`.** `Encerrada.tsx:26`, `EspiaoEncerrada.tsx:28`, `EspiaoJogo.tsx:43`, `Jogo.tsx:42`, `Escrita.tsx:32` — todas com `modo = 'sala'` na desestruturação, e todas repassando `modo={modo}` nas duas instâncias (coluna do celular e do desktop): `Encerrada:95,102` · `Escrita:137,144` · `EspiaoEncerrada:162,169` · `EspiaoJogo:255,262` · `Jogo:206,213`. Dez chamadas, dez com o valor repassado.
- **Quem ficou de fora, ficou por bom motivo.** `CartasJogo`/`CartasEncerrada` (Cartas Contra a Turma está fora do modo) e `EspiaoAguardando` (tela de espera que o modo local nunca monta — `Partida.tsx:319-323` usa `EspiaoTodosProntos`/`EspiaoPapel` no lugar) seguem com `PainelRecolhivel` direto, sem prop `modo`. Correto: nenhuma das três roda em modo local.

✅ **Confirmado.**

### Ramos de `modo` — a contagem, com a ressalva

| Tela | Antes | Agora | Sítios |
| --- | --- | --- | --- |
| `Escrita.tsx` | 2 | **0** | — |
| `EspiaoJogo.tsx` | 3 | **1** | 211 |
| `Jogo.tsx` | 3 | **1** | 158 |
| `Encerrada.tsx` | 4 | **2** | 115, 122 |
| `EspiaoEncerrada.tsx` | 4 | **2** | 182, 189 |
| `DedoJogo.tsx` | 2 | **2** | 89, 225 |
| `EnigmasJogo.tsx` | 2 | **2** | 377, 406 |
| `DedoEncerrada.tsx` | 3 | **3** | 146, 153, 193 |
| `EnigmasEncerrada.tsx` | 3 | **3** | 146, 153, 193 |

Sete das nove estão em ≤2. `DedoEncerrada` e `EnigmasEncerrada` seguem em 3 — mas o terceiro sítio (`:193`) é `if (local) return null` dentro de um subcomponente `Resenha` **local ao arquivo**, que faz exatamente o que `PainelDaResenha` passou a fazer. Sob a régua que o próprio refactor adotou — o painel encapsulado não conta como ramo da tela —, as nove estão em ≤2 e o gatilho de `design.md:209` está respeitado. O que sobra não é violação, é **duplicação**: duas cópias do mesmo embrulho continuam de pé em vez de usarem o componente compartilhado. Custo baixo, consolidação óbvia para quem passar por ali.

---

## Gate Check

- **Comando**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- **typecheck**: ✅ exit 0
- **lint**: ✅ exit 0 — 0 erros, 2 warnings `react-hooks/exhaustive-deps` (`Jogo.tsx:97`, `:108`), pré-existentes ao range
- **test:unit**: ✅ **42 arquivos, 1025 testes, 1025 passaram, 0 falharam, 0 pulados** (era 41/1011 — `+1` arquivo, `+14` testes: 13 de `volta.test.ts` e 1 de `guarda.test.ts`)
- **test:integration**: ✅ **6 arquivos, 88 testes, 88 passaram, 0 falharam**
- **build**: ✅ exit 0

Bate com o que o coordenador reportou, número por número.

**Integridade de testes**: nenhum teste removido nesta iteração. Acumulado da feature: `+130` declarações novas; as 14 "removidas" de `server/core/prazos.test.ts` reaparecem idênticas em `shared/jogos/prazos.test.ts:28-137` — mudança de casa junto com o código (`AD-017`), não perda.

---

## Spec-Anchored Acceptance Criteria — placar final

| Estado | Contagem | Quais |
| --- | --- | --- |
| ✅ asserção que bate com o resultado da spec | **24** | PJ-04, 05, 06, 07, 08, 10, 11, 12, 14, 15, 16, 19, 20, 21, 22, 24, 25, 26, 28, 29, 30, 31, 32, 34 |
| ⚠️ parcial — núcleo asserido, metade de tela por leitura | **9** | PJ-03, 09, 13, 17, 18, 23, 27, 33, 35 |
| ⚠️ limitação aceita — tela pura, sem harness | **2** | PJ-01, 02 |

Evolução desde a iteração 0: **17 → 24** em ✅, e **4 → 0** sem evidência nenhuma.

A evidência `file:line` de cada um dos 24 está distribuída entre `client/src/passaejoga/{motor,passagem,nomes,guarda,volta}.test.ts`, `shared/jogos/{aplicar,prazos}.test.ts`, `shared/jogos-catalogo.test.ts`, `shared/jogos-conteudo.test.ts` e `client/src/estado/entrada.test.ts`. As nove linhas que mudaram nesta iteração estão detalhadas na tabela do Item 1; as demais permanecem como na iteração 0, reverificadas por amostragem e pelos portões.

Fatos estruturais que sustentam o bloco de P3, reconferidos nesta iteração:

- **`PJ-11`** — os 20 arquivos de regra (`regras`/`projecao`/`sorteio`/`index` dos cinco jogos) têm **0 linhas divergentes** do original `server/games/**`, normalizando só o prefixo de import. Nenhuma regra foi reimplementada; o motor local chama o mesmo `REGISTRO_DE_JOGOS`.
- **`AD-010`** — `grep -rn setAlarm shared/ client/src/` devolve **uma única ocorrência, dentro de um comentário** (`shared/jogos/prazos.ts:6`). A única chamada real do projeto continua em `server/core/prazos.ts:40`.
- **`PJ-14`** — nenhum `setTimeout`/`setInterval` em `client/src/passaejoga/*.ts`. A batida de um segundo mora em `Partida.tsx:88` e apenas *olha* o relógio.

### Spec-precision gaps remanescentes

1. ~~`PJ-10` contradiz `PJ-07`~~ — **resolvido** em `e150d06`.
2. **`PJ-22` "SHALL contar até apontar"** não define o que é contar. A mecânica está coberta; a contagem regressiva de `DedoJogo.tsx:89-92` é escolha da implementação, sem resultado na spec para ancorar.
3. **`PJ-30` "letra grande"** sem número. Implementado como `clamp(2rem,11vw,3.5rem)` (`Jogo.tsx:549`).
4. **`PJ-33`/`PJ-35` "pedir confirmação"** sem texto nem gesto definidos. Implementado com `Modal` destrutivo nos dois.

Nenhum bloqueia: são frases que descrevem intenção sem fixar valor, e a implementação escolheu um valor razoável para cada. Ficam registrados para que uma mudança futura seja alteração de requisito e não conversa perdida.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — a extração é byte-idêntica; o `PainelDaResenha` só move código que já existia duplicado |
| Sem escopo além do pedido | ✅ — os 4 commits atacam exatamente os 4 fixes, nada mais |
| Não "melhorou" código não relacionado | ✅ — `DedoJogo`/`EnigmasJogo` e suas encerradas ficaram intocadas, como declarado |
| Segue os padrões existentes | ✅ — `volta.ts` entra em `client/src/passaejoga/**` puro, como `passagem.ts`, `nomes.ts` e `motor.ts` |
| Checagem ancorada na spec (valor asserido = resultado da spec) | ✅ nos 24; ⚠️ nos 9 parciais |
| Cobertura por camada: domínio 1:1 com ACs | ✅ |
| Cobertura por camada: telas | ⚠️ **limitação estrutural aceita** — o projeto não tem harness de componente. O que dava para tirar de dentro do `.tsx` foi tirado; o que sobrou é posicionamento, cópia e presença no DOM |
| Todo teste mapeia uma AC — sem testes órfãos | ✅ os 13 de `volta.test.ts` citam AC no título |
| Limite de dois ramos de `modo` | ✅ sob a régua do refactor (ver ressalva acima) |
| Diretrizes documentadas seguidas | ✅ `AD-002`, `AD-003`, `AD-008`, `AD-009`, `AD-010`, `AD-013`, `AD-017` reconferidos |

---

## Edge Cases

Os dez cobertos na iteração 0 seguem cobertos (depósito bloqueado, JSON corrompido, versão antiga, jogo fora do registro, mesa sem jogadores, pacote inexistente, aba dormindo dez minutos, aviso recusado, fila terminada, comando antes da partida). Mudanças nesta iteração:

- [x] **Dedo em votação: o aparelho vai para o próximo que não apontou** — `volta.test.ts:156` (era descoberto)
- [x] **Quem Sou Eu: o aparelho de quem não está na vez não se move** — `volta.test.ts:187` (era descoberto)
- [x] **`revelado` gravado à mão no depósito** — `guarda.test.ts:113-122` (era o mutante M7)
- [ ] Recarregar **no meio da volta do Espião** com pronto retido e passagem aberta ao mesmo tempo — as metades seguem testadas em separado (`guarda.test.ts:62`, `:97`), a combinação não
- [ ] Volta fechando sozinha por prazo vencido (`Partida.tsx:104-113`) — segue sem cobertura, é efeito de React

---

## Fix Plans

**Nenhum conserto pendente.** Os quatro da iteração 0 estão fechados. O que sobra é registro, não tarefa:

| Item | Severidade | Ação recomendada |
| --- | --- | --- |
| `volta.test.ts:159` tem título de Dedo e fixture de Quem Sou Eu | Cosmético | Renomear na próxima passagem pelo arquivo, ou trocar a fixture para realmente exercer o ramo do Dedo |
| `DedoEncerrada`/`EnigmasEncerrada` mantêm cópia local do embrulho `Resenha` | Cosmético | Adotar `PainelDaResenha` se alguém passar por ali |
| N7/N9/N11 inalcançáveis | Minor, **não consertar** | Se o modo ganhar espectador ou entrada no meio (hoje fora de escopo), N7 vira alcançável — reavaliar então |
| `PJ-01`, `PJ-02`, e as metades de tela de `PJ-23`/`PJ-27` | Aceito | Primeiros da fila se entrar harness de componente no projeto |

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| PJ-21, PJ-22, PJ-24, PJ-25, PJ-29, PJ-30 | ⚠️/❌ na iteração 0 | ✅ **Verified** |
| PJ-10 | ⚠️ correção de spec pendente | ✅ **Verified** (spec corrigida em `e150d06`) |
| PJ-20 | ✅ com mutante sobrevivente | ✅ **Verified** (duas trancas, ambas asseridas) |
| PJ-04, 05, 06, 07, 08, 11, 12, 14, 15, 16, 19, 26, 28, 31, 32, 34 | ✅ | ✅ **Verified** (inalterado) |
| PJ-23, PJ-27 | ❌/⚠️ | ⚠️ **Verified com evidência parcial** — cláusula comportamental asserida, cláusula de tela por leitura |
| PJ-03, 09, 13, 17, 18, 33, 35 | ⚠️ | ⚠️ **Verified com evidência parcial** (inalterado) |
| PJ-01, PJ-02 | ❌ não verificado | ⚠️ **Verified por leitura — limitação aceita** |

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored check**: 24/35 com asserção que bate com o resultado da spec · 9 parciais · 2 limitação aceita · 3 spec-precision gaps remanescentes, nenhum bloqueante
**Sensor**: iteração 1 → 6/9 mortos; acumulado → **17/20**, os 3 sobreviventes provados inalcançáveis por sonda contra o motor real
**Gate**: typecheck 0 · lint 0 erros / 2 warnings pré-existentes · unit **1025 (42 arquivos)** · integration **88** · build 0

**O que a iteração 1 fechou**: as cinco ACs que estavam presas dentro de um `.tsx` agora moram num módulo puro e são dirigidas pelo motor real — não por fixture montada à mão, o que importa, porque uma `Projecao` inventada testaria a fixture e não o jogo. A extração é byte-idêntica ao bloco que saiu, então nenhuma regressão de comportamento cabe dentro dela. A segunda tranca de `PJ-20` ganhou a asserção que faltava e o único mutante sobrevivente da feature morreu. A contradição entre `PJ-10` e `PJ-07` virou uma frase de spec corrigida — o código estava certo o tempo todo, e era isso que a iteração 0 dizia.

**O que continua fora de alcance**: presença no DOM, posicionamento e cópia. `PJ-01`, `PJ-02` e as metades de tela de `PJ-23` e `PJ-27` dependem de renderizar React em teste, e este projeto nunca teve como. Isso está registrado como limite conhecido da suíte, não como dívida em aberto: o implementador tirou de dentro do componente tudo que dava para tirar, e o que sobrou é genuinamente tela.

**Next steps**: nenhum bloqueante. A feature pode ser dada como concluída.
