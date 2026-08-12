"""
Pydantic schemas for user-related endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserUpdateRequest(BaseModel):
    """Update user profile request."""
    name: str | None = Field(None, min_length=2, max_length=255)
    email: EmailStr | None = None


class UserListResponse(BaseModel):
    """Paginated list of users."""
    items: list["UserItem"]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserItem(BaseModel):
    """User item in list responses."""
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
