# Publicar e testar em rede

Documentação de operação. Para entender o projeto, veja o [README](../README.md).

## ⚠️ Antes da primeira publicação — leia isto

A migração em `wrangler.jsonc` usa **`new_sqlite_classes`**, e **o tipo de storage de um
namespace de Durable Object é imutável**.

Trocar por `new_classes` cria o namespace com o storage legado de chave-valor —
irreversível, e indisponível no plano free. Corrigir depois exige recriar o namespace com
outro nome de classe, **perdendo todas as salas existentes**.

Se você mexer em `wrangler.jsonc`, confira essa linha antes de publicar.

## Publicando na Cloudflare

```bash
npx wrangler login   # uma vez por máquina; abre o navegador para autorizar
npm run deploy:dry   # confere bundle e bindings sem publicar
npm run deploy       # publica front e Worker num comando
```

`npm run deploy` roda o build e entrega o Worker junto com os assets estáticos, usando a
configuração que o plugin da Cloudflare gera em `dist/resenha/wrangler.json`.

O endereço final é o `*.workers.dev` do Worker, ou um domínio próprio que você associe a
ele. **Nenhuma variável de ambiente ou segredo é necessário** — todo o estado vive dentro
do Durable Object de cada sala.

## Testando com outras pessoas na rede local

O cliente monta o endereço do WebSocket a partir do host da página, então basta o Vite
escutar na rede em vez de só no `localhost`:

```bash
npm run dev -- --host
```

Ele imprime duas URLs; passe a de rede (algo como `http://192.168.0.10:5173`) para quem
estiver no **mesmo Wi-Fi**.

Quatro detalhes que economizam tempo:

- **O firewall do Windows pede permissão** na primeira vez que o Node abre na rede.
  Autorize em **redes privadas** — se negar, ninguém conecta e o motivo não é óbvio.
- **O botão "copiar link" não funciona fora de `localhost`.** A API de clipboard do
  navegador só existe em contexto seguro (HTTPS). O botão não quebra, só não faz nada —
  dite o código de 5 letras, que é justamente para isso que ele não usa `I`, `O`, `0`
  nem `1`.
- **São necessárias 2 pessoas** para iniciar uma partida.
- **Duas abas do mesmo navegador são a mesma pessoa.** A identidade é um token no
  armazenamento do navegador — para simular várias pessoas numa máquina só, use
  navegadores diferentes ou uma janela anônima.

## Tipos da plataforma

`worker-configuration.d.ts` é **gerado** a partir de `wrangler.jsonc` e não fica
versionado. O `npm install` o recria automaticamente; se precisar forçar depois de mexer
na configuração:

```bash
npm run cf-typegen
```
