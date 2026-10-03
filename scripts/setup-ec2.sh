#!/bin/bash
# =============================================================
# setup-ec2.sh — Run this ONCE on your fresh EC2 Ubuntu 24.04 instance
# Usage: ssh ubuntu@YOUR_EC2_IP "bash -s" < scripts/setup-ec2.sh
# Or:    scp scripts/setup-ec2.sh ubuntu@YOUR_EC2_IP:~/ && ssh ubuntu@YOUR_EC2_IP "bash setup-ec2.sh"
# =============================================================

set -e  # Exit immediately on any error

echo "================================================"
echo "  Capstone EC2 Setup: k3s + AWS CLI + kubectl  "
echo "================================================"

# -------------------------------------------------------
# 1. System update
# -------------------------------------------------------
echo ""
echo "=> [1/5] Updating system packages..."
sudo apt-get update -q && sudo apt-get upgrade -y -q

# -------------------------------------------------------
# 2. Install AWS CLI v2
# -------------------------------------------------------
echo ""
echo "=> [2/5] Installing AWS CLI v2..."
sudo apt-get install -y -q unzip curl
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install --update
rm -rf awscliv2.zip aws/
echo "   AWS CLI version: $(aws --version)"

# -------------------------------------------------------
# 3. Install k3s (includes kubectl, Traefik ingress, containerd)
# -------------------------------------------------------
echo ""
echo "=> [3/5] Installing k3s..."
curl -sfL https://get.k3s.io | sh -

# Wait for k3s to be ready
echo "   Waiting for k3s to start..."
sleep 10
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=60s

# Make kubectl usable without sudo
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc

echo "   k3s version: $(kubectl version --short 2>/dev/null | head -1)"

# -------------------------------------------------------
# 4. Verify Traefik is running (pre-installed with k3s)
# -------------------------------------------------------
echo ""
echo "=> [4/5] Verifying Traefik ingress controller..."
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=traefik -n kube-system --timeout=90s
echo "   Traefik is ready!"

# -------------------------------------------------------
# 5. Install Docker (needed to pull/run images locally if required)
# -------------------------------------------------------
echo ""
echo "=> [5/5] Installing Docker (optional, for local builds)..."
sudo apt-get install -y -q docker.io
sudo usermod -aG docker ubuntu
echo "   Docker version: $(docker --version)"

# -------------------------------------------------------
# Done — print next steps
# -------------------------------------------------------
echo ""
echo "================================================"
echo "  Setup complete! Next steps:"
echo "================================================"
echo ""
echo "  1. Configure AWS credentials on this server:"
echo "     aws configure"
echo "     (Enter your IAM Access Key ID, Secret, and region)"
echo ""
echo "  2. Copy kubeconfig to your LOCAL machine:"
echo "     On your local PC (PowerShell):"
echo "       scp ubuntu@$(curl -s ifconfig.me):/etc/rancher/k3s/k3s.yaml ./k3s.yaml"
echo "       (Then replace 127.0.0.1 in k3s.yaml with: $(curl -s ifconfig.me))"
echo ""
echo "  3. Run the bootstrap script to create secrets:"
echo "     bash scripts/bootstrap-cluster.sh"
echo ""
echo "  EC2 Public IP: $(curl -s ifconfig.me)"
