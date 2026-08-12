"""
Student and Batch database operations repository layer.
"""

from collections.abc import Sequence
from datetime import date

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.students.models import Attendance, Batch, Payment, Student, TestScore
from src.students.schemas import StudentCreate, StudentUpdate


class StudentRepository:
    """Handles all data access for students and related records."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, student_id: str, include_inactive: bool = False) -> Student | None:
        """Get a single student with all relationships eagerly loaded.
        By default only returns active students (soft-delete support).
        Pass include_inactive=True to retrieve archived/inactive students too.
        """
        stmt = (
            select(Student)
            .where(Student.id == student_id)
            .options(
                selectinload(Student.batches),
                selectinload(Student.payments),
                selectinload(Student.attendance_records),
                selectinload(Student.test_scores),
            )
        )
        if not include_inactive:
            stmt = stmt.where(Student.is_active == True)  # noqa: E712
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_students(
        self,
        page: int = 1,
        page_size: int = 10,
        search: str | None = None,
        sort_by: str = "name",
        sort_order: str = "asc",
        class_name: str | None = None,
        batch_id: str | None = None,
        include_inactive: bool = False,
    ) -> tuple[Sequence[Student], int]:
        """List students with dynamic search, filter, sorting, and pagination."""
        # 1. Base query
        query = select(Student).options(selectinload(Student.batches))

        # 2. Filter inactive by default (soft-delete support)
        if not include_inactive:
            query = query.where(Student.is_active == True)  # noqa: E712

        # 3. Filtering by active batches (many-to-many join if batch_id provided)
        if batch_id:
            query = query.join(Student.batches).where(Batch.id == batch_id)

        # 4. Filtering by class
        if class_name:
            query = query.where(Student.class_name == class_name)

        # 5. Text searching on student name, parent name, parent mobile
        if search:
            search_clause = f"%{search}%"
            query = query.where(
                or_(
                    Student.name.ilike(search_clause),
                    Student.parent_name.ilike(search_clause),
                    Student.parent_mobile.ilike(search_clause),
                )
            )

        # 6. Get count before applying pagination
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 7. Apply sorting
        sort_column = getattr(Student, sort_by, Student.name)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # 8. Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        students = result.scalars().all()

        return students, total

    async def create(self, data: StudentCreate) -> Student:
        """Create a student and associate selected batches."""
        student = Student(
            name=data.name,
            parent_name=data.parent_name,
            parent_mobile=data.parent_mobile,
            alternate_mobile=data.alternate_mobile,
            address=data.address,
            school=data.school,
            class_name=data.class_name,
            subjects=data.subjects,
            joining_date=data.joining_date,
            monthly_fee=data.monthly_fee,
            notes=data.notes,
            profile_image=data.profile_image,
        )

        if data.batch_ids:
            batches_stmt = select(Batch).where(Batch.id.in_(data.batch_ids))
            batches_result = await self.db.execute(batches_stmt)
            student.batches = list(batches_result.scalars().all())

        self.db.add(student)
        await self.db.flush()

        # Return re-fetched student with eager relationships loaded
        fetched = await self.get_by_id(student.id)
        if fetched is None:
            return student
        return fetched

    async def update(self, student: Student, data: StudentUpdate) -> Student:
        """Update student details and override associated batches if requested."""
        update_data = data.model_dump(exclude_unset=True)

        # Override batches many-to-many list
        if "batch_ids" in update_data:
            batch_ids = update_data.pop("batch_ids")
            if batch_ids is not None:
                batches_stmt = select(Batch).where(Batch.id.in_(batch_ids))
                batches_result = await self.db.execute(batches_stmt)
                student.batches = list(batches_result.scalars().all())

        # Apply basic fields updates
        for field, value in update_data.items():
            setattr(student, field, value)

        await self.db.flush()
        # Return re-fetched student with eager relationships loaded
        fetched = await self.get_by_id(student.id, include_inactive=True)
        if fetched is None:
            return student
        return fetched

    async def soft_delete(self, student: Student) -> Student:
        """Soft-delete: mark student as inactive instead of removing from DB."""
        student.is_active = False
        await self.db.flush()
        return student

    async def restore(self, student: Student) -> Student:
        """Restore a previously soft-deleted student."""
        student.is_active = True
        await self.db.flush()
        fetched = await self.get_by_id(student.id, include_inactive=False)
        if fetched is None:
            return student
        return fetched

    async def hard_delete(self, student: Student) -> None:
        """Permanently delete student record (admin use only)."""
        await self.db.delete(student)
        await self.db.flush()

    # Keep legacy alias for backward compatibility
    async def delete(self, student: Student) -> None:
        """Soft-delete student record (legacy alias)."""
        await self.soft_delete(student)

    async def find_duplicates(
        self,
        name: str,
        class_name: str,
        parent_mobile: str,
        exclude_id: str | None = None,
    ) -> Sequence[Student]:
        """Find potential duplicate students based on name+class or phone number."""
        stmt = (
            select(Student)
            .where(Student.is_active == True)  # noqa: E712
            .where(
                or_(
                    Student.parent_mobile == parent_mobile,
                    (Student.name == name) & (Student.class_name == class_name),
                )
            )
            .options(selectinload(Student.batches))
        )
        if exclude_id:
            stmt = stmt.where(Student.id != exclude_id)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ──────────────────────────────────────────
    # Child relationships add/remove operations
    # ──────────────────────────────────────────

    async def add_payment(self, student: Student, payment: Payment) -> Payment:
        """Record a fee payment."""
        payment.student_id = student.id
        self.db.add(payment)
        await self.db.flush()
        await self.db.refresh(payment)

        # Synchronize payment to the FeeRecord and FeeTransaction tables
        try:
            from src.fees.models import FeeRecord, FeeTransaction
            from src.fees.repository import FeeRepository
            from sqlalchemy import select, and_

            month_str = payment.date.strftime("%Y-%m")
            year = payment.date.year
            month_num = payment.date.month

            # Search for an existing FeeRecord for this month
            stmt = select(FeeRecord).where(
                and_(FeeRecord.student_id == student.id, FeeRecord.month == month_str)
            )
            res = await self.db.execute(stmt)
            fee_record = res.scalar_one_or_none()

            if not fee_record:
                # Auto-generate a FeeRecord if one doesn't exist
                fee_record = FeeRecord(
                    student_id=student.id,
                    month=month_str,
                    year=year,
                    month_num=month_num,
                    base_amount=student.monthly_fee,
                    discount=0.0,
                    extra_charges=0.0,
                    net_amount=student.monthly_fee,
                    due_date=payment.date,
                    notes="Automatically generated on payment sync"
                )
                self.db.add(fee_record)
                await self.db.flush()

            # Generate unique receipt number
            repo_fees = FeeRepository(self.db)
            receipt_number = await repo_fees.get_next_receipt_number(year)

            tx_notes = f"Synced from payment ID: {payment.id}"
            tx = FeeTransaction(
                fee_record_id=fee_record.id,
                student_id=student.id,
                amount=payment.amount,
                date=payment.date,
                mode=payment.method if payment.method in ["cash", "upi", "bank_transfer"] else "cash",
                receipt_number=receipt_number,
                notes=tx_notes
            )
            self.db.add(tx)
            await self.db.flush()

            # Update payment remarks to include the receipt number
            payment.remarks = (payment.remarks or "") + f" (Receipt: {receipt_number})"
            await self.db.flush()
        except Exception as e:
            # Log warning, but do not fail the parent transaction if sync fails
            import logging
            logger = logging.getLogger("tms")
            logger.warning("Could not sync Student Payment to Fees Ledger: %s", str(e))

        return payment

    async def add_attendance(self, student: Student, attendance: Attendance) -> Attendance:
        """Record attendance."""
        attendance.student_id = student.id
        self.db.add(attendance)
        await self.db.flush()
        await self.db.refresh(attendance)
        return attendance

    async def add_test_score(self, student: Student, score: TestScore) -> TestScore:
        """Record test score."""
        score.student_id = student.id
        self.db.add(score)
        await self.db.flush()
        await self.db.refresh(score)
        return score
