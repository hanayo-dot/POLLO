#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting POLLO Development Environment (Go + Next.js)"
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to kill child processes on exit
cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start Backend
echo "[1/2] Starting Go Backend on :8080..."
cd "$ROOT_DIR/backend"
go run main.go &
BACKEND_PID=$!

# Start Frontend
echo "[2/2] Starting Next.js Frontend on :3000..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "=========================================================="
echo " POLLO running at:"
echo " - Frontend: http://localhost:3000"
echo " - Backend API: http://localhost:8080/api/v1/health"
echo " Press Ctrl+C to stop both servers."
echo "=========================================================="

wait
