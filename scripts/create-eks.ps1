param(
    [string]$ClusterName = 'capstone-cluster',
    [string]$Region = 'us-east-1',
    [string]$NodeType = 't3.micro',
    [int]$Nodes = 1
)

$ErrorActionPreference = 'Stop'
eksctl create cluster --name $ClusterName --region $Region `
    --nodegroup-name standard-workers --node-type $NodeType `
    --nodes $Nodes --nodes-min 1 --nodes-max 1
kubectl get nodes
