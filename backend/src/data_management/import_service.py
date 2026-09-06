"""
ImportService — parses CSV/Excel files, generates sample templates, and bulk-creates student records.
"""

from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.data_management.schemas import ImportErrorDetail, ImportResult
from src.data_management.validation_service import ValidationService

SAMPLE_HEADERS = [
    "student_name",
    "parent_name",
    "parent_mobile",
    "alternate_mobile",
    "class",
    "school",
    "subjects",
    "batch",
    "monthly_fee",
    "joining_date",
    "address",
    "notes",
]

SAMPLE_ROWS = [
    [
        "Aarav Sharma",
        "Rajesh Sharma",
        "9876543210",
        "9876543211",
        "Class 10",
        "Delhi Public School",
        "Mathematics, Physics, Chemistry",
        "3 PM - 5 PM",
        "3000",
        "2026-06-01",
        "123 Park Street, Sector 4",
        "Targeting JEE Main",
    ],
    [
        "Ananya Mishra",
        "Sunil Mishra",
        "9812345678",
        "",
        "Class 12",
        "St. Xavier School",
        "Biology, Chemistry",
        "5 PM - 7 PM",
        "3500",
        "2026-06-15",
        "45 Green Avenue, Civil Lines",
        "NEET preparation",
    ],
]


class ImportService:
    """Handles parsing, template generation, and bulk importing of student data from CSV/Excel."""

    def __init__(self) -> None:
        self.validator = ValidationService()

    # ──────────────────────────────────────────
    # Sample Templates
    # ──────────────────────────────────────────

    def generate_sample_csv(self) -> str:
        """Generate sample CSV content for student import template."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(SAMPLE_HEADERS)
        for r in SAMPLE_ROWS:
            writer.writerow(r)
        return output.getvalue()

    def generate_sample_excel(self) -> bytes:
        """Generate sample Excel (.xlsx) content for student import template using openpyxl."""
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Student Import Template"

        ws.append(SAMPLE_HEADERS)
        for r in SAMPLE_ROWS:
            ws.append(r)

        # Style header row
        for cell in ws[1]:
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")

        out = io.BytesIO()
        wb.save(out)
        wb.close()
        return out.getvalue()

    def generate_error_report_csv(self, error_details: list[ImportErrorDetail]) -> str:
        """Generate a CSV report of failed rows and their error messages."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Row Number", "Student Name", "Parent Mobile", "Error Details"])
        for err in error_details:
            sname = err.data.get("student_name", err.data.get("name", "Unknown"))
            pmobile = err.data.get("parent_mobile", err.data.get("phone", "Unknown"))
            err_str = "; ".join(err.errors)
            writer.writerow([err.row, sname, pmobile, err_str])
        return output.getvalue()

    # ──────────────────────────────────────────
    # Parsing
    # ──────────────────────────────────────────

    def parse_csv(self, file_bytes: bytes, encoding: str = "utf-8") -> list[dict]:
        """Parse CSV bytes into a list of row dicts."""
        try:
            text = file_bytes.decode(encoding)
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1")

        reader = csv.DictReader(io.StringIO(text))
        return [dict(row) for row in reader]

    def parse_excel(self, file_bytes: bytes) -> list[dict]:
        """Parse Excel (.xlsx) bytes into a list of row dicts using openpyxl."""
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
        ws = wb.active

        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []

        # First row is the header
        headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(rows[0])]
        result: list[dict] = []
        for data_row in rows[1:]:
            # Skip completely empty rows
            if all(cell is None or str(cell).strip() == "" for cell in data_row):
                continue
            result.append(dict(zip(headers, [str(c) if c is not None else "" for c in data_row])))

        wb.close()
        return result

    # ──────────────────────────────────────────
    # Import
    # ──────────────────────────────────────────

    async def import_students(
        self,
        rows: list[dict],
        db: AsyncSession,
        duplicate_handling: str = "skip",  # merge | skip | create_anyway
        performed_by: str = "system",
    ) -> ImportResult:
        """
        Validate and bulk-import student rows into the database.
        Respects duplicate_handling strategy (merge, skip, create_anyway).
        """
        from sqlalchemy import select
        from src.students.models import Batch, Student
        from src.activity_log.repository import ActivityLogRepository

        log_repo = ActivityLogRepository(db)

        imported_count = 0
        merged_count = 0
        skipped_count = 0
        error_details: list[ImportErrorDetail] = []

        # Pre-load batch lookup table (name → Batch)
        batch_result = await db.execute(select(Batch))
        all_batches = {b.name.lower(): b for b in batch_result.scalars().all()}

        # Load existing active students for duplicate checking
        all_students_res = await db.execute(select(Student))
        existing_students = all_students_res.scalars().all()
        phone_map = {s.parent_mobile.strip(): s for s in existing_students if s.parent_mobile}
        name_class_map = {
            f"{s.name.strip().lower()}_{s.class_name.strip().lower()}": s
            for s in existing_students
        }

        for i, raw_row in enumerate(rows):
            validation = self.validator.validate_student_row(raw_row, i + 1)

            if not validation.is_valid:
                skipped_count += 1
                error_details.append(ImportErrorDetail(
                    row=i + 1,
                    data=raw_row,
                    errors=validation.errors,
                ))
                continue

            normalized = validation.row_data
            pmobile = str(normalized.get("parent_mobile", "")).strip()
            sname = str(normalized.get("student_name", "")).strip()
            sclass = str(normalized.get("class", "")).strip()
            name_key = f"{sname.lower()}_{sclass.lower()}"

            existing_match = phone_map.get(pmobile) or name_class_map.get(name_key)

            if existing_match:
                if duplicate_handling == "skip":
                    skipped_count += 1
                    continue
                elif duplicate_handling == "merge":
                    # Merge information into existing match
                    existing_match.parent_name = str(normalized.get("parent_name", existing_match.parent_name)).strip()
                    existing_match.school = str(normalized.get("school", existing_match.school)).strip()
                    existing_match.address = str(normalized.get("address", existing_match.address)).strip()
                    if normalized.get("notes"):
                        existing_match.notes = f"{existing_match.notes or ''} | Updated via Import: {normalized.get('notes')}"
                    merged_count += 1
                    continue

            # Parse joining date
            joining_date = self._parse_joining_date(str(normalized.get("joining_date", "")))
            if joining_date is None:
                joining_date = date.today()

            # Parse fee
            try:
                monthly_fee = float(str(normalized.get("monthly_fee", "0")))
            except ValueError:
                monthly_fee = 0.0

            # Parse subjects (comma-separated string → list)
            subjects_raw = str(normalized.get("subjects", ""))
            subjects = [s.strip() for s in subjects_raw.split(",") if s.strip()]
            if not subjects:
                subjects = ["All Subjects"]

            # Resolve batch
            batch_raw = str(normalized.get("batch", "")).strip()
            matched_batch = self._resolve_batch(batch_raw, all_batches)

            student = Student(
                name=sname,
                parent_name=str(normalized.get("parent_name", "")).strip(),
                parent_mobile=pmobile,
                alternate_mobile=str(normalized.get("alternate_mobile", "")).strip() or None,
                address=str(normalized.get("address", "")).strip() or "Chanod Colony Vapi",
                school=str(normalized.get("school", "")).strip() or "Not provided",
                class_name=sclass,
                subjects=subjects,
                joining_date=joining_date,
                monthly_fee=monthly_fee,
                notes=str(normalized.get("notes", "")).strip() or None,
                is_active=True,
                is_demo=False,
            )

            if matched_batch:
                student.batches = [matched_batch]

            db.add(student)
            imported_count += 1

        # Flush all changes
        try:
            await db.flush()
        except Exception as e:
            return ImportResult(
                imported=0,
                skipped=len(rows),
                merged=0,
                errors=[ImportErrorDetail(row=0, data={}, errors=[str(e)])],
                message=f"Import database error: {e}",
            )

        # Log the activity
        try:
            await log_repo.log(
                action="import_completed",
                summary=f"Student Import: {imported_count} imported, {merged_count} merged, {skipped_count} skipped",
                performed_by=performed_by,
                entity_type="Student",
                details={
                    "imported": imported_count,
                    "merged": merged_count,
                    "skipped": skipped_count,
                    "errors_count": len(error_details),
                    "duplicate_handling": duplicate_handling,
                },
            )
        except Exception:
            pass

        return ImportResult(
            imported=imported_count,
            skipped=skipped_count,
            merged=merged_count,
            errors=error_details,
            message=(
                f"Import complete: {imported_count} student(s) imported, "
                f"{merged_count} student(s) merged, {skipped_count} row(s) skipped."
            ),
        )

    # ──────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────

    def _resolve_batch(self, batch_raw: str, all_batches: dict) -> Any | None:
        """Smart match batch name from import string to database Batch objects."""
        if not batch_raw:
            return None

        raw_lower = batch_raw.strip().lower()

        # Direct exact match
        if raw_lower in all_batches:
            return all_batches[raw_lower]

        # Ignore header row artifact like 'batch 1/2' or 'batch 1 / 2'
        if raw_lower in ("batch 1/2", "batch 1 / 2", "batch 1_2"):
            return None

        # Check Batch 2 first (e.g. 'Batch 2 (5-7)', 'Batch 2')
        if re.search(r"\bbatch\s*2\b", raw_lower) or "5-7" in raw_lower or "5 to 7" in raw_lower:
            for name, b in all_batches.items():
                if "batch 2" in name:
                    return b

        # Check Batch 1 (e.g. 'Batch 1 (3-5)', 'Batch 1')
        if re.search(r"\bbatch\s*1\b", raw_lower) or "3-5" in raw_lower or "3 to 5" in raw_lower:
            for name, b in all_batches.items():
                if "batch 1" in name:
                    return b

        # Partial match
        for name, b in all_batches.items():
            if raw_lower in name or name in raw_lower:
                return b

        return None

    def _parse_joining_date(self, date_str: str) -> date | None:
        """Parse a date string using multiple formats."""
        if not date_str or not date_str.strip():
            return None

        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%d-%m-%Y %H:%M:%S",
            "%m-%d-%Y %H:%M:%S",
            "%d/%m/%Y %H:%M:%S",
            "%m/%d/%Y %H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
        ]
        s = date_str.strip()
        for fmt in formats:
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue

        # Try extract date prefix if timestamp has space
        if " " in s:
            part = s.split()[0]
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%m-%d-%Y"]:
                try:
                    return datetime.strptime(part, fmt).date()
                except ValueError:
                    continue

        return None
