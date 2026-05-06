# Sloopquest Justfile — https://just.systems

default:
    @just --list

# ─── Install ──────────────────────────────────────────────────────────────────

# Install backend dependencies
install:
    cd backend && uv sync --dev

# ─── Database ─────────────────────────────────────────────────────────────────

# Start postgres (dev + test) and redis via Docker
db-start:
    cd backend && docker compose -f docker-compose.dev.yml up -d

# Stop all Docker services
db-stop:
    cd backend && docker compose -f docker-compose.dev.yml down

# Run alembic migrations (upgrade to head)
db-upgrade:
    cd backend && uv run alembic upgrade head

# Create a new migration from model changes
db-migrate +message:
    cd backend && uv run alembic revision --autogenerate -m "{{message}}"
    cd backend && uv run ruff check --fix alembic/versions/ && uv run ruff format alembic/versions/

# Downgrade by one revision
db-downgrade:
    cd backend && uv run alembic downgrade -1

# Drop and recreate the dev database volume (destructive!)
db-clean:
    cd backend && docker compose -f docker-compose.dev.yml down -v
    just db-start
    just db-upgrade

# Connect to the dev database via psql
db-psql:
    psql postgresql://postgres:postgres@localhost:5432/sloopquest

# ─── Development ──────────────────────────────────────────────────────────────

# Backend + SAQ worker
dev:
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    just dev-backend &
    just dev-worker &
    wait

# Start Litestar backend with hot reload
dev-backend:
    cd backend && uv run litestar --app app.index:app run -r -d -p 8000

# Start SAQ worker
dev-worker:
    cd backend && uv run litestar --app app.index:app workers run

# ─── Tests ────────────────────────────────────────────────────────────────────

# Run backend tests
test:
    cd backend && uv run pytest -v

# ─── Code Quality ─────────────────────────────────────────────────────────────

# Lint + format backend
lint:
    cd backend && uv run ruff check --fix . && uv run ruff format .

# Type-check backend
check:
    cd backend && uv run basedpyright

# ─── Emails ───────────────────────────────────────────────────────────────────

# Start React Email dev server
dev-emails:
    cd backend/emails && pnpm dev

# Compile React Email templates to Jinja2 HTML
build-emails:
    cd backend/emails && pnpm build

# ─── Codegen ──────────────────────────────────────────────────────────────────

# Generate API client (requires backend running)
codegen:
    cd frontend && pnpm codegen

# ─── Docker ───────────────────────────────────────────────────────────────────

# Build backend Docker image
docker-build:
    cd backend && docker build -t sloopquest-api:local .
