"""
Pydantic schemas for Data Management operations.
Covers Import, Export, Backup, Seed, and Validation responses.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Environment Status Schema
# ──────────────────────────────────────────────

class EnvironmentStatusResponse(BaseModel):
    """Response schema for system environment status."""
    app_env: str
    is_development: bool
    is_staging: bool
    is_production: bool
    seed_demo_enabled: bool
    dev_routes_enabled: bool


# ──────────────────────────────────────────────
# Import & Validation Schemas
# ──────────────────────────────────────────────

class DuplicateMatch(BaseModel):
    """Information about an existing student matching the import row."""
    matched_student_id: str
    matched_student_name: str
    match_reason: str  # e.g. "Matching parent mobile +91..." or "Matching student name + class"
    existing_parent_name: str
    existing_parent_mobile: str
    existing_class: str


class RowValidationResult(BaseModel):
    """Validation result for a single import row."""
    row_number: int
    is_valid: bool
    errors: list[str] = Field(default_factory=list)
    is_duplicate: bool = False
    duplicate_info: DuplicateMatch | None = None
    row_data: dict


class ImportValidationReport(BaseModel):
    """Full pre-import validation report for uploaded file."""
    total_rows: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    row_results: list[RowValidationResult]
    can_import: bool


class ImportExecuteRequest(BaseModel):
    """Request payload to execute import after preview & validation."""
    rows: list[dict]
    duplicate_handling: str = "skip"  # merge | skip | create_anyway


class ImportErrorDetail(BaseModel):
    """Details of a single failed import row."""
    row: int
    data: dict
    errors: list[str]


class ImportResult(BaseModel):
    """Result of a bulk student import operation."""
    imported: int
    skipped: int
    merged: int = 0
    errors: list[ImportErrorDetail]
    message: str


# ──────────────────────────────────────────────
# Export Schemas
# ──────────────────────────────────────────────

class ExportFilter(BaseModel):
    """Filters for student export."""
    status: str = "all"  # all | active | inactive
    batch_id: str | None = None
    class_name: str | None = None
    fee_status: str | None = None  # paid | overdue | partial
    search: str | None = None
    format: str = "csv"  # csv | excel


# ──────────────────────────────────────────────
# Backup Schemas
# ──────────────────────────────────────────────

class BackupMetadata(BaseModel):
    """Metadata for a backup file."""
    filename: str
    created_at: datetime
    size_bytes: int
    record_counts: dict


class BackupListResponse(BaseModel):
    """List of available backups."""
    backups: list[BackupMetadata]


class BackupRestoreResult(BaseModel):
    """Result of a restore operation."""
    success: bool
    message: str
    record_counts: dict


# ──────────────────────────────────────────────
# Seed Schemas
# ──────────────────────────────────────────────

class SeedResult(BaseModel):
    """Result of seeding demo data."""
    success: bool
    message: str
    counts: dict


class ClearDemoResult(BaseModel):
    """Result of clearing demo data."""
    success: bool
    message: str
    deleted: dict


class ValidationResult(BaseModel):
    """Simple validation result for a single import row."""
    is_valid: bool
    errors: list[str]
    row_data: dict
