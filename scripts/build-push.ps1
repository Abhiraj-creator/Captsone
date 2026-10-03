# build-push.ps1 — Build all Docker images and push to AWS ECR
# Run this from your LOCAL machine (Windows) before deploying.
#
# Prerequisites:
#   1. AWS CLI installed: https://aws.amazon.com/cli/
#   2. Configured: aws configure (enter your IAM key, secret, region)
#   3. Docker Desktop running
#
# Usage:
#   .\scripts\build-push.ps1 -AccountId "123456789012" -Region "us-east-1"

param(
    [Parameter(Mandatory=$true)]
    [string]$AccountId,

    [Parameter(Mandatory=$true)]
    [string]$Region
)

$ErrorActionPreference = "Stop"
$ECR = "$AccountId.dkr.ecr.$Region.amazonaws.com"

# -------------------------------------------------------
# 1. Authenticate Docker to ECR
# -------------------------------------------------------
Write-Host "`n=> [1/8] Authenticating Docker to ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ECR

# -------------------------------------------------------
# 2. Ensure ECR repositories exist
# -------------------------------------------------------
Write-Host "`n=> [2/8] Ensuring ECR repositories exist..." -ForegroundColor Cyan
$repos = @("capstone/ai-orchestration", "capstone/sandbox", "capstone/router", "capstone/agent", "capstone/template", "capstone/frontend")
foreach ($repo in $repos) {
    aws ecr describe-repositories --repository-names $repo --region $Region 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Creating repository: $repo"
        aws ecr create-repository --repository-name $repo --region $Region | Out-Null
    } else {
        Write-Host "   Repository exists: $repo"
    }
}

# -------------------------------------------------------
# 3-8. Build and push each image
# -------------------------------------------------------
$services = @(
    @{ Name = "ai-orchestration"; Context = "./Ai-orchestration" },
    @{ Name = "sandbox";          Context = "./sandbox/server"   },
    @{ Name = "router";           Context = "./sandbox/router"   },
    @{ Name = "agent";            Context = "./sandbox/agent"    },
    @{ Name = "template";         Context = "./sandbox/template" },
    @{ Name = "frontend";         Context = "./frontend"         }
)

$step = 3
foreach ($svc in $services) {
    $tag = "$ECR/capstone/$($svc.Name):latest"
    Write-Host "`n=> [$step/8] Building and pushing: $($svc.Name)..." -ForegroundColor Cyan
    docker build -t $tag $svc.Context
    docker push $tag
    $step++
}

Write-Host "`n=> All images pushed to ECR successfully!" -ForegroundColor Green
Write-Host "   Registry: $ECR" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next step: run deploy.ps1 to apply manifests to the cluster." -ForegroundColor Yellow
