# Deploy

Dois ambientes, dois Workers, dois Durable Objects. Nada é compartilhado entre eles.

| | Worker | Quando sobe | KV |
| --- | --- | --- | --- |
| **Produção** | `resenha` → `resenha.dev.br` | Automático, a cada push na `main` | `0082f242…` |
| **Beta** | `resenha-beta` → `beta.resenha.dev.br` | Só na mão, pela branch que você escolher | `26112063…` |

O beta é um **Worker separado de propósito**. Se fosse o mesmo com dois domínios, os dois dividiriam o mesmo namespace de Durable Object — e uma branch que mudasse o formato do `EstadoSala` quebraria a sala de quem estivesse jogando na produção naquele momento. Do jeito que está, o storage do beta nasce vazio e morre nele.

---

## Subir o beta

GitHub → **Actions** → **Deploy beta** → **Run workflow**. O seletor *"Use workflow from"* é onde você escolhe a branch.

A branch precisa ter o arquivo `.github/workflows/deploy-beta.yml`. Branches criadas antes dele não funcionam no seletor — um rebase na `main` resolve.

O checkbox *"Pular os testes"* existe só pra republicar algo que já passou nos portões. Não use pra contornar teste vermelho.

Localmente, o mesmo deploy é:

```bash
npm run deploy:beta
```

## Subir a produção

Sozinho, no merge pra `main`. Se precisar republicar sem commit novo: Actions → **Deploy produção** → **Run workflow**.

Os portões (`typecheck`, `lint`, `test:unit`, `test:integration`) rodam antes de publicar nos dois casos. Falhou um, não sobe.

---

## Configuração que só se faz uma vez

### 1. Secrets do repositório

Settings → Secrets and variables → Actions:

| Secret | De onde vem |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → *Edit Cloudflare Workers* |
| `CLOUDFLARE_ACCOUNT_ID` | `npx wrangler whoami`, ou a barra de endereço do painel |

### 2. A zona na Cloudflare

Custom Domain de Worker exige que a Cloudflare seja o DNS autoritativo — não dá pra apontar um CNAME de fora, como se faz na Vercel.

1. Cloudflare → **Add a site** → `resenha.dev.br` → plano Free. Ela devolve dois nameservers.
2. Registro.br → o domínio → **Alterar servidores DNS** → cola os dois. A zona precisa existir na Cloudflare **antes**, senão o Registro.br recusa por não conseguir validar. Se houver DNSSEC ligado, desligue antes.
3. Espere a zona ficar *Active*. O Registro.br publica em lotes ao longo do dia, então costuma demorar mais que outros TLDs.

### 3. Os domínios nos Workers

Com a zona ativa, em Workers & Pages:

- `resenha` → Settings → Domains & Routes → **Add Custom Domain** → `resenha.dev.br`
- `resenha-beta` → **Add Custom Domain** → `beta.resenha.dev.br`

A Cloudflare cria o registro de DNS e emite o certificado sozinha. Não crie registro A/CNAME na mão.

---

## O KV de conteúdo

Os pacotes avançados moram no KV; o resto do conteúdo é estático em `shared/` e vai junto com o bundle. O KV do beta nasce vazio — o app funciona assim, caindo no fallback local, mas se quiser o conteúdo completo lá:

```bash
npx tsx scripts/seed-pacotes.ts --remote --beta
```

Sem `--beta`, o `--remote` escreve **na produção**. Preste atenção nessa flag.
