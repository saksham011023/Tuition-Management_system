"""
Reports API router — JSON preview endpoints and PDF/Excel export endpoints.
All routes accept start_date and end_date query params for custom date ranges.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import get_db
from src.reports import excel_service, pdf_service
from src.reports.schemas import (
    AttendanceReport,
    BatchReport,
    FeeCollectionReport,
    MonthlySummaryReport,
    PendingFeesReport,
    StudentPerformanceReport,
)
from src.reports.service import ReportsService

router = APIRouter()


# ──────────────────────────────────────────────
# Dependency helpers
# ──────────────────────────────────────────────

def get_reports_service(db: AsyncSession = Depends(get_db)) -> ReportsService:
    return ReportsService(db)


def _date_range_params(
    start_date: date = Query(..., description="Start date YYYY-MM-DD"),
    end_date: date = Query(..., description="End date YYYY-MM-DD"),
) -> tuple[date, date]:
    if start_date > end_date:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="start_date must be before end_date")
    return start_date, end_date


# ══════════════════════════════════════════════════════════════════════════════
# Fee Collection Report
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/fee-collection", response_model=FeeCollectionReport, tags=["Reports"])
async def fee_collection_report(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    student_id: str | None = Query(default=None),
    svc: ReportsService = Depends(get_reports_service),
) -> FeeCollectionReport:
    """Fee Collection report JSON for the given date range."""
    start, end = date_range
    return await svc.get_fee_collection_report(start, end, student_id)


@router.get("/fee-collection/export", tags=["Reports"])
async def export_fee_collection(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    format: str = Query("pdf", pattern="^(pdf|excel)$"),
    student_id: str | None = Query(default=None),
    svc: ReportsService = Depends(get_reports_service),
) -> Response:
    """Download Fee Collection report as PDF or Excel."""
    start, end = date_range
    report = await svc.get_fee_collection_report(start, end, student_id)
    if format == "pdf":
        data = pdf_service.generate_fee_collection_pdf(report)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=fee_collection_{start}_{end}.pdf"},
        )
    data = excel_service.generate_fee_collection_excel(report)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=fee_collection_{start}_{end}.xlsx"},
    )


# ══════════════════════════════════════════════════════════════════════════════
# Pending Fees Report
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/pending-fees", response_model=PendingFeesReport, tags=["Reports"])
async def pending_fees_report(
    as_of: date = Query(default=None),
    svc: ReportsService = Depends(get_reports_service),
) -> PendingFeesReport:
    """Pending fees as of a given date (defaults to today)."""
    as_of_date = as_of or date.today()
    return await svc.get_pending_fees_report(as_of_date)


@router.get("/pending-fees/export", tags=["Reports"])
async def export_pending_fees(
    as_of: date = Query(default=None),
    format: str = Query("pdf", pattern="^(pdf|excel)$"),
    svc: ReportsService = Depends(get_reports_service),
) -> Response:
    """Download Pending Fees report as PDF or Excel."""
    as_of_date = as_of or date.today()
    report = await svc.get_pending_fees_report(as_of_date)
    if format == "pdf":
        data = pdf_service.generate_pending_fees_pdf(report)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=pending_fees_{as_of_date}.pdf"},
        )
    data = excel_service.generate_pending_fees_excel(report)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=pending_fees_{as_of_date}.xlsx"},
    )


# ══════════════════════════════════════════════════════════════════════════════
# Attendance Report
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/attendance", response_model=AttendanceReport, tags=["Reports"])
async def attendance_report(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    batch_id: str | None = Query(default=None),
    svc: ReportsService = Depends(get_reports_service),
) -> AttendanceReport:
    """Attendance report JSON for the given date range."""
    start, end = date_range
    return await svc.get_attendance_report(start, end, batch_id)


@router.get("/attendance/export", tags=["Reports"])
async def export_attendance(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    format: str = Query("pdf", pattern="^(pdf|excel)$"),
    batch_id: str | None = Query(default=None),
    svc: ReportsService = Depends(get_reports_service),
) -> Response:
    """Download Attendance report as PDF or Excel."""
    start, end = date_range
    report = await svc.get_attendance_report(start, end, batch_id)
    if format == "pdf":
        data = pdf_service.generate_attendance_pdf(report)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=attendance_{start}_{end}.pdf"},
        )
    data = excel_service.generate_attendance_excel(report)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=attendance_{start}_{end}.xlsx"},
    )


# ══════════════════════════════════════════════════════════════════════════════
# Student Performance Report
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/student-performance", response_model=StudentPerformanceReport, tags=["Reports"])
async def student_performance_report(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    svc: ReportsService = Depends(get_reports_service),
) -> StudentPerformanceReport:
    """Student performance report JSON (fees + attendance + test scores)."""
    start, end = date_range
    return await svc.get_student_performance_report(start, end)


@router.get("/student-performance/export", tags=["Reports"])
async def export_student_performance(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    format: str = Query("pdf", pattern="^(pdf|excel)$"),
    svc: ReportsService = Depends(get_reports_service),
) -> Response:
    """Download Student Performance report as PDF or Excel."""
    start, end = date_range
    report = await svc.get_student_performance_report(start, end)
    if format == "pdf":
        data = pdf_service.generate_student_performance_pdf(report)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=student_performance_{start}_{end}.pdf"},
        )
    data = excel_service.generate_student_performance_excel(report)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=student_performance_{start}_{end}.xlsx"},
    )


# ══════════════════════════════════════════════════════════════════════════════
# Batch Report
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/batch", response_model=BatchReport, tags=["Reports"])
async def batch_report(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    svc: ReportsService = Depends(get_reports_service),
) -> BatchReport:
    """Batch-level summary report JSON."""
    start, end = date_range
    return await svc.get_batch_report(start, end)


@router.get("/batch/export", tags=["Reports"])
async def export_batch(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    format: str = Query("pdf", pattern="^(pdf|excel)$"),
    svc: ReportsService = Depends(get_reports_service),
) -> Response:
    """Download Batch report as PDF or Excel."""
    start, end = date_range
    report = await svc.get_batch_report(start, end)
    if format == "pdf":
        data = pdf_service.generate_batch_pdf(report)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=batch_report_{start}_{end}.pdf"},
        )
    data = excel_service.generate_batch_excel(report)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=batch_report_{start}_{end}.xlsx"},
    )


# ══════════════════════════════════════════════════════════════════════════════
# Monthly Summary Report
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/monthly-summary", response_model=MonthlySummaryReport, tags=["Reports"])
async def monthly_summary_report(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    svc: ReportsService = Depends(get_reports_service),
) -> MonthlySummaryReport:
    """Month-by-month summary report JSON."""
    start, end = date_range
    return await svc.get_monthly_summary_report(start, end)


@router.get("/monthly-summary/export", tags=["Reports"])
async def export_monthly_summary(
    date_range: Annotated[tuple[date, date], Depends(_date_range_params)],
    format: str = Query("pdf", pattern="^(pdf|excel)$"),
    svc: ReportsService = Depends(get_reports_service),
) -> Response:
    """Download Monthly Summary report as PDF or Excel."""
    start, end = date_range
    report = await svc.get_monthly_summary_report(start, end)
    if format == "pdf":
        data = pdf_service.generate_monthly_summary_pdf(report)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=monthly_summary_{start}_{end}.pdf"},
        )
    data = excel_service.generate_monthly_summary_excel(report)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=monthly_summary_{start}_{end}.xlsx"},
    )
