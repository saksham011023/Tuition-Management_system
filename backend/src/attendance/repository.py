"""
Attendance database operations repository layer.
Handles upserting attendance sheets, student summary stats, trend aggregations, and search.
"""

from collections.abc import Sequence
from datetime import date as datetime_date

from sqlalchemy import and_, asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.attendance.schemas import AttendanceMark
from src.students.models import Attendance, Student


class AttendanceRepository:
    """Handles all data access for attendance records."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────
    # Sheet Marked / Marked Check
    # ──────────────────────────────────────────

    async def get_batch_attendance(self, batch_id: str, date: datetime_date) -> Sequence[Attendance]:
        """Retrieve all marked attendance records for a batch on a specific date."""
        stmt = (
            select(Attendance)
            .where(and_(Attendance.batch_id == batch_id, Attendance.date == date))
            .options(joinedload(Attendance.student))
            .order_by(Attendance.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def upsert_batch_attendance(
        self,
        batch_id: str,
        date: datetime_date,
        records: list[AttendanceMark],
    ) -> Sequence[Attendance]:
        """
        Idempotent marker update for a batch attendance sheet.
        Updates status/remarks if existing, otherwise inserts a new record.
        """
        # Fetch existing sheet records for the batch/date
        stmt = select(Attendance).where(
            and_(Attendance.batch_id == batch_id, Attendance.date == date)
        )
        result = await self.db.execute(stmt)
        existing_map = {r.student_id: r for r in result.scalars().all()}

        marked_records = []

        for record in records:
            if record.student_id in existing_map:
                # Update existing
                att = existing_map[record.student_id]
                att.status = record.status
                att.remarks = record.remarks
            else:
                # Insert new
                att = Attendance(
                    student_id=record.student_id,
                    batch_id=batch_id,
                    date=date,
                    status=record.status,
                    remarks=record.remarks,
                )
                self.db.add(att)
            marked_records.append(att)

        await self.db.flush()

        # Return fully loaded response
        return await self.get_batch_attendance(batch_id, date)

    # ──────────────────────────────────────────
    # Student Statistics
    # ──────────────────────────────────────────

    async def get_student_attendance_metrics(self, student_id: str) -> dict:
        """Compute present/absent/leave statistics for a student."""
        stmt = (
            select(
                Attendance.status,
                func.count(Attendance.id)
            )
            .where(Attendance.student_id == student_id)
            .group_by(Attendance.status)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        counts = {"present": 0, "absent": 0, "leave": 0}
        for status, count in rows:
            if status in counts:
                counts[status] = count

        total_sessions = sum(counts.values())
        present_late = counts["present"] # We treat "present" and legacy "late" status values appropriately

        attendance_percentage = (
            (present_late / total_sessions * 100) if total_sessions > 0 else 100.0
        )

        return {
            "student_id": student_id,
            "present_count": counts["present"],
            "absent_count": counts["absent"],
            "leave_count": counts["leave"],
            "total_sessions": total_sessions,
            "attendance_percentage": round(attendance_percentage, 1),
        }

    # ──────────────────────────────────────────
    # Trends and Aggregations
    # ──────────────────────────────────────────

    async def get_attendance_in_range(
        self,
        start_date: datetime_date,
        end_date: datetime_date,
    ) -> Sequence[Attendance]:
        """Fetch all attendance records within a date range."""
        stmt = (
            select(Attendance)
            .where(and_(Attendance.date >= start_date, Attendance.date <= end_date))
            .options(joinedload(Attendance.student))
            .order_by(asc(Attendance.date))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ──────────────────────────────────────────
    # Search Logs
    # ──────────────────────────────────────────

    async def search_attendance_records(
        self,
        student_name: str | None = None,
        batch_id: str | None = None,
        status: str | None = None,
        start_date: datetime_date | None = None,
        end_date: datetime_date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Attendance], int]:
        """Search attendance logs with pagination and filters."""
        query = select(Attendance).join(Attendance.student).options(joinedload(Attendance.student))

        # Apply filters
        if student_name:
            query = query.where(Student.name.ilike(f"%{student_name}%"))
        if batch_id:
            query = query.where(Attendance.batch_id == batch_id)
        if status:
            query = query.where(Attendance.status == status)
        if start_date:
            query = query.where(Attendance.date >= start_date)
        if end_date:
            query = query.where(Attendance.date <= end_date)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Paginate & Order by date desc, student name asc
        offset = (page - 1) * page_size
        query = (
            query.order_by(desc(Attendance.date), asc(Student.name))
            .offset(offset)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        records = result.scalars().all()

        return records, total
