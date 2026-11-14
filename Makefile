.DEFAULT_GOAL := help

GO ?= go
NPM ?= npm
DOCKER_COMPOSE ?= docker compose
RMDIR ?= rm -rf

.PHONY: help deps backend-deps frontend-deps dev up down logs backend-dev frontend-dev build backend-build frontend-build test lint fmt clean clean-deps clean-cache

help: ## Show available commands
	@echo "POLLO development commands"
	@echo "  make deps            Install backend and frontend dependencies"
	@echo "  make dev             Build and run the full stack with Docker Compose"
	@echo "  make backend-dev     Run the Go API locally"
	@echo "  make frontend-dev    Run the Next.js app locally"
	@echo "  make build           Build the backend and frontend"
	@echo "  make test            Run backend tests"
	@echo "  make lint            Run frontend lint checks"
	@echo "  make fmt             Format Go source files"
	@echo "  make clean           Remove generated build output"
	@echo "  make clean-deps      Remove frontend dependencies and Go module cache"
	@echo "  make clean-cache     Delete downloaded NASA tile cache"
	@echo "  make up | down | logs  Manage the Docker Compose stack"

deps: backend-deps frontend-deps ## Install all project dependencies

backend-deps: ## Download Go modules
	cd backend && $(GO) mod download

frontend-deps: ## Install frontend dependencies from package-lock.json
	cd frontend && $(NPM) ci

dev: ## Build and run the full stack in Docker Compose
	$(DOCKER_COMPOSE) up --build

up: ## Start the Docker Compose stack in the background
	$(DOCKER_COMPOSE) up --build -d

down: ## Stop the Docker Compose stack
	$(DOCKER_COMPOSE) down

logs: ## Follow Docker Compose logs
	$(DOCKER_COMPOSE) logs -f

backend-dev: ## Run the backend API locally
	cd backend && $(GO) run .

frontend-dev: ## Run the frontend locally
	cd frontend && $(NPM) run dev

build: backend-build frontend-build ## Build backend and frontend for production

backend-build: ## Compile the backend binary
	cd backend && $(GO) build -o bin/server .

frontend-build: ## Build the frontend for production
	cd frontend && $(NPM) run build

test: ## Run backend tests
	cd backend && $(GO) test ./...

lint: ## Run frontend lint checks
	cd frontend && $(NPM) run lint

fmt: ## Format Go source files
	cd backend && $(GO) fmt ./...

clean: ## Remove generated build output, preserving downloaded dependencies and tile cache
	$(RMDIR) backend/bin backend/dist backend/tmp frontend/.next frontend/out frontend/build frontend/.turbo frontend/.eslintcache

clean-deps: ## Remove frontend node_modules and the local Go module download cache
	$(RMDIR) frontend/node_modules
	cd backend && $(GO) clean -modcache

clean-cache: ## Delete cached NASA GIBS tiles
	$(RMDIR) data/cache backend/data/cache
