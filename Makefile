.PHONY: help up down restart logs build migrate seed lint test clean dev

# Default target
help:
	@echo "Calo Security Assessment Platform - Available Commands"
	@echo "======================================================="
	@echo ""
	@echo "Development:"
	@echo "  make up          - Start all services in development mode"
	@echo "  make down        - Stop all services"
	@echo "  make restart     - Restart all services"
	@echo "  make logs        - Tail logs from all services"
	@echo "  make dev         - Start with hot-reload (same as up)"
	@echo ""
	@echo "Database:"
	@echo "  make migrate     - Run Prisma migrations"
	@echo "  make seed        - Seed database with sample data"
	@echo "  make db-reset    - Reset database (WARNING: deletes all data)"
	@echo "  make db-studio   - Open Prisma Studio"
	@echo ""
	@echo "Build & Test:"
	@echo "  make build       - Build all Docker images"
	@echo "  make lint        - Run linting on all packages"
	@echo "  make test        - Run tests on all packages"
	@echo "  make typecheck   - Run TypeScript type checking"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean       - Remove all containers, volumes, and images"
	@echo "  make shell-api   - Open shell in API container"
	@echo "  make shell-web   - Open shell in Web container"
	@echo "  make shell-worker- Open shell in Worker container"

# Environment setup
.env:
	cp .env.example .env
	@echo "Created .env file. Please update with your secrets."

# Development
up: .env
	docker-compose up -d
	@echo ""
	@echo "Services starting..."
	@echo "  Frontend: http://localhost:3000"
	@echo "  API:      http://localhost:4000"
	@echo "  API Docs: http://localhost:4000/api/docs"
	@echo "  MinIO:    http://localhost:9001"
	@echo ""
	@echo "Run 'make logs' to view logs"

dev: up

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-api:
	docker-compose logs -f api

logs-web:
	docker-compose logs -f web

logs-worker:
	docker-compose logs -f worker

# Database
migrate:
	docker-compose exec api npx prisma migrate dev

migrate-prod:
	docker-compose exec api npx prisma migrate deploy

seed:
	docker-compose exec api npx prisma db seed

db-reset:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker-compose exec api npx prisma migrate reset --force

db-studio:
	docker-compose exec api npx prisma studio

# Build
build:
	docker-compose build --no-cache

build-api:
	docker-compose build --no-cache api

build-web:
	docker-compose build --no-cache web

build-worker:
	docker-compose build --no-cache worker

# Testing & Linting
lint:
	docker-compose exec api npm run lint
	docker-compose exec web npm run lint
	docker-compose exec worker npm run lint

lint-fix:
	docker-compose exec api npm run lint:fix
	docker-compose exec web npm run lint:fix
	docker-compose exec worker npm run lint:fix

test:
	docker-compose exec api npm test
	docker-compose exec web npm test
	docker-compose exec worker npm test

test-api:
	docker-compose exec api npm test

test-web:
	docker-compose exec web npm test

test-worker:
	docker-compose exec worker npm test

typecheck:
	docker-compose exec api npm run typecheck
	docker-compose exec web npm run typecheck
	docker-compose exec worker npm run typecheck

# Cleanup
clean:
	docker-compose down -v --rmi all --remove-orphans
	@echo "Cleaned up all containers, volumes, and images"

# Shell access
shell-api:
	docker-compose exec api sh

shell-web:
	docker-compose exec web sh

shell-worker:
	docker-compose exec worker sh

shell-db:
	docker-compose exec postgres psql -U calo -d calo_db

# Production
prod-up:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-build:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
