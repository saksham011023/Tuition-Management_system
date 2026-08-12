"""
FastAPI application entry point.
Configures middleware, routers, and application lifespan.
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.attendance.router import router as attendance_router
from src.auth.router import router as auth_router
from src.batches.router import router as batch_router
from src.core.config import settings
from src.core.exceptions import register_exception_handlers
from src.core.logging_config import get_logger, setup_logging
from src.dashboard.router import router as dashboard_router
from src.data_management.router import router as data_management_router
from src.activity_log.router import router as activity_log_router
from src.db.base import Base
from src.db.session import engine
from src.fees.router import router as fees_router
from src.notifications.router import router as notifications_router
from src.reports.router import router as reports_router
from src.search.router import router as search_router
from src.settings.router import router as settings_router
from src.students.router import router as student_router
from src.users.router import router as users_router


# Initialize logging before anything else
setup_logging()
logger = get_logger(__name__)


async def seed_initial_batches():
    """Ensure the database always contains the 2 requested default batches (3 PM to 5 PM and 5 PM to 7 PM)."""
    from sqlalchemy import select
    from src.db.session import async_session_factory
    from src.students.models import Batch

    async with async_session_factory() as db:
        res = await db.execute(select(Batch))
        existing_batches = res.scalars().all()
        existing_names = [b.name for b in existing_batches]

        batch_1_name = "Batch 1 (03:00 PM - 05:00 PM)"
        batch_2_name = "Batch 2 (05:00 PM - 07:00 PM)"

        if batch_1_name not in existing_names:
            db.add(
                Batch(
                    name=batch_1_name,
                    subject="All Subjects",
                    teacher="Academy Teacher",
                    days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    timing="03:00 PM - 05:00 PM",
                    max_students=30,
                    description="Daily afternoon batch from 3:00 PM to 5:00 PM",
                )
            )

        if batch_2_name not in existing_names:
            db.add(
                Batch(
                    name=batch_2_name,
                    subject="All Subjects",
                    teacher="Academy Teacher",
                    days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    timing="05:00 PM - 07:00 PM",
                    max_students=30,
                    description="Daily evening batch from 5:00 PM to 7:00 PM",
                )
            )

        # Cleanup any legacy dummy batches if present
        dummy_names = [
            "JEE Advanced — Batch A",
            "NEET — Batch B",
            "Foundation — Class 10",
            "JEE Main — Batch C",
        ]
        for b in existing_batches:
            if b.name in dummy_names:
                await db.delete(b)

        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info(
        "Starting %s [env=%s, debug=%s]",
        settings.APP_NAME,
        settings.APP_ENV,
        settings.DEBUG,
    )
    # Import all models to ensure they are registered with Base.metadata
    from src.notifications.models import MessageTemplate, Notification  # noqa: F401
    from src.activity_log.models import ActivityLog  # noqa: F401

    # Startup: create tables (use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created successfully")

    # Ensure SQLite users table columns exist
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            res = await conn.execute(text("PRAGMA table_info(users)"))
            cols = [r[1] for r in res.fetchall()]
            if "is_onboarded" not in cols:
                await conn.execute(text("ALTER TABLE users ADD COLUMN is_onboarded BOOLEAN DEFAULT 0 NOT NULL"))
            if "phone" not in cols:
                await conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
            if "profile_image" not in cols:
                await conn.execute(text("ALTER TABLE users ADD COLUMN profile_image VARCHAR(500)"))
            if "signature_image" not in cols:
                await conn.execute(text("ALTER TABLE users ADD COLUMN signature_image VARCHAR(500)"))
    except Exception as e:
        logger.warning("Auto migration check (users): %s", e)

    # Ensure is_demo columns exist (added in this release)
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            for table in ("students", "payments", "attendance", "test_scores"):
                res = await conn.execute(text(f"PRAGMA table_info({table})"))
                cols = [r[1] for r in res.fetchall()]
                if "is_demo" not in cols:
                    await conn.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN is_demo BOOLEAN DEFAULT 0 NOT NULL")
                    )
    except Exception as e:
        logger.warning("Auto migration check (is_demo): %s", e)

    # Seed default message templates
    try:
        from src.db.session import async_session_factory
        from src.notifications.repository import NotificationRepository
        async with async_session_factory() as db:
            repo = NotificationRepository(db)
            await repo.seed_default_templates()
            await db.commit()
        logger.info("Default message templates seeded successfully")
    except Exception as e:
        logger.warning("Could not seed message templates: %s", e)
    
    # Seed initial 2 batches
    try:
        await seed_initial_batches()
        logger.info("Verified initial 2 batches (3 PM - 5 PM, 5 PM - 7 PM)")
    except Exception as e:
        logger.warning("Could not seed initial batches: %s", e)

    yield
    # Shutdown: dispose engine
    await engine.dispose()
    logger.info("Database engine disposed. Shutdown complete.")


# ──────────────────────────────────────────────
# OpenAPI Metadata
# ──────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "A production-ready REST API for managing students, batches, fees, attendance, "
        "reports, and settings for a tuition centre. "
        "All endpoints require JWT Bearer authentication unless otherwise stated."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "TMS Support",
        "email": "support@tms.local",
    },
    license_info={
        "name": "Private — All rights reserved",
    },
    openapi_tags=[
        {"name": "Authentication", "description": "Login, refresh tokens, and logout."},
        {"name": "Users", "description": "User profile management."},
        {"name": "Dashboard", "description": "Overview statistics and recent activity."},
        {"name": "Students", "description": "Full CRUD for student records."},
        {"name": "Batches", "description": "Class batch management."},
        {"name": "Fees", "description": "Fee generation, payment ledger, and receipts."},
        {"name": "Attendance", "description": "Mark and query batch attendance."},
        {"name": "Notifications", "description": "Parent notifications, receipt history, and message templates."},
        {"name": "Reports", "description": "Exportable PDF/Excel reports."},
        {"name": "Search", "description": "Global cross-module search."},
        {"name": "Settings", "description": "Application and profile configuration."},
        {"name": "Health", "description": "Service health and readiness probes."},
    ],
    lifespan=lifespan,
)

# ──────────────────────────────────────────────
# Middleware
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log every incoming request with method, path, status, and duration."""
    start = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
        return response
    except Exception:
        raise
    finally:
        duration_ms = (time.perf_counter() - start) * 1000
        status_code = response.status_code if response else 500
        log_fn = logger.warning if status_code >= 400 else logger.info
        log_fn(
            "%s %s -> %s (%.1f ms)",
            request.method,
            request.url.path,
            status_code,
            duration_ms,
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 1),
            },
        )


# ──────────────────────────────────────────────
# Exception Handlers
# ──────────────────────────────────────────────

register_exception_handlers(app)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(student_router, prefix="/api/students", tags=["Students"])
app.include_router(batch_router, prefix="/api/batches", tags=["Batches"])
app.include_router(fees_router, prefix="/api/fees", tags=["Fees"])
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
app.include_router(search_router, prefix="/api/search", tags=["Search"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(data_management_router, prefix="/api/data", tags=["Data Management"])
app.include_router(activity_log_router, prefix="/api/activity-log", tags=["Activity Log"])



# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.get(
    "/api/health",
    tags=["Health"],
    summary="Health check",
    description="Returns service health status. Used by Docker healthcheck and load balancers.",
    response_description="Service is healthy",
)
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.APP_NAME, "version": "1.0.0"}
