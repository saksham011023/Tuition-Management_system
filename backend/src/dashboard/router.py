"""
Dashboard API routes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.dependencies import get_current_user, get_db
from src.dashboard.schemas import DashboardResponse, DashboardStats, NotificationsResponse
from src.dashboard.service import DashboardService

router = APIRouter()


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full dashboard data including stats, charts, and activities."""
    service = DashboardService(db)
    return await service.get_dashboard()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get only the dashboard stat cards."""
    service = DashboardService(db)
    return await service.get_stats()


@router.get("/notifications", response_model=NotificationsResponse)
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get live notification alerts and recent activity for the notification center."""
    service = DashboardService(db)
    return await service.get_notifications()
