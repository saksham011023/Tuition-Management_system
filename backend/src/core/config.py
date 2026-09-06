"""
Application configuration using Pydantic BaseSettings.
All environment variables are centralized here.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Tuition Management System"
    APP_ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Backup
    BACKUP_DIR: str = "./backups"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./tms.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str | None) -> str:
        """
        Normalize PostgreSQL connection URL to use asyncpg driver.

        Handles:
        - postgres:// → postgresql+asyncpg://
        - postgresql:// → postgresql+asyncpg://
        - postgresql+psycopg2:// → postgresql+asyncpg://
        - Strips psycopg2-style params (sslmode, channel_binding) incompatible with asyncpg
        - Adds ssl=require when SSL was requested
        """
        if not v:
            return "sqlite+aiosqlite:///./tms.db"

        # Skip SQLite — no changes needed
        if "sqlite" in v:
            return v

        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

        # Normalize scheme
        for old, new in [
            ("postgresql+psycopg2://", "postgresql+asyncpg://"),
            ("postgresql://", "postgresql+asyncpg://"),
            ("postgres://", "postgresql+asyncpg://"),
        ]:
            if v.startswith(old):
                v = v.replace(old, "postgresql+asyncpg://", 1)
                break

        # Parse the URL to fix query params
        parsed = urlparse(v)
        query_params = parse_qs(parsed.query, keep_blank_values=True)

        # Check if SSL was requested via psycopg2-style param
        ssl_requested = query_params.pop("sslmode", [None])[0] in ("require", "verify-ca", "verify-full")
        # Remove channel_binding — asyncpg does not support it
        query_params.pop("channel_binding", None)

        # asyncpg uses ?ssl=require (not sslmode)
        if ssl_requested:
            query_params["ssl"] = ["require"]

        new_query = urlencode(query_params, doseq=True)
        normalized = urlunparse(parsed._replace(query=new_query))
        return normalized

    # JWT
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://tms-frontend-asde.onrender.com",
    ]

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @field_validator("PORT", mode="before")
    @classmethod
    def validate_port(cls, v: object) -> int:
        """Ensure PORT is parsed as an integer, defaulting to 8000 if invalid."""
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.isdigit():
                return int(v_str)
        return 8000

    # Development / Demo Data
    # Set SEED_DEMO_DATA=true in .env to auto-seed on startup (dev only)
    SEED_DEMO_DATA: bool = False
    # Enable dev-only API routes (seed, clear demo, etc.) — auto-derived from APP_ENV
    ENABLE_DEV_ROUTES: bool = True

    @property
    def IS_DEVELOPMENT(self) -> bool:  # noqa: N802
        """True when running in development mode."""
        return self.APP_ENV.lower() in ("development", "dev", "local")

    @property
    def IS_STAGING(self) -> bool:  # noqa: N802
        """True when running in staging mode."""
        return self.APP_ENV.lower() in ("staging", "stage")

    @property
    def IS_PRODUCTION(self) -> bool:  # noqa: N802
        """True when running in production mode."""
        return self.APP_ENV.lower() in ("production", "prod")


settings = Settings()


