# 🚀 DEPLOY DA LOJA TRANSLITE NO ONRENDER (`render.com`)
### *Guia Oficial Prático para Deploy Fullstack (Node.js + Vite + PostgreSQL)*

Este guia descreve os ajustes realizados e o passo a passo para implantar a **Loja Translite** no **Render (`onrender.com`)** com zero esforço operacional e suporte nativo ao **Render Postgres** ou **Modo Híbrido REST/Firebase**.

---

## 🛠️ 1. Ajustes Arquiteturais Realizados para o Render

A aplicação foi preparada nativamente para rodar no Render cumprindo todos os requisitos da plataforma:

1. **Porta Dinâmica (`process.env.PORT`):**
   - No Render, os Web Services recebem dinamicamente a porta de execução via variável de ambiente `PORT` (geralmente porta `10000`).
   - O servidor Node (`server.ts`) foi atualizado para escutar em `Number(process.env.PORT) || 3000`, garantindo compatibilidade com o balanceador/proxy reverso do Render e mantendo a porta 3000 no ambiente local/AI Studio.
2. **Suporte Nativo a `DATABASE_URL` (PostgreSQL / Drizzle ORM):**
   - O Render gerencia bancos PostgreSQL provendo uma única URL de conexão (`DATABASE_URL = postgresql://user:pass@srv.render.com/db_name?sslmode=require`).
   - O pool de conexões do backend (`src/db/index.ts`) e a configuração do ORM (`drizzle.config.ts`) foram ajustados para detectar automaticamente `DATABASE_URL` e ativar SSL de produção sem necessidade de configurar variáveis individuais (`SQL_HOST`, `SQL_USER`, etc.).
3. **Build Unificado Fullstack:**
   - Comando de Build: `npm ci && npm run build` (compila o frontend Vite em `/dist` e o backend TypeScript em `/dist/server.cjs`).
   - Comando de Start: `npm run start` (executa `node dist/server.cjs`).

---

## ⚡ 2. Opção A: Deploy Automático via Blueprint (Recomendado - 1 Clique)

O repositório já inclui os arquivos de infraestrutura como código (IaC) do Render:
- `render.yaml`: Deploy em modo Node.js nativo + Banco PostgreSQL gratuito no Render.
- `render-docker.yaml`: Deploy utilizando o container Docker multi-stage optimizado.

### Passo a Passo:
1. Suba seu código para um repositório no **GitHub** ou **GitLab**.
2. Acesse o painel do [Render Dashboard](https://dashboard.render.com/).
3. Clique em **"New +"** -> **"Blueprint"**.
4. Conecte o repositório da sua aplicação.
5. O Render detectará automaticamente o arquivo `render.yaml` e exibirá:
   - **Service `loja-translite`** (Web Service Fullstack).
   - **Database `loja-translite-db`** (PostgreSQL Gerenciado grátis).
6. Clique em **"Apply"**. O Render criará o banco de dados, injetará a `DATABASE_URL` automaticamente no serviço e publicará o site com certificado SSL/TLS HTTPS gratuito.

---

## 🖥️ 3. Opção B: Deploy Manual via Painel do Render

Caso prefira configurar manualmente sem o Blueprint:

1. No [Render Dashboard](https://dashboard.render.com/), clique em **"New +"** -> **"Web Service"**.
2. Conecte o seu repositório GitHub/GitLab.
3. Preencha as configurações do serviço:
   - **Name:** `loja-translite`
   - **Region:** *Frankfurt (EU)* ou *Oregon (US)*
   - **Environment:** `Node`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run start`
4. Vá em **"Environment Variables" (Variáveis de Ambiente)** e adicione:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `<Sua string de conexão PostgreSQL do Render, Supabase ou Neon>` (Opcional - se omitido, usará modo em memória/híbrido).
   - `DATABASE_SSL` = `true` (necessário para o Render Postgres).
5. Clique em **"Create Web Service"**.

---

## 🔍 4. Monitoramento e Health Checks

O serviço no Render já está pronto para monitoramento contínuo:
- **Health Check URL / Probes:** `/api/healthz` ou `/api/livez` (retorna JSON 200 com status do serviço e uptime).
- **Readiness Check (Banco de Dados):** `/api/readyz` (informa se o serviço está conectado via PostgreSQL ou modo Híbrido REST).
