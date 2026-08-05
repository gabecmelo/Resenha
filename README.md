# Resenha

Party games para jogar com os amigos pelo navegador. O primeiro jogo é **"Quem Sou
Eu?"**: cada pessoa recebe uma carta que todo mundo vê menos ela, e vai fazendo
perguntas de sim ou não até adivinhar.

As perguntas e respostas acontecem **fora do site**, por voz ou presencialmente. O
sistema é o tabuleiro, não o juiz: ele não registra perguntas, não valida respostas,
não pontua e não decide vencedor. O que ele resolve é exatamente a parte que o papel
resolve mal — esconder a sua carta de você e mostrá-la para todos os outros.

- Sem cadastro: entra com um apelido e joga.
- De 3 a 20 pessoas por sala.
- Cair a conexão nunca elimina ninguém — a vaga fica guardada enquanto a sala existir.

## Como está montado

| Camada | O que é |
| ------ | ------- |
| `client/` | SPA em React + Vite + TypeScript + Tailwind. Renderiza a projeção que recebe e envia comandos — **não** contém regra de jogo. |
| `server/core/` | A sala: jogadores, host, reconexão, chat, prazos, transporte WebSocket. Nada específico de "Quem Sou Eu?" mora aqui. |
| `server/games/quem-sou-eu/` | As regras do jogo, como três funções puras (`iniciarRodada`, `reduzir`, `projetar`). |
| `shared/protocolo.ts` | O contrato entre os dois lados: `Comando`, `Mensagem` e `Projecao`. |

Uma sala é um **Durable Object** da Cloudflare, com o estado persistido no storage
dele a cada mutação e WebSockets em modo hibernação. O servidor é autoritativo e
envia uma **projeção por jogador** — a carta de alguém nunca é construída no payload
de quem não pode vê-la.

As decisões de arquitetura estão registradas em [`.specs/STATE.md`](.specs/STATE.md);
os requisitos, em [`.specs/features/quem-sou-eu/spec.md`](.specs/features/quem-sou-eu/spec.md).

## Rodando localmente

Requer Node 20 ou mais novo.

```bash
npm install
npm run dev
```

O Vite sobe o front e o Worker juntos (o Worker roda no `workerd` de verdade, com
Durable Objects locais). Abra o endereço que ele imprimir, crie uma sala e mande o
link — o código da sala é o próprio caminho da URL, por exemplo `/KTVRM`.

Para testar com várias pessoas na mesma máquina, use janelas anônimas ou navegadores
diferentes: a identidade do jogador é um token guardado no navegador, então duas abas
do mesmo perfil são a mesma pessoa.

## Testes e verificações

```bash
npm run typecheck   # tipos do cliente e do servidor
npm run lint        # ESLint em tudo
npm run test:unit   # regras puras do jogo, núcleo da sala e lógica do cliente
npm run test:integration  # sala ponta a ponta no workerd (hibernação, alarme, storage)
npm test            # as duas suítes
npm run build       # bundle do front e do Worker
```

Os testes de integração sobem Durable Objects reais e exercitam hibernação, alarme e
persistência — por isso demoram bem mais que os unitários.

## Limpeza automática de salas

Não há banco de dados nem rotina de manutenção. As salas se destroem sozinhas:

- 30 minutos sem nenhuma conexão ativa;
- 6 horas sem nenhuma ação de jogador, mesmo com sockets abertos.

Depois disso o código volta a ficar livre.

## Publicar

Instruções de publicação e de teste em rede local estão em [`docs/DEPLOY.md`](docs/DEPLOY.md).
