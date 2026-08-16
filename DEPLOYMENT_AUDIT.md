# Production Deployment Audit Report

**Application**: Tuition Management System (TMS)  
**Target Deployment Architecture**: GitHub → Neon PostgreSQL → Koyeb FastAPI Backend → Vercel Next.js Frontend  
**Audit Date**: August 12, 2026  
**Status**: ⚠️ Audit Complete — Awaiting User Approval before applying changes or deploying  

---

## Executive Summary

The Tuition Management System codebase is architecturally modern, clean, and pre-configured for cloud deployment. The frontend and backend separation is clean, JWT authentication is decoupled, and environment-based control flags exist for production safety.

However, **before proceeding with live deployment to Neon + Koyeb + Vercel**, **3 critical compatibility issues** and **2 recommended code enhancements** must be addressed to ensure seamless cloud operation.

---

## 1. Database Audit (PostgreSQL & SQLite Analysis)

### 1.1 PostgreSQL Support
- **Driver**: `asyncpg>=0.30.0` is already declared in `backend/pyproject.toml`.
- **Connection Pool**: `backend/src/db/session.py` contains production pool configuration (`pool_size=10`, `max_overflow=20`, `pool_recycle=3600`, `pool_pre_ping=True`) activated automatically when `postgresql` is in `DATABASE_URL`.
- **URI Scheme requirement**: SQLAlchemy async requires `postgresql+asyncpg://` scheme. Neon connection strings (which start with `postgres://` or `postgresql://`) must be converted to `postgresql+asyncpg://`.

### 1.2 Identified SQLite-Specific Code
1. **`backend/src/settings/service.py` (`get_db_file_path` & `trigger_db_backup`)**:
   - Uses `shutil.copy2` to copy `./tms.db`. On PostgreSQL, `tms.db` does not exist on disk, causing a `FileNotFoundError` (500 Internal Server Error) if the teacher clicks "Backup DB" in settings.
2. **`backend/src/settings/router.py` (`/api/settings/export`)**:
   - Serves `tms_database_export.db` with `media_type="application/x-sqlite3"`. This endpoint assumes local SQLite file storage.
3. **`backend/src/main.py` (`lifespan` startup checks)**:
   - Contains SQLite-specific PRAGMA queries: `PRAGMA table_info(users)` and `PRAGMA table_info(students)`.
   - **Impact**: On PostgreSQL, PRAGMA statements fail into the `try...except` block with a warning in logs. While non-fatal, they should be gated or replaced with standard Alembic migrations.

### 1.3 Database Backup Logic
- **JSON Backup System** (`backend/src/data_management/backup_service.py`):
  - Dumps all tables (`users`, `students`, `payments`, `attendance`, etc.) to a JSON payload. This is 100% database-agnostic and works seamlessly on PostgreSQL.

---

## 2. Backend Audit (FastAPI & Python Environment)

### 2.1 Start Command & Python Version
- **Production Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT --workers 2`
- **Python Version**: `>=3.11` (specified in `pyproject.toml`; `Dockerfile` uses `python:3.12-slim`).

### 2.2 Environment Variables Required
| Variable | Production Value | Purpose |
|---|---|---|
| `APP_ENV` | `production` | Enables production security & disables dev routes |
| `DEBUG` | `False` | Disables debug logs & detailed traceback exposure |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Connection to Neon Cloud Postgres |
| `JWT_SECRET_KEY` | `[High Entropy Secret]` | Signs authentication JWT tokens |
| `CORS_ORIGINS` | `["https://tms-app.vercel.app"]` | Restricts API access to frontend origin |
| `SEED_DEMO_DATA` | `False` | Prevents auto-generating demo data |

### 2.3 Localhost & Hardcoded URLs
- Default fallbacks in `backend/src/core/config.py`:
  - `DATABASE_URL`: `postgresql+asyncpg://postgres:postgres@localhost:5432/tms_db`
  - `CORS_ORIGINS`: `["http://localhost:3000"]`
- **Audit Result**: Fallbacks exist for local dev, but all values are overridable via environment variables.

### 2.4 Health Check Endpoint
- `/api/health` returns `{"status": "healthy", "service": "Tuition Management System", "version": "1.0.0"}`.
- Docker health check and Koyeb readiness probes can target `/api/health`.

### 2.5 Persistent Storage & Filesystem Dependencies
- Local backup JSON files are written to `BACKUP_DIR` (`./backups`). On Koyeb (container host), local filesystem storage is ephemeral (resets on container restart).
- **Recommendation**: JSON backups can be downloaded directly in the browser via file response rather than relying on host disk persistence.

---

## 3. Frontend Audit (Next.js & API Integration)

### 3.1 Build Command & Node Environment
- **Build Command**: `next build` (Run from `frontend` directory).
- **Framework**: Next.js 16.2.10 (App Router).

### 3.2 Environment Variables & API URL Format
- `NEXT_PUBLIC_API_URL`: Controls the backend target URL.
- **CRITICAL FORMAT RULE**: Every API utility in the frontend appends endpoint paths to `NEXT_PUBLIC_API_URL`. Therefore, `NEXT_PUBLIC_API_URL` **MUST include `/api` at the end**:
  - ✅ **Correct**: `https://tms-backend.koyeb.app/api`
  - ❌ **Incorrect**: `https://tms-backend.koyeb.app` (will cause `/students` instead of `/api/students`)

### 3.3 Fallback Handling
- All frontend API calls cleanly fallback to `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"`. Setting the env var in Vercel overrides all fallbacks across all pages.

### 3.4 Authentication Compatibility
- Uses standard JWT Bearer token authentication stored in `localStorage` (`tms_token`).
- Works seamlessly across different subdomains/domains (Vercel frontend communicating with Koyeb backend).

---

## 4. Docker Audit

### 4.1 Dockerfile Assessment
- `backend/Dockerfile` is multi-stage (`python:3.12-slim`), includes non-root security user `appuser`, exposes port 8000, and has an active healthcheck.
- **Requirement for Koyeb**: Koyeb can build directly using this `backend/Dockerfile`.
- **Requirement for Vercel**: Docker is **NOT required** for Vercel. Vercel automatically detects Next.js and builds using its native Node.js engine.

---

## 5. Security Audit

| Security Item | Audit Result | Action Needed |
|---|---|---|
| `.env` Files | Tracked in `.gitignore` — safe | None |
| Hardcoded Secrets | Default fallback `JWT_SECRET_KEY` in `config.py` | Must set strong secret in Koyeb env |
| Dev Utility Endpoints | `/api/data/seed-demo` and `/api/data/reset-db` are guarded by `require_development_mode` | Automatic 403 in `production` |
| CORS Configuration | Restricted via `CORS_ORIGINS` setting | Must set live Vercel domain |
| SQL Injection Protection | SQLAlchemy ORM & parameterized queries used everywhere | Safe |
| Data Exposure in Git | No `.db` files or real student data committed in repo | Safe |

---

## 6. Production Data Audit

- **Demo Data Protection**: When `APP_ENV=production`, `SEED_DEMO_DATA=False` is enforced, preventing dummy student/payment creation.
- **Dev Gating**: Developer tools tab in `/dashboard/data-management` displays environment badge (`PRODUCTION`) and disables developer reset options.

---

## 7. Deployment Compatibility Matrix

### 🐘 7.1 Neon PostgreSQL
- **Configuration Required**: Create a new project `tms-db` in Neon console and copy the connection string.
- **Code Changes Required**: Ensure the database connection URL is formatted with `postgresql+asyncpg://` scheme.
- **Environment Variables**:
  - `DATABASE_URL`: `postgresql+asyncpg://user:pass@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require`
- **Limitations / Risks**: Neon free tier offers 0.5 GB storage (more than sufficient for thousands of tuition student records).

### 🐍 7.2 Koyeb FastAPI Backend
- **Configuration Required**: Connect GitHub repository, set Root Directory to `backend`, choose Docker builder.
- **Code Changes Required**: Update database service to handle PostgreSQL connection URL and gracefully fallback SQLite-specific file operations.
- **Environment Variables**:
  - `APP_ENV`: `production`
  - `DEBUG`: `false`
  - `DATABASE_URL`: `postgresql+asyncpg://...`
  - `JWT_SECRET_KEY`: `[random-string]`
  - `CORS_ORIGINS`: `["https://tms-app.vercel.app"]`
- **Limitations / Risks**: Koyeb free nano instance has 512 MB RAM. Multi-worker FastAPI processes should run with `--workers 2` to fit well within memory limits.

### ⚡ 7.3 Vercel Next.js Frontend
- **Configuration Required**: Connect GitHub repository, set Root Directory to `frontend`, Framework Preset: Next.js.
- **Code Changes Required**: None (code is already production ready).
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `https://[your-koyeb-app].koyeb.app/api`
- **Limitations / Risks**: Ensure `NEXT_PUBLIC_API_URL` ends with `/api`.

---

## Recommended Code Fixes (Pre-Deployment Checklist)

To ensure zero errors on PostgreSQL launch:

1. **Fix SQLite PRAGMA in `src/main.py`**:
   - Wrap PRAGMA execution in `if "sqlite" in settings.DATABASE_URL:` so PostgreSQL startup logs stay completely clean.
2. **Fix `DATABASE_URL` Scheme Normalizer**:
   - Add automated conversion in `src/core/config.py` so `postgres://` or `postgresql://` automatically converts to `postgresql+asyncpg://`.
3. **Fix SQLite File Backup in `src/settings/service.py`**:
   - Make `trigger_db_backup` use the database-agnostic `BackupService` (JSON backup) when running on PostgreSQL.

---

> [!IMPORTANT]
> **Next Steps**: Review this audit report. Once approved, I will apply the 3 small compatibility fixes listed above so your app is 100% ready for deployment to Neon, Koyeb, and Vercel.
