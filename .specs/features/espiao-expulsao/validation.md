# Espião — a expulsão que não acaba a partida — Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/espiao-expulsao/spec.md`
**Diff range**: `a6888a8..HEAD` (commit `7d3d321`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `ConfigEspiao.expulsarContinua` / `.chuteDoEspiaoPego` em `shared/protocolo.ts:142-157`; `ResultadoDaVotacao.desfecho` ganha `'expulsaoSegue' \| 'mesaVenceu'` (`protocolo.ts:649-655`); `ProjecaoEspiao.expulsos` (`protocolo.ts:619-624`) |
| T2   | ✅ Done | `EstadoEspiao.expulsos`, `naRodada` (`regras.ts:877-879`), os dois ramos de `fecharVotacao` (`regras.ts:457-468`, `482-508`) e as guardas em `abrirVotacao`/`votar` |
| T3   | ✅ Done | `projecao.ts:94` (`naRodada`), usado no cálculo de votação aberta |
| T4   | ✅ Done | `despacho.ts:207-209` (repasse) e `despacho.ts:364-369` (validação boolean) |
| T5   | ✅ Done | `Lobby.tsx:1428-1439` (linhas de regra) e `1463-1484` (folhas de escolha) |
| T6   | ✅ Done | `EspiaoJogo.tsx` — `expulsos`, `naRodada`, `fuiExpulso` (linhas 48-53), seção "fora da rodada" (linhas 215-236), `EspiaoAcusacao.tsx:36-39` filtra expulsos |
| T7   | ✅ Done | `ResultadoDaVotacao.tsx` — `SELO`/`FRASE_DO_DESFECHO` (linhas 21-33), `naoVotaram` exclui expulsos (linhas 66-71); `EspiaoEncerrada.tsx:236-238` novo motivo de vitória |

---

## Spec-Anchored Acceptance Criteria

| Critério | Outcome definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| `ESP-51` — `expulsarContinua` ligado (padrão): expulsar inocente em votação da mesa tira ele da rodada, partida segue sem vencedor/`encerrada`, relógio volta de onde parou | `desfecho: 'expulsaoSegue'`, `vencedor: null`, `faseSeguinte: undefined`, `prazos: { turno: agora + JANELA_DE_RESULTADO_MS }` | `shared/jogos/espiao/regras.test.ts:737-756` — `expect({desfecho, expulsos, vencedor, faseSeguinte, prazos}).toEqual({desfecho:'expulsaoSegue', expulsos:[inocente], vencedor:null, faseSeguinte:undefined, prazos:{turno: AMBIENTE.agora + JANELA_DE_RESULTADO_MS}})` | ✅ PASS |
| `ESP-51a` — desligada, expulsar inocente volta a entregar a partida aos espiões | `desfecho:'mesaPerdeu'`, `vencedor:'espioes'`, `faseSeguinte:'encerrada'` | `regras.test.ts:758-769` — `expect({desfecho, vencedor, faseSeguinte}).toEqual({desfecho:'mesaPerdeu', vencedor:'espioes', faseSeguinte:'encerrada'})` com `expulsarContinua: false` | ✅ PASS |
| `ESP-51b` — na votação final o erro custa a partida mesmo ligada | `final:true`, `desfecho:'mesaPerdeu'`, `vencedor:'espioes'` | `regras.test.ts:771-784` — vota na final (`t:'venceuPrazoTurno'` primeiro), afirma exatamente esses três campos | ✅ PASS |
| `ESP-51c` — a rodada só continua com `>= MIN_JOGADORES_ESPIAO` e >=1 não-espião sobrando; senão volta a encerrar | Com 3 jogadores (mínimo), expulsar um deixa 2 — abaixo do mínimo — logo `desfecho:'mesaPerdeu'`, `expulsos: []` | `regras.test.ts:786-798` — mesa de 3, `expect(desfecho).toBe('mesaPerdeu')`, `expect(expulsos).toEqual([])` | ✅ PASS |
| `ESP-51d` — expulso não vota, não é votado, não abre votação | Todas as três ações recusadas com `COMANDO_INVALIDO` | `regras.test.ts:800-820` — três `expect(...).toEqual({ok:false, erro:'COMANDO_INVALIDO'})`: abrir votação como expulso, ser votado (`alvoId: espiaoId`... na verdade o teste vota `alvoId: inocente` no segundo caso e recebe `alvoId` sendo o próprio expulso — ver nota abaixo), e votar como expulso | ✅ PASS — nota: o segundo `expect` do teste (linha 812) testa "ser votado" ao tentar `votar` **como** o expulso (`comoExpulso`) contra `espiaoId`; o terceiro (linha 816) testa alguém tentando votar **no** expulso (`alvoId: inocente`) — as duas metades do critério ("não vota" e "não é votado") estão cobertas, mas por dois asserts distintos que merecem nomes de teste mais explícitos (spec-precision: cobertura correta, nomenclatura confusa) |
| `ESP-51e` — contagem de mesa é sobre quem está na rodada: a votação seguinte fecha sozinha sem esperar o expulso, e `totalAtivos` não conta expulsos | Votação fecha com 3 votos (não 4); `totalAtivos: 3` | `regras.test.ts:822-838` — `expect(atual.votacaoAberta).toBeNull()` após só 3 votos; `expect(atual.resultadoVotacao?.totalAtivos).toBe(3)` | ✅ PASS |
| `ESP-51f` — mesa vê quem está fora, na tela de jogo; expulso é público | Lista visível de expulsos na `EspiaoJogo` | `client/src/telas/EspiaoJogo.tsx:215-236` — seção "fora da rodada" renderiza `expulsos.map(...)` com nome riscado; `ProjecaoEspiao.expulsos` (`protocolo.ts`) não tem visibilidade condicional (ao contrário de `espioes`, que só aparece condicionalmente) — confirma "público". Sem teste de componente (padrão do projeto); verificado por leitura direta do componente | ✅ PASS (por inspeção) |
| `ESP-52` — `chuteDoEspiaoPego` desligado (padrão): espião expulso não tem cartada, mesa vence na hora, partida encerra | `desfecho:'mesaVenceu'`, `vencedor:'mesa'`, `chutePendente:null`, `faseSeguinte:'encerrada'` | `regras.test.ts:840-858` — `expect({desfecho, vencedor, chutePendente, faseSeguinte, prazos}).toEqual({desfecho:'mesaVenceu', vencedor:'mesa', chutePendente:null, faseSeguinte:'encerrada', prazos:{turno:null}})` | ✅ PASS |
| `ESP-52a` — ligada, volta o `chutePendente`/prazo/decisão no chute | `desfecho:'chuteDoEspiao'`, `chutePendente` preenchido | `regras.test.ts:860-867` — `expect(desfecho).toBe('chuteDoEspiao')`, `expect(chutePendente).toBe(espiaoId)`; bloco `ESP-43…ESP-45` inteiro (linhas 870-978) migrado para rodar com `chuteDoEspiaoPego:true`, preservando `ESP-44`/`ESP-45` sem enfraquecer asserts | ✅ PASS |
| `ESP-53` — as duas opções aparecem no formulário (dois modos) e atravessam `configurar` do servidor | Boolean validado, repassado, e com fallback pro valor anterior quando ausente | `server/core/despacho.test.ts:588-620` — envia `expulsarContinua:true, chuteDoEspiaoPego:false` via `configurar` e afirma que saem intactos na config resultante; `despacho.ts:364-369` rejeita valores não-boolean (sem teste direto de rejeição, mas segue o padrão idêntico de `espioesSeVeem` logo acima, já coberto) — formulário: `Lobby.tsx:1428-1439` (duas `LinhaDeRegra`), sem teste de componente (padrão do projeto) | ✅ PASS (servidor coberto por teste; UI por inspeção) |

**Status**: ✅ Todos os 10 critérios (`ESP-51`…`ESP-53`) com evidência direta.

---

## Discrimination Sensor

| # | File:line | Mutação | Morto? |
| - | --------- | ------- | ------ |
| 1 | `shared/jogos/espiao/regras.ts:450-454` | `podeContinuarSem = (...)` → `!(...)` (inverte o resultado inteiro) | ✅ Morto (9 testes falharam) |
| 2 | `shared/jogos/espiao/regras.ts:451` | `!votacao.final &&` → `votacao.final &&` | ✅ Morto (4 testes falharam) |
| 3 | `shared/jogos/espiao/regras.ts:453` | `sobrariam.length >= MIN_JOGADORES_ESPIAO` → `>` | ✅ Morto (3 testes falharam) |
| 4 | `shared/jogos/espiao/regras.ts:877-879` | `naRodada` deixa de filtrar `expulsos` (retorna só `jogadoresAtivos(ctx)`) | ✅ Morto (2 testes falharam) |
| 5 | `shared/jogos/espiao/regras.ts:375` | Removida a guarda `if (estado.expulsos.includes(ctx.autorId))` em `votar` | ✅ Morto (1 teste falhou) |
| 6 | `shared/jogos/espiao/regras.ts:277` | Removida a guarda `if (estado.expulsos.includes(ctx.autorId))` em `abrirVotacao` | ✅ Morto (1 teste falhou) |
| 7 | `shared/jogos/espiao/regras.ts:463` | `ctx.config.espiao.chuteDoEspiaoPego` → `!ctx.config.espiao.chuteDoEspiaoPego` | ✅ Morto (11 testes falharam) |

**Sensor depth**: lightweight, ampliado para 7 mutações (acima do mínimo de 1-3) por cobrir todas as guardas e ramos de decisão citados no prompt de verificação
**Resultado**: 7/7 mortos — ✅ **PASS**

Todas as mutações foram desfeitas com `git checkout --` no único arquivo afetado (`shared/jogos/espiao/regras.ts`); `git status` confirma árvore limpa ao final.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — nenhuma `Situacao` nova no `core`, como o escopo exige |
| Sem scope creep | ✅ |
| Casa com os padrões existentes | ✅ — segue o padrão de `pausa`/`chutePendente` já presentes em `EstadoEspiao` |
| Checagem de outcome contra a spec | ✅ — todos os valores de teste batem literalmente com o que a spec descreve |
| Cobertura por camada (domínio 1:1; rotas happy+edge+erro) | ✅ — `regras.ts` tem 1:1 com todas as sub-letras de `ESP-51`; `despacho.ts` cobre o caminho feliz da validação |
| Todo teste mapeia pra uma AC | ✅ |
| Diretrizes de projeto seguidas | `tasks.md` da própria feature |

---

## Edge Cases

- [x] Mesa no mínimo (3 jogadores): expulsão sem gente pra continuar volta a encerrar (`ESP-51c`) — `regras.test.ts:786-798`
- [x] Votação final: opção `expulsarContinua` não se aplica (`ESP-51b`) — `regras.test.ts:771-784`
- [x] Espião expulso sem chute (padrão): mesa vence na hora (`ESP-52`) — `regras.test.ts:840-858`

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run build`
- **Resultado**: typecheck 0 erros; lint 0 erros, 2 warnings pré-existentes (`react-hooks/exhaustive-deps` em `client/src/telas/Jogo.tsx:96,107`); unit **1070 passed**; integration **98 passed**; build ok
- **Contagem de teste antes**: 1062 unit / 98 integration (linha de base do `tasks.md`, já refletindo a feature `quem-sou-eu-na-mesa`)
- **Contagem de teste depois**: 1070 unit / 98 integration
- **Delta**: +8 unit (os 8 testes novos do bloco `ESP-51, ESP-52` em `regras.test.ts`), 0 integration
- **Skipped**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

Nenhum necessário — todos os critérios têm evidência direta e todos os mutantes injetados foram mortos.

---

## Requirement Traceability Update

| Requirement | Status Anterior | Novo Status |
| --- | --- | --- |
| ESP-51  | Pending | ✅ Verified |
| ESP-51a | Pending | ✅ Verified |
| ESP-51b | Pending | ✅ Verified |
| ESP-51c | Pending | ✅ Verified |
| ESP-51d | Pending | ✅ Verified |
| ESP-51e | Pending | ✅ Verified |
| ESP-51f | Pending | ✅ Verified (por inspeção) |
| ESP-52  | Pending | ✅ Verified |
| ESP-52a | Pending | ✅ Verified |
| ESP-53  | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 10/10 ACs (incluindo as sub-letras `a`-`f`) com evidência direta e valores exatos batendo com a spec

**Sensor**: 7/7 mutações mortas — nenhum ramo de decisão sobreviveu sem cobertura

**Gate**: 1070 unit + 98 integration passed, 0 lint errors, build ok

**O que funciona**: as duas configurações (`expulsarContinua`, `chuteDoEspiaoPego`) e seus quatro desfechos novos (`expulsaoSegue`, `mesaVenceu`, mais os dois ramos antigos preservados), o `naRodada` que filtra expulsos em toda conta de mesa, as guardas de quem não pode mais agir, a visibilidade pública do expulso na tela, e o repasse de configuração pelo servidor — tudo com teste direto ou, no caso da UI, inspeção de código que confirma exatamente o que a spec pede.

**Problema encontrado**: nenhum blocker. Observação menor de legibilidade: os dois `expect` de `ESP-51d` (linhas 811-819 de `regras.test.ts`) verificam "vota" e "é votado" no mesmo `it`, sem nomes de sub-caso — não afeta a correção, só a leitura do relatório de falha caso um deles quebre no futuro.

**Próximos passos**: nenhum obrigatório. Opcionalmente, separar os dois asserts de `ESP-51d` em dois `it` distintos para facilitar diagnóstico futuro.
