"""
Student Management API routes.
Provides full CRUD for students plus sub-record endpoints for payments,
attendance history, and test scores.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.dependencies import get_current_user, get_db
from src.core.exceptions import NotFoundException
from src.students.models import Attendance, Payment, TestScore
from src.students.repository import StudentRepository
from src.students.schemas import (
    AttendanceCreate,
    AttendanceResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    PaymentCreate,
    PaymentResponse,
    StudentCreate,
    StudentDetailResponse,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
    TestScoreCreate,
    TestScoreResponse,
)

router = APIRouter()

_NOT_FOUND_RESPONSE = {404: {"description": "Student not found"}}


@router.get(
    "",
    response_model=StudentListResponse,
    summary="List students",
    description=(
        "Return a paginated, searchable, and filterable list of students. "
        "Supports text search on name, parent name, and parent mobile. "
        "By default only active students are returned; pass include_inactive=true to include soft-deleted records."
    ),
    response_description="Paginated list of students",
)
async def list_students(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by name, parent name, or phone"),
    sort_by: str = Query("name", description="Column to sort by: name, joining_date, monthly_fee, created_at"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort direction"),
    class_name: str | None = Query(None, description="Filter by class/grade"),
    batch_id: str | None = Query(None, description="Filter by batch ID"),
    include_inactive: bool = Query(False, description="Include soft-deleted/inactive students"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List students with pagination, sorting, search, and filtering."""
    repo = StudentRepository(db)
    valid_sort_columns = ["name", "joining_date", "monthly_fee", "created_at"]
    if sort_by not in valid_sort_columns:
        sort_by = "name"

    students, total = await repo.list_students(
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        class_name=class_name,
        batch_id=batch_id,
        include_inactive=include_inactive,
    )

    total_pages = max(1, (total + page_size - 1) // page_size)

    return StudentListResponse(
        items=students,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create student",
    description="Create a new student record and optionally assign to batches.",
    response_description="The newly created student",
)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new student."""
    repo = StudentRepository(db)
    return await repo.create(data)


@router.post(
    "/check-duplicate",
    response_model=DuplicateCheckResponse,
    summary="Check for duplicate students",
    description=(
        "Check whether a student with the same phone number or same name+class already exists. "
        "Returns a list of potential duplicates. Does NOT create any record."
    ),
)
async def check_duplicate(
    data: DuplicateCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check for potential duplicate students before creating or updating."""
    repo = StudentRepository(db)
    duplicates = await repo.find_duplicates(
        name=data.name,
        class_name=data.class_name,
        parent_mobile=data.parent_mobile,
        exclude_id=data.exclude_id,
    )
    return DuplicateCheckResponse(
        has_duplicates=len(duplicates) > 0,
        duplicates=list(duplicates),
    )


@router.get(
    "/{id}",
    response_model=StudentDetailResponse,
    summary="Get student",
    description="Retrieve full details of a student including batches, payments, attendance, and test scores.",
    response_description="Student detail with all relationships",
    responses=_NOT_FOUND_RESPONSE,
)
async def get_student(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full details of a student by ID."""
    repo = StudentRepository(db)
    student = await repo.get_by_id(id)
    if not student:
        raise NotFoundException(resource="Student", identifier=id)
    return student


@router.put(
    "/{id}",
    response_model=StudentResponse,
    summary="Update student",
    description="Update student details. Only fields included in the request body are modified.",
    response_description="Updated student record",
    responses=_NOT_FOUND_RESPONSE,
)
async def update_student(
    id: str,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update student details."""
    repo = StudentRepository(db)
    student = await repo.get_by_id(id)
    if not student:
        raise NotFoundException(resource="Student", identifier=id)
    return await repo.update(student, data)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete student",
    description=(
        "Marks the student as inactive (soft-delete). "
        "Historical records (fees, attendance, payments) are preserved. "
        "Use POST /{id}/restore to reactivate."
    ),
    responses=_NOT_FOUND_RESPONSE,
)
async def delete_student(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a student by ID (sets is_active=False)."""
    repo = StudentRepository(db)
    student = await repo.get_by_id(id)
    if not student:
        raise NotFoundException(resource="Student", identifier=id)
    await repo.soft_delete(student)


@router.post(
    "/{id}/restore",
    response_model=StudentResponse,
    summary="Restore student",
    description="Reactivate a previously soft-deleted student.",
    responses=_NOT_FOUND_RESPONSE,
)
async def restore_student(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restore an inactive student by ID."""
    repo = StudentRepository(db)
    student = await repo.get_by_id(id, include_inactive=True)
    if not student:
        raise NotFoundException(resource="Student", identifier=id)
    return await repo.restore(student)


# ──────────────────────────────────────────
# Student Sub-records endpoints
# ──────────────────────────────────────────

@router.post(
    "/{id}/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record payment (legacy)",
    description=(
        "Record a simple payment history entry on a student. "
        "For the full fee ledger with receipt generation, use POST /api/fees/{id}/pay."
    ),
    response_description="Created payment record",
    responses=_NOT_FOUND_RESPONSE,
)
async def record_payment(
    id: str,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a fee payment history entry for a student."""
    repo = StudentRepository(db)
    student = await repo.get_by_id(id)
    if not student:
        raise NotFoundException(resource="Student", identifier=id)

    payment = Payment(
        amount=data.amount,
        date=data.date,
        status=data.status,
        method=data.method,
        remarks=data.remarks,
    )
    return await repo.add_payment(student, payment)


@router.post(
    "/{id}/attendance",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record attendance (legacy)",
    description=(
        "Record a single attendance entry on a student. "
        "For batch-level attendance marking, use POST /api/attendance/mark."
    ),
    response_description="Created attendance record",
    responses=_NOT_FOUND_RESPONSE,
)
async def record_attendance(
    id: str,
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record daily attendance status for a student."""
    repo = StudentRepository(db)
    student = await repo.get_by_id(id)
    if not student:
        raise NotFoundException(resource="Student", identifier=id)

    attendance = Attendance(
        date=data.date,
        status=data.status,
        remarks=data.remarks,
    )
    return await repo.add_attendance(student, attendance)


@router.post(
    "/{id}/test-scores",
    response_model=TestScoreResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record test score",
    description="Record an academic test score entry for a student.",
    response_description="Created test score record",
    responses=_NOT_FOUND_RESPONSE,
)
async def record_test_score(
    id: str,
    data: TestScoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record an academic test score/marks entry for a student."""
    repo = StudentRepository(db)
    student = await repo.get_by_id(id)
    if not student:
        raise NotFoundException(resource="Student", identifier=id)

    score = TestScore(
        test_name=data.test_name,
        date=data.date,
        max_marks=data.max_marks,
        marks_obtained=data.marks_obtained,
        remarks=data.remarks,
    )
    return await repo.add_test_score(student, score)
