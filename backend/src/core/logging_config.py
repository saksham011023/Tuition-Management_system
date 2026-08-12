"""
Structured logging configuration for the TMS application.
Provides a consistent, production-ready logging setup with JSON output in
non-debug environments and colored console output in development.
"""

import logging
import sys
from datetime import UTC, datetime

from src.core.config import settings

# ──────────────────────────────────────────────
# JSON Formatter (Production)
# ──────────────────────────────────────────────

class JSONFormatter(logging.Formatter):
    """Emit log records as single-line JSON for structured log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        import json

        log_entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Attach exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Attach any extra fields
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            ):
                log_entry[key] = value

        return json.dumps(log_entry, default=str)


# ──────────────────────────────────────────────
# Console Formatter (Development)
# ──────────────────────────────────────────────

class ConsoleFormatter(logging.Formatter):
    """Human-readable colored console formatter for development."""

    COLORS = {
        "DEBUG": "\033[36m",    # Cyan
        "INFO": "\033[32m",     # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",    # Red
        "CRITICAL": "\033[35m", # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        timestamp = datetime.now(UTC).strftime("%H:%M:%S")
        level = f"{color}{record.levelname:<8}{self.RESET}"
        location = f"{record.name}:{record.lineno}"
        return f"{timestamp} {level} {location} — {record.getMessage()}"


# ──────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────

def setup_logging() -> None:
    """
    Configure the root logger and silence noisy third-party loggers.
    Call once at application startup.
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)

    if settings.DEBUG:
        handler.setFormatter(ConsoleFormatter())
    else:
        handler.setFormatter(JSONFormatter())

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Silence noisy libraries
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # In debug mode, show SQLAlchemy queries
    if settings.DEBUG:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger.

    Usage::

        from src.core.logging_config import get_logger
        logger = get_logger(__name__)
        logger.info("Processing request", extra={"student_id": sid})
    """
    return logging.getLogger(name)
