#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Building POLLO (Go Backend + Next.js Frontend)"
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Building Go backend..."
cd "$ROOT_DIR/backend"
mkdir -p bin
go build -o bin/server main.go
echo "Go backend built successfully -> backend/bin/server"

echo "Building Next.js frontend..."
cd "$ROOT_DIR/frontend"
npm run build
echo "Next.js frontend built successfully!"

echo "=========================================================="
echo " POLLO Build Completed Successfully."
echo "=========================================================="
