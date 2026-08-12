"""
User repository — data access layer for User model.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User


class UserRepository:
    """Handles all database operations for the User model."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> User | None:
        """Get a user by their ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Get a user by their email address."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        """Create a new user."""
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update(self, user: User) -> User:
        """Update an existing user."""
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def exists_by_email(self, email: str) -> bool:
        """Check if a user with the given email exists."""
        result = await self.db.execute(select(User.id).where(User.email == email))
        return result.scalar_one_or_none() is not None
