#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DEPLOY AUTOMATIZADO - GOOGLE CLOUD RUN & ARTIFACT REGISTRY
# ==============================================================================
# Uso: chmod +x gcp/deploy.sh && ./gcp/deploy.sh [PROJECT_ID] [REGION]
# ==============================================================================

set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo '')}"
REGION="${2:-europe-west1}"
REPO_NAME="translite-repo"
SERVICE_NAME="loja-translite"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Erro: ID do Projeto Google Cloud não informado ou não configurado."
  echo "Uso: ./gcp/deploy.sh <SEU_PROJECT_ID> [REGIAO]"
  exit 1
fi

echo "🚀 Iniciando deploy da Arquitetura de Referência GCP..."
echo "📦 Projeto : $PROJECT_ID"
echo "🌍 Região  : $REGION"
echo "------------------------------------------------------------"

# 1. Habilitar APIs necessárias na GCP
echo "⚙️  1/4 Habilitando APIs (Cloud Run, Artifact Registry, Cloud Build, Secret Manager)..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID"

# 2. Criar repositório Docker no Artifact Registry (se não existir)
echo "📂 2/4 Verificando/Criando repositório no Artifact Registry ($REPO_NAME)..."
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Repositório Docker para Loja Translite" \
    --project="$PROJECT_ID"
  echo "✅ Repositório criado com sucesso!"
else
  echo "✅ Repositório já existente."
fi

# 3. Disparar o Google Cloud Build (Build & Deploy automatizado via cloudbuild.yaml)
echo "🔨 3/4 Disparando Cloud Build para gerar imagem otimizada e executar deploy no Cloud Run..."
gcloud builds submit \
  --config=gcp/cloudbuild.yaml \
  --substitutions="_AR_REGION=$REGION,_DEPLOY_REGION=$REGION,_AR_REPO=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME" \
  --project="$PROJECT_ID" .

# 4. Obter e exibir a URL oficial da aplicação
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")

echo "------------------------------------------------------------"
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO NO GOOGLE CLOUD RUN!"
echo "🌐 URL Oficial da Aplicação: $SERVICE_URL"
echo "🔍 Monitoramento / Probes: $SERVICE_URL/api/healthz"
echo "============================================================"
