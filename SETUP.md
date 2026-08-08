# Setup

Instruções rápidas para desenvolvedores prepararem o ambiente local.

## Pré-requisitos

- Node.js (versão recomendada mais recente)
- npm

## Instalação e Execução

1. **Clonar o repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd Resenha
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Configuração do Wrangler e banco KV:**
   O projeto utiliza os serviços do Cloudflare. Para utilizar o banco de dados KV (onde residem, por exemplo, os pacotes de cartas), é necessário configurar o `wrangler`:
   - Tenha o Wrangler CLI logado (`npx wrangler login`).
   - O arquivo `wrangler.jsonc` já contém o binding para o KV (ex: `PACOTES_KV`).
   - Em ambiente de desenvolvimento local, o Wrangler emulará o KV. 

4. **Rodar o projeto localmente:**
   ```bash
   npm run dev
   ```
   Acesse a URL informada pelo servidor de desenvolvimento (geralmente `http://localhost:5173` ou algo parecido).
