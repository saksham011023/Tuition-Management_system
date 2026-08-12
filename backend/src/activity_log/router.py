"""
Activity Log API routes.
Available in both development and production.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.activity_log.repository import ActivityLogRepository
from src.activity_log.schemas import ActivityLogListResponse
from src.auth.models import User
from src.core.dependencies import get_current_user, get_db

router = APIRouter()


@router.get(
    "",
    response_model=ActivityLogListResponse,
    summary="List activity log",
    description="Retrieve a paginated audit trail of all significant actions performed in the system.",
)
async def list_activity_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: str | None = Query(None, description="Filter by action type"),
    entity_type: str | None = Query(None, description="Filter by entity type"),
    search: str | None = Query(None, description="Search query filter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityLogListResponse:
    """Return paginated activity log entries."""
    repo = ActivityLogRepository(db)
    logs, total = await repo.list_logs(
        page=page,
        page_size=page_size,
        action_filter=action,
        entity_type_filter=entity_type,
        search=search,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return ActivityLogListResponse(
        items=list(logs),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
