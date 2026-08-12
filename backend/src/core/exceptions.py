"""
Custom exception classes and global exception handlers.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from src.core.config import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Custom Exception Classes
# ──────────────────────────────────────────────

class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str = "An unexpected error occurred",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class NotFoundException(AppException):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", identifier: str | None = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedException(AppException):
    """Authentication required or failed."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    """Access denied."""

    def __init__(self, message: str = "Access denied"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class ConflictException(AppException):
    """Resource conflict (e.g., duplicate email)."""

    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT)


class BadRequestException(AppException):
    """Invalid request data."""

    def __init__(self, message: str = "Bad request"):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────
# Global Exception Handlers
# ──────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        # Log server errors; client errors (4xx) are generally not actionable
        if exc.status_code >= 500:
            logger.error(
                "Application error: %s",
                exc.message,
                extra={"path": request.url.path, "method": request.method},
                exc_info=True,
            )
        else:
            logger.warning(
                "Client error [%s]: %s",
                exc.status_code,
                exc.message,
                extra={"path": request.url.path},
            )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                # Only expose internal detail in DEBUG mode
                "detail": exc.detail if settings.DEBUG else None,
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "Unhandled exception on %s %s",
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "Internal server error",
                # Only expose raw exception string in DEBUG mode
                "detail": str(exc) if settings.DEBUG else None,
            },
        )
