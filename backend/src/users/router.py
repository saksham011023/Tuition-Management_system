"""
User management API routes.
"""

from fastapi import APIRouter, Depends

from src.auth.models import User
from src.auth.schemas import UserResponse
from src.core.dependencies import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get the current user's profile."""
    return UserResponse.model_validate(current_user)
