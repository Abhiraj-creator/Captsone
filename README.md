# Kubernetes Cloud Sandbox Environment

A dynamic, scalable Kubernetes-based sandbox environment designed to spin up isolated Vite React development servers on-demand. It dynamically allocates Kubernetes Pods and Services and routes traffic via an Nginx Ingress Controller and a custom Router.

## 🏗 Architecture

The project consists of several microservices and components:

1. **Router (`/router`)**: A Node.js proxy service that receives wildcard traffic (`*.preview.localhost`) from the Ingress Controller and routes it to the correct dynamically created sandbox service based on the requested subdomain.
2. **Sandbox Server (`/sandbox/server`)**: A Node.js API server responsible for interacting with the Kubernetes API to dynamically provision Sandbox Pods and Services when a new environment is requested.
3. **Sandbox Agent (`/sandbox/agent`)**: An internal agent running to provide health checks and potential management capabilities inside the sandbox nodes.
4. **Project Template (`/sandbox/template`)**: The base Vite + React template that is served when a sandbox starts.
5. **Kubernetes Configuration (`/k8s`)**: Deployment manifests for the Router, Sandbox Server, RBAC permissions, and the Nginx Ingress routing.

## 📋 Prerequisites

Ensure you have the following installed and configured:
*   **Docker Desktop**: With the **Kubernetes** feature enabled in settings.
*   **Node.js & pnpm**: For local development and package management.
*   **PowerShell**: Used for running the deployment script.
*   **kubectl**: Configured to connect to your local Docker Desktop cluster.

## 🚀 Setup Instructions

### 1. Install NGINX Ingress Controller
The project uses the Nginx Ingress Controller to handle wildcard subdomain routing. Install it using the official manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
```

Wait for the ingress controller pods to be fully running:
```bash
kubectl get pods -n ingress-nginx
```

### 2. Build Docker Images
Before deploying, you must build the local Docker images for the router and sandbox server. The Kubernetes manifests are configured to use `router:v2` and `sandbox:v2` to avoid caching issues.

Run these commands from the **root directory**:

```bash
# Build the Router image
docker build -t router:v2 ./router

# Build the Sandbox Server image
docker build -t sandbox:v2 ./sandbox/server

# Build the Agent image (Note the -f flag since your Dockerfile is inside src/)
docker build -f ./sandbox/agent/src/dockerfile -t agent ./sandbox/agent
```

### 3. Deploy to Kubernetes
To deploy the infrastructure, we use a custom PowerShell script `deploy.ps1`. 

**Why use the script instead of just `kubectl apply`?**
There is a known race condition in Kubernetes where the Nginx Ingress Controller will generate empty configuration blocks if the target backend (`router-service`) doesn't have active, healthy endpoints at the time the Ingress is created. The `deploy.ps1` script handles this by applying the manifests, waiting for the deployments to become `1/1 Ready`, and finally forcing the Ingress Controller to restart and regenerate its configuration with the live endpoints.

Run from the root directory:
```powershell
.\deploy.ps1
```

### 4. Create a Sandbox Environment
Once the cluster is running, you can dynamically spin up a new sandbox environment using the Sandbox API.

Make a POST request to create a sandbox:
```bash
curl -X POST http://localhost/api/sandbox/start -H "Content-Type: application/json"
```

You will receive a JSON response similar to this:
```json
{
  "message": "sandbox environment created successfully",
  "sandboxId": "019e2558-89d3-77ae-9ce6-118169661ead",
  "previewUrl": "http://019e2558-89d3-77ae-9ce6-118169661ead.preview.localhost"
}
```

### 5. Access the Sandbox
Open the `previewUrl` provided in the API response in your web browser. 
*   **Flow**: Browser ➔ `*.preview.localhost` ➔ Nginx Ingress ➔ Router Pod ➔ `sandbox-service-<id>` ➔ Sandbox Pod (Vite Dev Server).

## 🛠 Troubleshooting

*   **Getting a 404 Nginx Error?**
    If you redeployed the cluster manually without the script, Nginx might have lost the router endpoints. Run `.\deploy.ps1` to properly sequence the deployment.
*   **Docker build failing for the agent?**
    If you get a `no such file or directory` error when building the agent, remember that your Dockerfile is located in `sandbox/agent/src/dockerfile`, not the root of the agent folder. Build it using: `docker build -f ./sandbox/agent/src/dockerfile -t agent ./sandbox/agent`.
*   **Image Pull Errors?**
    Ensure you built the images with the exact tags referenced in the Kubernetes manifests (`router:v2` and `sandbox:v2`). Docker Desktop's Kubernetes uses the local image cache automatically as long as the `imagePullPolicy: IfNotPresent` is set in the deployment YAML.
