"""
Pydantic schemas for authentication endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ──────────────────────────────────────────────
# Request Schemas
# ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class RegisterRequest(BaseModel):
    """Registration request body."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class RefreshTokenRequest(BaseModel):
    """Refresh token request body."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Password reset request body."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation body."""
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)


# ──────────────────────────────────────────────
# Response Schemas
# ──────────────────────────────────────────────

class UserResponse(BaseModel):
    """User data in API responses."""
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    is_onboarded: bool = False
    phone: str | None = None
    profile_image: str | None = None
    signature_image: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic message response."""
    success: bool = True
    message: str

