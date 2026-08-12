"""
Fee business logic service layer.
Manages billing schedules, payment ledger transactions, receipt routing, and aggregation reports.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotFoundException
from src.fees.models import FeeRecord
from src.fees.repository import FeeRepository
from src.fees.schemas import (
    DailySummary,
    DailySummaryItem,
    FeeRecordCreate,
    FeeRecordDetailResponse,
    FeeRecordResponse,
    FeeRecordUpdate,
    FeeTransactionCreate,
    FeeTransactionResponse,
    GenerateFeesResponse,
    ModeBreakdown,
    MonthlyCollectionReport,
    PendingFeeItem,
    StudentFeeTimeline,
)
from src.students.models import Student


def get_month_range(start_date_or_str: str | date | None, end_month_str: str) -> list[str]:
    """
    Given a starting joining date (e.g. '2026-06-01' or date object) and an end month 'YYYY-MM',
    returns a list of month strings ['2026-06', '2026-07'] inclusive up to end_month.
    """
    if not start_date_or_str:
        return [end_month_str]
    try:
        if isinstance(start_date_or_str, date):
            start_year, start_month = start_date_or_str.year, start_date_or_str.month
        else:
            parts = str(start_date_or_str).split("-")
            start_year, start_month = int(parts[0]), int(parts[1])

        end_year, end_month = map(int, end_month_str.split("-"))

        months = []
        curr_year, curr_month = start_year, start_month

        while (curr_year, curr_month) <= (end_year, end_month):
            months.append(f"{curr_year}-{curr_month:02d}")
            curr_month += 1
            if curr_month > 12:
                curr_month = 1
                curr_year += 1

        return months or [end_month_str]
    except Exception:
        return [end_month_str]


class FeeService:
    """Encapsulates fee ledger business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FeeRepository(db)

    # ──────────────────────────────────────────
    # Fee Record Generation
    # ──────────────────────────────────────────

    async def generate_monthly_fees(self, month: str, student_ids: list[str] | None = None) -> GenerateFeesResponse:
        """
        Auto-generates FeeRecord billing entries for active students for all months from their
        joining_date up to the given month (YYYY-MM).
        Skips creation if a billing record already exists for the student and month.
        """
        # Fetch active students
        stmt = select(Student).where(Student.is_active)
        if student_ids:
            stmt = stmt.where(Student.id.in_(student_ids))

        result = await self.db.execute(stmt)
        students = result.scalars().all()

        generated_count = 0
        skipped_count = 0

        for student in students:
            # Determine all months from student's joining date to target month
            months_to_bill = get_month_range(student.joining_date, month) if student.joining_date else [month]

            for m in months_to_bill:
                # Check for existing billing record
                existing = await self.repo.get_by_student_and_month(student.id, m)
                if existing:
                    skipped_count += 1
                    continue

                m_year, m_month_num = map(int, m.split("-"))
                due_date = date(m_year, m_month_num, 10)

                # Create new record
                data = FeeRecordCreate(
                    student_id=student.id,
                    month=m,
                    discount=0.0,
                    extra_charges=0.0,
                    notes=f"Auto-generated fee obligation for {m}",
                )
                base_amt = student.monthly_fee
                net_amt = base_amt

                await self.repo.create_fee_record(
                    data=data,
                    base_amount=base_amt,
                    net_amount=net_amt,
                    due_date=due_date
                )
                generated_count += 1

        return GenerateFeesResponse(
            month=month,
            generated_count=generated_count,
            skipped_count=skipped_count
        )

    # ──────────────────────────────────────────
    # Transaction Management
    # ──────────────────────────────────────────

    async def record_payment(self, record_id: str, data: FeeTransactionCreate) -> FeeRecordDetailResponse:
        """
        Records a transaction against a FeeRecord.
        Auto-generates sequential receipt number and recalculates outstanding balance.
        """
        record = await self.repo.get_fee_record_by_id(record_id)
        if not record:
            raise NotFoundException(resource="FeeRecord", identifier=record_id)

        # Generate unique receipt number
        receipt_year = data.date.year
        receipt_number = await self.repo.get_next_receipt_number(receipt_year)

        # Save payment transaction
        await self.repo.record_transaction(record, data, receipt_number)

        # Commit and re-fetch to update relationships
        await self.db.flush()

        # Synchronize payment to the Student's Payment history table
        try:
            from src.students.models import Payment
            
            payment = Payment(
                student_id=record.student_id,
                amount=data.amount,
                date=data.date,
                status="paid",
                method=data.mode,
                remarks=data.notes or f"Payment for {record.month} (Receipt: {receipt_number})"
            )
            self.db.add(payment)
            await self.db.flush()
        except Exception as e:
            import logging
            logger = logging.getLogger("tms")
            logger.warning("Could not sync Fee Transaction to Student Payments: %s", str(e))

        return await self.get_fee_record_detail(record_id)

    async def get_receipt(self, receipt_number: str) -> FeeTransactionResponse:
        """Get transaction receipt details by receipt number."""
        tx = await self.repo.get_transaction_by_receipt(receipt_number)
        if not tx:
            raise NotFoundException(resource="Receipt", identifier=receipt_number)
        return FeeTransactionResponse.model_validate(tx)

    # ──────────────────────────────────────────
    # CRUD / Details
    # ──────────────────────────────────────────

    async def get_fee_record_detail(self, record_id: str) -> FeeRecordDetailResponse:
        """Get full details of a fee record, computing paid amount, status, and balance."""
        record = await self.repo.get_fee_record_by_id(record_id)
        if not record:
            raise NotFoundException(resource="FeeRecord", identifier=record_id)

        paid_amount, balance, status = self.compute_financial_status(record)

        tx_responses = [FeeTransactionResponse.model_validate(t) for t in record.transactions]

        # Collect student context for receipt / notifications
        student = record.student
        batch_names: list[str] = []
        if student and "batches" in student.__dict__ and student.batches:
            batch_names = [b.name for b in student.batches]

        return FeeRecordDetailResponse(
            id=record.id,
            student_id=record.student_id,
            student_name=student.name if student else None,
            month=record.month,
            year=record.year,
            month_num=record.month_num,
            base_amount=record.base_amount,
            discount=record.discount,
            discount_reason=record.discount_reason,
            extra_charges=record.extra_charges,
            extra_charges_reason=record.extra_charges_reason,
            net_amount=record.net_amount,
            due_date=record.due_date,
            notes=record.notes,
            created_at=record.created_at,
            updated_at=record.updated_at,
            paid_amount=paid_amount,
            balance=balance,
            status=status,
            transactions=tx_responses,
            # Receipt context
            parent_name=student.parent_name if student else None,
            parent_mobile=student.parent_mobile if student else None,
            class_name=student.class_name if student else None,
            batch_names=batch_names,
        )

    async def update_fee_record(self, record_id: str, data: FeeRecordUpdate) -> FeeRecordResponse:
        """Update billing discount/extra charges and recalculate net obligation."""
        record = await self.repo.get_fee_record_by_id(record_id)
        if not record:
            raise NotFoundException(resource="FeeRecord", identifier=record_id)

        updates = data.model_dump(exclude_unset=True)
        updated = await self.repo.update_fee_record(record, updates)

        paid_amount, balance, status = self.compute_financial_status(updated)

        return FeeRecordResponse(
            id=updated.id,
            student_id=updated.student_id,
            student_name=updated.student.name if updated.student else None,
            month=updated.month,
            year=updated.year,
            month_num=updated.month_num,
            base_amount=updated.base_amount,
            discount=updated.discount,
            discount_reason=updated.discount_reason,
            extra_charges=updated.extra_charges,
            extra_charges_reason=updated.extra_charges_reason,
            net_amount=updated.net_amount,
            due_date=updated.due_date,
            notes=updated.notes,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
            paid_amount=paid_amount,
            balance=balance,
            status=status,
        )

    async def delete_fee_record(self, record_id: str) -> None:
        """Delete a fee record by ID."""
        record = await self.repo.get_fee_record_by_id(record_id)
        if not record:
            raise NotFoundException(resource="FeeRecord", identifier=record_id)
        
        # Collect receipt numbers of transactions about to be deleted
        receipts = [tx.receipt_number for tx in record.transactions]

        # Delete the fee record (cascades to FeeTransaction)
        await self.repo.delete_fee_record(record)

        # Clean up the corresponding Payment records
        try:
            from src.students.models import Payment
            from sqlalchemy import select
            
            if receipts:
                # Fetch payments for this student
                stmt = select(Payment).where(Payment.student_id == record.student_id)
                res = await self.db.execute(stmt)
                payments = res.scalars().all()
                for p in payments:
                    # Check if payment remarks contains any of the receipt numbers
                    if p.remarks and any(r in p.remarks for r in receipts):
                        await self.db.delete(p)
                await self.db.flush()
        except Exception as e:
            import logging
            logger = logging.getLogger("tms")
            logger.warning("Could not sync Fee Record deletion to Student Payments: %s", str(e))

    # ──────────────────────────────────────────
    # Reports and Outstandings
    # ──────────────────────────────────────────

    async def get_pending_fees(self, search: str | None = None, month: str | None = None) -> list[PendingFeeItem]:
        """Fetch details of all pending and partially paid records with search capability."""
        target_month = month or date.today().strftime("%Y-%m")
        try:
            await self.generate_monthly_fees(target_month)
        except Exception:
            pass

        records = await self.repo.get_pending_fee_records(search=search, month=month)

        today = date.today()
        items = []

        for r in records:
            paid_amount, balance, _ = self.compute_financial_status(r)
            days_overdue = 0
            if balance > 0 and today > r.due_date:
                days_overdue = (today - r.due_date).days

            items.append(
                PendingFeeItem(
                    id=r.id,
                    student_id=r.student_id,
                    student_name=r.student.name if r.student else "Unknown",
                    class_name=r.student.class_name if r.student else "Unknown",
                    month=r.month,
                    due_date=r.due_date,
                    net_amount=r.net_amount,
                    paid_amount=paid_amount,
                    balance=balance,
                    days_overdue=days_overdue,
                )
            )

        return items

    async def get_student_timeline(self, student_id: str) -> StudentFeeTimeline:
        """Get the full chronological billing history and running balance of a student."""
        current_month = date.today().strftime("%Y-%m")
        try:
            await self.generate_monthly_fees(current_month, student_ids=[student_id])
        except Exception:
            pass

        # Load student details
        stmt = select(Student).where(Student.id == student_id)
        result = await self.db.execute(stmt)
        student = result.scalar_one_or_none()
        if not student:
            raise NotFoundException(resource="Student", identifier=student_id)

        records = await self.repo.get_student_timeline_records(student_id)

        total_expected = 0.0
        total_paid = 0.0

        timeline_records = []
        for r in records:
            detail = await self.get_fee_record_detail(r.id)
            total_expected += detail.net_amount
            total_paid += detail.paid_amount
            timeline_records.append(detail)

        total_outstanding = max(total_expected - total_paid, 0.0)

        return StudentFeeTimeline(
            student_id=student_id,
            student_name=student.name,
            monthly_fee=student.monthly_fee,
            total_expected=total_expected,
            total_paid=total_paid,
            total_outstanding=total_outstanding,
            records=timeline_records,
        )

    async def get_monthly_report(self, month: str) -> MonthlyCollectionReport:
        """Aggregate monthly collection metrics."""
        try:
            await self.generate_monthly_fees(month)
        except Exception:
            pass

        metrics = await self.repo.get_monthly_collection_metrics(month)

        return MonthlyCollectionReport(
            month=metrics["month"],
            total_expected=metrics["total_expected"],
            total_collected=metrics["total_collected"],
            total_pending=metrics["total_pending"],
            collection_rate=metrics["collection_rate"],
            by_mode=ModeBreakdown(**metrics["by_mode"]),
        )

    # ──────────────────────────────────────────
    # Computed Financial Fields
    # ──────────────────────────────────────────

    @staticmethod
    def compute_financial_status(record: FeeRecord) -> tuple[float, float, str]:
        """
        Pure function helper to calculate paid amount, outstanding balance,
        and transaction-based status. Status is computed dynamically:
          - Sum of transactions >= net amount: paid
          - Sum of transactions > 0: partially paid
          - Else: pending
        Supports extra/overpayment.
        """
        transactions = record.transactions or []
        paid_amount = sum(t.amount for t in transactions)
        balance = max(record.net_amount - paid_amount, 0.0)

        if paid_amount >= record.net_amount and record.net_amount > 0:
            status = "paid"
        elif paid_amount > 0:
            status = "partially_paid"
        else:
            status = "pending"

        # If net_amount is 0 (i.e. 100% discount), but no payments were made, it's considered paid.
        if record.net_amount == 0.0:
            status = "paid"
            balance = 0.0

        return paid_amount, balance, status

    # ──────────────────────────────────────────
    # Daily Summary
    # ──────────────────────────────────────────

    async def get_daily_summary(self, summary_date: date | None = None) -> DailySummary:
        """Aggregate today's (or a given date's) collection by payment mode."""
        from sqlalchemy import func
        from src.fees.models import FeeTransaction

        target_date = summary_date or date.today()

        # Query all transactions on the target date
        stmt = select(FeeTransaction).where(FeeTransaction.date == target_date)
        result = await self.db.execute(stmt)
        transactions = result.scalars().all()

        mode_totals: dict[str, dict] = {}
        total_collected = 0.0

        for tx in transactions:
            mode = tx.mode
            if mode not in mode_totals:
                mode_totals[mode] = {"total": 0.0, "count": 0}
            mode_totals[mode]["total"] += tx.amount
            mode_totals[mode]["count"] += 1
            total_collected += tx.amount

        by_mode = [
            DailySummaryItem(mode=mode, total=data["total"], count=data["count"])
            for mode, data in mode_totals.items()
        ]

        return DailySummary(
            date=str(target_date),
            total_collected=total_collected,
            receipt_count=len(transactions),
            by_mode=by_mode,
        )
