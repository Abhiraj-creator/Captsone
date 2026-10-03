# deploy.ps1 - Apply manifests to remote k3s cluster on EC2
# Run this from your local machine after:
#   1. Running scripts/build-push.ps1 to push fresh images
#   2. Ensuring KUBECONFIG points to your EC2 k3s cluster
#
# To get the kubeconfig from EC2:
#   scp ubuntu@YOUR_EC2_IP:/etc/rancher/k3s/k3s.yaml ./k3s.yaml
#   Then set: $env:KUBECONFIG = "$PWD\k3s.yaml"
#   And replace 127.0.0.1 in k3s.yaml with your EC2 public IP.

param(
    [string]$KubeconfigPath = "$PSScriptRoot\k3s.yaml"
)

if (Test-Path $KubeconfigPath) {
    $env:KUBECONFIG = $KubeconfigPath
    Write-Host "=> Using kubeconfig: $KubeconfigPath" -ForegroundColor DarkGray
} else {
    Write-Host "=> Using system default kubeconfig (KUBECONFIG not overridden)" -ForegroundColor DarkGray
}

Write-Host "`n=> Applying all K8s manifests..." -ForegroundColor Cyan
kubectl apply -f ./k8s

Write-Host "`n=> Waiting for ai-deployment to be ready..." -ForegroundColor Cyan
kubectl rollout status deployment/ai-deployment --timeout=180s

Write-Host "`n=> Waiting for sandbox-deployment to be ready..." -ForegroundColor Cyan
kubectl rollout status deployment/sandbox-deployment --timeout=180s

Write-Host "`n=> Waiting for router-deployment to be ready..." -ForegroundColor Cyan
kubectl rollout status deployment/router-deployment --timeout=120s

Write-Host "`n=> Waiting for frontend-deployment to be ready..." -ForegroundColor Cyan
kubectl rollout status deployment/frontend-deployment --timeout=60s

Write-Host "`n=> All done. Cluster state:" -ForegroundColor Green
kubectl get pods,deployments,ingress
