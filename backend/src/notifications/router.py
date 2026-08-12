"""
Notification API routes.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.dependencies import get_current_user, get_db
from src.notifications.schemas import (
    MessageTemplateResponse,
    NotificationAnalytics,
    NotificationCreate,
    NotificationListResponse,
    NotificationResponse,
)
from src.notifications.service import NotificationService

router = APIRouter()


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notification history",
    description="Paginated notification history with optional filters.",
)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: str | None = Query(None),
    notification_type: str | None = Query(None),
    channel: str | None = Query(None),
    status: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return paginated list of notifications with optional filters."""
    service = NotificationService(db)
    items, total = await service.list_notifications(
        page=page,
        page_size=page_size,
        student_id=student_id,
        notification_type=notification_type,
        channel=channel,
        status=status,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    from src.notifications.schemas import NotificationResponse as NR
    return NotificationListResponse(
        items=[NR.model_validate(n) for n in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record notification event",
    description="Persist a notification event (e.g., WhatsApp message initiated).",
)
async def create_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a notification event to the database."""
    service = NotificationService(db)
    return await service.record_notification(
        student_id=data.student_id,
        student_name=data.student_name,
        parent_name=data.parent_name,
        parent_mobile=data.parent_mobile,
        notification_type=data.notification_type,
        message=data.message,
        channel=data.channel,
        status=data.status,
        receipt_number=data.receipt_number,
        metadata=data.metadata_,
    )


@router.get(
    "/templates",
    response_model=list[MessageTemplateResponse],
    summary="List message templates",
    description="Return all active reusable message templates.",
)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all message templates, seeding defaults if needed."""
    service = NotificationService(db)
    templates = await service.get_templates()
    return [MessageTemplateResponse.model_validate(t) for t in templates]


@router.get(
    "/analytics",
    response_model=NotificationAnalytics,
    summary="Notification analytics",
    description="Aggregate counts for receipts generated, WhatsApp shares, etc.",
)
async def get_notification_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return notification analytics."""
    service = NotificationService(db)
    data = await service.get_analytics()
    return NotificationAnalytics(**data)
