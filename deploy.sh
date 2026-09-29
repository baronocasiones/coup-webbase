#!/usr/bin/env bash
# deploy.sh — Build and run the Coup backend with cloudflared tunnel
#
# Prerequisites:
#   - Docker installed
#   - cloudflared installed (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
#   - .env file configured (copy from .env.example)
#
# Usage:
#   ./deploy.sh              # Build + run
#   ./deploy.sh --no-build   # Run without rebuilding
#   ./deploy.sh --tunnel     # Also start cloudflared quick tunnel

set -euo pipefail

IMAGE_NAME="coup-backend"
CONTAINER_NAME="coup-backend"
ENV_FILE=".env"
NO_BUILD=false
START_TUNNEL=false

for arg in "$@"; do
    case $arg in
        --no-build) NO_BUILD=true ;;
        --tunnel) START_TUNNEL=true ;;
    esac
done

# Load env vars
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found. Copy .env.example to .env and fill in your values."
    exit 1
fi
set -a
source "$ENV_FILE"
set +a

# Build
if [ "$NO_BUILD" = false ]; then
    echo "Building Docker image..."
    docker build -t "$IMAGE_NAME" .
fi

# Stop existing container
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

# Run
echo "Starting backend on port ${PORT:-8000}..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --env-file "$ENV_FILE" \
    -p "${PORT:-8000}:8000" \
    "$IMAGE_NAME"

echo "Backend running at http://localhost:${PORT:-8000}"

# Start cloudflared tunnel
if [ "$START_TUNNEL" = true ]; then
    echo "Starting cloudflared quick tunnel..."
    cloudflared tunnel --url "http://localhost:${PORT:-8000}"
fi
