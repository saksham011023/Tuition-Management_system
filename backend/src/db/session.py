"""
Async database session and engine configuration.
Tuned connection pool settings for production use.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.config import settings

# ──────────────────────────────────────────────
# Engine Configuration
# ──────────────────────────────────────────────

engine_kwargs: dict = {
    "echo": False,          # Never echo SQL in production; use DEBUG-level logging instead
    "pool_pre_ping": True,  # Verify connections are alive before using them
}

if "postgresql" in settings.DATABASE_URL:
    engine_kwargs.update(
        pool_size=10,           # Number of persistent connections in the pool
        max_overflow=20,        # Extra connections allowed under load
        pool_recycle=3600,      # Recycle connections after 1 hour to prevent stale conns
        pool_timeout=30,        # Wait up to 30s for a connection before raising
    )
elif "sqlite" in settings.DATABASE_URL:
    # SQLite does not support connection pooling; use StaticPool or NullPool
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

# ──────────────────────────────────────────────
# Session Factory
# ──────────────────────────────────────────────

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
