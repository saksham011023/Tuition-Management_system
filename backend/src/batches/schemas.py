"""
Pydantic schemas for Batch management request/response validation.
"""

from datetime import datetime

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────
# Request Schemas
# ──────────────────────────────────────────────

class BatchCreate(BaseModel):
    """Schema for creating a new batch."""

    name: str = Field(..., min_length=2, max_length=255)
    subject: str = Field(..., min_length=2, max_length=255)
    teacher: str = Field(..., min_length=2, max_length=255)
    days: list[str] = Field(..., min_length=1)
    timing: str = Field(..., min_length=3, max_length=100)
    max_students: int = Field(..., gt=0, le=200)
    description: str | None = Field(None, max_length=1000)


class BatchUpdate(BaseModel):
    """Schema for updating a batch. All fields are optional for partial update."""

    name: str | None = Field(None, min_length=2, max_length=255)
    subject: str | None = Field(None, min_length=2, max_length=255)
    teacher: str | None = Field(None, min_length=2, max_length=255)
    days: list[str] | None = Field(None, min_length=1)
    timing: str | None = Field(None, min_length=3, max_length=100)
    max_students: int | None = Field(None, gt=0, le=200)
    description: str | None = Field(None, max_length=1000)


class BatchStudentAssignment(BaseModel):
    """Schema for assigning or removing students from a batch."""

    student_ids: list[str] = Field(..., min_length=1)


# ──────────────────────────────────────────────
# Response Schemas
# ──────────────────────────────────────────────

class BatchStudentResponse(BaseModel):
    """Lightweight student info when listing students within a batch."""

    id: str
    name: str
    class_name: str
    is_active: bool
    joining_date: str | None = None

    model_config = {"from_attributes": True}


class BatchAttendanceSummary(BaseModel):
    """Attendance aggregate statistics for a batch."""

    total_sessions: int = 0
    total_present: int = 0
    total_absent: int = 0
    avg_present_rate: float = 0.0
    avg_absent_rate: float = 0.0


class BatchResponse(BaseModel):
    """Batch response used in list views and dropdowns."""

    id: str
    name: str
    subject: str
    teacher: str
    days: list[str]
    timing: str
    max_students: int
    description: str | None
    student_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BatchDetailResponse(BatchResponse):
    """Full batch details including enrolled students and attendance summary."""

    students: list[BatchStudentResponse] = []
    attendance_summary: BatchAttendanceSummary = BatchAttendanceSummary()


class BatchListResponse(BaseModel):
    """Paginated list of batches."""

    items: list[BatchResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
