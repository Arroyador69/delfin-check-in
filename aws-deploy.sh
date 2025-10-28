#!/bin/bash

# Script de despliegue para AWS
# Requiere: AWS CLI, Docker, y permisos configurados

set -e

# Variables de configuración
APP_NAME="delfin-checkin"
AWS_REGION="us-east-1"
ECR_REPOSITORY="delfin-checkin"
CLUSTER_NAME="delfin-checkin-cluster"
SERVICE_NAME="delfin-checkin-service"
TASK_DEFINITION="delfin-checkin-task"

echo "🚀 Iniciando despliegue de Delfín Check-in en AWS..."

# 1. Configurar AWS CLI
echo "📋 Configurando AWS CLI..."
aws configure set default.region $AWS_REGION

# 2. Crear repositorio ECR si no existe
echo "🐳 Creando repositorio ECR..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY || \
aws ecr create-repository --repository-name $ECR_REPOSITORY

# 3. Obtener token de login de ECR
echo "🔐 Obteniendo token de ECR..."
aws ecr get-login-password --region $AWS_REGION | \
docker login --username AWS --password-stdin \
$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

# 4. Construir imagen Docker
echo "🔨 Construyendo imagen Docker..."
docker build -t $ECR_REPOSITORY .

# 5. Etiquetar imagen
echo "🏷️ Etiquetando imagen..."
docker tag $ECR_REPOSITORY:latest \
$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# 6. Subir imagen a ECR
echo "⬆️ Subiendo imagen a ECR..."
docker push \
$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# 7. Crear cluster ECS si no existe
echo "🏗️ Creando cluster ECS..."
aws ecs describe-clusters --clusters $CLUSTER_NAME || \
aws ecs create-cluster --cluster-name $CLUSTER_NAME

# 8. Registrar definición de tarea
echo "📝 Registrando definición de tarea..."
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 9. Crear servicio ECS
echo "🔧 Creando servicio ECS..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition $TASK_DEFINITION \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678],securityGroups=[sg-12345678],assignPublicIp=ENABLED}" || \
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TASK_DEFINITION

echo "✅ Despliegue completado!"
echo "🌐 La aplicación estará disponible en: http://your-load-balancer-url"
echo "📊 Monitorear en: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME/services"
