"""
Authentication business logic service.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.auth.repository import UserRepository
from src.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from src.core.exceptions import ConflictException, UnauthorizedException
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    """Authentication business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> TokenResponse:
        """Register a new user and return tokens."""
        # Check if email already exists
        if await self.repo.exists_by_email(data.email):
            raise ConflictException(message="A user with this email already exists")

        # Create user
        user = User(
            email=data.email,
            name=data.name,
            hashed_password=hash_password(data.password),
        )
        user = await self.repo.create(user)

        # Generate tokens
        token_data = {"sub": user.id, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserResponse.model_validate(user),
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate user and return tokens."""
        user = await self.repo.get_by_email(data.email)

        if user is None or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedException(message="Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException(message="Account is deactivated")

        # Generate tokens
        token_data = {"sub": user.id, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserResponse.model_validate(user),
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using a valid refresh token."""
        payload = decode_token(refresh_token)

        if payload is None or payload.get("type") != "refresh":
            raise UnauthorizedException(message="Invalid or expired refresh token")

        user_id = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException(message="Invalid token payload")

        user = await self.repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise UnauthorizedException(message="User not found or inactive")

        # Generate new tokens
        token_data = {"sub": user.id, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserResponse.model_validate(user),
        )
