# Resenha

**Um hub de party games que roda no navegador.** Sem instalar nada, sem cadastro: você cria uma sala, manda um código de 5 letras no grupo e a galera entra.

🌐 **Jogue agora em [resenha.dev.br](https://resenha.dev.br/)**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

![A tela inicial do Resenha: escolha do jogo à esquerda, entrar ou criar sala à direita](docs/inicio.png)

## Os jogos

| Jogo | O que é | Pessoas |
| --- | --- | --- |
| [Quem Sou Eu?](https://resenha.dev.br/quem-sou-eu) | Você não vê a própria carta. Pergunte, deduza, chute. | 2+ |
| [Espião](https://resenha.dev.br/espiao) | Todos sabem o local. Menos um. Descubra quem. | 3+ |
| [Cartas Contra a Turma](https://resenha.dev.br/cartas-contra-a-turma) | Uma frase no meio da mesa e a pior resposta possível ganha. | 3+ |
| [Enigmas Sinistros](https://resenha.dev.br/enigmas-sinistros) | Uma cena impossível. Só sim, não e indiferente pra desatar. | 2+ |
| [Dedo na Cara](https://resenha.dev.br/dedo-na-cara) | Quem aqui é mais capaz? A mesa aponta e alguém se explica. | 3+ |

Dois pacotes são de humor negro e vêm desligados, com aviso na tela: quem liga é o host, por conta e risco da mesa. O porquê está em [CONTEUDO.md](CONTEUDO.md). Os baralhos são escritos para o projeto, com uma exceção creditada: o pacote "O Clássico" do Cartas Contra a Turma é tradução e adaptação do Cards Against Humanity, sob CC BY-NC-SA 2.0. Os detalhes estão em [CONTEUDO.md](CONTEUDO.md).

Cada sala aguenta até 20 pessoas. Funciona com a turma junta no sofá, cada um com o celular na mão, e funciona igual com todo mundo em chamada de vídeo.

## [Passa e Joga](https://resenha.dev.br/passa-e-joga): um celular só

Numa festa, oito pessoas entrando num link custa mais tempo do que a primeira rodada. O **Passa e Joga** é o segundo caminho: um aparelho só, passando de mão em mão. Quem organiza diz quem vai jogar e começa — ninguém entra em link, ninguém digita código.

Quando a rodada tem segredo (o papel do Espião, a carta que você escreve, o voto), a tela nomeia quem deve estar com o aparelho e não monta nada do conteúdo até essa pessoa tocar. Fora disso o celular fica parado na mesa, servindo de relógio e painel.

Quatro dos cinco jogos cabem: Quem Sou Eu?, Espião, Enigmas Sinistros e Dedo na Cara. Cartas Contra a Turma fica de fora porque lá cada pessoa segura seis cartas privadas o tempo inteiro, e não só num instante da rodada.

A partida roda **inteira dentro do navegador**, sem sala e sem servidor — dá para jogar do começo ao fim sem sinal — e é guardada no próprio aparelho, então um toque errado no "voltar" não custa a partida.

## Como foi feito

Um **Cloudflare Worker** serve o app e faz a ponte para os **Durable Objects** — um por sala, que é o dono de toda a verdade do jogo. O cliente não decide nada: manda comando, recebe projeção. Isso torna trapaça um problema de servidor, não de confiança no navegador, e faz a reconexão ser trivial — quem cai volta e recebe o estado inteiro.

Os WebSockets usam a **Hibernation API**: uma sala parada não consome tempo de CPU, mas continua existindo. É o que permite manter salas abertas de graça enquanto a mesa vai buscar cerveja.

```
client/   React 19 + Vite + Tailwind v4
  passaejoga/  o motor local do modo de um aparelho só
server/
  core/     sala, roster, chat, prazos — não conhece jogo nenhum
shared/   protocolo e conteúdo que os dois lados leem
  jogos/    cada jogo é um módulo com regras e projeção próprias
```

Os jogos moram em `shared/` porque os dois lados os executam: o Durable Object na sala online e o navegador no Passa e Joga. São funções puras, com relógio e sorteio injetados — morar em `server/` era convenção, não necessidade. Uma regra, uma implementação: a que valeu na sala vale na festa.

A regra que segura a arquitetura: **`core/` nunca importa jogo nenhum**. Ele recebe o registro por injeção, e um jogo novo é uma pasta em `shared/jogos/` mais uma linha nesse registro — nada no núcleo muda. Foi assim que o segundo, o terceiro e o quarto jogo entraram.

**1099 testes** (1011 unitários e 88 de integração rodando no `workerd` de verdade, com Durable Objects reais) rodam no CI a cada push, junto de typecheck e lint.

### As páginas de cada jogo

As páginas de `/espiao`, `/quem-sou-eu`, `/passa-e-joga` e companhia são HTML estático gerado no build, e não rotas do app — porque o fallback de SPA da Cloudflare só responde a requisições de navegação, e raspador de link não manda o cabeçalho que dispara isso. O texto sai do mesmo módulo que alimenta o "como jogar" dentro do jogo, para os dois nunca discordarem.

![A página do Espião, com a explicação de como jogar](docs/pagina-espiao.png)

## Rodando localmente

```bash
npm install
npm run dev
```

O **[SETUP.md](SETUP.md)** tem o passo a passo completo (pré-requisitos, KV, variáveis).

## Como contribuir

Contribuições são bem-vindas. Se encontrou um problema ou tem uma ideia — inclusive de jogo novo —, abra uma issue. Se for mexer no código, o `SETUP.md` prepara o ambiente e o `.specs/` guarda as decisões de arquitetura e as especificações de cada jogo.

## Deploy

A `main` vai pro ar sozinha. Qualquer branch pode ir pro ambiente de beta na mão, pelo GitHub Actions. O runbook completo — secrets, domínios, KV — está em **[DEPLOY.md](DEPLOY.md)**.

## Licença

O Resenha é software livre licenciado sob a **[GNU General Public License v3.0 ou posterior](LICENSE)**. Você é livre para usar, estudar, compartilhar e modificar — mas qualquer versão distribuída (incluindo modificações) deve permanecer aberta sob a GPL. Não pode ser transformado em produto fechado e proprietário.
