# Infra / CI/CD

Auto-loaded when editing infra/terraform/workflow files.

## CI/CD (`.github/workflows/`)

GitHub Actions with change detection — only deploys when backend or infra changes. Uses AWS OIDC (no long-lived credentials). Pipeline: detect changes → test → build Docker image → Terraform → ECS deploy.

## Critical deployment gotchas

- **Infra-only changes don't redeploy ECS.** The deploy step only runs when `backend_changed=true`. If you change infra (e.g., recreate Redis), Terraform updates the task definition but ECS keeps running old containers with old env vars. Fix: trigger a manual workflow run with both "Deploy infrastructure" and "Deploy application" = true.
- **Migrations run on container startup** via `scripts/start.sh` → `scripts/migrate.py`. If migration fails, the container crashes, health checks return 500, ECS keeps restarting. Check BetterStack logs (not CloudWatch) for migration output.
- **Production logs are on BetterStack** (`logs.betterstack.com`), source `sloopquest-production`. Shipped via OpenTelemetry. Search for `migration`, `alembic`, or error messages there — NOT CloudWatch.
- **Demo reseed:** `POST /api/demo/reseed` (admin-only) wipes and repopulates the demo org. Also runs automatically every Sunday at midnight UTC via SAQ scheduled task. Seed script: `backend/app/demo/seed.py`.
- **Never `uv pip install --force-reinstall`** individual packages — it breaks dependency versions. If venv is corrupted, delete it (`rm -rf backend/.venv`) and rebuild with `just install`.
