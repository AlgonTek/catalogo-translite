# 🌐 ARQUITETURA DE REFERÊNCIA NO GOOGLE CLOUD (GCP)
### *Guia Oficial de Implementação & Deploy Fullstack para DevOps / SRE / CTOs*

Este documento descreve a **1. Arquitetura de Referência no Google Cloud** implementada no ecossistema da **Loja Translite**, preparada para escalar desde o MVP/Startup até milhões de requisições com **Zero-Downtime**, **Escala-para-Zero (Scale-to-Zero)**, **Baixa Latência** e **Controle de Custos**.

---

## 🏗️ 1. Diagrama de Arquitetura & Fluxo dos Dados

```
                     +--------------------------------------------+
                     |         CLIENTE / NAVEGADOR (SPA)          |
                     |     React 18 + Vite + Tailwind (HTTPS)     |
                     +---------------------+----------------------+
                                           |
                              [TLS 1.3 / HTTPS Edge]
                                           |
                     +---------------------v----------------------+
                     |       GOOGLE CLOUD LOAD BALANCER /         |
                     |         CLOUD RUN INGRESS (0.0.0.0:3000)   |
                     +---------------------+----------------------+
                                           |
                +--------------------------+--------------------------+
                |                                                     |
    (Sessão & JWT / Token)                                  (Requisições API / REST)
                |                                                     |
+---------------v---------------+                     +---------------v---------------+
|     FIREBASE AUTHENTICATION   |                     |      GOOGLE CLOUD RUN         |
|  (Gerenciamento de Usuários,  |                     |  (Backend Node.js/Express +   |
|   OAuth, Tokens JWT / Roles)  |                     |   Servidor de Ativos Estáticos)
+-------------------------------+                     +---------------+---------------+
                                                                      |
                                             +------------------------+------------------------+
                                             |                                                 |
                                (Leitura / Gravação REST)                    (Probes Kubernetes & Logs)
                                             |                                                 |
                               +-------------v-------------+                     +-------------v-------------+
                               |     BANCO DE DADOS GCP    |                     |   GOOGLE CLOUD LOGGING    |
                               | (Cloud SQL PostgreSQL OU  |                     |       & CLOUD TRACE       |
                               |  Firestore Híbrido/API)   |                     |  (Observabilidade JSON)   |
                               +---------------------------+                     +---------------------------+
```

---

## 🎯 2. Componentes da Arquitetura & Responsabilidades

### A. Compute: Google Cloud Run (2ª Geração)
- **Papel:** Executar o contêiner único fullstack que serve tanto a API REST (`/api/*`) quanto os arquivos estáticos otimizados da SPA (`/dist`).
- **Configurações de Produção Implementadas:**
  - **Porta Unificada:** `3000` (`0.0.0.0`), alinhada com o roteamento de Ingress do Google Cloud Run.
  - **CPU Boost:** Inicialização acelerada (`--cpu-boost`) para eliminar cold-starts perceptíveis.
  - **Escala:** `min-instances=0` (para custo zero em repouso) a `max-instances=10` (proteção contra sobrecarga de custos / DDoS).
  - **Concorrência:** `concurrency=80` requisições simultâneas por contêiner.

### B. CI/CD Pipeline: Google Cloud Build & Artifact Registry
- **Papel:** Automação de compilação, otimização de imagens Docker e deploy contínuo (GitOps).
- **Arquivos Implementados:**
  - `/Dockerfile`: Build multi-estágio (`builder` com `node:20-alpine` + `runner` em contêiner enxuto).
  - `/gcp/cloudbuild.yaml`: Pipeline de 3 etapas com cache de camadas no **Google Artifact Registry**, compilação e deploy sem inatividade.
  - `/gcp/service.yaml`: Especificação declarativa Knative/Cloud Run com sondas de vivacidade (*Liveness*) e prontidão (*Readiness*).

### C. Segurança & Identidade: Firebase Auth + IAM
- **Autenticação:** O Google Firebase Authentication gerencia credenciais, sessões e tokens JWT sem expor segredos no cliente.
- **Autorização:** O backend valida identidades via cabeçalhos HTTP (`X-User-Id`) ou middlewares JWT com rate-limiting em memória para rotas sensíveis (`/api/products`).

### D. Observabilidade & SRE: Cloud Logging & Probes
- **Logs Estruturados JSON:** Todas as requisições HTTP, erros e eventos de ciclo de vida utilizam o formato nativo do **Google Cloud Logging** (`severity`, `timestamp`, `message`, `httpRequest`).
- **Health Probes Kubernetes / Cloud Run:**
  - `/api/healthz` e `/api/livez`: Sonda de liveness para o balanceador de carga.
  - `/api/readyz`: Sonda de prontidão que verifica a disponibilidade das conexões de banco de dados e dependências.

---

## 🚀 3. Como Executar o Deploy (CLI Rápido)

Para fazer o deploy imediato na sua conta Google Cloud, basta executar no terminal:

```bash
# 1. Conceder permissão de execução ao script
chmod +x gcp/deploy.sh

# 2. Executar o deploy informando o ID do seu projeto Google Cloud
./gcp/deploy.sh meu-projeto-gcp europe-west1
```

O script cuidará automaticamente de:
1. Habilitar as APIs oficiais (`run.googleapis.com`, `artifactregistry.googleapis.com`, `cloudbuild.googleapis.com`).
2. Verificará e criará o repositório Docker no **Artifact Registry**.
3. Compilará e implantará o serviço no **Cloud Run** com Zero-Downtime.
4. Exibirá a URL HTTPS oficial de produção.
