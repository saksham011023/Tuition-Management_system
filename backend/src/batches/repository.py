"""
Batch database operations repository layer.
Handles all data access for batches, student assignments, and attendance aggregation.
"""

from collections.abc import Sequence

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.batches.schemas import BatchCreate, BatchUpdate
from src.students.models import Attendance, Batch, Student, student_batches


class BatchRepository:
    """Handles all data access for batches."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────
    # Single Record Queries
    # ──────────────────────────────────────────

    async def get_by_id(self, batch_id: str) -> Batch | None:
        """Get a single batch by ID with eagerly loaded students."""
        stmt = (
            select(Batch)
            .where(Batch.id == batch_id)
            .options(selectinload(Batch.students))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Batch | None:
        """Get a single batch by unique name."""
        stmt = select(Batch).where(Batch.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    # ──────────────────────────────────────────
    # List Queries
    # ──────────────────────────────────────────

    async def list_batches(
        self,
        page: int = 1,
        page_size: int = 10,
        search: str | None = None,
        sort_by: str = "name",
        sort_order: str = "asc",
    ) -> tuple[Sequence[Batch], int]:
        """List batches with search, sorting, and pagination."""
        query = select(Batch).options(selectinload(Batch.students))

        # Search across name, subject, and teacher
        if search:
            search_clause = f"%{search}%"
            query = query.where(
                or_(
                    Batch.name.ilike(search_clause),
                    Batch.subject.ilike(search_clause),
                    Batch.teacher.ilike(search_clause),
                )
            )

        # Count before pagination
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Sorting
        valid_sort_columns = ["name", "subject", "teacher", "max_students", "created_at"]
        if sort_by not in valid_sort_columns:
            sort_by = "name"
        sort_column = getattr(Batch, sort_by, Batch.name)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        batches = result.scalars().all()

        return batches, total

    async def list_all(self) -> Sequence[Batch]:
        """List all batches (for dropdowns)."""
        stmt = select(Batch).options(selectinload(Batch.students)).order_by(Batch.name.asc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ──────────────────────────────────────────
    # CRUD Operations
    # ──────────────────────────────────────────

    async def create(self, data: BatchCreate) -> Batch:
        """Create a new batch with all fields."""
        batch = Batch(
            name=data.name,
            subject=data.subject,
            teacher=data.teacher,
            days=data.days,
            timing=data.timing,
            max_students=data.max_students,
            description=data.description,
        )
        self.db.add(batch)
        await self.db.flush()
        await self.db.refresh(batch)
        # Re-fetch with students loaded
        return await self.get_by_id(batch.id) or batch

    async def update(self, batch: Batch, data: BatchUpdate) -> Batch:
        """Update batch with partial data."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(batch, field, value)
        await self.db.flush()
        # Re-fetch with students loaded
        return await self.get_by_id(batch.id) or batch

    async def delete(self, batch: Batch) -> None:
        """Delete a batch."""
        await self.db.delete(batch)
        await self.db.flush()

    # ──────────────────────────────────────────
    # Student Assignment Operations
    # ──────────────────────────────────────────

    async def assign_students(self, batch: Batch, student_ids: list[str]) -> Batch:
        """Add students to a batch. Skips students already assigned."""
        existing_ids = {s.id for s in batch.students}
        new_ids = [sid for sid in student_ids if sid not in existing_ids]

        if new_ids:
            students_stmt = select(Student).where(Student.id.in_(new_ids))
            students_result = await self.db.execute(students_stmt)
            new_students = list(students_result.scalars().all())
            batch.students.extend(new_students)
            await self.db.flush()

        return await self.get_by_id(batch.id) or batch

    async def remove_students(self, batch: Batch, student_ids: list[str]) -> Batch:
        """Remove specific students from a batch."""
        remove_set = set(student_ids)
        batch.students = [s for s in batch.students if s.id not in remove_set]
        await self.db.flush()
        return await self.get_by_id(batch.id) or batch

    # ──────────────────────────────────────────
    # Attendance Aggregation
    # ──────────────────────────────────────────

    async def get_attendance_summary(self, batch_id: str) -> dict:
        """
        Compute attendance summary for all students in a batch.
        Returns total sessions, present count, absent count, and average rates.
        """
        # Get all student IDs in the batch
        student_ids_stmt = (
            select(student_batches.c.student_id)
            .where(student_batches.c.batch_id == batch_id)
        )
        student_ids_result = await self.db.execute(student_ids_stmt)
        student_ids = [row[0] for row in student_ids_result.all()]

        if not student_ids:
            return {
                "total_sessions": 0,
                "total_present": 0,
                "total_absent": 0,
                "avg_present_rate": 0.0,
                "avg_absent_rate": 0.0,
            }

        # Count total attendance records for these students
        total_stmt = select(func.count(Attendance.id)).where(
            Attendance.student_id.in_(student_ids)
        )
        total_result = await self.db.execute(total_stmt)
        total_sessions = total_result.scalar() or 0

        # Count present (includes 'late')
        present_stmt = select(func.count(Attendance.id)).where(
            Attendance.student_id.in_(student_ids),
            or_(Attendance.status == "present", Attendance.status == "late"),
        )
        present_result = await self.db.execute(present_stmt)
        total_present = present_result.scalar() or 0

        total_absent = total_sessions - total_present
        avg_present_rate = round((total_present / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
        avg_absent_rate = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0

        return {
            "total_sessions": total_sessions,
            "total_present": total_present,
            "total_absent": total_absent,
            "avg_present_rate": avg_present_rate,
            "avg_absent_rate": avg_absent_rate,
        }
