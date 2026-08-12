"""
Search repository — raw ILIKE queries across all searchable models.
Keeps all SQL logic here, away from business logic.
"""

from collections.abc import Sequence

from sqlalchemy import and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.fees.models import FeeRecord, FeeTransaction
from src.students.models import Attendance, Batch, Student


class SearchRepository:
    """Cross-model search queries."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Students ──────────────────────────────────────────────────────

    async def search_students(self, q: str, limit: int = 10) -> Sequence[Student]:
        """Search by name, parent name, class, phone."""
        pattern = f"%{q}%"
        stmt = (
            select(Student)
            .where(
                and_(
                    Student.is_active == True,  # noqa: E712
                    or_(
                        Student.name.ilike(pattern),
                        Student.parent_name.ilike(pattern),
                        Student.parent_mobile.ilike(pattern),
                        Student.alternate_mobile.ilike(pattern),
                        Student.class_name.ilike(pattern),
                        Student.school.ilike(pattern),
                    ),
                )
            )
            .options(selectinload(Student.batches))
            .order_by(Student.name.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    # ── Batches ──────────────────────────────────────────────────────

    async def search_batches(self, q: str, limit: int = 10) -> Sequence[Batch]:
        """Search by name, subject, teacher."""
        pattern = f"%{q}%"
        stmt = (
            select(Batch)
            .where(
                or_(
                    Batch.name.ilike(pattern),
                    Batch.subject.ilike(pattern),
                    Batch.teacher.ilike(pattern),
                )
            )
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ── Fee Transactions (receipt / payment) ─────────────────────────

    async def search_fee_transactions(self, q: str, limit: int = 10) -> Sequence[FeeTransaction]:
        """Search by receipt number, transaction ID, student name, or notes."""
        pattern = f"%{q}%"
        stmt = (
            select(FeeTransaction)
            .join(FeeTransaction.student)
            .options(
                joinedload(FeeTransaction.student),
                joinedload(FeeTransaction.fee_record),
            )
            .where(
                or_(
                    FeeTransaction.receipt_number.ilike(pattern),
                    FeeTransaction.transaction_id.ilike(pattern),
                    FeeTransaction.notes.ilike(pattern),
                    Student.name.ilike(pattern),
                )
            )
            .order_by(desc(FeeTransaction.date))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ── Fee Records (month-level) ─────────────────────────────────────

    async def search_fee_records(self, q: str, limit: int = 10) -> Sequence[FeeRecord]:
        """Search fee records by month string or student name."""
        pattern = f"%{q}%"
        stmt = (
            select(FeeRecord)
            .join(FeeRecord.student)
            .options(
                joinedload(FeeRecord.student),
                selectinload(FeeRecord.transactions),
            )
            .where(
                or_(
                    FeeRecord.month.ilike(pattern),
                    Student.name.ilike(pattern),
                )
            )
            .order_by(desc(FeeRecord.month))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    # ── Attendance ───────────────────────────────────────────────────

    async def search_attendance(self, q: str, limit: int = 10) -> Sequence[Attendance]:
        """Search attendance records by student name, date string, or status."""
        pattern = f"%{q}%"
        stmt = (
            select(Attendance)
            .join(Attendance.student)
            .options(
                joinedload(Attendance.student),
                joinedload(Attendance.batch),
            )
            .where(
                or_(
                    Student.name.ilike(pattern),
                    Attendance.status.ilike(pattern),
                    Attendance.remarks.ilike(pattern),
                )
            )
            .order_by(desc(Attendance.date))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
