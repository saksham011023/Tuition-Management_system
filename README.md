<<<<<<< HEAD
# Tuition Management System (TMS)

A production-grade, highly responsive Tuition Management System (TMS) designed for teachers and academy administrators. Built on a modern full-stack architecture featuring a Next.js App Router frontend and a FastAPI backend with asynchronous database querying.

---

## Key Features

- **📊 Comprehensive Dashboard**: Multi-metric collection metrics, attendance percentages, dynamic alerts panel, and a recent activities ledger.
- **🎓 Student Management**: Add, update, view, and delete students with multi-batch enrollments, school tags, joining dates, and internal remarks.
- **💰 Asynchronous Payment Ledger**: Dynamic invoice creation, partial payment transaction posting, discount allocations, extra charges support, and sequential receipts generation (`TMS-YYYY-NNNN`).
- **📅 Batch Attendance Marker**: Dynamic class sheets to log present, absent, or leave statuses, calendar view, batch attendance stats, and running percentage timelines.
- **📈 Custom Report Generators**: Filterable Fee Collection, Outstanding Balances, Attendance Trends, Student Performance, and Batch Summaries with native data previews.
- **🔍 Keyboard Command Palette**: Instant modal-driven search (Ctrl+K / Cmd+K) querying students, parents, class tags, mobile phone numbers, and invoice receipts.
- **🔔 Live Notifications Drawer**: High-priority dashboard warnings for unpaid invoices, today's batch schedule, new admissions, and recent transactions.
- **⚙️ Configurable Settings Panel**: Complete profile updates, institute formatting, default tuition variables, active academic sessions, theme selection, and manual SQLite database backup copies & export downloads.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router, TailwindCSS, TypeScript) |
| **State & Navigation** | React Context, Custom Custom Hooks |
| **Backend** | FastAPI (Python 3.12, Asynchronous Execution) |
| **Database** | PostgreSQL 16 (Production) / SQLite (Local Development) |
| **ORM & Migrations** | SQLAlchemy 2.0 (asyncio) / Alembic |
| **Containers & Orchestration** | Docker / Docker Compose (Multi-stage builds) |
| **Logging & Security** | Python Logging (JSON formatted), PyJWT, Passlib (Bcrypt) |

---

## Quick Start (Docker Compose — Recommended)

Start all services (Next.js, FastAPI, PostgreSQL) in a production-ready environment with a single command:

```bash
# 1. Clone the repository and configure environment variables
cp .env.example .env

# 2. Build and launch the container cluster
docker-compose up --build
```

### Access Ports
- **Web UI Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**:
  - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
  - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Local Development (Manual Setup)

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -e .
uvicorn src.main:app --reload --port 8000
```

### 2. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
```

---

## Configuration Variables (`.env`)

Refer to the [.env.example](file:///C:/Users/SAKSHAM/Desktop/TMS/.env.example) file for descriptions of all key-value configurations:
- `DATABASE_URL`: Asynchronous DB connection URI.
- `JWT_SECRET_KEY`: Secret string securing authentication signatures.
- `LOG_LEVEL`: Level of verbosity for the backend console/JSON output.
- `BACKUP_DIR`: Directory where SQLite backup snapshots are stored.

---

## Production Security Checklist

1. Change `JWT_SECRET_KEY` from default dev keys in production.
2. Set `DEBUG` to `false` and `APP_ENV` to `production` (removes exception trace logs from JSON API responses).
3. Secure PostgreSQL port configurations (`5432`) inside production firewalls.
