"""
Application configuration using Pydantic BaseSettings.
All environment variables are centralized here.
"""

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
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tms_db"

    # JWT
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

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


