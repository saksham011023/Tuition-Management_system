"""
Reports data repository — all aggregation queries for the six report types.
Follows repository pattern: only raw SQL/ORM queries here, no business logic.
"""

from collections.abc import Sequence
from datetime import date

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.fees.models import FeeRecord
from src.students.models import Attendance, Batch, Student, TestScore


class ReportsRepository:
    """All data access for report generation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────
    # Fee Collection Queries
    # ──────────────────────────────────────────

    async def get_fee_records_in_range(
        self,
        start_date: date,
        end_date: date,
        student_id: str | None = None,
    ) -> Sequence[FeeRecord]:
        """All fee records whose due_date falls within [start_date, end_date]."""
        stmt = (
            select(FeeRecord)
            .join(FeeRecord.student)
            .options(
                joinedload(FeeRecord.student),
                selectinload(FeeRecord.transactions),
            )
            .where(
                and_(
                    FeeRecord.due_date >= start_date,
                    FeeRecord.due_date <= end_date,
                )
            )
            .order_by(FeeRecord.month.desc(), Student.name.asc())
        )
        if student_id:
            stmt = stmt.where(FeeRecord.student_id == student_id)
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    async def get_pending_fee_records(self, as_of: date) -> Sequence[FeeRecord]:
        """All fee records that are not fully paid as of a given date."""
        stmt = (
            select(FeeRecord)
            .join(FeeRecord.student)
            .options(
                joinedload(FeeRecord.student),
                selectinload(FeeRecord.transactions),
            )
            .where(FeeRecord.due_date <= as_of)
            .order_by(FeeRecord.due_date.asc(), Student.name.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    # ──────────────────────────────────────────
    # Attendance Queries
    # ──────────────────────────────────────────

    async def get_attendance_in_range(
        self,
        start_date: date,
        end_date: date,
        batch_id: str | None = None,
    ) -> Sequence[Attendance]:
        """All attendance records within date range, optionally filtered by batch."""
        stmt = (
            select(Attendance)
            .options(
                joinedload(Attendance.student),
                joinedload(Attendance.batch),
            )
            .where(
                and_(
                    Attendance.date >= start_date,
                    Attendance.date <= end_date,
                )
            )
            .order_by(Attendance.date.asc())
        )
        if batch_id:
            stmt = stmt.where(Attendance.batch_id == batch_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ──────────────────────────────────────────
    # Student + Scores Queries
    # ──────────────────────────────────────────

    async def get_all_active_students_with_relations(self) -> Sequence[Student]:
        """Active students with their batches eagerly loaded."""
        stmt = (
            select(Student)
            .where(Student.is_active == True)  # noqa: E712
            .options(selectinload(Student.batches))
            .order_by(Student.name.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    async def get_test_scores_in_range(
        self,
        start_date: date,
        end_date: date,
        student_id: str | None = None,
    ) -> Sequence[TestScore]:
        """Test scores within date range, optionally filtered by student."""
        stmt = (
            select(TestScore)
            .options(joinedload(TestScore.student))
            .where(
                and_(
                    TestScore.date >= start_date,
                    TestScore.date <= end_date,
                )
            )
        )
        if student_id:
            stmt = stmt.where(TestScore.student_id == student_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ──────────────────────────────────────────
    # Batch Queries
    # ──────────────────────────────────────────

    async def get_all_batches_with_students(self) -> Sequence[Batch]:
        """All batches with enrolled students eagerly loaded."""
        stmt = (
            select(Batch)
            .options(selectinload(Batch.students))
            .order_by(Batch.name.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    # ──────────────────────────────────────────
    # Monthly Aggregate Queries
    # ──────────────────────────────────────────

    async def get_active_student_count_by_month(self, month: str) -> int:
        """Count active students at the time of a specific month (YYYY-MM)."""
        stmt = select(func.count(Student.id)).where(Student.is_active == True)  # noqa: E712
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def get_test_count_in_month(self, month: str) -> int:
        """Count unique test sessions conducted in a given month."""
        year, mon = int(month[:4]), int(month[5:7])
        from calendar import monthrange
        _, last_day = monthrange(year, mon)
        start = date(year, mon, 1)
        end = date(year, mon, last_day)
        stmt = select(func.count(TestScore.id)).where(
            and_(TestScore.date >= start, TestScore.date <= end)
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0
