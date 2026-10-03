#!/bin/bash
# =============================================================
# bootstrap-cluster.sh — Run ONCE on the EC2 server after setup-ec2.sh
# This creates all Kubernetes secrets needed before applying manifests.
#
# Usage: ssh ubuntu@YOUR_EC2_IP "bash -s" < scripts/bootstrap-cluster.sh
# =============================================================

set -e

# -------------------------------------------------------
# CONFIG — edit these before running
# -------------------------------------------------------
AWS_REGION="us-east-1"              # Change to your AWS region
AWS_ACCOUNT_ID="YOUR_ACCOUNT_ID"   # 12-digit AWS account ID
MISTRAL_API_KEY="YOUR_MISTRAL_KEY" # Your Mistral AI API key

# Derived values (don't change)
ECR_SERVER="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "================================================"
echo "  Bootstrap: Creating Kubernetes Secrets        "
echo "================================================"

# -------------------------------------------------------
# 1. Create ECR imagePullSecret
# -------------------------------------------------------
echo ""
echo "=> [1/3] Creating ECR pull secret (ecr-creds)..."
ECR_TOKEN=$(aws ecr get-login-password --region $AWS_REGION)

kubectl create secret docker-registry ecr-creds \
  --docker-server="$ECR_SERVER" \
  --docker-username=AWS \
  --docker-password="$ECR_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "   ecr-creds secret created."

# -------------------------------------------------------
# 2. Create AWS credentials secret (used by ECR token refresh CronJob)
# -------------------------------------------------------
echo ""
echo "=> [2/3] Creating aws-credentials secret for token refresh CronJob..."
AWS_ACCESS_KEY=$(aws configure get aws_access_key_id)
AWS_SECRET_KEY=$(aws configure get aws_secret_access_key)

kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY" \
  --from-literal=AWS_SECRET_ACCESS_KEY="$AWS_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "   aws-credentials secret created."

# -------------------------------------------------------
# 3. Create Mistral API key secret
# -------------------------------------------------------
echo ""
echo "=> [3/3] Creating Mistral AI secret (mistral-ai)..."
kubectl create secret generic mistral-ai \
  --from-literal=MISTRAL_API_KEY="$MISTRAL_API_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "   mistral-ai secret created."

# -------------------------------------------------------
# Done
# -------------------------------------------------------
echo ""
echo "================================================"
echo "  Secrets ready! You can now deploy:"
echo "  kubectl apply -f k8s/"
echo "================================================"
kubectl get secrets
