#!/usr/bin/env bash
# ==============================================================================
# Universal Open Knowledge Search Engine - Oracle Cloud VPS Setup & Deploy Script
# Optimized for Oracle Cloud Always Free Tier (Ubuntu 22.04/24.04 & Oracle Linux)
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "  🚀 Starting Universal Search Engine Production Deployment"
echo "  Target: Oracle Cloud Always Free VPS (Docker Compose Stack)"
echo "================================================================="

# 1. Root check
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo or as root: sudo ./scripts/setup-oracle-vps.sh"
  exit 1
fi

# 2. Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

echo "📦 Detected OS: $OS"

# 3. Update packages and install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "⚙️ Docker not found. Installing Docker Engine & Docker Compose Plugin..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update -y
        apt-get install -y ca-certificates curl gnupg lsb-release iptables-persistent
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -y
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif [ "$OS" = "ol" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        dnf -y install dnf-plugins-core
        dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin iptables-services
        systemctl enable --now docker
    fi
else
    echo "✅ Docker is already installed: $(docker --version)"
fi

# Ensure docker service is running
systemctl enable --now docker

# 4. Open Host Firewall for HTTP (80) & HTTPS (443)
# (Oracle Cloud default Ubuntu/OL images enforce strict local iptables rules)
echo "🔒 Configuring Host Firewall for Ports 80 & 443..."
if command -v iptables &> /dev/null; then
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
    if command -v netfilter-persistent &> /dev/null; then
        netfilter-persistent save || true
    fi
fi

if command -v ufw &> /dev/null; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow 22/tcp || true
    ufw reload || true
fi

# 5. Verify .env exists or create from defaults
if [ ! -f .env ]; then
    echo "📝 Generating default .env file..."
    cat << 'EOF' > .env
PORT=3000
NODE_ENV=production
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=Nikunj@1608
DB_NAME=knowledge_db
REDIS_HOST=redis
REDIS_PORT=6379
API_KEY=demo-api-key-12345
NVIDIA_API_KEY=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
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
NVIDIA_EMBEDDING_MODEL=nvidia/llama-nemotron-embed-vl-1b-v2
EOF
    echo "✅ Default .env generated."
fi

# 6. Build and start production containers
echo "🐳 Launching Docker Compose Production Stack..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "================================================================="
echo "  🎉 Deployment Complete!"
echo "================================================================="
echo "  Web Frontend:  http://<YOUR_ORACLE_PUBLIC_IP>/"
echo "  API Health:    http://<YOUR_ORACLE_PUBLIC_IP>/api/v1/health"
echo "  Swagger Docs:  http://<YOUR_ORACLE_PUBLIC_IP>/api/docs"
echo "================================================================="
echo ""
echo "To check live container logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
