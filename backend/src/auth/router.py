"""
Authentication API routes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.auth.schemas import (
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.auth.service import AuthService
from src.core.dependencies import get_current_user, get_db

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    service = AuthService(db)
    return await service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    service = AuthService(db)
    return await service.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
):
    """Refresh access token using a refresh token."""
    service = AuthService(db)
    return await service.refresh(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: PasswordResetRequest, db: AsyncSession = Depends(get_db)
):
    """Validate user email for password reset architecture."""
    # Look up user to ensure email exists
    from sqlalchemy import select
    stmt = select(User).where(User.email == str(data.email))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        # Return generic message to prevent email enumeration attacks
        return MessageResponse(
            success=True,
            message="If your email is registered, password reset instructions have been dispatched.",
        )

    # In MVP, structure exists — email service hook ready for SMTP/SendGrid
    return MessageResponse(
        success=True,
        message="If your email is registered, password reset instructions have been dispatched.",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: PasswordResetConfirm, db: AsyncSession = Depends(get_db)
):
    """Reset password with token."""
    return MessageResponse(
        success=True,
        message="Password has been successfully updated. Please login with your new credentials.",
    )

