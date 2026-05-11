# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mo-lib is an LLM-based emotional context analysis service for cross-domain content recommendations (movies, books, music). It uses GPT-4o mini to analyze emotional/thematic axes and generates an "immersion map" — a node graph connecting content across domains.

**Stack:** FastAPI (Python 3.11) · PostgreSQL 16 · SQLAlchemy ORM + Alembic · JWT auth · Docker Compose · GitHub Actions CI

---

## Development Environment

All Python tooling runs inside Docker containers. Do not use local `pip install`.

```bash
# First-time setup
cd backend
cp .env.example .env
# Generate JWT secret: openssl rand -hex 32
docker compose up --build

# Normal startup
docker compose up

# API: http://localhost:8000
# Swagger docs: http://localhost:8000/docs
```

---

## Common Commands

All commands below run from `backend/`.

### Code Quality (required before any PR)

```bash
docker compose exec api ruff format .
docker compose exec api ruff check . --fix
docker compose exec api pip-audit --ignore-vuln GHSA-jr27-m4p2-rc6r --ignore-vuln GHSA-...
```

Ignored CVEs are documented with justification in `backend/SECURITY_NOTES.md`.

### Database Migrations

```bash
# Generate a new migration (add model imports to alembic/env.py first)
docker compose exec api alembic revision --autogenerate -m "description"

# Apply migrations
docker compose exec api alembic upgrade head

# Rollback one step
docker compose exec api alembic downgrade -1
```

**Important:** Always import new SQLAlchemy models in `backend/alembic/env.py` before running `--autogenerate`, or the migration won't detect the new tables.

---

## Architecture

### Request Flow

```
HTTP Request → FastAPI (main.py) → API Routes (app/api/) → Services (app/core/) → SQLAlchemy ORM → PostgreSQL
                                                                        ↓
                                                          External APIs (TMDB, Spotify, Aladin)
                                                          LLM (GPT-4o mini) for emotion analysis
```

### Data Model

```
User (email/password_hash/nickname)
  └── Map (immersion map / node graph)
        ├── Node (content item)
        │     ├── domain: movie | music | book  (CHECK constraint)
        │     ├── external_id: ID from TMDB / Spotify / Aladin
        │     ├── emotion_tags: JSONB  (LLM-generated emotional tags)
        │     └── metadata: JSONB  (domain-specific extra fields)
        └── Edge (connection between two nodes)
              ├── source_node_id → target_node_id  (UNIQUE together)
              └── reason: text  (LLM-generated connection rationale)
```

Models live in `backend/app/models/`. Each model file has a corresponding SQLAlchemy ORM class.

### Key Files

| File | Role |
|------|------|
| `backend/app/main.py` | FastAPI app init, CORS, health check (`GET /`) |
| `backend/app/config.py` | Pydantic Settings; loads `.env` — JWT secret, API keys, CORS origins |
| `backend/app/database.py` | SQLAlchemy engine + `SessionLocal` factory + `Base` |
| `backend/app/security.py` | bcrypt password hashing/verification |
| `backend/alembic/env.py` | Alembic migration env; must import all models for autogenerate |

### Directories Not Yet Implemented

- `backend/app/api/` — API route modules (to be created)
- `backend/app/core/` — Service/business logic
- `backend/app/db/` — Database utility helpers

---

## CI Pipeline

`.github/workflows/ci.yml` runs on every push/PR:
1. Ruff format check + lint
2. pip-audit (dependency vulnerability scan)
3. Gitleaks (secret scanning — full history via `fetch-depth: 0`)
4. Docker build verification

CI secrets (`JWT_SECRET_KEY`, `TMDB_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`) are stored in GitHub repository secrets.

---

## Conventions

From `backend/CONTRIBUTING.md`:

- **Code style:** Ruff only (no Black, flake8, or isort)
- **Naming:** `snake_case` functions/variables, `PascalCase` classes, `UPPER_SNAKE_CASE` constants
- **Branch strategy:** `main` ← `develop` ← `feature/<area>` (e.g. `feature/map`, `feature/tmdb`)
- **Commit messages:** `<type>: <Korean or English description>` where type is `feat | fix | docs | refactor | test | chore | style | ci`
- **PR rules:** 1 approval required, CI must be green, prefer < 500 lines changed per PR
- **Docker-first:** All runtime dependencies managed via Docker; do not run the app or tests locally outside of containers
