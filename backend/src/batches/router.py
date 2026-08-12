"""
Batch Management API routes.
Provides full CRUD plus student assignment/removal endpoints.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.batches.repository import BatchRepository
from src.batches.schemas import (
    BatchCreate,
    BatchDetailResponse,
    BatchListResponse,
    BatchResponse,
    BatchStudentAssignment,
    BatchUpdate,
)
from src.batches.service import BatchService
from src.core.dependencies import get_current_user, get_db

router = APIRouter()


@router.get("", response_model=BatchListResponse)
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List batches with pagination, search, and sorting."""
    repo = BatchRepository(db)
    batches, total = await repo.list_batches(
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = max(1, (total + page_size - 1) // page_size)

    items = [
        BatchResponse(
            id=b.id,
            name=b.name,
            subject=b.subject,
            teacher=b.teacher,
            days=b.days,
            timing=b.timing,
            max_students=b.max_students,
            description=b.description,
            student_count=len(b.students) if b.students else 0,
            created_at=b.created_at,
            updated_at=b.updated_at,
        )
        for b in batches
    ]

    return BatchListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    data: BatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new batch."""
    service = BatchService(db)
    return await service.create_batch(data)


@router.get("/{batch_id}", response_model=BatchDetailResponse)
async def get_batch(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full details of a batch including enrolled students and attendance summary."""
    service = BatchService(db)
    return await service.get_batch_detail(batch_id)


@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(
    batch_id: str,
    data: BatchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update batch details."""
    service = BatchService(db)
    return await service.update_batch(batch_id, data)


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a batch by ID."""
    service = BatchService(db)
    await service.delete_batch(batch_id)


@router.post("/{batch_id}/students", response_model=BatchDetailResponse)
async def assign_students(
    batch_id: str,
    data: BatchStudentAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign students to a batch. Validates capacity constraints."""
    service = BatchService(db)
    return await service.assign_students(batch_id, data.student_ids)


@router.delete("/{batch_id}/students", response_model=BatchDetailResponse)
async def remove_students(
    batch_id: str,
    data: BatchStudentAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove students from a batch."""
    service = BatchService(db)
    return await service.remove_students(batch_id, data.student_ids)
