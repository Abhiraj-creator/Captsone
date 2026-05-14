# deploy.ps1 - Full redeploy with correct sequencing
# Fixes race condition: nginx generates location blocks only when backends have endpoints

Write-Host "=> Applying all K8s manifests..." -ForegroundColor Cyan
kubectl apply -f ./k8s

Write-Host "`n=> Waiting for router-deployment to be ready..." -ForegroundColor Cyan
kubectl rollout status deployment/router-deployment --timeout=120s

Write-Host "`n=> Waiting for sandbox-deployment to be ready..." -ForegroundColor Cyan
kubectl rollout status deployment/sandbox-deployment --timeout=120s

Write-Host "`n=> Restarting ingress-nginx controller so nginx regenerates config with live endpoints..." -ForegroundColor Yellow
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=60s

Write-Host "`n=> All done. Cluster state:" -ForegroundColor Green
kubectl get pods,deployments,ingress
