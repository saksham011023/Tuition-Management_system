"""
Fee database operations repository layer.
Handles FeeRecord, FeeTransaction, timeline, reports, and pending fee aggregates.
"""

from collections.abc import Sequence
from datetime import date

from sqlalchemy import and_, asc, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.fees.models import FeeRecord, FeeTransaction
from src.fees.schemas import FeeRecordCreate, FeeTransactionCreate
from src.students.models import Student


class FeeRepository:
    """Handles all data access for fee records and payment transactions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────
    # Private Helpers
    # ──────────────────────────────────────────

    @staticmethod
    def _paid_amount_subquery():
        """Reusable correlated subquery: sum of payments for a given FeeRecord.id."""
        return (
            select(func.coalesce(func.sum(FeeTransaction.amount), 0.0))
            .where(FeeTransaction.fee_record_id == FeeRecord.id)
            .scalar_subquery()
        )

    # ──────────────────────────────────────────
    # Single Record Queries
    # ──────────────────────────────────────────

    async def get_fee_record_by_id(self, record_id: str) -> FeeRecord | None:
        """Get a single fee record by ID, eagerly loading student, batches, and transactions."""
        stmt = (
            select(FeeRecord)
            .where(FeeRecord.id == record_id)
            .options(
                joinedload(FeeRecord.student).selectinload(Student.batches),
                selectinload(FeeRecord.transactions)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_student_and_month(self, student_id: str, month: str) -> FeeRecord | None:
        """Find a billing record for a specific student and month (YYYY-MM)."""
        stmt = (
            select(FeeRecord)
            .where(and_(FeeRecord.student_id == student_id, FeeRecord.month == month))
            .options(selectinload(FeeRecord.transactions))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    # ──────────────────────────────────────────
    # Paginated List and Search
    # ──────────────────────────────────────────

    async def list_fee_records(
        self,
        page: int = 1,
        page_size: int = 10,
        student_id: str | None = None,
        month: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[FeeRecord], int]:
        """List fee records with filters and optional text search on student name."""
        # Query with eager transactions and student
        query = (
            select(FeeRecord)
            .join(FeeRecord.student)
            .options(
                joinedload(FeeRecord.student),
                selectinload(FeeRecord.transactions)
            )
        )

        # Filters
        if student_id:
            query = query.where(FeeRecord.student_id == student_id)
        if month:
            query = query.where(FeeRecord.month == month)
        if search:
            query = query.where(Student.name.ilike(f"%{search}%"))

        # Paid amount subquery for status filtering
        paid_amount_sub = self._paid_amount_subquery()

        if status:
            if status == "paid":
                query = query.where(paid_amount_sub >= FeeRecord.net_amount)
            elif status == "partially_paid":
                query = query.where(and_(paid_amount_sub > 0, paid_amount_sub < FeeRecord.net_amount))
            elif status == "pending":
                query = query.where(paid_amount_sub == 0)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Pagination & sorting by month desc, student name asc
        offset = (page - 1) * page_size
        query = (
            query.order_by(desc(FeeRecord.month), asc(Student.name))
            .offset(offset)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        records = result.scalars().all()

        return records, total

    # ──────────────────────────────────────────
    # Pending Fees Search
    # ──────────────────────────────────────────

    async def get_pending_fee_records(
        self,
        search: str | None = None,
        month: str | None = None,
    ) -> Sequence[FeeRecord]:
        """Get all fee records that are not fully paid, with optional search and month filters."""
        paid_amount_sub = self._paid_amount_subquery()

        query = (
            select(FeeRecord)
            .join(FeeRecord.student)
            .where(paid_amount_sub < FeeRecord.net_amount)
            .options(
                joinedload(FeeRecord.student),
                selectinload(FeeRecord.transactions)
            )
        )

        if month:
            query = query.where(FeeRecord.month == month)
        if search:
            query = query.where(
                or_(
                    Student.name.ilike(f"%{search}%"),
                    Student.parent_mobile.ilike(f"%{search}%")
                )
            )

        query = query.order_by(desc(FeeRecord.month), asc(Student.name))
        result = await self.db.execute(query)
        return result.scalars().all()

    # ──────────────────────────────────────────
    # Write Operations
    # ──────────────────────────────────────────

    async def create_fee_record(self, data: FeeRecordCreate, base_amount: float, net_amount: float, due_date: date) -> FeeRecord:
        """Create a new fee record."""
        # Parse month/year
        y, m = map(int, data.month.split("-"))

        record = FeeRecord(
            student_id=data.student_id,
            month=data.month,
            year=y,
            month_num=m,
            base_amount=base_amount,
            discount=data.discount,
            discount_reason=data.discount_reason,
            extra_charges=data.extra_charges,
            extra_charges_reason=data.extra_charges_reason,
            net_amount=net_amount,
            due_date=due_date,
            notes=data.notes,
        )
        self.db.add(record)
        await self.db.flush()
        return await self.get_fee_record_by_id(record.id) or record

    async def update_fee_record(self, record: FeeRecord, updates: dict) -> FeeRecord:
        """Apply updates to a fee record and recalculate net_amount."""
        for field, value in updates.items():
            setattr(record, field, value)

        # Re-compute net amount: base - discount + extra
        record.net_amount = max(record.base_amount - record.discount + record.extra_charges, 0.0)

        await self.db.flush()
        return await self.get_fee_record_by_id(record.id) or record

    async def delete_fee_record(self, record: FeeRecord) -> None:
        """Delete fee record."""
        await self.db.delete(record)
        await self.db.flush()

    # ──────────────────────────────────────────
    # Transaction Management
    # ──────────────────────────────────────────

    async def get_next_receipt_number(self, year: int) -> str:
        """Generate the next unique receipt number in sequence: TMS-YYYY-NNNN."""
        pattern = f"TMS-{year}-%"
        stmt = (
            select(FeeTransaction.receipt_number)
            .where(FeeTransaction.receipt_number.like(pattern))
            .order_by(desc(FeeTransaction.receipt_number))
            .limit(1)
        )
        result = await self.db.execute(stmt)
        latest = result.scalar_one_or_none()

        if latest:
            try:
                parts = latest.split("-")
                seq = int(parts[2])
                next_seq = seq + 1
            except (IndexError, ValueError):
                next_seq = 1
        else:
            next_seq = 1

        return f"TMS-{year}-{next_seq:04d}"

    async def record_transaction(self, record: FeeRecord, data: FeeTransactionCreate, receipt_number: str) -> FeeTransaction:
        """Create a payment transaction entry."""
        transaction = FeeTransaction(
            fee_record_id=record.id,
            student_id=record.student_id,
            amount=data.amount,
            date=data.date,
            mode=data.mode,
            receipt_number=receipt_number,
            transaction_id=data.transaction_id,
            notes=data.notes,
        )
        self.db.add(transaction)
        if record.transactions is None:
            record.transactions = []
        record.transactions.append(transaction)
        await self.db.flush()
        return transaction

    async def get_transaction_by_receipt(self, receipt_number: str) -> FeeTransaction | None:
        """Fetch a single transaction by receipt number."""
        stmt = (
            select(FeeTransaction)
            .where(FeeTransaction.receipt_number == receipt_number)
            .options(
                joinedload(FeeTransaction.fee_record),
                joinedload(FeeTransaction.student)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    # ──────────────────────────────────────────
    # Aggregate Reports and Timelines
    # ──────────────────────────────────────────

    async def get_student_timeline_records(self, student_id: str) -> Sequence[FeeRecord]:
        """Fetch all fee records for a student sorted by month desc."""
        stmt = (
            select(FeeRecord)
            .where(FeeRecord.student_id == student_id)
            .options(selectinload(FeeRecord.transactions))
            .order_by(desc(FeeRecord.month))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_monthly_collection_metrics(self, month: str) -> dict:
        """Calculate monthly financial collection metrics."""
        # Expected from fee records
        expected_stmt = select(func.coalesce(func.sum(FeeRecord.net_amount), 0.0)).where(FeeRecord.month == month)
        expected_res = await self.db.execute(expected_stmt)
        total_expected = expected_res.scalar() or 0.0

        # Collected from transactions tied to records of this month
        collected_stmt = (
            select(
                func.coalesce(func.sum(FeeTransaction.amount), 0.0),
                func.coalesce(func.sum(case((FeeTransaction.mode == 'cash', FeeTransaction.amount), else_=0.0)), 0.0),
                func.coalesce(func.sum(case((FeeTransaction.mode == 'upi', FeeTransaction.amount), else_=0.0)), 0.0),
                func.coalesce(func.sum(case((FeeTransaction.mode == 'bank_transfer', FeeTransaction.amount), else_=0.0)), 0.0)
            )
            .join(FeeTransaction.fee_record)
            .where(FeeRecord.month == month)
        )
        collected_res = await self.db.execute(collected_stmt)
        row = collected_res.first()

        total_collected = row[0] if row else 0.0
        cash = row[1] if row else 0.0
        upi = row[2] if row else 0.0
        bank_transfer = row[3] if row else 0.0

        total_pending = max(total_expected - total_collected, 0.0)
        collection_rate = (total_collected / total_expected * 100) if total_expected > 0 else 100.0

        return {
            "month": month,
            "total_expected": total_expected,
            "total_collected": total_collected,
            "total_pending": total_pending,
            "collection_rate": round(collection_rate, 1),
            "by_mode": {
                "cash": cash,
                "upi": upi,
                "bank_transfer": bank_transfer
            }
        }
