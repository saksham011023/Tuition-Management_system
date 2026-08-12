"""
Batch business logic service layer.
Separates domain rules (capacity checks, uniqueness) from routing and data access.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from src.batches.repository import BatchRepository
from src.batches.schemas import (
    BatchAttendanceSummary,
    BatchCreate,
    BatchDetailResponse,
    BatchResponse,
    BatchStudentResponse,
    BatchUpdate,
)
from src.core.exceptions import BadRequestException, ConflictException, NotFoundException
from src.students.models import Batch


class BatchService:
    """Encapsulates batch business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = BatchRepository(db)

    # ──────────────────────────────────────────
    # CRUD Operations
    # ──────────────────────────────────────────

    async def create_batch(self, data: BatchCreate) -> BatchResponse:
        """Create a batch after validating uniqueness."""
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise ConflictException(message=f"A batch with name '{data.name}' already exists")

        batch = await self.repo.create(data)
        return self._to_response(batch)

    async def update_batch(self, batch_id: str, data: BatchUpdate) -> BatchResponse:
        """Update a batch, ensuring name uniqueness if changed."""
        batch = await self._get_or_404(batch_id)

        # Check name uniqueness if being changed
        if data.name is not None and data.name != batch.name:
            existing = await self.repo.get_by_name(data.name)
            if existing:
                raise ConflictException(message=f"A batch with name '{data.name}' already exists")

        updated = await self.repo.update(batch, data)
        return self._to_response(updated)

    async def delete_batch(self, batch_id: str) -> None:
        """Delete a batch by ID."""
        batch = await self._get_or_404(batch_id)
        await self.repo.delete(batch)

    async def get_batch_detail(self, batch_id: str) -> BatchDetailResponse:
        """Get full batch details including students and attendance summary."""
        batch = await self._get_or_404(batch_id)
        attendance_data = await self.repo.get_attendance_summary(batch_id)

        return BatchDetailResponse(
            id=batch.id,
            name=batch.name,
            subject=batch.subject,
            teacher=batch.teacher,
            days=batch.days,
            timing=batch.timing,
            max_students=batch.max_students,
            description=batch.description,
            student_count=len(batch.students),
            created_at=batch.created_at,
            updated_at=batch.updated_at,
            students=[
                BatchStudentResponse(
                    id=s.id,
                    name=s.name,
                    class_name=s.class_name,
                    is_active=s.is_active,
                    joining_date=str(s.joining_date),
                )
                for s in batch.students
            ],
            attendance_summary=BatchAttendanceSummary(**attendance_data),
        )

    # ──────────────────────────────────────────
    # Student Assignment
    # ──────────────────────────────────────────

    async def assign_students(self, batch_id: str, student_ids: list[str]) -> BatchDetailResponse:
        """
        Assign students to a batch.
        Validates capacity constraints before assignment.
        """
        batch = await self._get_or_404(batch_id)

        # Calculate how many new students would be added
        existing_ids = {s.id for s in batch.students}
        new_ids = [sid for sid in student_ids if sid not in existing_ids]
        new_count = len(batch.students) + len(new_ids)

        if new_count > batch.max_students:
            raise BadRequestException(
                message=f"Cannot assign students: batch capacity is {batch.max_students}, "
                f"current enrollment is {len(batch.students)}, "
                f"attempting to add {len(new_ids)} new student(s)"
            )

        await self.repo.assign_students(batch, student_ids)
        return await self.get_batch_detail(batch_id)

    async def remove_students(self, batch_id: str, student_ids: list[str]) -> BatchDetailResponse:
        """Remove students from a batch."""
        batch = await self._get_or_404(batch_id)

        # Validate that all requested students are actually in the batch
        enrolled_ids = {s.id for s in batch.students}
        invalid_ids = [sid for sid in student_ids if sid not in enrolled_ids]
        if invalid_ids:
            raise BadRequestException(
                message=f"Students with IDs {invalid_ids} are not enrolled in this batch"
            )

        await self.repo.remove_students(batch, student_ids)
        return await self.get_batch_detail(batch_id)

    # ──────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────

    async def _get_or_404(self, batch_id: str) -> Batch:
        """Fetch a batch by ID or raise NotFoundException."""
        batch = await self.repo.get_by_id(batch_id)
        if not batch:
            raise NotFoundException(resource="Batch", identifier=batch_id)
        return batch

    @staticmethod
    def _to_response(batch: Batch) -> BatchResponse:
        """Convert a Batch ORM instance to a BatchResponse schema."""
        return BatchResponse(
            id=batch.id,
            name=batch.name,
            subject=batch.subject,
            teacher=batch.teacher,
            days=batch.days,
            timing=batch.timing,
            max_students=batch.max_students,
            description=batch.description,
            student_count=len(batch.students) if batch.students else 0,
            created_at=batch.created_at,
            updated_at=batch.updated_at,
        )
