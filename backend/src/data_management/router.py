"""
Data Management API Router.
Provides endpoints for import, export, backup/restore, templates, environment status, and demo data seeding.
Seed and Reset endpoints are protected by require_development_mode.
Import/Export/Backup endpoints are available in all environments.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.activity_log.repository import ActivityLogRepository
from src.auth.models import User
from src.core.config import settings
from src.core.dependencies import get_current_user, get_db, require_development_mode
from src.data_management.backup_service import BackupService
from src.data_management.export_service import ExportService
from src.data_management.import_service import ImportService
from src.data_management.schemas import (
    BackupListResponse,
    BackupMetadata,
    BackupRestoreResult,
    ClearDemoResult,
    EnvironmentStatusResponse,
    ImportExecuteRequest,
    ImportResult,
    ImportValidationReport,
    SeedResult,
)
from src.data_management.seed_service import SeedService
from src.data_management.validation_service import ValidationService

router = APIRouter()


# ─────────────────────────────────────────────────────
# Environment Status
# ─────────────────────────────────────────────────────

@router.get(
    "/environment",
    response_model=EnvironmentStatusResponse,
    summary="Get environment status",
    description="Returns current app environment (development, staging, production) and flags.",
    tags=["Data Management"],
)
async def get_environment_status() -> EnvironmentStatusResponse:
    """Get active environment information."""
    return EnvironmentStatusResponse(
        app_env=settings.APP_ENV,
        is_development=settings.IS_DEVELOPMENT,
        is_staging=settings.IS_STAGING,
        is_production=settings.IS_PRODUCTION,
        seed_demo_enabled=settings.SEED_DEMO_DATA,
        dev_routes_enabled=settings.ENABLE_DEV_ROUTES and settings.IS_DEVELOPMENT,
    )


# ─────────────────────────────────────────────────────
# Demo Data & Dev Utilities (Development only)
# ─────────────────────────────────────────────────────

@router.post(
    "/seed",
    response_model=SeedResult,
    status_code=status.HTTP_201_CREATED,
    summary="Generate demo data",
    description="[DEV ONLY] Seed the database with 30-50 realistic demo students, payments, attendance, and test scores.",
    dependencies=[Depends(require_development_mode)],
    tags=["Data Management — Dev"],
)
async def generate_demo_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SeedResult:
    """Generate demo data — development only."""
    service = SeedService()
    counts = await service.seed_all(db, performed_by=current_user.email or current_user.id)
    return SeedResult(
        success=True,
        message=(
            f"Demo data generated: {counts['students']} students, "
            f"{counts['payments']} payments, {counts['attendance']} attendance records, "
            f"{counts['test_scores']} test scores."
        ),
        counts=counts,
    )


@router.delete(
    "/seed",
    response_model=ClearDemoResult,
    summary="Clear demo data",
    description="[DEV ONLY] Remove all records tagged as demo data (is_demo=True).",
    dependencies=[Depends(require_development_mode)],
    tags=["Data Management — Dev"],
)
async def clear_demo_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClearDemoResult:
    """Remove all demo-seeded records — development only."""
    service = SeedService()
    deleted = await service.clear_demo_data(db, performed_by=current_user.email or current_user.id)
    return ClearDemoResult(
        success=True,
        message=f"Demo data cleared: {deleted.get('students', 0)} students removed.",
        deleted=deleted,
    )


@router.post(
    "/reset-dev-db",
    response_model=dict,
    summary="Reset development database",
    description="[DEV ONLY] Clear all students, attendance, fee records, and test scores for a fresh dev state.",
    dependencies=[Depends(require_development_mode)],
    tags=["Data Management — Dev"],
)
async def reset_dev_db(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Reset development database — development only."""
    from sqlalchemy import delete
    from src.students.models import Attendance, FeeRecord, FeeTransaction, Payment, Student, TestScore

    await db.execute(delete(FeeTransaction))
    await db.execute(delete(FeeRecord))
    await db.execute(delete(Payment))
    await db.execute(delete(Attendance))
    await db.execute(delete(TestScore))
    await db.execute(delete(Student))
    await db.flush()

    log_repo = ActivityLogRepository(db)
    await log_repo.log(
        action="dev_db_reset",
        summary="Development database cleared for clean state",
        performed_by=current_user.email or current_user.id,
        entity_type="System",
    )

    return {"success": True, "message": "Development database reset successfully."}


# ─────────────────────────────────────────────────────
# Import Templates & Workflow
# ─────────────────────────────────────────────────────

@router.get(
    "/import/template",
    summary="Download import template",
    description="Download a sample CSV or Excel template for student import.",
    tags=["Data Management"],
)
async def download_import_template(
    format: str = Query("csv", pattern="^(csv|excel)$", description="Template format: csv or excel"),
) -> Response:
    """Return a sample CSV or Excel file for student import."""
    service = ImportService()
    if format == "excel":
        content = service.generate_sample_excel()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=student_import_template.xlsx"},
        )
    else:
        content = service.generate_sample_csv().encode("utf-8-sig")
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=student_import_template.csv"},
        )


@router.post(
    "/import/validate",
    response_model=ImportValidationReport,
    summary="Validate import file",
    description="Upload a CSV/Excel file to parse and validate all rows, checking for missing fields, phone format, and DB duplicates.",
    tags=["Data Management"],
)
async def validate_import_file(
    file: UploadFile = File(..., description="CSV or Excel file to validate"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportValidationReport:
    """Parse file and validate rows against rules & database records for duplicate detection."""
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename_lower = file.filename.lower()
    content = await file.read()
    service = ImportService()

    if filename_lower.endswith(".csv"):
        rows = service.parse_csv(content)
    elif filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
        rows = service.parse_excel(content)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .csv or .xlsx file.",
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file contains no data rows.",
        )

    validator = ValidationService()
    report = await validator.validate_rows_with_duplicates(rows, db)
    return report


@router.post(
    "/import/execute",
    response_model=ImportResult,
    summary="Execute student import",
    description="Bulk import validated student rows with conflict resolution option (skip, merge, create_anyway).",
    tags=["Data Management"],
)
async def execute_import(
    payload: ImportExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportResult:
    """Execute bulk student import with specified duplicate handling strategy."""
    if not payload.rows:
        raise HTTPException(status_code=400, detail="No student rows provided for import.")

    service = ImportService()
    return await service.import_students(
        payload.rows,
        db,
        duplicate_handling=payload.duplicate_handling,
        performed_by=current_user.email or current_user.id,
    )


@router.post(
    "/import/error-report",
    summary="Download import error report",
    description="Generate a CSV error report for invalid rows.",
    tags=["Data Management"],
)
async def download_error_report(
    errors: list[dict],
) -> Response:
    """Generate CSV file download containing error details."""
    from src.data_management.schemas import ImportErrorDetail

    service = ImportService()
    error_objs = [
        ImportErrorDetail(
            row=e.get("row", i + 1),
            data=e.get("data", {}),
            errors=e.get("errors", []),
        )
        for i, e in enumerate(errors)
    ]
    csv_content = service.generate_error_report_csv(error_objs).encode("utf-8-sig")

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=import_error_report.csv"},
    )


# ─────────────────────────────────────────────────────
# Export
# ─────────────────────────────────────────────────────

@router.get(
    "/export/students",
    summary="Export students",
    description="Export student records as CSV or Excel with status, class, batch, and search filters.",
    tags=["Data Management"],
)
async def export_students(
    format: str = Query("csv", pattern="^(csv|excel)$", description="Export format: csv or excel"),
    status: str = Query("all", description="Filter by status: all | active | inactive"),
    batch_id: str | None = Query(None, description="Batch ID filter"),
    class_name: str | None = Query(None, description="Class name filter"),
    search: str | None = Query(None, description="Search query filter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Export filtered student list as CSV or Excel."""
    service = ExportService()
    students = await service.get_students(
        db, status=status, batch_id=batch_id, class_name=class_name, search=search
    )

    # Log the export
    try:
        log_repo = ActivityLogRepository(db)
        await log_repo.log(
            action="export_performed",
            summary=f"Exported {len(students)} students as {format.upper()}",
            performed_by=current_user.email or current_user.id,
            entity_type="Student",
            details={"format": format, "status": status, "count": len(students)},
        )
    except Exception:
        pass

    if format == "excel":
        content = service.export_excel(students)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=students_export.xlsx"},
        )
    else:
        content = service.export_csv(students)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=students_export.csv"},
        )


# ─────────────────────────────────────────────────────
# Backup & Restore
# ─────────────────────────────────────────────────────

@router.post(
    "/backup",
    summary="Create backup",
    description="Export a complete JSON backup of all database tables.",
    tags=["Data Management"],
)
async def create_backup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Create a full database backup and save it to the backup directory."""
    service = BackupService()
    result = await service.create_backup(db, performed_by=current_user.email or current_user.id)
    return result


@router.get(
    "/backup",
    response_model=BackupListResponse,
    summary="List backups",
    description="List all available backup files with metadata.",
    tags=["Data Management"],
)
async def list_backups(
    current_user: User = Depends(get_current_user),
) -> BackupListResponse:
    """List backup files available for restore."""
    service = BackupService()
    backups = service.list_backups()
    return BackupListResponse(
        backups=[
            BackupMetadata(
                filename=b["filename"],
                created_at=b["created_at"],
                size_bytes=b["size_bytes"],
                record_counts=b.get("record_counts", {}),
            )
            for b in backups
        ]
    )


@router.get(
    "/backup/{filename}/download",
    summary="Download backup",
    description="Download a specific backup file by filename.",
    tags=["Data Management"],
)
async def download_backup(
    filename: str,
    current_user: User = Depends(get_current_user),
) -> Response:
    """Download a backup file as JSON."""
    from pathlib import Path

    backup_dir = Path(BackupService().backup_dir)
    filepath = backup_dir / filename

    if not filepath.exists() or not filename.startswith("tms_backup_"):
        raise HTTPException(status_code=404, detail="Backup file not found.")

    with open(filepath, "rb") as f:
        content = f.read()

    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post(
    "/restore",
    response_model=BackupRestoreResult,
    summary="Restore backup",
    description=(
        "Upload a JSON backup file to restore the database. "
        "WARNING: This will overwrite existing data in backed-up tables."
    ),
    tags=["Data Management"],
)
async def restore_backup(
    file: UploadFile = File(..., description="JSON backup file to restore"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BackupRestoreResult:
    """Restore database from an uploaded JSON backup file."""
    if file.filename is None or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Please upload a valid .json backup file.")

    content = await file.read()

    try:
        json.loads(content)  # Validate JSON
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON backup file: {e}") from e

    service = BackupService()
    result = await service.restore_from_bytes(
        content, db, performed_by=current_user.email or current_user.id
    )

    return BackupRestoreResult(
        success=result["success"],
        message=result["message"],
        record_counts=result.get("record_counts", {}),
    )
