"""
ValidationService — row-level validation and duplicate detection for student import data.
Centralizes all validation logic to avoid duplication.
"""

from __future__ import annotations

import re
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.data_management.schemas import (
    DuplicateMatch,
    ImportValidationReport,
    RowValidationResult,
    ValidationResult,
)

# Required columns for import
REQUIRED_FIELDS = [
    "student_name",
    "parent_name",
    "parent_mobile",
    "class",
    "school",
    "subjects",
    "batch",
    "monthly_fee",
    "joining_date",
    "address",
]

PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")
DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"]


class ValidationService:
    """Service that validates rows of student import data and detects duplicates."""

    def validate_student_row(self, row: dict, row_index: int = 0) -> ValidationResult:
        """
        Validate a single row from an import file.
        Returns a ValidationResult with any errors.
        """
        errors: list[str] = []
        cleaned = self._normalize_keys(row)

        # --- Required field checks ---
        for field in REQUIRED_FIELDS:
            val = cleaned.get(field, "")
            if val is None or str(val).strip() == "":
                errors.append(f"Missing required field: '{field}'")

        # --- Phone number validation ---
        mobile = str(cleaned.get("parent_mobile", "")).strip()
        if mobile and not PHONE_RE.match(mobile):
            errors.append(f"Invalid parent mobile number: '{mobile}' (must be 10-15 digits)")

        alt_mobile = str(cleaned.get("alternate_mobile", "")).strip()
        if alt_mobile and not PHONE_RE.match(alt_mobile):
            errors.append(f"Invalid alternate mobile: '{alt_mobile}'")

        # --- Monthly fee validation ---
        fee_raw = str(cleaned.get("monthly_fee", "")).strip()
        if fee_raw:
            try:
                fee = float(fee_raw)
                if fee < 0:
                    errors.append(f"Monthly fee cannot be negative: {fee}")
            except ValueError:
                errors.append(f"Invalid monthly fee value: '{fee_raw}'")

        # --- Joining date validation ---
        joining_raw = str(cleaned.get("joining_date", "")).strip()
        if joining_raw:
            parsed_date = self._parse_date(joining_raw)
            if parsed_date is None:
                errors.append(
                    f"Invalid joining_date format: '{joining_raw}'. "
                    "Accepted formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY"
                )

        # --- Name length ---
        name = str(cleaned.get("student_name", "")).strip()
        if name and len(name) < 2:
            errors.append("Student name must be at least 2 characters")

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            row_data=cleaned,
        )

    def validate_rows(self, rows: list[dict]) -> list[ValidationResult]:
        """Validate multiple rows and return results for each."""
        return [self.validate_student_row(row, i + 1) for i, row in enumerate(rows)]

    async def validate_rows_with_duplicates(
        self, rows: list[dict], db: AsyncSession
    ) -> ImportValidationReport:
        """
        Validate all rows and cross-reference with DB for duplicate detection.
        Returns a complete ImportValidationReport.
        """
        from src.students.models import Student

        # Load existing active students for duplicate lookup
        result = await db.execute(select(Student))
        existing_students = result.scalars().all()

        # Build lookup maps
        phone_map = {s.parent_mobile.strip(): s for s in existing_students if s.parent_mobile}
        name_class_map = {
            f"{s.name.strip().lower()}_{s.class_name.strip().lower()}": s
            for s in existing_students
        }

        row_results: list[RowValidationResult] = []
        valid_count = 0
        invalid_count = 0
        duplicate_count = 0

        for i, raw_row in enumerate(rows):
            val_res = self.validate_student_row(raw_row, i + 1)
            row_data = val_res.row_data

            duplicate_info: DuplicateMatch | None = None
            is_duplicate = False

            if val_res.is_valid:
                # Check phone duplicate
                pmobile = str(row_data.get("parent_mobile", "")).strip()
                sname = str(row_data.get("student_name", "")).strip()
                sclass = str(row_data.get("class", "")).strip()
                name_key = f"{sname.lower()}_{sclass.lower()}"

                matched_student = phone_map.get(pmobile)
                match_reason = f"Matching parent mobile number: {pmobile}" if matched_student else ""

                if not matched_student and name_key in name_class_map:
                    matched_student = name_class_map[name_key]
                    match_reason = f"Matching student name '{sname}' and class '{sclass}'"

                if matched_student:
                    is_duplicate = True
                    duplicate_count += 1
                    duplicate_info = DuplicateMatch(
                        matched_student_id=matched_student.id,
                        matched_student_name=matched_student.name,
                        match_reason=match_reason,
                        existing_parent_name=matched_student.parent_name,
                        existing_parent_mobile=matched_student.parent_mobile,
                        existing_class=matched_student.class_name,
                    )

                valid_count += 1
            else:
                invalid_count += 1

            row_results.append(
                RowValidationResult(
                    row_number=i + 1,
                    is_valid=val_res.is_valid,
                    errors=val_res.errors,
                    is_duplicate=is_duplicate,
                    duplicate_info=duplicate_info,
                    row_data=row_data,
                )
            )

        return ImportValidationReport(
            total_rows=len(rows),
            valid_count=valid_count,
            invalid_count=invalid_count,
            duplicate_count=duplicate_count,
            row_results=row_results,
            can_import=valid_count > 0,
        )

    # ──────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────

    def _normalize_keys(self, row: dict) -> dict:
        """
        Normalize column headers to canonical snake_case names.
        Handles common variations from Excel/CSV exports.
        """
        ALIASES: dict[str, str] = {
            "student name": "student_name",
            "studentname": "student_name",
            "name": "student_name",
            "parent name": "parent_name",
            "parentname": "parent_name",
            "father name": "parent_name",
            "guardian name": "parent_name",
            "parent mobile": "parent_mobile",
            "phone": "parent_mobile",
            "mobile": "parent_mobile",
            "contact": "parent_mobile",
            "alternate mobile": "alternate_mobile",
            "alt mobile": "alternate_mobile",
            "alt phone": "alternate_mobile",
            "class": "class",
            "grade": "class",
            "class name": "class",
            "school": "school",
            "school name": "school",
            "subjects": "subjects",
            "subject": "subjects",
            "batch": "batch",
            "batch name": "batch",
            "monthly fee": "monthly_fee",
            "fee": "monthly_fee",
            "fees": "monthly_fee",
            "monthlyfee": "monthly_fee",
            "joining date": "joining_date",
            "joiningdate": "joining_date",
            "date of joining": "joining_date",
            "address": "address",
            "notes": "notes",
            "remarks": "notes",
        }

        normalized: dict = {}
        for key, val in row.items():
            lookup = str(key).strip().lower()
            canonical = ALIASES.get(lookup, lookup)
            normalized[canonical] = val

        return normalized

    def _parse_date(self, date_str: str) -> datetime | None:
        """Try multiple date formats; return parsed datetime or None."""
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        return None
