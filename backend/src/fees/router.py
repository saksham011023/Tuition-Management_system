"""
Fee Management API routes.
Provides ledger endpoints: monthly generation, transaction ledger, timeline, receipts, and reporting.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.dependencies import get_current_user, get_db
from src.fees.repository import FeeRepository
from src.fees.schemas import (
    DailySummary,
    FeeRecordDetailResponse,
    FeeRecordListResponse,
    FeeRecordResponse,
    FeeRecordUpdate,
    FeeTransactionCreate,
    FeeTransactionResponse,
    GenerateFeesRequest,
    GenerateFeesResponse,
    MonthlyCollectionReport,
    PendingFeeItem,
    StudentFeeTimeline,
)
from src.fees.service import FeeService

router = APIRouter()

_NOT_FOUND_RESPONSE = {404: {"description": "Fee record not found"}}


@router.post(
    "/generate",
    response_model=GenerateFeesResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate monthly fees",
    description=(
        "Auto-generate fee obligation records for all active students (or a selected subset) "
        "for the given month. Skips students who already have a record for that month."
    ),
    response_description="Summary of generated and skipped fee records",
)
async def generate_monthly_fees(
    data: GenerateFeesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Auto-generate fee obligations for all active students or selected student list."""
    service = FeeService(db)
    return await service.generate_monthly_fees(month=data.month, student_ids=data.student_ids)


@router.get(
    "",
    response_model=FeeRecordListResponse,
    summary="List fee records",
    description=(
        "Return a paginated list of fee records with optional filters. "
        "Status is computed dynamically from the payment ledger (pending/partially_paid/paid)."
    ),
    response_description="Paginated fee records with computed payment status",
)
async def list_fee_records(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Records per page"),
    student_id: str | None = Query(None, description="Filter by student ID"),
    month: str | None = Query(None, description="Filter by month in YYYY-MM format"),
    status: str | None = Query(None, pattern="^(pending|partially_paid|paid)$", description="Filter by payment status"),
    search: str | None = Query(None, description="Search by student name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List fee records with pagination, filtering, and text search on student name."""
    repo = FeeRepository(db)
    records, total = await repo.list_fee_records(
        page=page,
        page_size=page_size,
        student_id=student_id,
        month=month,
        status=status,
        search=search,
    )

    items = []
    service = FeeService(db)
    for r in records:
        paid_amount, balance, computed_status = service.compute_financial_status(r)
        items.append(
            FeeRecordResponse(
                id=r.id,
                student_id=r.student_id,
                student_name=r.student.name if r.student else None,
                month=r.month,
                year=r.year,
                month_num=r.month_num,
                base_amount=r.base_amount,
                discount=r.discount,
                discount_reason=r.discount_reason,
                extra_charges=r.extra_charges,
                extra_charges_reason=r.extra_charges_reason,
                net_amount=r.net_amount,
                due_date=r.due_date,
                notes=r.notes,
                created_at=r.created_at,
                updated_at=r.updated_at,
                paid_amount=paid_amount,
                balance=balance,
                status=computed_status,
            )
        )

    total_pages = max(1, (total + page_size - 1) // page_size)

    return FeeRecordListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/daily-summary",
    response_model=DailySummary,
    summary="Daily collection summary",
    description="Aggregate today's (or a given date's) collection totals by payment mode.",
)
async def get_daily_summary(
    date: str | None = Query(None, description="Date in YYYY-MM-DD format (defaults to today)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get daily payment collection summary."""
    from datetime import date as date_type
    target_date = None
    if date:
        try:
            target_date = date_type.fromisoformat(date)
        except ValueError:
            pass
    service = FeeService(db)
    return await service.get_daily_summary(target_date)


@router.get(
    "/pending",
    response_model=list[PendingFeeItem],
    summary="Search pending fees",
    description="Return all fee records that are not yet fully paid, with optional search and month filters.",
    response_description="List of outstanding fee items",
)
async def search_pending_fees(
    search: str | None = Query(None, description="Search by student name or phone"),
    month: str | None = Query(None, description="Filter by month in YYYY-MM format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search all outstanding/unpaid fee records."""
    service = FeeService(db)
    return await service.get_pending_fees(search=search, month=month)


@router.get(
    "/report/{month}",
    response_model=MonthlyCollectionReport,
    summary="Monthly collection report",
    description=(
        "Aggregate financial collection totals, pending amounts, and payment mode breakdowns "
        "for a given month (format: YYYY-MM)."
    ),
    response_description="Monthly financial summary with mode breakdown",
)
async def get_monthly_report(
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate financial collection totals and mode breakdowns for a month (YYYY-MM)."""
    service = FeeService(db)
    return await service.get_monthly_report(month)


@router.get(
    "/student/{student_id}/timeline",
    response_model=StudentFeeTimeline,
    summary="Student fee timeline",
    description="Retrieve the complete billing history and running outstanding balance for a student.",
    response_description="Chronological fee records with running balance",
    responses={404: {"description": "Student not found"}},
)
async def get_student_fee_timeline(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full billing chronological history and running outstanding balances of a student."""
    service = FeeService(db)
    return await service.get_student_timeline(student_id)


@router.get(
    "/receipt/{receipt_number}",
    response_model=FeeTransactionResponse,
    summary="Get receipt",
    description="Look up a payment receipt by its receipt number (e.g., TMS-2025-0001).",
    response_description="Payment transaction details",
    responses={404: {"description": "Receipt not found"}},
)
async def get_receipt(
    receipt_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find a specific payment receipt details by receipt number."""
    service = FeeService(db)
    return await service.get_receipt(receipt_number)


@router.get(
    "/{id}",
    response_model=FeeRecordDetailResponse,
    summary="Get fee record",
    description="Retrieve a single fee record with full transaction ledger history.",
    response_description="Fee record with all payment transactions",
    responses=_NOT_FOUND_RESPONSE,
)
async def get_fee_record(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single fee record details including its transactions."""
    service = FeeService(db)
    return await service.get_fee_record_detail(id)


@router.put(
    "/{id}",
    response_model=FeeRecordResponse,
    summary="Update fee record",
    description=(
        "Update discounts or extra charges on a fee record. "
        "The net_amount is automatically recalculated: base - discount + extra_charges."
    ),
    response_description="Updated fee record with recalculated net amount",
    responses=_NOT_FOUND_RESPONSE,
)
async def update_fee_record(
    id: str,
    data: FeeRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update discounts/extra charges of a record and recalculate balance."""
    service = FeeService(db)
    return await service.update_fee_record(id, data)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete fee record",
    description="Delete a fee record and all its associated payment transactions.",
    responses=_NOT_FOUND_RESPONSE,
)
async def delete_fee_record(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a fee record."""
    service = FeeService(db)
    await service.delete_fee_record(id)


@router.post(
    "/{id}/pay",
    response_model=FeeRecordDetailResponse,
    summary="Record payment",
    description=(
        "Record a payment transaction against a fee record. "
        "Supports partial payments (amount < balance), full payments, and overpayments. "
        "Automatically generates a unique receipt number."
    ),
    response_description="Updated fee record with the new transaction in the ledger",
    responses=_NOT_FOUND_RESPONSE,
)
async def record_payment(
    id: str,
    data: FeeTransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a payment ledger transaction for a monthly record."""
    service = FeeService(db)
    return await service.record_payment(id, data)
