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

# Wipe and repopulate the demo organization with fixture data
fixtures:
    cd backend && uv run python -m app.demo.tasks

# ─── Development ──────────────────────────────────────────────────────────────

# Full dev — backend (with embedded SAQ worker) + frontend
dev:
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    just dev-backend &
    just dev-frontend &
    wait

# Backend + SAQ worker in separate process (no frontend)
dev-backend-all:
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

# Start Vite frontend dev server
dev-frontend:
    cd frontend && pnpm dev

# Start Next.js landing page dev server
dev-landing:
    cd landing && pnpm dev

# ─── Tests ────────────────────────────────────────────────────────────────────

# Run backend tests
test:
    cd backend && uv run pytest -v

# ─── Code Quality ─────────────────────────────────────────────────────────────

# Run semgrep custom rules against backend
semgrep:
    semgrep --config=semgrep/ --error backend/

# Run semgrep tests against rule test files
semgrep-test:
    semgrep --test semgrep/

# Lint + format all code (backend + frontend + landing)
lint: lint-backend lint-frontend lint-landing

# Lint + format backend
lint-backend:
    cd backend && uv run ruff check --fix . && uv run ruff format .

# Lint + format frontend
lint-frontend:
    cd frontend && pnpm lint:fix

# Lint landing page
lint-landing:
    cd landing && pnpm lint

# Type-check all code (backend + frontend + landing)
check: check-backend check-frontend check-landing

# Type-check backend
check-backend:
    cd backend && uv run basedpyright

# Type-check frontend
check-frontend:
    cd frontend && pnpm type-check

# Type-check landing
check-landing:
    cd landing && pnpm type-check

# ─── Build ────────────────────────────────────────────────────────────────────

# Build all frontends (frontend + landing)
build: build-frontend build-landing

# Build frontend for production
build-frontend:
    cd frontend && pnpm build

# Build frontend and open bundle size analyzer
analyze-frontend:
    cd frontend && ANALYZE=1 pnpm build

# Build landing page for production
build-landing:
    cd landing && pnpm build

# ─── Emails ───────────────────────────────────────────────────────────────────

# Start React Email dev server
dev-emails:
    cd backend/emails && pnpm dev

# Compile React Email templates to Jinja2 HTML
build-emails:
    cd backend/emails && pnpm build

# ─── Codegen ──────────────────────────────────────────────────────────────────

# Generate API client for frontend (requires backend running)
codegen:
    cd frontend && pnpm codegen

# Generate API client for landing page (requires backend running)
codegen-landing:
    cd landing && pnpm codegen

# ─── Docker ───────────────────────────────────────────────────────────────────

# Build backend Docker image
docker-build:
    cd backend && docker build -t sloopquest-api:local .
