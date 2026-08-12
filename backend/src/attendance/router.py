"""
Attendance Management API routes.
Provides sheet marking, sheet templates retrieval, stats checklists, trends aggregation, and search logs.
"""

from datetime import date as datetime_date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.attendance.repository import AttendanceRepository
from src.attendance.schemas import (
    AttendanceResponse,
    AttendanceTrends,
    BatchAttendanceReport,
    BatchAttendanceSubmit,
    StudentAttendanceStats,
)
from src.attendance.service import AttendanceService
from src.auth.models import User
from src.core.dependencies import get_current_user, get_db

router = APIRouter()


@router.post("", response_model=BatchAttendanceReport, status_code=status.HTTP_201_CREATED)
async def submit_attendance(
    data: BatchAttendanceSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark or update student attendance sheet for a batch and date."""
    service = AttendanceService(db)
    return await service.submit_attendance(data)


@router.get("/batch/{batch_id}", response_model=BatchAttendanceReport)
async def get_attendance_sheet(
    batch_id: str,
    date: datetime_date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve marked attendance records or generate blank sheet for today."""
    if not date:
        date = datetime_date.today()
    service = AttendanceService(db)
    return await service.get_attendance_sheet(batch_id, date)


@router.get("/student/{student_id}/stats", response_model=StudentAttendanceStats)
async def get_student_attendance_stats(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get summarized attendance rate statistics for a student."""
    service = AttendanceService(db)
    return await service.get_student_stats(student_id)


@router.get("/trends", response_model=AttendanceTrends)
async def get_attendance_trends(
    view: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start_date: datetime_date | None = Query(None),
    end_date: datetime_date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate daily, weekly, or monthly attendance trends."""
    service = AttendanceService(db)
    return await service.get_trends(view=view, start_date=start_date, end_date=end_date)


@router.get("/search")
async def search_attendance(
    student_name: str | None = Query(None),
    batch_id: str | None = Query(None),
    status: str | None = Query(None, pattern="^(present|absent|leave)$"),
    start_date: datetime_date | None = Query(None),
    end_date: datetime_date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search paginated attendance logs."""
    repo = AttendanceRepository(db)
    records, total = await repo.search_attendance_records(
        student_name=student_name,
        batch_id=batch_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )

    items = [
        AttendanceResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=r.student.name if r.student else None,
            batch_id=r.batch_id,
            date=r.date,
            status=r.status,
            remarks=r.remarks,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in records
    ]

    total_pages = max(1, (total + page_size - 1) // page_size)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
