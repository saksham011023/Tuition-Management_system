"""
Attendance business logic service layer.
Manages sheet validation, empty templates building, student statistics, and aggregated trends.
"""

from collections import defaultdict
from collections.abc import Sequence
from datetime import date as datetime_date
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.attendance.repository import AttendanceRepository
from src.attendance.schemas import (
    AttendanceResponse,
    AttendanceSummaryItem,
    AttendanceTrends,
    BatchAttendanceReport,
    BatchAttendanceSubmit,
    StudentAttendanceStats,
)
from src.core.exceptions import BadRequestException, NotFoundException
from src.students.models import Batch, Student


class AttendanceService:
    """Encapsulates attendance tracking business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AttendanceRepository(db)

    # ──────────────────────────────────────────
    # Sheet Submission / Marking
    # ──────────────────────────────────────────

    async def submit_attendance(self, data: BatchAttendanceSubmit) -> BatchAttendanceReport:
        """
        Submits marked attendance sheet for a batch.
        Validates date constraint (no future date allowed) and student existence.
        """
        if data.date > datetime_date.today():
            raise BadRequestException("Cannot mark attendance for a future date")

        # Fetch batch
        stmt = select(Batch).where(Batch.id == data.batch_id).options(selectinload(Batch.students))
        result = await self.db.execute(stmt)
        batch = result.scalar_one_or_none()
        if not batch:
            raise NotFoundException(resource="Batch", identifier=data.batch_id)

        # Enforce that submitted student IDs are actually enrolled in the batch
        enrolled_ids = {s.id for s in batch.students}
        submitted_ids = {r.student_id for r in data.records}
        invalid_ids = submitted_ids - enrolled_ids
        if invalid_ids:
            raise BadRequestException(
                f"Student IDs {list(invalid_ids)} are not enrolled in this batch"
            )

        # Upsert records
        marked = await self.repo.upsert_batch_attendance(data.batch_id, data.date, data.records)

        return self._build_report(batch, data.date, marked)

    async def get_attendance_sheet(self, batch_id: str, date: datetime_date) -> BatchAttendanceReport:
        """
        Retrieves the marked attendance sheet for a batch + date.
        If no records exist, generates a blank template pre-populated with enrolled students.
        """
        # Fetch batch and its students
        stmt = select(Batch).where(Batch.id == batch_id).options(selectinload(Batch.students))
        result = await self.db.execute(stmt)
        batch = result.scalar_one_or_none()
        if not batch:
            raise NotFoundException(resource="Batch", identifier=batch_id)

        # Load marked records
        marked = await self.repo.get_batch_attendance(batch_id, date)

        if len(marked) > 0:
            return self._build_report(batch, date, marked)

        # Generate blank sheet (defaulting status to "present" for active students)
        blank_responses = []
        for s in batch.students:
            if s.is_active:
                blank_responses.append(
                    AttendanceResponse(
                        id=f"blank-{s.id}",
                        student_id=s.id,
                        student_name=s.name,
                        batch_id=batch_id,
                        date=date,
                        status="present",  # Default status
                        remarks=None,
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                    )
                )

        return BatchAttendanceReport(
            batch_id=batch_id,
            batch_name=batch.name,
            date=date,
            present_count=0,
            absent_count=0,
            leave_count=0,
            total_students=len(blank_responses),
            attendance_rate=0.0,
            records=blank_responses,
        )

    # ──────────────────────────────────────────
    # Student Metrics
    # ──────────────────────────────────────────

    async def get_student_stats(self, student_id: str) -> StudentAttendanceStats:
        """Get summarized billing attendance stats for a student."""
        # Check student existence
        stmt = select(Student).where(Student.id == student_id)
        result = await self.db.execute(stmt)
        student = result.scalar_one_or_none()
        if not student:
            raise NotFoundException(resource="Student", identifier=student_id)

        metrics = await self.repo.get_student_attendance_metrics(student_id)
        metrics["student_name"] = student.name

        return StudentAttendanceStats(**metrics)

    # ──────────────────────────────────────────
    # Aggregate Trends
    # ──────────────────────────────────────────

    async def get_trends(
        self,
        view: str = "daily",
        start_date: datetime_date | None = None,
        end_date: datetime_date | None = None,
    ) -> AttendanceTrends:
        """
        Aggregate attendance metrics into daily, weekly, or monthly intervals.
        Defaults to past 30 days if range is not specified.
        """
        if not end_date:
            end_date = datetime_date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Fetch records in range
        records = await self.repo.get_attendance_in_range(start_date, end_date)

        # Group in Python
        grouped = defaultdict(lambda: {"present": 0, "absent": 0, "leave": 0, "total": 0})

        for r in records:
            label = self._get_label_for_view(r.date, view)

            grouped[label]["total"] += 1
            if r.status == "present":
                grouped[label]["present"] += 1
            elif r.status == "absent":
                grouped[label]["absent"] += 1
            elif r.status == "leave":
                grouped[label]["leave"] += 1

        items = []
        for label, counts in grouped.items():
            tot = counts["total"]
            rate = (counts["present"] / tot * 100) if tot > 0 else 100.0
            items.append(
                AttendanceSummaryItem(
                    label=label,
                    present_count=counts["present"],
                    absent_count=counts["absent"],
                    leave_count=counts["leave"],
                    attendance_rate=round(rate, 1),
                )
            )

        # If daily, sort chronologically by converting labels back or ordering
        # For simple sorting, since start_date -> end_date is ascending, let's keep order
        return AttendanceTrends(view=view, items=items)

    # ──────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────

    @staticmethod
    def _build_report(batch: Batch, date: datetime_date, marked: Sequence) -> BatchAttendanceReport:
        """Construct a full BatchAttendanceReport from query models."""
        present = sum(1 for r in marked if r.status == "present")
        absent = sum(1 for r in marked if r.status == "absent")
        leave = sum(1 for r in marked if r.status == "leave")
        total = len(marked)

        rate = (present / total * 100) if total > 0 else 100.0

        responses = [
            AttendanceResponse(
                id=r.id,
                student_id=r.student_id,
                student_name=r.student.name if r.student else "Unknown",
                batch_id=r.batch_id,
                date=r.date,
                status=r.status,
                remarks=r.remarks,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in marked
        ]

        return BatchAttendanceReport(
            batch_id=batch.id,
            batch_name=batch.name,
            date=date,
            present_count=present,
            absent_count=absent,
            leave_count=leave,
            total_students=total,
            attendance_rate=round(rate, 1),
            records=responses,
        )

    @staticmethod
    def _get_label_for_view(d: datetime_date, view: str) -> str:
        """Formatting date keys based on daily/weekly/monthly target views."""
        if view == "monthly":
            return d.strftime("%b %Y")  # e.g., "Jul 2026"
        elif view == "weekly":
            # Monday of the ISO week
            monday = d - timedelta(days=d.weekday())
            return f"Wk {monday.strftime('%d %b')}"  # e.g., "Wk 10 Jul"
        else:
            return d.strftime("%d %b")  # e.g., "12 Jul"
class AttendanceSearchFilters:
    """Filters payload for routing search queries."""
    student_name: str | None = None
    batch_id: str | None = None
    status: str | None = None
    start_date: datetime_date | None = None
    end_date: datetime_date | None = None
