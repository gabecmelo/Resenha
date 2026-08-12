# Hub de Seleção de Jogos — Design

## Architecture Overview

Hoje `SalaDurableObject` amarra `SalaDeJogo<E>` a `E = EstadoQuemSouEu` na declaração da classe e injeta um único módulo (`quemSouEu`) no construtor (`server/index.ts:13`). Não existe seleção de jogo — existe um jogo hardcoded.

A mudança central: **o `core` para de conhecer o tipo concreto do estado de jogo.** `SalaDeJogo` deixa de ser genérico em `E` e passa a operar sobre `EstadoSala` (que já é `EstadoSala<E = unknown>` — usar o `unknown` do próprio default). No lugar de receber **um módulo**, o construtor passa a receber **um registro** — `Record<jogoId, JogoDaSala<unknown>>` — e cada sala guarda seu próprio `jogoId: string` no documento persistido. O `core` resolve `registro[sala.jogoId]` sempre que precisa chamar o módulo; nunca importa `games/` diretamente (AD-002 continua de pé, só muda de "um módulo fixo" para "um módulo resolvido por chave").

O apagamento de tipo (`as JogoDaSala<unknown>`) fica isolado num único arquivo novo, `server/games/registro.ts` — é o único lugar do projeto que sabe que jogos concretos existem, e o único lugar a tocar quando o Espião entrar (`HUB-13`).

No lado do conteúdo exibível (nome, descrição — não a lógica), segue o padrão já estabelecido por `AD-011`/`AD-012`: um catálogo simples vive em `shared/`, importado por cliente (para desenhar o seletor) e servidor (para validar `jogoId` na criação, antes mesmo de acordar o Durable Object). Catálogo (dado de exibição, `shared/`) e registro (módulo de jogo de verdade, `server/games/`) são coisas diferentes — o catálogo não pode importar `games/`, o registro sim.

```
Cliente                          Worker (index.ts)              Durable Object (SalaDeJogo)
┌────────────────┐   POST /api/salas    ┌──────────────────┐         ┌─────────────────────┐
│ Início          │  {jogoId, limite}    │ valida jogoId     │  /criar │ persiste jogoId no   │
│ seletor de jogo │ ────────────────────▶│ contra o registro │────────▶│ EstadoSala           │
└────────────────┘                       └──────────────────┘         └─────────────────────┘
                                                                                 │
┌────────────────┐   {t:'trocarJogo'}                                          ▼
│ Lobby            │ ──────────────────────────────────────────────▶  registro[jogoId] resolvido
│ "Mudar jogo"     │                                                  a cada comando/aviso/projeção
└────────────────┘
```

## Code Reuse Analysis

- **Reaproveita integralmente**: o padrão de injeção por construtor (já existe, só passa a injetar um mapa em vez de um valor); `despachar`/`avisar`/`projetar` (mesma assinatura de efeito, só resolvem `jogo` por `sala.jogoId` em vez de receber `this.jogo` fixo); `Modal.tsx` e o padrão de rascunho (`pacoteIdsRascunho`) do lobby, reaproveitado para o seletor de troca de jogo; o padrão de validação "host + fase lobby" já usado por `configurar`.
- **Estende**: `TipoDeComandoDoCore` (novo `trocarJogo`), `CodigoErro` (novo `JOGO_INVALIDO`), `EstadoSala`/`Projecao.sala` (novo campo `jogoId`), `MENSAGENS_DE_ERRO`.
- **Não reaproveita / novo**: `server/games/registro.ts` (registro real, novo arquivo), `shared/jogos-catalogo.ts` (catálogo de exibição, novo arquivo), componente de cliente `SeletorDeJogos` (novo, mas modelado no `.pacote-grid`/`.pacote-card` já existente).

## Components / Interfaces

### `shared/jogos-catalogo.ts` (novo)

```ts
export interface JogoCatalogo {
  id: string
  nome: string
  descricao: string
}

export const JOGO_PADRAO = 'quem-sou-eu'

export const CATALOGO_DE_JOGOS: JogoCatalogo[] = [
  { id: 'quem-sou-eu', nome: 'Quem Sou Eu?', descricao: 'Cada um recebe uma carta que todos veem menos ele.' },
]
```

Importado por `Inicio.tsx`/`Lobby.tsx` (desenhar o seletor) e por `server/index.ts` (validar `jogoId` recebido antes de criar a sala — `HUB-03`). `HUB-14` fica satisfeito porque adicionar um jogo é adicionar uma linha aqui; nenhuma tela muda de estrutura.

### `server/games/registro.ts` (novo)

```ts
import type { JogoDaSala } from '../core/despacho'
import { quemSouEu } from './quem-sou-eu'

/** Único arquivo do projeto que sabe quais jogos concretos existem (HUB-13). */
export const REGISTRO_DE_JOGOS: Record<string, JogoDaSala<unknown>> = {
  'quem-sou-eu': quemSouEu as JogoDaSala<unknown>,
}
```

O `as JogoDaSala<unknown>` é o único apagamento de tipo do projeto — cada módulo de jogo continua totalmente tipado em `E` dentro da sua própria pasta (`server/games/quem-sou-eu/regras.ts` não muda).

### `server/core/sala-do.ts` (modificado)

- `class SalaDeJogo<E>` → `class SalaDeJogo` (opera sobre `EstadoSala`, que resolve para `EstadoSala<unknown>`).
- Construtor: `jogo: JogoDaSala<E>` → `registro: Record<string, JogoDaSala<unknown>>`.
- Novo helper privado:
  ```ts
  private jogoAtual(sala: EstadoSala): JogoDaSala<unknown> | null {
    return this.registro[sala.jogoId] ?? null
  }
  ```
- Todo ponto que hoje usa `this.jogo` (chamada a `despachar`, `avisar` no `alarm()` e em `entrarNaSala`, `projetar` em `confirmar()`) passa a resolver via `this.jogoAtual(sala)` primeiro. Se `null` (cenário de ops do Edge Case 4 — jogo removido do registro depois de um deploy), o comando falha com `COMANDO_INVALIDO` em vez de lançar exceção; a `projetar`/`avisar` do alarme simplesmente pulam a chamada naquele ciclo (a sala não trava, só não processa aquele efeito — cenário que não deveria ocorrer em operação normal).
- `criar()` ganha um parâmetro `jogoId: string` e grava em `EstadoSala.jogoId`.
- `MENSAGENS_DE_ERRO` ganha `JOGO_INVALIDO: 'Jogo inválido.'`.

### `server/core/despacho.ts` (modificado)

- `despachar`/`executar` deixam de ser genéricos em `E`; trocam o parâmetro `jogo: JogoDaSala<E>` por `registro: Record<string, JogoDaSala<unknown>>`. Resolvem `const jogo = registro[sala.jogoId]` internamente nos branches que precisam dele (`iniciar`, `expulsar`, `sair`, `paraOJogo`) — mesmo tratamento de "não encontrado" do item anterior.
- `TipoDeComandoDoCore` ganha `'trocarJogo'`.
- Novo `case 'trocarJogo'` no `switch` de `executar`, chamando uma função nova:

  ```ts
  function trocarJogo(
    sala: EstadoSala,
    autor: Jogador,
    jogoId: string,
    registro: Record<string, JogoDaSala<unknown>>,
  ): Resultado<Efeitos> {
    if (autor.id !== sala.hostId) return { ok: false, erro: 'SEM_AUTORIDADE' }
    if (sala.fase !== 'lobby') return { ok: false, erro: 'FASE_INVALIDA' }
    if (!(jogoId in registro)) return { ok: false, erro: 'JOGO_INVALIDO' }
    if (jogoId === sala.jogoId) return { ok: true, valor: SEM_EFEITOS } // HUB-09, idempotente
    sala.jogoId = jogoId
    sala.jogo = null
    sala.config = { ...CONFIG_PADRAO } // HUB-08
    return { ok: true, valor: SEM_EFEITOS }
  }
  ```

  Cobre `HUB-06`–`HUB-09`, `HUB-11` diretamente; `HUB-12` (broadcast imediato) é grátis — é o mesmo `confirmar()` que já roda depois de qualquer comando aceito.

### `server/index.ts` (modificado)

- `SalaDurableObject` perde o parâmetro de tipo, injeta `REGISTRO_DE_JOGOS` em vez de `quemSouEu`.
- `/api/salas` (POST): lê `jogoId` do corpo (`CATALOGO_DE_JOGOS`/`REGISTRO_DE_JOGOS` como fonte de verdade); ausente → `JOGO_PADRAO` (`HUB-04`); presente mas fora do registro → recusa com `JOGO_INVALIDO` **antes** de acordar o Durable Object (`HUB-03` — nenhuma sala chega a nascer). Passa `jogoId` como query param pro `/criar` do DO, igual a `codigo`/`limite` hoje.

### `client/src/componentes/SeletorDeJogos.tsx` (novo)

Reaproveita o padrão visual de `.pacote-card`/`.pacote-grid` (`index.css`) para uma lista de `JogoCatalogo`. Usado em dois lugares:

- **`Inicio.tsx`**: substitui o texto fixo "Quem Sou Eu? · N a M pessoas" da `Apresentacao()` por um `SeletorDeJogos` de fato (mesmo com 1 card só — Edge Case confirmado), com o `jogoId` escolhido guardado em estado local e enviado no `fetch('/api/salas', { body: { limiteJogadores, jogoId } })`.
- **`Lobby.tsx`**: novo controle "Mudar jogo" (host-only, ao lado de onde hoje mostra o nome do jogo — texto puro para não-host, `VIS-04`), abre um `Modal` com o mesmo `SeletorDeJogos` em modo rascunho (mesmo padrão `pacoteIdsRascunho` já usado pro seletor de pacotes — aqui um único `jogoIdRascunho`). Confirmar envia `{ t: 'trocarJogo', jogoId }`; Cancelar descarta.

## Data Models

```ts
// shared/protocolo.ts

export interface EstadoSala<E = unknown> {
  // ...campos existentes
  jogoId: string   // novo — persistido, nunca undefined após a criação
}

export type Comando =
  | // ...variantes existentes
  | { t: 'trocarJogo'; jogoId: string }

export type CodigoErro =
  | // ...códigos existentes
  | 'JOGO_INVALIDO'

export interface Projecao {
  sala: {
    // ...campos existentes
    jogoId: string   // novo
  }
  // ...
}
```

`shared/jogos-catalogo.ts` traz `JogoCatalogo`/`CATALOGO_DE_JOGOS`/`JOGO_PADRAO` (ver Components acima).

## Error Handling Strategy

- **Criação com `jogoId` inválido** (`HUB-03`): recusada na camada `index.ts`, antes do `env.SALA.get(...)` — a sala nunca chega a existir. Resposta `400` com `{ erro: 'JOGO_INVALIDO' }`, mesmo padrão de `LIMITE_INVALIDO` hoje.
- **Criação sem `jogoId`** (`HUB-04`): não é erro — default silencioso para `JOGO_PADRAO`, mesmo padrão de `limite` ausente hoje (`AJU-36`).
- **`trocarJogo` por não-host** (`HUB-10`... revisando numeração, é `HUB-05` no traceability): `SEM_AUTORIDADE`, mesma mensagem já usada por `configurar`/`expulsar`/`transferirHost`.
- **`trocarJogo` fora do lobby** (`HUB-11` na numeração do spec — partida em andamento/encerrada): `FASE_INVALIDA`, mesma mensagem já usada por `configurar`/`iniciar`.
- **`trocarJogo` com `jogoId` desconhecido**: `JOGO_INVALIDO`, sala não muda (fail-closed, mesmo padrão de todo comando inválido do `core`).
- **`trocarJogo` idempotente pro mesmo jogo** (`HUB-09`, confirmado): não é erro — `ok: true`, sem tocar `config`.
- **Jogo removido do registro depois de um deploy** (Edge Case operacional, não modelado como erro de comando): `jogoAtual()`/lookup retornam `null`; comandos que dependeriam do módulo falham com `COMANDO_INVALIDO` em vez de lançar exceção. Não há novo código de erro para isso — é deploy, não caminho de usuário.

## Risks & Concerns

- **`Config` já carrega campos específicos do Quem Sou Eu** (`pacoteIds`, `dificuldades`, `modoPacote`) dentro de um tipo nominalmente "genérico" do `core` — tensão já registrada em `AD-011`. Resetar para `CONFIG_PADRAO` ao trocar de jogo (`HUB-08`) funciona hoje porque só existe um `CONFIG_PADRAO`; quando o Espião precisar de uma config estruturalmente diferente, essa tensão vai pedir resolução de verdade (provavelmente `ModuloDeJogo` ganhar seu próprio `configPadrao`, ou `Config` virar genérico também). **Não resolvido aqui de propósito** — resolver agora seria abstração especulativa sem o segundo caso real na mão; fica anotado para quando o Espião definir sua necessidade real (mesmo padrão de adiamento que `AD-011`/`AD-012` já usam).
- **`App.tsx` roteia telas de jogo por `sala.fase`, hardcoded pras telas do Quem Sou Eu** (`Escrita`, `Jogo`, `Encerrada`) — esta feature **não** toca nesse roteamento; ele continua funcionando porque só existe um jogo. Quando o Espião chegar, `App.tsx` vai precisar também discriminar por `projecao.sala.jogoId`, não só por `fase`. Fora de escopo aqui (é literalmente o próximo item do roadmap), mas registrado para não surpreender no Design do Espião.
- **Apagamento de tipo em `registro.ts`**: um `as JogoDaSala<unknown>` incorreto (módulo que na prática não obedece o contrato) só quebraria em runtime, não em compile-time, dentro daquele arquivo. Mitigado por ser um único arquivo pequeno, fácil de revisar a cada jogo novo, e pelos testes de integração existentes que já exercitam `despachar`/`avisar`/`projetar` ponta a ponta.

## Tech Decisions

- **Registro de jogos: novo `AD-013`** (a registrar em `STATE.md` ao final do Design) — este é o momento que `AD-011` e `AD-012` sinalizaram como "reavaliar quando o segundo jogo chegar". Decisão: o apagamento de tipo fica isolado num arquivo (`server/games/registro.ts`), nunca dentro de `core/`.
- **Catálogo de exibição em `shared/`, registro de módulo em `server/games/`**: são coisas diferentes por design — o catálogo é dado (nome/descrição), o registro é código (funções puras do jogo). Misturar os dois obrigaria `shared/` a importar lógica de jogo, quebrando a regra de que `shared/` é só protocolo + conteúdo estático (`AD-012`).
- **Sem Design Handoff (design-brief/design-prompts)**: a interface visual do seletor reaproveita diretamente o padrão já existente de `.pacote-card`/`.pacote-grid` e `Modal.tsx` (mesma decisão da rodada `pacotes-avancados` de iterar no código real via `/impeccable shape`, não gerar telas novas em ferramenta externa — ver memória `resenha-design-iteracao-ao-vivo`). Não há tela nova o suficiente para justificar o offer formal do Design Handoff.
