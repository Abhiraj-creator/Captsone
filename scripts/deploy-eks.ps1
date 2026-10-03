param(
    [Parameter(Mandatory = $true)] [string]$AccountId,
    [Parameter(Mandatory = $true)] [string]$Region,
    [Parameter(Mandatory = $true)] [string]$MistralApiKey,
    [string]$PreviewDomain = '',
    [string]$Namespace = 'default'
)

$ErrorActionPreference = 'Stop'
$registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"

function Invoke-KubectlTemplate([string]$Path) {
    $yaml = Get-Content -Raw $Path
    $yaml = $yaml.Replace('YOUR_AWS_ACCOUNT_ID', $AccountId).Replace('YOUR_REGION', $Region).Replace('PREVIEW_DOMAIN', $PreviewDomain)
    $yaml | kubectl apply -f - -n $Namespace
}

Write-Host 'Creating/updating Kubernetes secrets...' -ForegroundColor Cyan
$token = aws ecr get-login-password --region $Region
$token | kubectl create secret docker-registry ecr-creds `
    --docker-server=$registry --docker-username=AWS --docker-password=$token `
    --dry-run=client -o yaml | kubectl apply -f - -n $Namespace
kubectl create secret generic mistral-ai --from-literal="MISTRAL_API_KEY=$MistralApiKey" `
    --dry-run=client -o yaml | kubectl apply -f - -n $Namespace

$files = @(
    'rbac.yml', 'ai-deployment.yml', 'ai-service.yml',
    'sandbox-deployment.yml', 'sandbox-service.yml',
    'router-deployment.yml', 'router-service.yml',
    'frontend-deployment.yml', 'frontend-service.yml'
)
foreach ($file in $files) { Invoke-KubectlTemplate "$(Join-Path $PSScriptRoot '..\k8s\$file')" }

if ([string]::IsNullOrWhiteSpace($PreviewDomain)) {
    Write-Warning 'PreviewDomain was not supplied; deploying the main application without wildcard sandbox preview routes.'
    $ingress = Get-Content -Raw "$(Join-Path $PSScriptRoot '..\k8s\ingress-aws.yml')"
    $ingress = $ingress -replace '(?ms)  - host: "\*\.preview\.PREVIEW_DOMAIN".*?(?=  - host:|\z)', ''
    $ingress = $ingress -replace '(?ms)  - host: "\*\.agent\.PREVIEW_DOMAIN".*?(?=\z)', ''
    $ingress | kubectl apply -f - -n $Namespace
} else {
    Invoke-KubectlTemplate "$(Join-Path $PSScriptRoot '..\k8s\ingress-aws.yml')"
}

kubectl rollout status deployment/ai-deployment --timeout=180s -n $Namespace
kubectl rollout status deployment/sandbox-deployment --timeout=180s -n $Namespace
kubectl rollout status deployment/router-deployment --timeout=180s -n $Namespace
kubectl rollout status deployment/frontend-deployment --timeout=180s -n $Namespace
kubectl get pods,ingress -n $Namespace
